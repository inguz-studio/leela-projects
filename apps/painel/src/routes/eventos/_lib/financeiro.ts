// =============================================================================
// Derivações puras da tela Financeiro do evento (S207-T1). O cliente NUNCA
// recalcula receita — só LÊ o agregado `financeiro/current` (S207-T2) e formata
// / exporta. taxa e líquido são null-safe (RN-406, sem termo → "—").
// =============================================================================

import type { FinanceiroEvento } from '@leela/api-client';
import { KITS_INSCRITO, STATUS_INSCRITO } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';
import { celulaCsv } from './csv';

/** Formata a % da taxa (RN-406): null → "—". */
export function formatTaxaPct(pct: number | null): string {
  if (pct === null) return '—';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(pct)}%`;
}

export interface LinhaBreakdown {
  categoria: string;
  item: string;
  valor: number;
}

/**
 * Breakdown das contagens do agregado: por kit, por modalidade e por status.
 * Só categorias com valor > 0 entram (evita ruído). @pure
 */
export function breakdownFinanceiro(fin: FinanceiroEvento): LinhaBreakdown[] {
  const linhas: LinhaBreakdown[] = [];
  for (const kit of KITS_INSCRITO) {
    const valor = fin.inscritos.porKit[kit] ?? 0;
    if (valor > 0) linhas.push({ categoria: 'Kit', item: kitInscritoLabel(kit), valor });
  }
  for (const [modalidade, valor] of Object.entries(fin.inscritos.porModalidade)) {
    if (valor > 0) linhas.push({ categoria: 'Modalidade', item: modalidade, valor });
  }
  for (const status of STATUS_INSCRITO) {
    const valor = fin.inscritos.porStatus[status] ?? 0;
    if (valor > 0) linhas.push({ categoria: 'Status', item: statusInscritoBadge(status).label, valor });
  }
  return linhas;
}

/**
 * Gera o CSV das linhas exibidas: resumo (bruto/taxa/líquido) + breakdown.
 * Números crus (machine-readable); taxa/líquido ausentes viram vazio. As
 * células passam pela sanitização partilhada (`celulaCsv` · separador `,`):
 * RFC 4180 + anti-injeção de fórmula — a modalidade é texto livre público
 * (mesma superfície de ataque do inscritosCsv). @pure
 */
export function gerarCsvFinanceiro(fin: FinanceiroEvento): string {
  const linhas: (string | number)[][] = [['Categoria', 'Item', 'Valor']];
  linhas.push(['Resumo', 'Receita bruta (R$)', fin.receitaBruta]);
  linhas.push(['Resumo', 'Taxa (%)', fin.taxaPct ?? '']);
  linhas.push(['Resumo', 'Taxa (R$)', fin.taxaValor ?? '']);
  linhas.push(['Resumo', 'Receita líquida (R$)', fin.receitaLiquida ?? '']);
  linhas.push(['Inscritos', 'Total', fin.inscritos.total]);
  for (const l of breakdownFinanceiro(fin)) {
    linhas.push([l.categoria, l.item, l.valor]);
  }
  return linhas.map((row) => row.map((c) => celulaCsv(c, ',')).join(',')).join('\r\n');
}
