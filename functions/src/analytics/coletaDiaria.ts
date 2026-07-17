// =============================================================================
// functions/src/analytics/coletaDiaria.ts
//
// Cron de COLETA DIÁRIA de snapshots de analytics (LEELA-S821-T1b · E11 ·
// Onda 2 T2-L1 · decisão 6: histórico não é backfillável — coleta primeiro,
// telas na Onda 3).
//
// PADRÃO ADR-015 (formalizado neste lote — precedente recalcularStatusMembros):
//   - wrapper v1 `pubsub.schedule(...).timeZone('America/Sao_Paulo').onRun()`;
//   - núcleo `*Core(db, …)` separado e testável no Emulator SEM o scheduler
//     (o Emulator --only firestore,auth NÃO sobe pubsub — o cron nunca
//     dispara sozinho no CI; testa-se chamando o Core direto);
//   - horários ESCALONADOS por dependência: 03:00 recalcularStatusMembros
//     (envelhecimento RN-102) → 03:05 coletaDiaria (ESTE — lê
//     membros.status/qtdMembrosAtivos JÁ reprocessados) → 03:10
//     encerrarEventos. A ordem é aceite, não detalhe.
//
// O QUE COLETA: para cada profissional, o doc `dashboard/current`
// (DashboardCurrent — E02). ESTE é o único ponto que toca DashboardCurrent:
// extrai o subset OverviewKPIs (descartando `alerts`/`computadoEm` — UI
// transitória fica fora do histórico) e grava
// `profissionais/{profId}/analyticsSnapshots/{YYYY-MM-DD}` via
// montarSnapshot (@leela/core — cópia campo a campo, zero recálculo).
//
// IDEMPOTENTE: escrita por SUBSTITUIÇÃO TOTAL (set sem merge). Rerun do
// mesmo dia com o mesmo estado ⇒ doc idêntico. NUNCA toca dias passados —
// só o doc `{data}` pedido é escrito.
//
// STALE/AUSENTE: se `dashboard/current` não existe ou está velho
// (computadoEm além de DASHBOARD_STALE_MS), recomputa via
// recomputeProfessionalDashboard ANTES de snapshotar (custo aceitável no
// cron noturno — mesma política do getOverview).
//
// BIGQUERY (nota de brief — SEM build de pipeline nesta onda): o hook
// exportSnapshotBigQuery fica atrás da flag de ambiente
// LEELA_BQ_EXPORT (DESLIGADA por padrão). Dataset será modelado em fase
// posterior; nenhum SDK BigQuery entra agora.
// =============================================================================

import * as admin from 'firebase-admin';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  dataLocalISO,
  FUSO_EVENTO,
  montarSnapshot,
  type AnalyticsSnapshot,
  type OverviewKPIs,
} from '@leela/core';
import {
  DASHBOARD_STALE_MS,
  recomputeProfessionalDashboard,
  type DashboardCurrent,
} from '../overview/aggregateProfessionalDashboard';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Flag BigQuery (desligada por padrão — nota do brief T2-L1)
// ---------------------------------------------------------------------------

/** Nome da flag de ambiente que liga o export BigQuery (futuro). */
export const BQ_EXPORT_FLAG = 'LEELA_BQ_EXPORT';

/** Export BigQuery ativo? Lida em runtime (testável ligando/desligando env). */
export function bigQueryExportAtivo(): boolean {
  return process.env[BQ_EXPORT_FLAG] === 'true';
}

/**
 * Hook de export do snapshot para BigQuery — PLACEHOLDER deliberado.
 * Dataset/streaming insert serão modelados em fase posterior (Onda 3+);
 * nesta onda NENHUM SDK BigQuery entra no bundle. O Core só o chama quando
 * a flag LEELA_BQ_EXPORT estiver ligada (hoje: desligada em todo ambiente).
 */
export async function exportSnapshotBigQuery(
  snapshot: AnalyticsSnapshot
): Promise<void> {
  // Intencionalmente vazio além do log: a assinatura é o contrato estável
  // para quando o dataset existir. Não implementar aqui sem ADR próprio.
  logger.info('bq_export_stub', { profId: snapshot.profId, data: snapshot.data });
}

/** Assinatura injetável do exportador (spy nos testes). */
export type ExportadorSnapshot = (snapshot: AnalyticsSnapshot) => Promise<void>;

// ---------------------------------------------------------------------------
// Núcleo (ADR-015 — testável no Emulator via Admin SDK, sem scheduler)
// ---------------------------------------------------------------------------

/** Resultado da coleta (observabilidade + asserções de teste). */
export interface ResultadoColetaDiaria {
  /** Dia civil coletado (YYYY-MM-DD — docId dos snapshots). */
  data: string;
  /** Profissionais varridos (docs e "pais fantasma" com subcoleção). */
  profissionais: number;
  /** Snapshots gravados nesta execução (= profissionais, salvo erro). */
  snapshots: number;
  /** Dashboards recomputados por estarem ausentes/stale. */
  recomputados: number;
  /** Exports BigQuery disparados (0 com a flag desligada). */
  exportados: number;
}

/** Extrai o subset OverviewKPIs de um DashboardCurrent (descarta alerts). */
function kpisDoDashboard(current: DashboardCurrent): OverviewKPIs {
  return {
    inscricoesTotais: current.inscricoesTotais,
    inscricoesTrendPct: current.inscricoesTrendPct,
    receitaConfirmada: current.receitaConfirmada,
    receitaTrendPct: current.receitaTrendPct,
    vagasRestantes: current.vagasRestantes,
    eventoEmRisco: current.eventoEmRisco,
    taxaConversaoPct: current.taxaConversaoPct,
    conversaoSparkline: current.conversaoSparkline,
    membrosAtivosTotais: current.membrosAtivosTotais,
    desafiosAtivosTotais: current.desafiosAtivosTotais,
  };
}

/**
 * Descobre os profissionais a snapshotar — UNIÃO de três fontes:
 *   1. `profissionais/*` via listDocuments() (inclui "pai fantasma": doc
 *      ausente com subcoleção dashboard — `.get()` de coleção não os vê);
 *   2. `eventos.organizadorId` distintos (E03);
 *   3. `clubes.ownerId` distintos (E05).
 * As fontes 2/3 cobrem o caso do brief "profissional nunca teve write de
 * dashboard" — o Core recomputa antes de snapshotar. Varredura completa é
 * aceitável no cron noturno (o recompute E02 já varre por profissional).
 */
async function descobrirProfissionais(db: Db): Promise<string[]> {
  const [profRefs, eventosSnap, clubesSnap] = await Promise.all([
    db.collection('profissionais').listDocuments(),
    db.collection('eventos').select('organizadorId').get(),
    db.collection('clubes').select('ownerId').get(),
  ]);

  const ids = new Set<string>();
  for (const ref of profRefs) ids.add(ref.id);
  for (const doc of eventosSnap.docs) {
    const id = doc.get('organizadorId') as unknown;
    if (typeof id === 'string' && id.length > 0) ids.add(id);
  }
  for (const doc of clubesSnap.docs) {
    const id = doc.get('ownerId') as unknown;
    if (typeof id === 'string' && id.length > 0) ids.add(id);
  }
  return [...ids].sort(); // ordem determinística (idempotência observável)
}

/**
 * Coleta o snapshot diário de TODOS os profissionais.
 *
 * - `data` (YYYY-MM-DD) nomeia o doc — default: dia civil de `agora` no
 *   FUSO_EVENTO (às 03:05 do dia D, grava o doc do dia D — estado após o
 *   envelhecimento das 03:00);
 * - substituição total do doc do dia; dias passados NUNCA são tocados.
 */
export async function coletarSnapshotsDiariosCore(
  db: Db,
  data?: string,
  agora: Date = new Date(),
  exportador: ExportadorSnapshot = exportSnapshotBigQuery
): Promise<ResultadoColetaDiaria> {
  const dia = data ?? dataLocalISO(agora, FUSO_EVENTO);

  const profIds = await descobrirProfissionais(db);

  let snapshots = 0;
  let recomputados = 0;
  let exportados = 0;

  for (const profId of profIds) {
    const profRef = db.collection('profissionais').doc(profId);

    // dashboard/current fresco? senão recomputa (política do getOverview)
    const dashSnap = await profRef.collection('dashboard').doc('current').get();
    let current: DashboardCurrent;
    const computadoEm = dashSnap.get('computadoEm') as unknown;
    if (
      dashSnap.exists &&
      typeof computadoEm === 'number' &&
      agora.getTime() - computadoEm < DASHBOARD_STALE_MS
    ) {
      current = dashSnap.data() as DashboardCurrent;
    } else {
      current = await recomputeProfessionalDashboard(db, profId, agora);
      recomputados++;
    }

    const snapshot = montarSnapshot(
      kpisDoDashboard(current),
      profId,
      dia,
      agora.getTime()
    );

    // SUBSTITUIÇÃO TOTAL (set sem merge) — rerun do dia = mesmo conteúdo;
    // nenhum outro dia é tocado (imutabilidade do passado por construção).
    await profRef.collection('analyticsSnapshots').doc(dia).set(snapshot);
    snapshots++;

    if (bigQueryExportAtivo()) {
      await exportador(snapshot);
      exportados++;
    }
  }

  return {
    data: dia,
    profissionais: profIds.length,
    snapshots,
    recomputados,
    exportados,
  };
}

// ---------------------------------------------------------------------------
// Cron (ADR-015 — wrapper v1 fino; 03:05, escalonado após o 03:00 do RN-102)
// ---------------------------------------------------------------------------

export const coletaDiaria = pubsub
  .schedule('every day 03:05')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const resultado = await coletarSnapshotsDiariosCore(admin.firestore());
    logger.info('coleta_diaria_analytics', { ...resultado });
    return null;
  });
