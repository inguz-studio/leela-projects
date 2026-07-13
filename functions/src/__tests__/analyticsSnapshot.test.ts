/**
 * analyticsSnapshot.test.ts — LEELA-S821-T1a (E11 · Onda 2 T2-L1)
 *
 * Unit PURO (sem Emulator): `montarSnapshot` é cópia campo a campo de
 * `OverviewKPIs` — ZERO recálculo, ZERO vazamento de campos extras.
 *
 * Aceites do brief cobertos aqui:
 *   - montarSnapshot(kpis,'marina','2026-07-04') → data/profId corretos e os
 *     MESMOS números de kpis campo a campo (todos os campos de OverviewKPIs);
 *   - `alerts` NÃO aparece no resultado (nem quando o input é um
 *     DashboardCurrent-like com alerts+computadoEm);
 *   - CAMPOS_KPI_SNAPSHOT cobre exatamente as chaves de OverviewKPIs
 *     (guarda de paridade: campo novo em OverviewKPIs quebra ESTE teste,
 *     não silenciosamente o histórico).
 */
import { describe, expect, it } from 'vitest';
import {
  CAMPOS_KPI_SNAPSHOT,
  isDataSnapshotValida,
  montarSnapshot,
  type OverviewKPIs,
} from '@leela/core';

const KPIS: OverviewKPIs = {
  inscricoesTotais: 1284,
  inscricoesTrendPct: 12.5,
  receitaConfirmada: 142280,
  receitaTrendPct: null,
  vagasRestantes: 47,
  eventoEmRisco: { nome: 'Meia Maratona Floripa', slug: 'meia-floripa-2026' },
  taxaConversaoPct: null,
  conversaoSparkline: [],
  membrosAtivosTotais: 120,
  desafiosAtivosTotais: 3,
};

const CAPTURADO_EM = new Date('2026-07-04T06:05:00Z').getTime();

describe('montarSnapshot — cópia fiel (S821-T1a)', () => {
  it('copia TODOS os campos de OverviewKPIs campo a campo (zero recálculo)', () => {
    const snap = montarSnapshot(KPIS, 'uid-marina-castelo', '2026-07-04', CAPTURADO_EM);

    expect(snap.data).toBe('2026-07-04');
    expect(snap.profId).toBe('uid-marina-castelo');
    expect(snap.capturadoEm).toBe(CAPTURADO_EM);

    // Paridade campo a campo — itera a lista canônica (fonte única)
    for (const campo of CAMPOS_KPI_SNAPSHOT) {
      expect(snap[campo], `campo ${campo}`).toEqual(KPIS[campo]);
    }
  });

  it('CAMPOS_KPI_SNAPSHOT cobre exatamente as chaves de OverviewKPIs (guarda de paridade)', () => {
    // Se OverviewKPIs ganhar campo novo, o literal KPIS acima (tipado) é
    // obrigado a declará-lo — e esta asserção acusa a lista desatualizada.
    expect([...CAMPOS_KPI_SNAPSHOT].sort()).toEqual(Object.keys(KPIS).sort());
  });

  it('NÃO vaza campos extras (alerts/computadoEm de um DashboardCurrent-like)', () => {
    const dashboardLike = {
      ...KPIS,
      alerts: [{ tipo: 'ocupacao', slug: 'meia-floripa-2026' }],
      computadoEm: 1234567890,
    };
    const snap = montarSnapshot(dashboardLike, 'uid-marina-castelo', '2026-07-04', CAPTURADO_EM);

    expect('alerts' in snap).toBe(false);
    expect('computadoEm' in snap).toBe(false);
    // Só as chaves do contrato: KPIs + data/profId/capturadoEm
    expect(Object.keys(snap).sort()).toEqual(
      [...CAMPOS_KPI_SNAPSHOT, 'data', 'profId', 'capturadoEm'].sort()
    );
  });

  it('eventoEmRisco null é copiado como null (não inventa risco)', () => {
    const snap = montarSnapshot(
      { ...KPIS, eventoEmRisco: null },
      'uid-marina-castelo',
      '2026-07-04',
      CAPTURADO_EM
    );
    expect(snap.eventoEmRisco).toBeNull();
  });

  it('conversaoSparkline é cópia defensiva (mutação do input não afeta o snapshot)', () => {
    const kpis = { ...KPIS, conversaoSparkline: [1, 2, 3] };
    const snap = montarSnapshot(kpis, 'uid-marina-castelo', '2026-07-04', CAPTURADO_EM);
    kpis.conversaoSparkline.push(99);
    expect(snap.conversaoSparkline).toEqual([1, 2, 3]);
  });
});

describe('isDataSnapshotValida — formato YYYY-MM-DD', () => {
  it('aceita datas reais e rejeita formato/valor inválido', () => {
    expect(isDataSnapshotValida('2026-07-04')).toBe(true);
    expect(isDataSnapshotValida('2026-7-4')).toBe(false);
    expect(isDataSnapshotValida('2026-13-01')).toBe(false);
    expect(isDataSnapshotValida('2026-02-30')).toBe(false);
    expect(isDataSnapshotValida('hoje')).toBe(false);
  });
});
