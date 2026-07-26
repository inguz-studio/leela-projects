// =============================================================================
// functions/src/checkout/carrinhoCheckout.ts
//
// O CARRINHO DE CHECKOUT como documento (LEELA-PIX-CARRINHO-T2 · RN-158 ·
// item 26 da rodada DEC-0726B).
//
// POR QUE UM DOC NOVO (e por que nenhum dos existentes servia). O prazo do
// carrinho corre ANTES de existir pedido: pela RN-158, "concluir" é
// justamente criar o pedido com a cobrança. Pedido, pagamento e sentinela da
// trava PIX só nascem NA conclusão — nenhum deles pode carregar o relógio de
// quem ainda não concluiu. O que se reusou foi a MECÂNICA, não a infra:
// varredura por cron no padrão ADR-015 (wrapper fino + `*Core` puro), estado
// terminal com escrita exclusiva de Function (decisão 17 / RN-136) e chave
// determinística de doc como ponto de serialização (a mesma disciplina da
// sentinela `cobrancasPixAtivas`).
//
// ONDE O CARRINHO ABRE. Na COTAÇÃO — a primeira vez que o servidor precifica
// aquele (comprador, evento). É o primeiro instante em que a plataforma sabe
// que existe um carrinho: nenhum evento de tela anterior a esse chega ao
// backend, e o território desta lane não inclui inventar um. O NÚCLEO da
// cotação continua READ-ONLY (a garantia declarada em
// cotarInscricaoCheckout.ts vale intacta: nenhum caminho de PREÇO escreve); a
// abertura é um passo separado e explícito, com função própria e teste
// próprio.
//
// ⚠️ FRONTEIRA DECLARADA (escalada no report, não escondida): quem chama
// `createInscricaoCharge` SEM ter cotado não tem carrinho, e o prazo não o
// alcança — o gate FALHA ABERTO nesse caso. Fechar isso significaria tornar a
// cotação obrigatória para comprar, que é política NOVA e esta lane não tem
// mandato para inventá-la. A tela sempre cota (o Resumo depende disso).
//
// PII: o doc guarda uid (na chave — precedente `cobrancasPixAtivas`), evento,
// tenant, estado e instantes. Nada de nome, CPF, e-mail ou conteúdo do
// carrinho.
//
// ESCRITA/LEITURA EXCLUSIVAS de Function (Admin SDK) — cai no deny-by-default
// do firestore.rules. Abrir para client SDK deixaria o comprador reabrir o
// próprio prazo (o timer viraria enfeite) e daria a um sondador o mapa dos
// carrinhos abertos de terceiros.
// =============================================================================

import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  CARRINHO_PRAZO_SEGUNDOS,
  MOTIVO_CARRINHO_EXPIRADO,
  carrinhoNoPrazo,
} from '@leela/core';

type Db = admin.firestore.Firestore;
type Tx = admin.firestore.Transaction;
type Ref = admin.firestore.DocumentReference;

/** Coleção do carrinho — Function-only (deny-by-default nas Rules). */
export const COLECAO_CARRINHOS = 'carrinhos';

/** Mensagem ao comprador — diz o que houve E o que fazer. */
export const MSG_CARRINHO_EXPIRADO =
  'Seu carrinho passou dos 15 minutos e foi cancelado — nenhuma cobrança foi ' +
  'criada e nada foi cobrado de você. Recarregue a página do checkout para ' +
  'recomeçar: os preços são recalculados no momento da compra.';

/**
 * Chave determinística: comprador × evento. Um carrinho vigente por par, por
 * construção — é o que dá sentido literal ao "não existem carrinhos
 * simultâneos" do item 26, sem precisar de query nem de índice para
 * descobrir qual é o carrinho da vez.
 */
export function docIdCarrinho(uid: string, eventoId: string): string {
  return `${uid}__${eventoId}`;
}

/** O carrinho vigente, do jeito que o gate de conclusão precisa vê-lo. */
export interface CarrinhoVigente {
  ciclo: number;
  status: string;
  abertoEmMillis: number;
  expiraEmMillis: number;
}

function lerCarrinhoDoSnap(
  snap: admin.firestore.DocumentSnapshot
): CarrinhoVigente | null {
  if (!snap.exists) return null;
  const status = snap.get('status') as unknown;
  const abertoEmMillis = snap.get('abertoEmMillis') as unknown;
  const expiraEmMillis = snap.get('expiraEmMillis') as unknown;
  const ciclo = snap.get('ciclo') as unknown;
  if (
    typeof status !== 'string' ||
    typeof abertoEmMillis !== 'number' ||
    typeof expiraEmMillis !== 'number' ||
    typeof ciclo !== 'number'
  ) {
    // Doc torto não pode NEGAR venda (mesma disciplina de fail-open da
    // sentinela do PIX): dado corrompido viraria denial of purchase, e a
    // próxima cotação reescreve o carrinho inteiro.
    return null;
  }
  return { ciclo, status, abertoEmMillis, expiraEmMillis };
}

/**
 * ABERTURA do carrinho na cotação (RN-158). Idempotente e SEM extensão de
 * prazo: cotar de novo dentro do prazo não move `expiraEmMillis` um
 * milissegundo — a mesma disciplina do replay do PIX, que recarimba o
 * `agora` mas nunca a expiração. Sem isso, mexer no cupom a cada 14 minutos
 * daria um carrinho eterno e o timer seria enfeite.
 *
 * Carrinho vencido (ou terminal) ⇒ abre um CICLO NOVO: quem volta depois
 * merece comprar, e expirar carrinho nunca é punição.
 *
 * Devolve o carrinho vigente, ou `null` quando o evento não existe (não se
 * inventa carrinho de evento inexistente — a cotação falha por conta dela).
 */
export async function abrirCarrinhoNaCotacao(
  db: Db,
  uid: string,
  eventoId: string,
  agoraMs: number
): Promise<CarrinhoVigente | null> {
  const ref = db.collection(COLECAO_CARRINHOS).doc(docIdCarrinho(uid, eventoId));
  return db.runTransaction(async (tx) => {
    const [snap, eventoSnap] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection('eventos').doc(eventoId)),
    ]);
    const vigente = lerCarrinhoDoSnap(snap);
    if (
      vigente !== null &&
      vigente.status === 'aberto' &&
      carrinhoNoPrazo(vigente.expiraEmMillis, agoraMs)
    ) {
      // Caminho de longe mais comum (toda cotação depois da primeira): uma
      // leitura, zero escritas, prazo intocado.
      return vigente;
    }
    if (!eventoSnap.exists) return null;
    const tenantId = (eventoSnap.get('tenantId') as string | undefined) ?? '';

    const ciclo = (vigente?.ciclo ?? 0) + 1;
    const novo: CarrinhoVigente = {
      ciclo,
      status: 'aberto',
      abertoEmMillis: agoraMs,
      expiraEmMillis: agoraMs + CARRINHO_PRAZO_SEGUNDOS * 1000,
    };
    tx.set(ref, {
      ...novo,
      eventoId,
      tenantId,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return novo;
  });
}

/**
 * LEITURA do carrinho DENTRO da transação que cria o pedido — chamar na fase
 * de leitura (Firestore exige todo get antes de qualquer write).
 */
export async function lerCarrinhoNaTx(
  db: Db,
  tx: Tx,
  uid: string,
  eventoId: string
): Promise<{ ref: Ref; carrinho: CarrinhoVigente | null }> {
  const ref = db.collection(COLECAO_CARRINHOS).doc(docIdCarrinho(uid, eventoId));
  const snap = await tx.get(ref);
  return { ref, carrinho: lerCarrinhoDoSnap(snap) };
}

/**
 * GATE DE CONCLUSÃO (RN-158) — a regra que faz o prazo valer alguma coisa.
 * Roda na transação de criação, contra o relógio do SERVIDOR: o carimbo do
 * cron pode atrasar, o veredito não.
 *
 * Recusa quando o carrinho existe e passou do prazo (ou já está terminal).
 * Aceita nos outros casos, incluindo:
 *
 *   - `concluido`: o prazo do carrinho já cumpriu o papel dele; daí em
 *     diante quem governa é a validade do MEIO (RN-157). A segunda cobrança
 *     legítima depois de o PIX vencer não pode ser barrada por um carrinho
 *     que concluiu — quem a limita é a trava do PIX, não este relógio.
 *   - ausente: fronteira declarada no cabeçalho (fail-open sem cotação).
 */
export function exigirCarrinhoNoPrazo(
  carrinho: CarrinhoVigente | null,
  agoraMs: number
): void {
  if (carrinho === null) return;
  if (carrinho.status === 'concluido') return;
  if (
    carrinho.status === 'aberto' &&
    carrinhoNoPrazo(carrinho.expiraEmMillis, agoraMs)
  ) {
    return;
  }
  throw new https.HttpsError('failed-precondition', MSG_CARRINHO_EXPIRADO, {
    motivo: MOTIVO_CARRINHO_EXPIRADO,
    expiraEmMillis: carrinho.expiraEmMillis,
  });
}

/**
 * CONCLUSÃO do carrinho, na MESMA tx que cria o pedido — atômico de
 * propósito: carrinho concluído sem pedido (ou pedido sem carrinho
 * concluído) seria estado que a visibilidade da fase 2 leria como um
 * abandono que não houve.
 */
export function concluirCarrinhoNaTx(
  tx: Tx,
  ref: Ref,
  dados: { pedidoId: string; concluidoEmMillis: number }
): void {
  tx.set(
    ref,
    {
      status: 'concluido',
      pedidoId: dados.pedidoId,
      concluidoEmMillis: dados.concluidoEmMillis,
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Abertura BEST-EFFORT para o wrapper da cotação: o carrinho é bookkeeping,
 * e uma falha nele não pode tirar do comprador o preço que ele pediu.
 * Falhou ⇒ log e segue (o gate de conclusão falha aberto sem carrinho, então
 * o pior caso é uma compra sem prazo — nunca uma venda perdida).
 */
export async function abrirCarrinhoBestEffort(
  db: Db,
  uid: string,
  eventoId: string,
  agoraMs: number
): Promise<void> {
  try {
    await abrirCarrinhoNaCotacao(db, uid, eventoId, agoraMs);
  } catch (err) {
    logger.error('carrinho_abertura_falhou', {
      eventoId,
      erro: err instanceof Error ? err.message : String(err),
    }); // sem PII
  }
}
