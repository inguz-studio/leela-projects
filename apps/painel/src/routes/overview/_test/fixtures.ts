// Fixtures da Visão Geral (não é .test → não coletado pelo vitest).
import type { OverviewKPIs, OverviewAlert, Timestamp } from '@leela/core';
import type { EventoAtivoInput } from '../_lib/activeEvents';
import type { EventoCountdownInput } from '../_lib/countdown';
import type { InscricaoRecenteInput } from '../_lib/recentRegistrations';

/** Timestamp portátil fake (superfície toDate/toMillis do core). */
export function ts(date: Date): Timestamp {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

/** KPIs canônicos do aceite (1.284 / R$ 142.280 / 47 vagas / 68,2%). */
export function mkKpis(over: Partial<OverviewKPIs> = {}): OverviewKPIs {
  return {
    inscricoesTotais: 1284,
    inscricoesTrendPct: 12.5,
    receitaConfirmada: 142280,
    receitaTrendPct: null,
    vagasRestantes: 47,
    eventoEmRisco: { nome: 'Meia Maratona Floripa', slug: 'meia-floripa-2026' },
    taxaConversaoPct: 68.2,
    conversaoSparkline: [],
    membrosAtivosTotais: 0,
    desafiosAtivosTotais: 0,
    ...over,
  };
}

export function mkAlert(over: Partial<OverviewAlert> = {}): OverviewAlert {
  return {
    id: over.id ?? 'ocupacao-meia-floripa-2026',
    severidade: over.severidade ?? 'warn',
    titulo: over.titulo ?? 'Meia Maratona Floripa está com 90% das vagas preenchidas',
    quando: over.quando ?? 'há 2h',
    em: over.em ?? '2026-04-19T09:00:00.000Z',
    ...over,
  };
}

export function mkEventoAtivo(over: Partial<EventoAtivoInput> = {}): EventoAtivoInput {
  return {
    nome: 'Meia Maratona Floripa 2026',
    slug: 'meia-floripa-2026',
    status: 'publicado',
    qtdInscritos: 453,
    capacidade: 500,
    ...over,
  };
}

export function mkEventoCountdown(over: Partial<EventoCountdownInput> = {}): EventoCountdownInput {
  return {
    nome: 'Meia Maratona Floripa 2026',
    slug: 'meia-floripa-2026',
    status: 'publicado',
    data: ts(new Date('2026-04-27T09:00:00Z')),
    qtdInscritos: 453,
    capacidade: 500,
    ...over,
  };
}

export function mkInscricao(over: Partial<InscricaoRecenteInput> = {}): InscricaoRecenteInput {
  return {
    id: over.id ?? 'ins-1',
    atletaNome: over.atletaNome ?? 'Marina Silva',
    modalidade: over.modalidade ?? '21k',
    status: over.status ?? 'confirmado',
    criadoEm: over.criadoEm ?? ts(new Date('2026-04-18T10:00:00Z')),
    ...over,
  };
}
