// =============================================================================
// Desempenho de vendas RECORTADO por evento (S-R9-01-T2 · RN-821).
//
// A Análise tem duas fontes honestas para o bloco "Desempenho de vendas":
//   • "Todos os eventos" → `getOverview` (callable tenant-wide · dashboard/current);
//   • um evento específico → o agregado `financeiro/current` DAQUELE evento.
//
// `getOverview` NÃO aceita parâmetro de evento (escopo é sempre o uid do token —
// ver overview.ts). Para recortar por evento sem varrer inscritos no cliente
// (RN-820), mapeamos o `financeiro/current` do evento ao MESMO contrato que a
// View já consome (OverviewResult), com os campos indisponíveis por-evento em
// `null`/`0`/`[]` — "indisponível", nunca número inventado (§2.12).
//
// HONESTIDADE: `financeiro/current` NÃO tem série de CONVERSÃO por evento (o
// `ticketSparkline` é ticket médio, categoria diferente — não o rotulamos como
// conversão). Logo `conversaoSparkline: []` no recorte por evento: a View
// esconde a "Tendência de conversão" em vez de mostrar uma série de outro
// significado. `vagasRestantes/trend/membros/desafios` não vivem no agregado
// financeiro → `null`/`0`; a View não os renderiza neste bloco.
// =============================================================================

import type { FinanceiroEvento, OverviewResult } from '@leela/api-client';

/**
 * Mapeia o `financeiro/current` de UM evento ao contrato OverviewResult que a
 * AnaliseVendasView consome. Só os campos que o bloco Desempenho exibe carregam
 * dado real (inscrições, receita, conversão); o resto é AUSÊNCIA honesta.
 * @pure
 */
export function overviewDoFinanceiro(financeiro: FinanceiroEvento): OverviewResult {
  return {
    inscricoesTotais: financeiro.inscritos.total,
    inscricoesTrendPct: null,
    receitaConfirmada: financeiro.receitaBruta,
    receitaTrendPct: null,
    vagasRestantes: 0,
    eventoEmRisco: null,
    // % de conversão do agregado do evento quando existir (preview/E12); senão
    // "—" honesto — nunca 0 falso.
    taxaConversaoPct: financeiro.taxaConversaoPct ?? null,
    // Sem série de conversão POR EVENTO — a View esconde a tendência (§2.12).
    conversaoSparkline: [],
    membrosAtivosTotais: 0,
    desafiosAtivosTotais: 0,
    alerts: [],
    atualizadoEm: 0,
  };
}
