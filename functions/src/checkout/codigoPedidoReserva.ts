// =============================================================================
// functions/src/checkout/codigoPedidoReserva.ts
//
// RESERVA do código curto da compra (LEELA-S1228-T1 · RN-474).
//
// O sorteio (`gerarCodigoPedido`, no core) não é unicidade. Quem garante é
// este módulo, contra uma CHAVE PRIMÁRIA: `pedidoCodigos/{codigo}`, lido e
// criado DENTRO da transação que já cria o pedido.
//
// POR QUE CHAVE PRIMÁRIA E NÃO QUERY (o mecanismo da `emitirIngressos`,
// copiado com a razão junto — `eventos/emitirIngressos.ts:34-44`): varrer os
// pedidos com uma query dentro da transação apostaria no bloqueio de FAIXA de
// índice, que é justamente a garantia que o Firestore NÃO promete para
// resultado vazio (phantom read). Documento lido por id, ele promete: a
// leitura de um doc inexistente entra no read-set da transação e o commit
// falha se alguém o criar no meio. `tx.create` (nunca `set`) é a segunda
// tranca: se outra transação reservou o mesmo código entre a leitura e o
// commit, este commit FALHA em vez de sobrescrever a reserva alheia — e o
// retry do Firestore re-executa o callback inteiro, sorteando de novo.
//
// O ESCOPO É GLOBAL, não por tenant nem por evento (decisão COD-3 da spec):
// o escopo da unicidade tem de casar com o escopo da conversa. O código do
// ingresso é único por EVENTO porque é ditado no balcão daquele evento — o
// evento é a sala. O código da compra é ditado no telefone, no chat e no
// e-mail, e a área do cliente lista as compras da pessoa ATRAVESSANDO
// produtoras: duas compras com o mesmo código na mesma lista é precisamente a
// falha que o código existe para não ter. Custo de escolher global: zero (é
// um documento nos dois desenhos, só muda o caminho).
//
// A coleção `pedidoCodigos` NÃO tem `match` em firestore.rules DE PROPÓSITO:
// cai no deny-by-default (`match /{document=**} { allow read, write: if false }`).
// Nenhum cliente lê (a compra carrega o próprio código no doc do pedido, que a
// RN-469 já autoriza por campo) e nenhum cliente escreve (escrever seria
// reservar o código de outra pessoa antes dela). O teste de Rules desta lane
// prova a negativa contra o arquivo real, sem editá-lo.
//
// ⚠️ A reserva NÃO é porta de leitura. Ela guarda `pedidoId` porque o backfill
// (S1228-T4) precisa distinguir "código livre" de "código que JÁ é deste
// pedido" para ser idempotente por comparação — não para servir de índice
// código→compra. Uma consulta cross-tenant por código é exatamente o ORÁCULO
// que a spec recusou (§"O formulário de estorno da plataforma fica como
// está"): ela responderia "existe"/"não existe" para qualquer palpite de cinco
// símbolos. Nenhuma superfície pode chegar aqui.
// =============================================================================

import * as admin from 'firebase-admin';
import { gerarCodigoPedido } from '@leela/core';

type Db = admin.firestore.Firestore;
type Tx = admin.firestore.Transaction;

/** Coleção ROOT de RESERVA do código da compra (server-only — ver cabeçalho). */
export const PEDIDO_CODIGOS_COL = 'pedidoCodigos';

/**
 * Tentativas de sorteio dentro de UMA passagem da transação antes de desistir.
 *
 * Com 28.629.151 combinações, a chance de um sorteio cair em código ocupado é
 * (compras / 28,6 milhões) — em dez mil compras, um re-sorteio a cada 2.900;
 * em um milhão, um a cada 29. A chance de ESGOTAR as oito é essa fração
 * elevada a oito: desprezível em qualquer volume que o Leela vá ver.
 *
 * O número é o mesmo da emissão do ingresso de propósito — mas a CONSEQUÊNCIA
 * é oposta, e é isso que importa aqui: lá, desistir de um inscrito e seguir é
 * melhor que travar o pedido; aqui, um pedido sem código é estado PROIBIDO
 * (RN-474), então esgotar as tentativas derruba a venda inteira sem escrever
 * nada. Se o motivo `sem_codigo_livre` aparecer em log alguma vez, o espaço
 * encolheu demais e a resposta é ACRESCENTAR UM SÍMBOLO, não aumentar este
 * teto (fronteira escrita na spec).
 */
export const TENTATIVAS_CODIGO_PEDIDO = 8;

/** Motivo NOMEADO da falha — o sintoma que pede revisão do comprimento. */
export const MOTIVO_SEM_CODIGO_PEDIDO_LIVRE = 'sem_codigo_livre';

/** Código sorteado + a referência da reserva que o segura. */
export interface ReservaCodigoPedido {
  /** Os cinco símbolos, sem prefixo — o que vai para o doc do pedido. */
  codigo: string;
  ref: admin.firestore.DocumentReference;
}

/**
 * FASE DE LEITURA — sorteia um código livre e devolve a reserva a gravar.
 *
 * Chamada DENTRO da transação da venda, antes de qualquer escrita (disciplina
 * de transação do Firestore: todas as leituras primeiro). Devolve `null`
 * quando as tentativas esgotam — o chamador decide, e o único desfecho
 * correto é abortar a venda.
 *
 * @param random RNG injetável — os testes forçam colisão com ele.
 */
export async function sortearCodigoPedidoNaTx(
  db: Db,
  tx: Tx,
  random: () => number = Math.random
): Promise<ReservaCodigoPedido | null> {
  const col = db.collection(PEDIDO_CODIGOS_COL);
  for (let i = 0; i < TENTATIVAS_CODIGO_PEDIDO; i++) {
    const candidato = gerarCodigoPedido(random);
    const ref = col.doc(candidato);
    const reservado = await tx.get(ref);
    if (!reservado.exists) return { codigo: candidato, ref };
  }
  return null;
}

/**
 * FASE DE ESCRITA — grava a reserva na MESMA transação que cria o pedido.
 *
 * `create` e não `set`: reserva alheia nunca é sobrescrita — o commit falha e
 * o retry sorteia de novo. É o que torna "pedido sem código" e "código sem
 * pedido" estados irrepresentáveis: os dois docs nascem no mesmo commit ou
 * nenhum nasce.
 *
 * Sem PII: o doc guarda só o `pedidoId` (que o backfill compara) e o carimbo.
 */
export function gravarReservaCodigoPedidoNaTx(
  tx: Tx,
  reserva: ReservaCodigoPedido,
  pedidoId: string
): void {
  tx.create(reserva.ref, {
    pedidoId,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
}
