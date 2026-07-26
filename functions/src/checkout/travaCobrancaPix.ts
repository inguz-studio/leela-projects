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
// `cobrancasPixAtivas/{uid}__{eventoId}` é esse documento em comum: as duas
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
// =============================================================================

import { createHmac } from 'node:crypto';
import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MOTIVO_PIX_PENDENTE_ATIVO,
  normalizarCodigoCupom,
  normalizarCpf,
} from '@leela/core';
import { crmIdPepper } from '../crm/agregarClientes';

type Db = admin.firestore.Firestore;
type Tx = admin.firestore.Transaction;

/** Coleção da sentinela — Function-only (deny-by-default nas Rules). */
export const COLECAO_TRAVA_PIX = 'cobrancasPixAtivas';

/**
 * Motivo TIPADO devolvido em `details` do HttpsError quando a trava recusa a
 * cobrança — REEXPORTADO do core, que é onde mora o contrato servidor↔cliente
 * (a UI reconhece a mesma constante). Nunca redeclarar aqui.
 */
export { MOTIVO_PIX_PENDENTE_ATIVO };

/** Mensagem ao comprador — diz o que houve E o que fazer. */
export const MSG_PIX_PENDENTE_ATIVO =
  'Já existe uma cobrança PIX aberta e dentro do prazo para este evento. ' +
  'Pague o código atual ou aguarde o prazo terminar para gerar outro — ' +
  'duas cobranças abertas ao mesmo tempo cobrariam você duas vezes.';

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
}

/**
 * LEITURA da trava DENTRO da transação de criação do pedido. Devolve o
 * `ref` da sentinela (para a escrita no fim da mesma tx) e o bloqueio, se
 * houver.
 *
 * "Vivo" tem definição estreita de propósito — os TRÊS ao mesmo tempo:
 *   1. pedido apontado ainda `pendente` (pago/cancelado/falhou não bloqueia);
 *   2. pagamento apontado ainda `pendente` (webhook confirmando vence);
 *   3. `pixExpiraEm` no FUTURO pelo relógio do SERVIDOR (`agoraMs`) — depois
 *      do prazo a cobrança não é mais cobrável e não pode barrar a próxima,
 *      mesmo que ninguém tenha chamado `expirarPixPendente` ainda.
 *
 * Qualquer um faltando ⇒ `null` (a venda segue): a trava protege contra
 * cobrança DUPLICADA, nunca contra a primeira cobrança.
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
): Promise<{
  ref: admin.firestore.DocumentReference;
  bloqueio: BloqueioPixAtivo | null;
}> {
  const ref = db.collection(COLECAO_TRAVA_PIX).doc(docIdTravaPix(uid, carrinho));
  const snap = await tx.get(ref);
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
    tx.get(db.collection('pedidos').doc(pedidoId)),
    tx.get(db.collection('pagamentos').doc(pagamentoId)),
  ]);
  if (!pedidoSnap.exists || !pagamentoSnap.exists) return { ref, bloqueio: null };
  if (pedidoSnap.get('status') !== 'pendente') return { ref, bloqueio: null };
  if (pagamentoSnap.get('status') !== 'pendente') return { ref, bloqueio: null };

  const pixExpiraEm = pagamentoSnap.get('pixExpiraEm') as
    | { toMillis?: () => number }
    | undefined;
  if (pixExpiraEm === undefined || typeof pixExpiraEm.toMillis !== 'function') {
    // Pagamento PIX sem prazo (pedido anterior à RN-157): sem prazo não há
    // como afirmar que ainda vale — não bloqueia.
    return { ref, bloqueio: null };
  }
  const pixExpiraEmMillis = pixExpiraEm.toMillis();
  if (pixExpiraEmMillis <= agoraMs) return { ref, bloqueio: null };

  return { ref, bloqueio: { pedidoId, pagamentoId, pixExpiraEmMillis } };
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
