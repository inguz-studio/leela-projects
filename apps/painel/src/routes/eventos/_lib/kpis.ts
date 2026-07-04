// =============================================================================
// KPIs globais do hub de eventos (S200-T2).
// Consome SOMENTE os agregados ∑ mantidos por Function (qtdInscritos,
// receitaConfirmada) — nunca recalcula no cliente (regra do épico E03).
// =============================================================================

import type { Evento } from '@leela/core';
import { eventoPublico } from '@leela/core';

export interface KpisGlobais {
  totalEventos: number;
  eventosAtivos: number;
  totalInscritos: number;
  receitaConsolidada: number;
}

/**
 * Consolida os KPIs do topo do hub a partir da lista de eventos do organizador.
 * "Ativos" = publicado ou ao_vivo (derivação pura `eventoPublico` do core).
 */
export function agregaKpisGlobais(eventos: readonly Evento[]): KpisGlobais {
  return eventos.reduce<KpisGlobais>(
    (acc, ev) => ({
      totalEventos: acc.totalEventos + 1,
      eventosAtivos: acc.eventosAtivos + (eventoPublico(ev.status) ? 1 : 0),
      totalInscritos: acc.totalInscritos + ev.qtdInscritos,
      receitaConsolidada: acc.receitaConsolidada + ev.receitaConfirmada,
    }),
    { totalEventos: 0, eventosAtivos: 0, totalInscritos: 0, receitaConsolidada: 0 },
  );
}
