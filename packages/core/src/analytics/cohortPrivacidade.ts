// =============================================================================
// packages/core/src/analytics/cohortPrivacidade.ts
//
// Salvaguarda de k-ANONIMATO do cohort idade × sexo (RN-822 · lastro RN-820/
// RN-172 — minimização LGPD, art. 6º III).
//
// POR QUE EXISTE: bandas de 5 anos cruzadas com sexo em evento PEQUENO viram
// células com 1-4 pessoas — quem conhece UM inscrito (idade + sexo) passa a
// inferir atributos dele no recorte, e o organizador compartilha esse gráfico
// com patrocinador (verbatim S-R9-02). O doc `demografia/current` carrega a
// matriz BRUTA (contagens, sem PII); a EXPOSIÇÃO na UI passa por aqui.
//
// ONDE APLICA (decisão de arquitetura — reader-side, não write-side):
//   1. A supressão roda DEPOIS da soma dos agregados (tenant = Σ eventos).
//      Suprimir no write quebraria a soma: células <k de N eventos podem
//      somar ≥k no tenant — suprimir cedo destruiria dado legítimo.
//   2. k é ajustável sem reprocessar todos os docs.
//   3. O leitor do doc bruto (owner/staff via Rules) JÁ tem acesso legítimo
//      ao dado individual dos inscritos (RN-172/CRM) — a matriz bruta no doc
//      não cria exposição nova; a salvaguarda governa a SUPERFÍCIE de
//      analytics (e o que dela se compartilha adiante).
//
// REGRAS (supressão de célula + complementar anti-diferenciação):
//   R1 (primária): célula é exposta sse contagem == 0 ou contagem >= k.
//      0 não identifica ninguém; 1..k-1 identifica grupo pequeno.
//   R2 (linha inteira): se QUALQUER célula da faixa cai em 1..k-1, o
//      detalhamento por sexo da faixa INTEIRA é suprimido (porGenero = null).
//      Motivo: com o total da linha visível, expor as demais células
//      recuperaria a suprimida por subtração.
//   R3 (complementar entre linhas): se sobraria EXATAMENTE UMA linha
//      suprimida, suprime-se TAMBÉM a linha exposta de menor total. Motivo:
//      o marginal 1D `porGenero` é público (RN-820) — com uma única linha
//      suprimida, (marginal − Σ linhas expostas) recuperaria a linha por
//      diferença. Com ≥2 linhas suprimidas só a SOMA delas é inferível.
//
// LIMITE DOCUMENTADO (residual, aceito): os marginais 1D (faixasEtarias,
// porGenero) são superfície RN-820 já entregue e não passam por k — num
// evento degenerado onde TODOS os inscritos com idade caem numa única faixa,
// o marginal de gênero se aproxima da linha da matriz. Esse residual é
// limitado pelo acesso legítimo que a audiência (owner/staff) já tem ao dado
// individual (RN-172); a régua aqui é minimização da superfície, não
// anonimização contra o próprio controlador.
// =============================================================================

import {
  FAIXAS_ETARIAS,
  type FaixaEtaria,
  type MatrizFaixaGenero,
} from './demografia';
import {
  GENEROS_INSCRITO,
  type GeneroInscrito,
} from '../eventos/dadosPessoais';

/**
 * k mínimo do cohort (k-anonimato): célula idade×sexo só é exposta com
 * contagem 0 ou ≥ 5. Valor usual de controle de divulgação estatística
 * (censos/microdados usam 3-5; adotamos o teto da faixa por ser dado
 * derivado de PII compartilhável com terceiros — patrocinador).
 */
export const K_MIN_COHORT = 5;

/** Uma faixa do cohort PRONTA para exposição (pós-salvaguarda). */
export interface CohortFaixaVisivel {
  faixa: FaixaEtaria;
  /** Inscritos com idade E sexo válidos nesta faixa (total da linha). */
  total: number;
  /**
   * Detalhamento por sexo — `null` quando SUPRIMIDO pela salvaguarda
   * (alguma célula em 1..k-1, ou supressão complementar R3). O total da
   * linha permanece visível; só o cruzamento é retido.
   */
  porGenero: Record<GeneroInscrito, number> | null;
}

/** Total de uma linha da matriz. @pure */
function totalDaLinha(linha: Record<GeneroInscrito, number>): number {
  let t = 0;
  for (const g of GENEROS_INSCRITO) t += linha[g];
  return t;
}

/** Linha tem célula na zona proibida 1..k-1? @pure */
function linhaViolaK(
  linha: Record<GeneroInscrito, number>,
  k: number
): boolean {
  for (const g of GENEROS_INSCRITO) {
    const c = linha[g];
    if (c > 0 && c < k) return true;
  }
  return false;
}

/**
 * Aplica a salvaguarda de k-anonimato à matriz idade×sexo JÁ SOMADA (tenant
 * ou evento único) e devolve as faixas prontas para exposição, em ordem
 * canônica. Faixas com total 0 são omitidas (nada a expor). Determinística.
 * @pure
 */
export function suprimirCohortPorK(
  matriz: MatrizFaixaGenero,
  k: number = K_MIN_COHORT
): CohortFaixaVisivel[] {
  // Passo 1 — R1+R2: linha exposta sse NENHUMA célula em 1..k-1.
  const linhas = FAIXAS_ETARIAS.map((faixa) => {
    const linha = matriz[faixa];
    const total = totalDaLinha(linha);
    return { faixa, total, linha, suprimida: linhaViolaK(linha, k) };
  }).filter((l) => l.total > 0);

  // Passo 2 — R3 (complementar): exatamente 1 linha suprimida seria
  // recuperável por diferença contra o marginal público `porGenero` →
  // suprime também a linha EXPOSTA de menor total (desempate: ordem
  // canônica — determinístico).
  const suprimidas = linhas.filter((l) => l.suprimida);
  if (suprimidas.length === 1) {
    const expostas = linhas.filter((l) => !l.suprimida);
    if (expostas.length > 0) {
      let menor = expostas[0]!;
      for (const l of expostas) {
        if (l.total < menor.total) menor = l;
      }
      menor.suprimida = true;
    }
  }

  return linhas.map(
    ({ faixa, total, linha, suprimida }): CohortFaixaVisivel => ({
      faixa,
      total,
      porGenero: suprimida ? null : { ...linha },
    })
  );
}

/**
 * Soma matrizes idade×sexo de N eventos (∑ pura, célula a célula) — a
 * salvaguarda roda DEPOIS desta soma, nunca antes (ver cabeçalho). @pure
 */
export function somarMatrizes(
  matrizes: readonly MatrizFaixaGenero[]
): MatrizFaixaGenero {
  const out = {} as MatrizFaixaGenero;
  for (const f of FAIXAS_ETARIAS) {
    const linha = {} as Record<GeneroInscrito, number>;
    for (const g of GENEROS_INSCRITO) {
      let t = 0;
      for (const m of matrizes) t += m[f][g];
      linha[g] = t;
    }
    out[f] = linha;
  }
  return out;
}
