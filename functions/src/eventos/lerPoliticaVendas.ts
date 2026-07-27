// =============================================================================
// functions/src/eventos/lerPoliticaVendas.ts
//
// Leitura transacional da política de vendas do evento (E04-S305). Mora aqui,
// e não em `finance/requestRefund`, porque DOIS donos precisam dela e um deles
// é o primitivo de dinheiro: `estornarInscricao` (RN-351/352 — quanto da taxa
// volta) e a máquina de reembolso (RN-338/339/340 — para onde a solicitação
// vai). Importar uma da outra fecharia ciclo.
//
// Sem doc gravado, a LEI ainda vale: `politicaVendasPadrao()` (CDC Art. 49,
// 7 dias / corte 48h) — nunca "sem política = sem direito".
// =============================================================================

import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  parsePoliticaVendas,
  politicaVendasPadrao,
  POLITICA_VENDAS_DOC_ID,
  type PoliticaReembolso,
} from '@leela/core';

type Db = admin.firestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * Política COMPLETA do evento dentro da transação (fallback: defaults legais;
 * transferência/troca nascem DESLIGADAS).
 */
export async function lerPoliticaVendasTx(
  tx: Tx,
  db: Db,
  eventoId: string,
  tenantId: string
): Promise<ReturnType<typeof politicaVendasPadrao>> {
  const ref = db
    .collection('eventos')
    .doc(eventoId)
    .collection('politicaVendas')
    .doc(POLITICA_VENDAS_DOC_ID);
  const snap = await tx.get(ref);
  if (!snap.exists) {
    logger.info('politica_vendas_ausente_usando_default', { eventoId });
    return politicaVendasPadrao();
  }
  const data = snap.data() as Record<string, unknown>;
  // tenantId pode faltar em doc legado de seed antigo — injeta o do evento.
  return parsePoliticaVendas(POLITICA_VENDAS_DOC_ID, { tenantId, ...data });
}

/** Bloco de reembolso da política (RN-338/339/340/351/352). */
export async function lerPoliticaReembolsoTx(
  tx: Tx,
  db: Db,
  eventoId: string,
  tenantId: string
): Promise<PoliticaReembolso> {
  return (await lerPoliticaVendasTx(tx, db, eventoId, tenantId)).reembolso;
}
