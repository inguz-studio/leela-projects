// =============================================================================
// functions/src/eventos/guardPreco.ts
//
// Guard de servidor da RN-200 (LEELA-S201-T3 · E03): nenhuma Function que
// altere preço de evento/kit pode fazê-lo quando o evento já tem venda.
//
// Camadas da RN-200 (ver core/eventos/precoBloqueado.ts):
//   - escrita de CLIENTE em `kits.preco` → negada pela Security Rule
//     (precoEditavel em firestore.rules) — enforcement direto;
//   - escrita via FUNCTION (Admin SDK bypassa Rules) → DEVE passar por
//     `assertPrecoEditavel` antes de gravar (S206-T1/E04 consomem).
//
// Limitação registrada (não coberta pela RN-200 na V1): deletar um kit e
// recriá-lo com outro preço contorna a trava de update. Delete/create de
// kit seguem permitidos (RN-210: 0..N kits; contrato do S205-T1). O fluxo
// econômico real (lotes/checkout) chega no E04/E12 — revisar a trava lá.
// =============================================================================

import type * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import { podeAlterarPreco } from '@leela/core';

/**
 * Lança `failed-precondition` quando a mudança de preço proposta viola a
 * RN-200 (evento com ≥1 venda). Manter o mesmo preço nunca é bloqueado.
 *
 * @param db        Firestore Admin
 * @param eventoId  evento dono do preço (do próprio evento ou de um kit)
 * @param mudanca   preço atual e proposto
 */
export async function assertPrecoEditavel(
  db: admin.firestore.Firestore,
  eventoId: string,
  mudanca: { precoAtual: number; novoPreco: number }
): Promise<void> {
  const snap = await db.collection('eventos').doc(eventoId).get();
  if (!snap.exists) {
    throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
  }

  const qtdInscritos =
    typeof snap.get('qtdInscritos') === 'number' ? (snap.get('qtdInscritos') as number) : 0;

  if (!podeAlterarPreco({ qtdInscritos }, mudanca.precoAtual, mudanca.novoPreco)) {
    throw new https.HttpsError(
      'failed-precondition',
      `Evento '${eventoId}' já tem venda — preço bloqueado (RN-200).`
    );
  }
}
