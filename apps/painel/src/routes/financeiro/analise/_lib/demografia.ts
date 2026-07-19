// =============================================================================
// Perfil de compradores — IDADE e SEXO REAIS (E11 §RN-820 · LEELA-BEPEND-T1)
// + COHORT idade×sexo em bandas de 5 anos (RN-822 · S-R9-02).
// A fonte é o agregado `demografia/current` mantido pela Function
// `agregarDemografia` (buckets por evento), somado aqui PURAMENTE através dos
// eventos do organizador. Nenhum dado individual chega a este módulo — só
// contagens (LGPD).
//
// PRIVACIDADE DO COHORT (k-anonimato · RN-822): a matriz idade×sexo NUNCA é
// exposta bruta — depois da soma dos eventos ela passa por
// `suprimirCohortPorK` (@leela/core, k = K_MIN_COHORT): célula com 1..k-1
// pessoas suprime o detalhamento da faixa inteira (+ supressão complementar
// anti-diferenciação). Ver cabeçalho de cohortPrivacidade.ts no core.
//
// HONESTIDADE (§2.12): inscritos confirmados SEM dado demográfico (checkout
// mínimo/legado) NÃO entram nos gráficos — são declarados na nota de
// cobertura ("N de M inscritos com dados"). Zero registro com dado ⇒ a View
// mostra EmptyState, nunca número inventado.
// =============================================================================

import {
  FAIXAS_ETARIAS,
  GENEROS_INSCRITO,
  somarMatrizes,
  suprimirCohortPorK,
  type FaixaEtaria,
  type GeneroInscrito,
} from '@leela/core';
import type { DemografiaEvento } from '@leela/api-client';
import type { BarChartDatum, DonutChartDatum } from '@leela/design-system';

/** Rótulos de exibição dos buckets etários (chave canônica → UI — RN-822). */
const ROTULO_FAIXA: Record<FaixaEtaria, string> = {
  ate_17: 'Até 17',
  '18_24': '18–24',
  '25_29': '25–29',
  '30_34': '30–34',
  '35_39': '35–39',
  '40_44': '40–44',
  '45_49': '45–49',
  '50_54': '50–54',
  '55_59': '55–59',
  '60_mais': '60+',
};

/** Rótulos de exibição dos gêneros (enum canônico → UI). */
const ROTULO_GENERO: Record<GeneroInscrito, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
};

/** Um segmento (sexo) de uma linha do cohort — pronto para a viz. */
export interface CohortSegmento {
  label: string;
  value: number;
  /** Índice de cor categórica FIXO por gênero (mesma ordem canônica). */
  colorIndex: number;
}

/** Uma linha (faixa etária) do cohort — pós-salvaguarda de k-anonimato. */
export interface CohortLinha {
  /** Rótulo da faixa (ex.: "25–29"). */
  faixa: string;
  /** Inscritos com idade E sexo conhecidos nesta faixa. */
  total: number;
  /**
   * Segmentos por sexo (só os > 0, ordem canônica) — `null` quando o
   * detalhamento foi SUPRIMIDO pela salvaguarda (k-anonimato).
   */
  segmentos: CohortSegmento[] | null;
}

/** Demografia somada dos eventos do organizador — pronta para os gráficos. */
export interface DemografiaTenant {
  /** Barras por faixa etária (só faixas com contagem > 0, ordem canônica) */
  faixas: BarChartDatum[];
  /** Rosca por gênero (só fatias com contagem > 0, ordem canônica) */
  sexo: DonutChartDatum[];
  /** Cohort idade×sexo (RN-822) — linhas pós-supressão k-anonimato */
  cohort: CohortLinha[];
  /** Alguma linha do cohort foi suprimida? (a View declara a salvaguarda) */
  cohortTemSupressao: boolean;
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
 * O cohort aplica a salvaguarda de k-anonimato DEPOIS da soma (nunca por
 * evento — células <k de N eventos podem somar ≥k no tenant).
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

  // Cohort (RN-822): soma das matrizes → salvaguarda k-anonimato → viz.
  const matrizSomada = somarMatrizes(aggs.map((a) => a.faixaXGenero));
  const visiveis = suprimirCohortPorK(matrizSomada);
  const cohort: CohortLinha[] = visiveis.map((v) => {
    const linha = v.porGenero;
    return {
      faixa: ROTULO_FAIXA[v.faixa],
      total: v.total,
      segmentos:
        linha === null
          ? null
          : GENEROS_INSCRITO.map((g, i): CohortSegmento => ({
              label: ROTULO_GENERO[g],
              value: linha[g],
              colorIndex: i,
            })).filter((s) => s.value > 0),
    };
  });
  const cohortTemSupressao = cohort.some((l) => l.segmentos === null);

  return { faixas, sexo, cohort, cohortTemSupressao, comIdade, comGenero, totalConfirmados };
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
