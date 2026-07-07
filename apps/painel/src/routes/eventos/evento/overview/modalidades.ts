// =============================================================================
// Preparação dos dados de modalidade para os painéis do Overview (LEELA-FID-EVT-T3).
// Pura. Fixa uma ORDEM estável (por receita desc → contagem desc → alfabética) e
// dá a cada modalidade um `colorIndex` por essa ordem: a MESMA modalidade recebe
// a MESMA cor no bar e no donut (a cor segue a entidade, não o rank do gráfico —
// regra da skill dataviz). @pure
// =============================================================================

import type { BarChartDatum, DonutChartDatum } from '@leela/design-system';

export interface ModalidadesPreparadas {
  inscricoes: BarChartDatum[];
  receita: DonutChartDatum[] | null;
}

export function prepararModalidades(
  contagem: Record<string, number>,
  receita: Record<string, number> | undefined,
): ModalidadesPreparadas {
  const chaves = new Set<string>([...Object.keys(contagem), ...Object.keys(receita ?? {})]);
  const ordem = [...chaves].sort((a, b) => {
    const ra = receita?.[a] ?? 0;
    const rb = receita?.[b] ?? 0;
    if (rb !== ra) return rb - ra;
    const ca = contagem[a] ?? 0;
    const cb = contagem[b] ?? 0;
    if (cb !== ca) return cb - ca;
    return a.localeCompare(b);
  });

  const indice = new Map(ordem.map((m, i) => [m, i] as const));

  const inscricoes: BarChartDatum[] = ordem
    .filter((m) => (contagem[m] ?? 0) > 0)
    .map((m) => ({ label: m, value: contagem[m] ?? 0, colorIndex: indice.get(m)! }));

  const receitaData: DonutChartDatum[] | null = receita
    ? ordem
        .filter((m) => (receita[m] ?? 0) > 0)
        .map((m) => ({ label: m, value: receita[m] ?? 0, colorIndex: indice.get(m)! }))
    : null;

  return { inscricoes, receita: receitaData && receitaData.length > 0 ? receitaData : null };
}
