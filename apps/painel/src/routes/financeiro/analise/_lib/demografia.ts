// =============================================================================
// Perfil de compradores — IDADE e SEXO REAIS (E11 §RN-820 · LEELA-BEPEND-T1).
// Substitui o mock honesto: a fonte agora é o agregado `demografia/current`
// mantido pela Function `agregarDemografia` (buckets por evento), somado aqui
// PURAMENTE através dos eventos do organizador. Nenhum dado individual chega a
// este módulo — só contagens (LGPD).
//
// HONESTIDADE (§2.12): inscritos confirmados SEM dado demográfico (checkout
// mínimo/legado) NÃO entram nos gráficos — são declarados na nota de
// cobertura ("N de M inscritos com dados"). Zero registro com dado ⇒ a View
// mostra EmptyState, nunca número inventado.
// =============================================================================

import { FAIXAS_ETARIAS, GENEROS_INSCRITO, type FaixaEtaria, type GeneroInscrito } from '@leela/core';
import type { DemografiaEvento } from '@leela/api-client';
import type { BarChartDatum, DonutChartDatum } from '@leela/design-system';

/** Rótulos de exibição dos buckets etários (chave canônica → UI). */
const ROTULO_FAIXA: Record<FaixaEtaria, string> = {
  ate_17: 'Até 17',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_54': '45–54',
  '55_mais': '55+',
};

/** Rótulos de exibição dos gêneros (enum canônico → UI). */
const ROTULO_GENERO: Record<GeneroInscrito, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
};

/** Demografia somada dos eventos do organizador — pronta para os gráficos. */
export interface DemografiaTenant {
  /** Barras por faixa etária (só faixas com contagem > 0, ordem canônica) */
  faixas: BarChartDatum[];
  /** Rosca por gênero (só fatias com contagem > 0, ordem canônica) */
  sexo: DonutChartDatum[];
  /** Inscritos confirmados com nascimento válido (cobertura das faixas) */
  comIdade: number;
  /** Inscritos confirmados com gênero declarado (cobertura da rosca) */
  comGenero: number;
  /** Total de inscritos confirmados considerados nos agregados */
  totalConfirmados: number;
}

/**
 * Soma os agregados por evento nos buckets do tenant (∑ pura — a mesma soma
 * que os demais fan-outs da análise fazem sobre `financeiro/current`).
 * `nao_informado` é gênero DECLARADO (enum do checkout) e entra na rosca;
 * `semGenero`/`semNascimento` são AUSÊNCIA de dado e ficam só na cobertura.
 * @pure
 */
export function somarDemografia(aggs: readonly DemografiaEvento[]): DemografiaTenant {
  const porFaixa = {} as Record<FaixaEtaria, number>;
  for (const f of FAIXAS_ETARIAS) porFaixa[f] = 0;
  const porGenero = {} as Record<GeneroInscrito, number>;
  for (const g of GENEROS_INSCRITO) porGenero[g] = 0;
  let totalConfirmados = 0;
  let semNascimento = 0;
  let semGenero = 0;

  for (const agg of aggs) {
    totalConfirmados += agg.totalConfirmados;
    semNascimento += agg.semNascimento;
    semGenero += agg.semGenero;
    for (const f of FAIXAS_ETARIAS) porFaixa[f] += agg.faixasEtarias[f];
    for (const g of GENEROS_INSCRITO) porGenero[g] += agg.porGenero[g];
  }

  const comIdade = Math.max(0, totalConfirmados - semNascimento);
  const comGenero = Math.max(0, totalConfirmados - semGenero);

  const faixas: BarChartDatum[] = FAIXAS_ETARIAS.filter((f) => porFaixa[f] > 0).map(
    (f) => ({ label: ROTULO_FAIXA[f], value: porFaixa[f] }),
  );
  const sexo: DonutChartDatum[] = GENEROS_INSCRITO.filter((g) => porGenero[g] > 0).map(
    (g) => ({ label: ROTULO_GENERO[g], value: porGenero[g] }),
  );

  return { faixas, sexo, comIdade, comGenero, totalConfirmados };
}

/**
 * Nota de COBERTURA honesta (§2.12): declara sobre quantos inscritos os
 * gráficos falam quando parte dos confirmados não tem dado demográfico
 * (checkout mínimo/legado). null = cobertura total (nota desnecessária).
 * @pure
 */
export function notaCobertura(d: DemografiaTenant): string | null {
  const menorCobertura = Math.min(d.comIdade, d.comGenero);
  if (d.totalConfirmados === 0 || menorCobertura >= d.totalConfirmados) return null;
  return (
    `Perfil calculado sobre os inscritos confirmados com dados demográficos ` +
    `(idade: ${d.comIdade} de ${d.totalConfirmados}; sexo: ${d.comGenero} de ` +
    `${d.totalConfirmados}). Inscrições sem esses dados ficam fora dos gráficos.`
  );
}
