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
// ver saudeInscrito.ts).
//
// ÍNDICES — as DUAS queries daqui exigem declaração explícita, e a falta
// derruba o cron inteiro com `FAILED_PRECONDITION` (BUILD-EXPURGO ·
// 2026-08-05, depois de 8 execuções seguidas falhando em produção):
//   1. `eventos(status ASC, data ASC)` — composto, escopo COLLECTION, para a
//      varredura de eventos encerrados vencidos;
//   2. `saude.eventoId` — fieldOverride com escopo COLLECTION_GROUP, para as
//      duas `collectionGroup(SAUDE_SUBCOL).where('eventoId', ...)`.
// Ambos vivem em `firestore.indexes.json` e são provados por
// `__tests__/firestoreIndexes.contract.test.ts`. ⚠️ O Emulator NÃO cobra
// índice: nenhum teste de execução pega a falta, só o contrato sobre o
// arquivo — e só o deploy de índices prova o servidor.
//
// AUDITORIA SEM PII: loga contagens e ids de evento — NUNCA o conteúdo.
// O carimbo `saudeExpurgadaEm` no evento fecha o ciclo (prova de expurgo,
// e evita revarrer evento já expurgado a cada madrugada).
//
// FALHA NUNCA É SILENCIOSA: o wrapper transforma erro em INCIDENTE
// observável (`incidenteExpurgo.ts`) e RELANÇA — expurgo é obrigação legal,
// e cron de obrigação legal que falha calado é o defeito, não o sintoma.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { RETENCAO_SAUDE_DIAS_POS_EVENTO, SAUDE_SUBCOL } from '@leela/core';
import { registrarIncidenteExpurgo } from './incidenteExpurgo';

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

/**
 * Executa o expurgo e garante que a falha seja OBSERVÁVEL.
 *
 * Está separado do wrapper de cron de propósito: o `onRun` do pubsub v1 não é
 * chamável de teste sem `firebase-functions-test`, e o caminho de erro é
 * justamente o que precisa de prova. Aqui ele é uma função comum, testável
 * com um `db` que estoura.
 *
 * RELANÇA depois de registrar. Engolir o erro deixaria a execução VERDE no
 * Cloud Scheduler, que é exatamente o defeito que este conserto ataca:
 * trocaríamos uma falha silenciosa por uma falha invisível.
 *
 * Progresso parcial não se perde: `expurgarSaudeCore` loga `saude_expurgada`
 * por evento ANTES de seguir, então um erro no meio da varredura deixa a
 * trilha do que já foi apagado no próprio log.
 */
export async function executarExpurgoSaude(
  db: Db,
  agora?: Date
): Promise<ExpurgarSaudeResult> {
  try {
    return await expurgarSaudeCore(db, agora);
  } catch (erro) {
    registrarIncidenteExpurgo('expurgo_saude_falhou', { tipo: 'saude', erro });
    throw erro;
  }
}

// ---------------------------------------------------------------------------
// Cron (ADR-015 — wrapper v1 fino; 03:20, escalonado após 03:00/03:05/03:10)
// ---------------------------------------------------------------------------

export const expurgarSaude = pubsub
  .schedule('every day 03:20')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const resultado = await executarExpurgoSaude(admin.firestore());
    logger.info('expurgo_saude_diario', { ...resultado });
    return null;
  });
