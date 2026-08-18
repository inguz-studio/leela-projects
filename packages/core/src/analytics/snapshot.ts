// =============================================================================
// packages/core/src/analytics/snapshot.ts
//
// Snapshot diário de analytics do profissional (LEELA-S821-T1a · E11 ·
// Onda 2 T2-L1 — decisão 6: "coleta agora, telas na Onda 3").
//
// Doc: `profissionais/{profId}/analyticsSnapshots/{YYYY-MM-DD}` — cópia
// IMUTÁVEL do agregado `dashboard/current` que já existe (E02). A
// granularidade diária é a mais fina NÃO-reconstruível; mês/rolling-30d
// derivam dela depois (Onda 3). Histórico não é backfillável — por isso a
// coleta nasce antes de qualquer tela.
//
// LAYERING (decisão de brief #8):
//   - `AnalyticsSnapshot` (core) estende `OverviewKPIs` (core);
//   - `DashboardCurrent` (functions) NÃO é importável por core, e seu campo
//     `alerts` é estado de UI transitório (referencia slugs vivos de evento)
//     — NUNCA entra no histórico imutável. Quem extrai o subset OverviewKPIs
//     de um DashboardCurrent é a Function (coletaDiaria), não este módulo.
//
// ZERO RECÁLCULO: `montarSnapshot` copia campo a campo — nenhuma soma,
// nenhuma derivação. O snapshot é fiel ao agregado no instante da coleta;
// recalcular aqui abriria divergência silenciosa entre painel e histórico.
//
// Rules (firestore.rules): leitura só do dono (uid == profId) +
// platform_admin; escrita de cliente NEGADA (só Function/Admin SDK).
// Dias passados são imutáveis por construção: a coleta só escreve o doc do
// dia pedido, e o cliente não escreve nunca.
// =============================================================================

import type { OverviewKPIs } from '../overview/kpis';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * Snapshot diário dos KPIs do profissional — doc
 * `profissionais/{profId}/analyticsSnapshots/{data}`.
 *
 * Estende `OverviewKPIs` (nomes REAIS do contrato E02 — `inscricoesTotais`,
 * `membrosAtivosTotais`, `desafiosAtivosTotais`… — não os apelidos soltos
 * dos mocks). SEM `alerts` (UI transitória) e SEM `computadoEm` (o carimbo
 * do snapshot é `capturadoEm`).
 *
 * Campos de parceria/afiliação (`conversoesViaLink`, `gmvViaParcerias`)
 * ficam FORA até E12 gerar atribuição — o snapshot é aditivo e os
 * readiciona sem migração (corte registrado no brief T2-L1).
 */
export interface AnalyticsSnapshot extends OverviewKPIs {
  /** Dia civil do snapshot (YYYY-MM-DD, fuso America/Sao_Paulo) — docId. */
  data: string;
  /** Dono do histórico (`profissionais/{profId}`). */
  profId: string;
  /** Millis UTC do instante da coleta (carimbo do cron/rerun). */
  capturadoEm: number;
}

// ---------------------------------------------------------------------------
// Cópia campo a campo (fonte única da lista de campos)
// ---------------------------------------------------------------------------

/**
 * Lista canônica dos campos de `OverviewKPIs` copiados para o snapshot.
 * FONTE ÚNICA para `montarSnapshot` e para os testes de paridade de campo
 * (se `OverviewKPIs` ganhar campo novo, o teste de cobertura acusa a lista
 * desatualizada — atualizar AQUI, nunca espalhar spread).
 */
export const CAMPOS_KPI_SNAPSHOT = [
  'inscricoesTotais',
  'inscricoesTrendPct',
  'receitaConfirmada',
  'receitaTrendPct',
  'vagasRestantes',
  'eventoEmRisco',
  'taxaConversaoPct',
  'conversaoSparkline',
  'membrosAtivosTotais',
  'desafiosAtivosTotais',
  // S825-T1: a série por forma entra no histórico diário. O snapshot é o
  // único lugar onde "série financeira" vira série DE VERDADE (uma leitura
  // por dia civil) — deixá-la de fora seria guardar todo o resto do painel e
  // jogar fora justamente o campo que o dono pediu. `null` no dia em que o
  // agregado ainda não sabia fica registrado como null, e não como zero:
  // histórico que inventa zero é pior que histórico com buraco declarado.
  'formasPagamento',
] as const satisfies readonly (keyof OverviewKPIs)[];

/** Formato exigido do docId/dia do snapshot (YYYY-MM-DD). */
export function isDataSnapshotValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

/**
 * Monta o snapshot diário a partir dos KPIs canônicos.
 *
 * CÓPIA CAMPO A CAMPO deliberada (não `...kpis`): se o chamador passar um
 * objeto MAIOR que `OverviewKPIs` (ex.: um `DashboardCurrent`, que carrega
 * `alerts` + `computadoEm`), os campos extras NÃO vazam para o histórico.
 * Zero recálculo — nenhum número é derivado aqui.
 * @pure
 */
export function montarSnapshot(
  kpis: OverviewKPIs,
  profId: string,
  data: string,
  capturadoEm: number
): AnalyticsSnapshot {
  return {
    data,
    profId,
    capturadoEm,
    inscricoesTotais: kpis.inscricoesTotais,
    inscricoesTrendPct: kpis.inscricoesTrendPct,
    receitaConfirmada: kpis.receitaConfirmada,
    receitaTrendPct: kpis.receitaTrendPct,
    vagasRestantes: kpis.vagasRestantes,
    eventoEmRisco: kpis.eventoEmRisco
      ? { nome: kpis.eventoEmRisco.nome, slug: kpis.eventoEmRisco.slug }
      : null,
    taxaConversaoPct: kpis.taxaConversaoPct,
    conversaoSparkline: [...kpis.conversaoSparkline],
    membrosAtivosTotais: kpis.membrosAtivosTotais,
    desafiosAtivosTotais: kpis.desafiosAtivosTotais,
    // Cópia RASA das fatias (não a referência): o snapshot é imutável por
    // construção e não pode compartilhar array com o doc vivo do dashboard.
    formasPagamento: kpis.formasPagamento
      ? kpis.formasPagamento.map((f) => ({ ...f }))
      : null,
  };
}
