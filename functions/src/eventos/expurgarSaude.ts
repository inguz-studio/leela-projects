// =============================================================================
// functions/src/eventos/expurgarSaude.ts
//
// EXPURGO programado do dado de saúde (LEELA-S306-T3 · E04 · RN-147 ·
// LGPD Art. 11). Retenção = ciclo do evento + janela legal
// (`RETENCAO_SAUDE_DIAS_POS_EVENTO` = 90d, premissa alinhada à RN-144):
// evento ENCERRADO cuja data passou do corte ⇒ TODOS os docs
// `inscritos/{i}/saude/{current}` daquele evento são APAGADOS.
//
// PADRÃO ADR-015: núcleo puro/testável (Admin SDK, relógio INJETADO) +
// wrapper cron v1 fino (03:20 — escalonado após 03:00/03:05/03:10).
// Idempotente por natureza: expurgar de novo não encontra docs (delete de
// inexistente é no-op); evento sem exigência de saúde não tem docs.
//
// LOCALIZAÇÃO dos docs: collectionGroup('saude') filtrado por eventoId —
// cada doc de saúde é SELF-LOCATING (carrega tenantId/eventoId/inscritoId,
// ver saudeInscrito.ts). ⚠️ PENDÊNCIA OPERACIONAL (deploy): collectionGroup
// com filtro de igualdade exige habilitar o índice de collection group do
// campo `eventoId` no console/firestore.indexes.json — o Emulator não exige.
//
// AUDITORIA SEM PII: loga contagens e ids de evento — NUNCA o conteúdo.
// O carimbo `saudeExpurgadaEm` no evento fecha o ciclo (prova de expurgo,
// e evita revarrer evento já expurgado a cada madrugada).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { RETENCAO_SAUDE_DIAS_POS_EVENTO, SAUDE_SUBCOL } from '@leela/core';

type Db = admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;

export interface ExpurgarSaudeResult {
  eventosVarridos: number;
  eventosExpurgados: number;
  docsApagados: number;
}

/**
 * Núcleo testável (relógio injetado): varre eventos ENCERRADOS com data
 * anterior ao corte de retenção e SEM carimbo de expurgo, apaga os docs de
 * saúde e carimba `saudeExpurgadaEm`.
 */
export async function expurgarSaudeCore(
  db: Db,
  agora: Date = new Date()
): Promise<ExpurgarSaudeResult> {
  const corte = Timestamp.fromDate(
    new Date(agora.getTime() - RETENCAO_SAUDE_DIAS_POS_EVENTO * DIA_MS)
  );
  const eventos = await db
    .collection('eventos')
    .where('status', '==', 'encerrado')
    .where('data', '<', corte)
    .get();

  let eventosExpurgados = 0;
  let docsApagados = 0;

  for (const evento of eventos.docs) {
    // Review antagonista F2: o carimbo NÃO é skip cego — evento com carimbo
    // faz um probe limit(1): se um ciclo futuro (reabertura) coletou saúde
    // NOVA, ela é expurgada de novo (nunca retenção eterna); se está vazio,
    // segue barato (1 query indexada, zero delete).
    if (evento.get('saudeExpurgadaEm') != null) {
      const probe = await db
        .collectionGroup(SAUDE_SUBCOL)
        .where('eventoId', '==', evento.id)
        .limit(1)
        .get();
      if (probe.empty) continue; // já expurgado e sem dado novo
    }
    const saudeDocs = await db
      .collectionGroup(SAUDE_SUBCOL)
      .where('eventoId', '==', evento.id)
      .get();
    // Lotes de até 400 deletes + o carimbo no fim (limite de batch = 500).
    const refs = saudeDocs.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      for (const ref of refs.slice(i, i + 400)) batch.delete(ref);
      await batch.commit();
    }
    await evento.ref.update({ saudeExpurgadaEm: FieldValue.serverTimestamp() });
    eventosExpurgados++;
    docsApagados += refs.length;
    logger.info('saude_expurgada', {
      eventoId: evento.id,
      tenantId: evento.get('tenantId') as string,
      docsApagados: refs.length,
    });
  }

  return { eventosVarridos: eventos.size, eventosExpurgados, docsApagados };
}

// ---------------------------------------------------------------------------
// Cron (ADR-015 — wrapper v1 fino; 03:20, escalonado após 03:00/03:05/03:10)
// ---------------------------------------------------------------------------

export const expurgarSaude = pubsub
  .schedule('every day 03:20')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const resultado = await expurgarSaudeCore(admin.firestore());
    logger.info('expurgo_saude_diario', { ...resultado });
    return null;
  });
