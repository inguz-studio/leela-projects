// =============================================================================
// functions/src/checkout/travaCobrancaPix.ts
//
// Trava SERVER-SIDE da segunda cobrança PIX viva (LEELA-S1209-PIXBE-T2 ·
// RN-157 · item 2 dos ESCALADOS da review antagonista S1209-REV).
//
// O QUE FECHA: a review provou que a segunda cobrança nascia de dentro da
// tela — relógio adiantado ⇒ "expirou" ⇒ botão "Gerar nova cobrança" ⇒ novo
// pedido com idempotencyKey nova, enquanto a PRIMEIRA seguia pendente e
// pagável no gateway. O pré-voo do cliente (fix `59f18ed`) fecha o caminho
// conhecido; a garantia de verdade é aqui, porque a callable também é
// chamável direto, sem tela nenhuma.
//
// POR QUE UM DOC SENTINELA E NÃO UMA QUERY (Kleppmann · DDIA §7.2.4
// "materializing conflicts"): a pergunta "existe OUTRO pedido PIX vivo deste
// comprador neste evento?" é sobre docs que a transação NÃO leu — o caso
// clássico de phantom read. Duas requisições concorrentes com chaves de
// idempotência distintas criam pedidos DIFERENTES, então não há um documento
// em comum para o Firestore serializar, e as duas passariam. A sentinela
// `cobrancasPixAtivas/{uid}__{eventoId}__{hash do carrinho}` é esse documento
// em comum (o hash faz parte da chave — ver ESCOPO abaixo): as duas
// transações LEEM a mesma chave determinística, o Firestore serializa o
// conflito, a segunda relê e encontra a primeira. Custo: 1 doc read no
// caminho feliz (contra query + índice composto, cujo phantom-locking eu não
// quero que sustente uma garantia de dinheiro).
//
// A sentinela é um PONTEIRO, não um cadeado: ninguém precisa liberá-la. O
// veredito é sempre relido dos docs apontados (pedido + pagamento + prazo),
// então ponteiro para cobrança morta/paga/cancelada não bloqueia nada e é
// simplesmente sobrescrito pela cobrança seguinte. Nada a expirar, nada a
// varrer, nenhum job de limpeza.
//
// ESCOPO DA CHAVE — (comprador, evento, CARRINHO), não (comprador, evento).
// O defeito que a review provou é "duas cobranças vivas para A MESMA
// compra": o botão "Gerar nova cobrança" recomeça com o carrinho INTACTO
// (mesmos atletas, mesmas modalidades, mesmo kit, mesmo cupom), então a
// segunda cobrança é o MESMO carrinho — e é exatamente isso que a chave
// pega. Travar por (comprador, evento) barraria também a compradora que
// volta ao checkout para inscrever OUTRA pessoa enquanto o próprio PIX
// ainda não venceu: isso não é cobrança duplicada, é uma segunda compra —
// proibi-la seria política NOVA de produto, que esta lane não tem mandato
// para inventar (a fronteira está registrada no report).
//
// PII (RN-172/173): o carrinho contém CPF, e CPF tem espaço pequeno o
// bastante para força bruta — o componente vai HMAC-SHA256 com o MESMO
// pepper de ops do CRM (`CRM_ID_PEPPER`), em domínio de mensagem próprio,
// REUSANDO a disciplina do `pessoaDocIdDoCpf`. Nenhum dado pessoal em path.
//
// ESCRITA/LEITURA EXCLUSIVAS de Function (Admin SDK) — a coleção cai no
// deny-by-default do firestore.rules e NÃO deve ser aberta para client SDK:
// leitura daria a um sondador o mapa das cobranças abertas de terceiros;
// escrita permitiria forjar/derrubar a própria trava.
//
// ── PIX-CARRINHO-T1 · A TRAVA NÃO SOLTA MAIS PELO RELÓGIO ───────────────────
// (item 25 da rodada DEC-0726B, opção (b) ratificada pelo Vitor · fecha o
// achado A1 da review antagonista S1209-PIXREV.)
//
// O defeito era um desacordo de definição entre duas lanes irmãs: para o T3
// (`expirarPixPendente`) uma cobrança só morre quando o GATEWAY confirma;
// para o T2 (esta trava) ela morria quando o RELÓGIO passava. Com o gateway
// recusando o cancelamento, o pedido seguia pendente e a cobrança seguia
// pagável — e a trava, olhando só o prazo, deixava nascer a segunda. Duas
// cobranças vivas do mesmo carrinho: exatamente o que ela existe para
// impedir.
//
// Agora existe UMA definição de morta nas duas lanes — o gateway confirmou.
// A consequência é que "prazo vencido" deixa de ser saída e vira TAREFA: o
// caminho de criação encerra a anterior no gateway (`encerrarPixAnteriorNaCriacao`,
// que REUSA o `expirarPixPendenteCore` — nenhuma segunda máquina de
// cancelamento nasceu aqui) e só então deixa a nova nascer. Gateway recusou
// ⇒ a criação é NEGADA com motivo tipado próprio. Negativa honesta é melhor
// do que cobrança dupla, e ela NÃO cria denial of purchase permanente: cada
// nova tentativa de compra retenta o cancelamento, então o gateway voltando
// destrava sozinho, sem fiação nova de tela.
// =============================================================================

import { createHmac } from 'node:crypto';
import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO,
  MOTIVO_PIX_PENDENTE_ATIVO,
  normalizarCodigoCupom,
  normalizarCpf,
  type PaymentProvider,
} from '@leela/core';
import { crmIdPepper } from '../crm/agregarClientes';
import { expirarPixPendenteCore } from './expirarPixPendente';

type Db = admin.firestore.Firestore;
type Tx = admin.firestore.Transaction;
type Snap = admin.firestore.DocumentSnapshot;
type Ref = admin.firestore.DocumentReference;
/** Leitor de doc — `tx.get` na transação, `ref.get()` no pré-voo. */
type Ler = (ref: Ref) => Promise<Snap>;

/** Coleção da sentinela — Function-only (deny-by-default nas Rules). */
export const COLECAO_TRAVA_PIX = 'cobrancasPixAtivas';

/**
 * Motivo TIPADO devolvido em `details` do HttpsError quando a trava recusa a
 * cobrança — REEXPORTADO do core, que é onde mora o contrato servidor↔cliente
 * (a UI reconhece a mesma constante). Nunca redeclarar aqui.
 */
export { MOTIVO_PIX_PENDENTE_ATIVO, MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO };

/** Mensagem ao comprador — diz o que houve E o que fazer. */
export const MSG_PIX_PENDENTE_ATIVO =
  'Já existe uma cobrança PIX aberta e dentro do prazo para este evento. ' +
  'Pague o código atual ou aguarde o prazo terminar para gerar outro — ' +
  'duas cobranças abertas ao mesmo tempo cobrariam você duas vezes.';

/**
 * Mensagem da NEGATIVA HONESTA do T1: o prazo da anterior passou, mas o
 * provedor não confirmou o encerramento dela. Diz a verdade literal (o
 * código antigo ainda pode ser aceito pelo banco) e a única saída segura
 * (esperar, nunca abrir outra).
 */
export const MSG_PIX_ANTERIOR_NAO_ENCERRADO =
  'A cobrança PIX anterior venceu, mas não conseguimos encerrá-la no ' +
  'provedor de pagamento — ela ainda pode ser aceita pelo seu banco. Tente ' +
  'de novo em alguns instantes: não vamos abrir uma segunda cobrança por ' +
  'cima da primeira, porque isso cobraria você duas vezes.';

/**
 * O que define "a MESMA compra" para a trava — o subconjunto do input que
 * identifica O QUE está sendo comprado.
 *
 * DENTRO: quem corre (CPF), o que cada um corre (modalidade), qual kit e o
 * cupom — é o que a tela repete intacto quando o comprador pede "gerar nova
 * cobrança", e é o que define o preço.
 *
 * FORA de propósito: nome, e-mail, telefone, nascimento, gênero, endereço e
 * tamanhos. São dados de contato/fulfillment, não identidade da compra —
 * incluí-los deixaria qualquer correção de digitação (um tamanho, um
 * sobrenome) abrir uma segunda cobrança viva, que é exatamente o buraco.
 */
export interface CarrinhoParaTrava {
  eventoId: string;
  inscritos: readonly { cpf: string; modalidade: string; kitId?: string }[];
  cupomCodigo?: string;
}

/**
 * Impressão digital do carrinho — HMAC-SHA256(pepper) truncado, docId-safe.
 *
 * Os inscritos são ORDENADOS antes do hash: trocar a ordem dos atletas no
 * formulário é o mesmo carrinho, e sem a ordenação seria um atalho trivial
 * para escapar da trava. @pure-ish (lê o pepper do ambiente)
 */
export function impressaoDoCarrinho(carrinho: CarrinhoParaTrava): string {
  const linhas = carrinho.inscritos
    .map(
      (i) =>
        `${normalizarCpf(i.cpf)}|${i.modalidade}|${
          typeof i.kitId === 'string' && i.kitId.length > 0 ? i.kitId : '-'
        }`
    )
    .sort();
  const cupom =
    typeof carrinho.cupomCodigo === 'string' && carrinho.cupomCodigo.length > 0
      ? normalizarCodigoCupom(carrinho.cupomCodigo)
      : '-';
  return createHmac('sha256', crmIdPepper())
    .update(`carrinho:pix:${carrinho.eventoId}:${cupom}:${linhas.join(';')}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Chave determinística da sentinela: comprador × evento × carrinho. Os
 * componentes são docId-safe (uid do Firebase, slug do evento, hex do
 * HMAC) e o separador `__` não colide com eles. @pure-ish
 */
export function docIdTravaPix(
  uid: string,
  carrinho: CarrinhoParaTrava
): string {
  return `${uid}__${carrinho.eventoId}__${impressaoDoCarrinho(carrinho)}`;
}

/** Cobrança PIX viva encontrada pela trava (o que a recusa informa). */
export interface BloqueioPixAtivo {
  pedidoId: string;
  pagamentoId: string;
  pixExpiraEmMillis: number;
  /**
   * O prazo dela já passou pelo relógio do SERVIDOR? (PIX-CARRINHO-T1)
   *
   * `false` ⇒ o comprador tem um código VÁLIDO na mão: a saída é pagá-lo
   * (recusa `pix_pendente_ativo`, inalterada desde o T2 da PIXBE).
   *
   * `true` ⇒ o código venceu e MESMO ASSIM a trava segura, porque ninguém
   * confirmou a morte dele no gateway. Não é mais motivo de soltura: é
   * tarefa. O caminho de criação encerra a anterior antes de deixar a nova
   * nascer, e só nega se o gateway recusar.
   */
  prazoVencido: boolean;
}

/**
 * Avaliação da trava com um LEITOR injetado — `tx.get` dentro da transação
 * de criação, `ref.get()` no pré-voo que roda antes dela. A definição de
 * "vivo" é escrita UMA vez: dois leitores com dois vereditos foi exatamente
 * o defeito A1, e não vai renascer por duplicação de código aqui.
 *
 * "Vivo" (PIX-CARRINHO-T1) = os DOIS ao mesmo tempo:
 *   1. pedido apontado ainda `pendente` (pago/cancelado/falhou não bloqueia);
 *   2. pagamento apontado ainda `pendente` (webhook confirmando vence).
 *
 * O PRAZO deixou de ser condição de soltura e virou uma PROPRIEDADE do
 * bloqueio (`prazoVencido`): cobrança vencida que ninguém confirmou morta
 * no gateway continua PAGÁVEL pelo banco do comprador, e deixar a próxima
 * nascer por cima dela é a cobrança dupla do achado A1.
 *
 * Qualquer condição faltando ⇒ `null` (a venda segue): a trava protege
 * contra cobrança DUPLICADA, nunca contra a primeira cobrança.
 */
async function avaliarTravaPix(
  db: Db,
  ler: Ler,
  uid: string,
  carrinho: CarrinhoParaTrava,
  agoraMs: number
): Promise<{ ref: Ref; bloqueio: BloqueioPixAtivo | null }> {
  const ref = db.collection(COLECAO_TRAVA_PIX).doc(docIdTravaPix(uid, carrinho));
  const snap = await ler(ref);
  if (!snap.exists) return { ref, bloqueio: null };

  const pedidoId = snap.get('pedidoId') as unknown;
  const pagamentoId = snap.get('pagamentoId') as unknown;
  if (typeof pedidoId !== 'string' || typeof pagamentoId !== 'string') {
    // Sentinela torta (dado corrompido) não pode BLOQUEAR venda — ela seria
    // um denial-of-service silencioso sobre o checkout. Fail-open: a próxima
    // gravação a conserta.
    return { ref, bloqueio: null };
  }

  const [pedidoSnap, pagamentoSnap] = await Promise.all([
    ler(db.collection('pedidos').doc(pedidoId)),
    ler(db.collection('pagamentos').doc(pagamentoId)),
  ]);
  if (!pedidoSnap.exists || !pagamentoSnap.exists) return { ref, bloqueio: null };
  if (pedidoSnap.get('status') !== 'pendente') return { ref, bloqueio: null };
  if (pagamentoSnap.get('status') !== 'pendente') return { ref, bloqueio: null };

  const pixExpiraEm = pagamentoSnap.get('pixExpiraEm') as
    | { toMillis?: () => number }
    | undefined;
  if (pixExpiraEm === undefined || typeof pixExpiraEm.toMillis !== 'function') {
    // Pagamento PIX SEM prazo (pedido anterior à RN-157). Fail-open
    // DELIBERADO mesmo depois do T1: sem `pixExpiraEm` o
    // `expirarPixPendenteCore` recusa encerrar ("cobrança sem expiração"),
    // então segurar aqui seria negar a compra para sempre, sem caminho de
    // saída. O universo é fechado (docs pré-RN-157, que não existem em
    // produção) e a alternativa é pior.
    return { ref, bloqueio: null };
  }
  const pixExpiraEmMillis = pixExpiraEm.toMillis();

  return {
    ref,
    bloqueio: {
      pedidoId,
      pagamentoId,
      pixExpiraEmMillis,
      prazoVencido: pixExpiraEmMillis <= agoraMs,
    },
  };
}

/**
 * LEITURA da trava DENTRO da transação de criação do pedido. Devolve o
 * `ref` da sentinela (para a escrita no fim da mesma tx) e o bloqueio, se
 * houver.
 *
 * ⚠️ Chamar na FASE DE LEITURA da transação (Firestore exige todo get antes
 * de qualquer write).
 */
export async function lerTravaPixNaTx(
  db: Db,
  tx: Tx,
  uid: string,
  carrinho: CarrinhoParaTrava,
  agoraMs: number
): Promise<{ ref: Ref; bloqueio: BloqueioPixAtivo | null }> {
  return avaliarTravaPix(db, (ref) => tx.get(ref), uid, carrinho, agoraMs);
}

/**
 * A MESMA leitura, fora de transação — insumo do pré-voo do T1. Não decide
 * nada sozinha: o veredito que cria pedido continua sendo o da tx (este
 * aqui pode envelhecer entre a leitura e ela, e é por isso que a tx relê).
 */
export async function lerTravaPixForaDaTx(
  db: Db,
  uid: string,
  carrinho: CarrinhoParaTrava,
  agoraMs: number
): Promise<{ ref: Ref; bloqueio: BloqueioPixAtivo | null }> {
  return avaliarTravaPix(db, (ref) => ref.get(), uid, carrinho, agoraMs);
}

/**
 * PRÉ-VOO DO T1 (item 25 · opção (b)) — encerra a cobrança PIX ANTERIOR no
 * gateway ANTES da transação que cria a nova.
 *
 * Roda só quando a sentinela aponta para uma cobrança pendente com o prazo
 * VENCIDO. Dentro do prazo nada acontece aqui: o comprador tem um código
 * válido na mão e a recusa `pix_pendente_ativo` continua sendo a resposta
 * (um único ponto de recusa, dentro da tx).
 *
 * REUSO, não máquina nova: o encerramento É o `expirarPixPendenteCore` —
 * mesma autorização (o dono é o próprio caller: a sentinela é chaveada pelo
 * uid dele), mesmo gate de relógio do servidor, mesma ordem gateway-primeiro
 * e o mesmo fail-safe do T3. O que muda é QUEM chama e QUANDO.
 *
 * FALHA DO GATEWAY ⇒ a criação é NEGADA (`failed-precondition` com motivo
 * tipado). A rede no caminho quente do dinheiro é o preço declarado desta
 * escolha — a alternativa era travar a venda até a confirmação, que exigiria
 * fiação nova de tela e produziria denial of purchase.
 *
 * CORRIDA: duas criações simultâneas podem chamar o encerramento ao mesmo
 * tempo. A segunda pode receber erro (do Firestore sob contenção ou do
 * gateway sobre uma cobrança já morta) — por isso o `catch` RELÊ o estado
 * antes de negar: se a anterior já morreu, quem morreu não importa.
 */
export async function encerrarPixAnteriorNaCriacao(
  db: Db,
  provider: PaymentProvider,
  uid: string,
  carrinho: CarrinhoParaTrava,
  agora: () => Date
): Promise<{ encerrado: boolean; pedidoId: string | null }> {
  const agoraMs = agora().getTime();
  const { bloqueio } = await lerTravaPixForaDaTx(db, uid, carrinho, agoraMs);
  if (bloqueio === null) return { encerrado: false, pedidoId: null };
  if (!bloqueio.prazoVencido) return { encerrado: false, pedidoId: null };

  try {
    await expirarPixPendenteCore(
      db,
      provider,
      { pedidoId: bloqueio.pedidoId },
      { uid },
      agora
    );
    return { encerrado: true, pedidoId: bloqueio.pedidoId };
  } catch (err) {
    // RELEITURA antes de negar: um concorrente pode ter encerrado a mesma
    // cobrança (AT-8 da review provou que a segunda chamada concorrente pode
    // levantar erro cru sobre um trabalho JÁ FEITO). Negar uma venda por
    // causa de um erro sobre algo que já aconteceu seria falso negativo.
    const { bloqueio: fresco } = await lerTravaPixForaDaTx(
      db,
      uid,
      carrinho,
      agora().getTime()
    );
    if (fresco === null) return { encerrado: true, pedidoId: bloqueio.pedidoId };

    logger.error('pix_anterior_nao_encerrado_na_criacao', {
      pedidoId: bloqueio.pedidoId,
      erro: err instanceof Error ? err.message : String(err),
    }); // sem PII
    throw new https.HttpsError(
      'failed-precondition',
      fresco.prazoVencido ? MSG_PIX_ANTERIOR_NAO_ENCERRADO : MSG_PIX_PENDENTE_ATIVO,
      {
        motivo: fresco.prazoVencido
          ? MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO
          : MOTIVO_PIX_PENDENTE_ATIVO,
        pedidoId: fresco.pedidoId,
        pixExpiraEmMillis: fresco.pixExpiraEmMillis,
      }
    );
  }
}

/**
 * ESCRITA da sentinela na MESMA transação que cria o pedido — a cobrança
 * nova passa a ser a apontada. Só faz sentido para PIX (é o único fluxo com
 * janela de validade em que duas cobranças coexistiriam).
 */
export function gravarTravaPixNaTx(
  tx: Tx,
  ref: admin.firestore.DocumentReference,
  dados: {
    eventoId: string;
    pedidoId: string;
    pagamentoId: string;
    pixExpiraEmMillis: number;
  }
): void {
  // Nada de PII no doc: o carrinho já viaja HASHEADO no docId, e o pedido
  // apontado tem o resto. `uid` também fica fora — está na chave.
  tx.set(ref, {
    eventoId: dados.eventoId,
    pedidoId: dados.pedidoId,
    pagamentoId: dados.pagamentoId,
    pixExpiraEmMillis: dados.pixExpiraEmMillis,
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}
