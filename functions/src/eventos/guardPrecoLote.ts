// =============================================================================
// functions/src/eventos/guardPrecoLote.ts
//
// Guard de servidor da RN-200 para PREÇO DE LOTE (LEELA-S300-T2 · E04):
// evento com ≥1 venda ⇒ nenhuma Function/rotina admin muda preço de lote.
//
// Camadas da RN-200 no lote (defesa em profundidade — espelha guardPreco.ts):
//   1. UI (S300-T4): campo de preço desabilitado + aviso quando o evento já
//      tem venda (MSG_PRECO_BLOQUEADO);
//   2. Security Rules: `loteComercialImutavelSeVendido` congela preco/janela/
//      vaga/ordem/modalidade quando o PRÓPRIO lote tem `vendidos > 0`
//      (granularidade (modalidade, lote) — ADR-012);
//   3. Functions (AQUI): Admin SDK bypassa Rules — toda Function que altere
//      preço de lote DEVE passar por `assertPrecoLoteEditavel` antes de
//      gravar. Cobre também o buraco entre as camadas: a Rule per-lote não
//      vê venda de OUTRO lote do evento; o guard aplica o ∑ do EVENTO
//      (aceite S300-T2: "evento com venda ⇒ preço de lote imutável").
//
// Manter o MESMO preço nunca é bloqueado (updates de outros campos não podem
// ser reféns da trava — mesma semântica de `podeAlterarPreco`).
// =============================================================================

import type * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import { podeAlterarPreco } from '@leela/core';

/**
 * Lança `failed-precondition` quando a mudança de preço de LOTE proposta
 * viola a RN-200: evento com ≥1 venda (∑ `qtdInscritos`) OU lote com venda
 * própria (∑ `vendidos` > 0 — ADR-012). Mesmo preço nunca é bloqueado.
 *
 * @param db        Firestore Admin
 * @param eventoId  evento dono do lote
 * @param loteId    lote cujo preço se pretende alterar
 * @param novoPreco preço proposto (R$)
 */
export async function assertPrecoLoteEditavel(
  db: admin.firestore.Firestore,
  eventoId: string,
  loteId: string,
  novoPreco: number
): Promise<void> {
  const eventoRef = db.collection('eventos').doc(eventoId);
  const [eventoSnap, loteSnap] = await Promise.all([
    eventoRef.get(),
    eventoRef.collection('lotes').doc(loteId).get(),
  ]);

  if (!eventoSnap.exists) {
    throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
  }
  if (!loteSnap.exists) {
    throw new https.HttpsError(
      'not-found',
      `Lote '${loteId}' não existe no evento '${eventoId}'.`
    );
  }

  const precoAtual =
    typeof loteSnap.get('preco') === 'number' ? (loteSnap.get('preco') as number) : 0;
  if (novoPreco === precoAtual) return; // manter o preço nunca é bloqueado

  // Camada evento (aceite S300-T2): ∑ qtdInscritos > 0 ⇒ trava (RN-200).
  const qtdInscritos =
    typeof eventoSnap.get('qtdInscritos') === 'number'
      ? (eventoSnap.get('qtdInscritos') as number)
      : 0;
  if (!podeAlterarPreco({ qtdInscritos }, precoAtual, novoPreco)) {
    throw new https.HttpsError(
      'failed-precondition',
      `Evento '${eventoId}' já tem venda — preço de lote bloqueado (RN-200).`
    );
  }

  // Camada lote (ADR-012): venda do PRÓPRIO lote também trava — cobre o
  // intervalo entre a venda confirmada e a atualização do ∑ do evento.
  const vendidos =
    typeof loteSnap.get('vendidos') === 'number' ? (loteSnap.get('vendidos') as number) : 0;
  if (vendidos > 0) {
    throw new https.HttpsError(
      'failed-precondition',
      `Lote '${loteId}' já tem venda (${vendidos}) — preço bloqueado (RN-200/ADR-012).`
    );
  }
}
