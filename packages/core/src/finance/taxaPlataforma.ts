// =============================================================================
// packages/core/src/finance/taxaPlataforma.ts
//
// Taxa-flex da plataforma — TABELA por meio de pagamento (LEELA-TAXAFLEX ·
// rodada 2026-07-19 · RN-178/179/180/182/183).
//
// A taxa deixa de ser um `platformFeePct` único e vira uma tabela por meio
// (`pix | cartao | boleto`) de `{percentual, fixoCentavos}`:
//   - GLOBAL da plataforma em `platform/config.taxaPlataforma` (default de
//     todos os tenants; escrita SÓ via callable admin — RN-404);
//   - OVERRIDE por organizador em `commercialTerms/current.taxaTabela`
//     (condição negociada; PARCIAL por meio — linha ausente herda a global);
//   - precedência por LINHA: override[meio] > global[meio] > legado
//     (`platformFeePct` pct-único, fixo 0 — schema evolution, docs vigentes
//     seguem precificando idêntico).
//
// FONTE ÚNICA (RN-183, mesmo padrão do PIX_EXPIRACAO_SEGUNDOS): a TABELA é a
// fonte de dados; `computeTaxaPlataforma` é a fonte de cálculo — half-up em
// centavos inteiros, SEM constante hardcoded (RN-404/406). A aritmética
// reusa a convenção cent-exata do COMF2 (`computeComissaoConversao`):
// centavos inteiros × basis points inteiros, arredondamento half-up.
//
// `boleto` existe por completude do enum (P-TAXAFLEX-2) — o checkout não
// oferta boleto (`FormaPagamento` ∈ {cartao_credito, pix}); a linha fica
// especificada e INERTE até o boleto existir no checkout.
//
// Parcelamento por parcela FICA FORA (pergunta aberta e — uma taxa por meio).
// =============================================================================

import type { FormaPagamento } from '../pedidos/pagamento';

// ---------------------------------------------------------------------------
// Enum de meios (chaves da tabela — RN-178)
// ---------------------------------------------------------------------------

/** Meio de pagamento da TABELA de taxa (chave da linha — RN-178). */
export type MeioTaxa = 'pix' | 'cartao' | 'boleto';

/** Lista canônica dos meios da tabela — única fonte para validação/UI. */
export const MEIOS_TAXA: readonly MeioTaxa[] = ['pix', 'cartao', 'boleto'];

/** Type guard de MeioTaxa. @pure */
export function isMeioTaxa(value: unknown): value is MeioTaxa {
  return (
    typeof value === 'string' && (MEIOS_TAXA as readonly string[]).includes(value)
  );
}

/**
 * Forma de pagamento do DOMÍNIO → meio da TABELA (borda, mesmo molde do
 * adapter cartao_credito→credit_card do gateway — ADR-006). @pure
 */
export function meioDaForma(forma: FormaPagamento): MeioTaxa {
  return forma === 'cartao_credito' ? 'cartao' : 'pix';
}

// ---------------------------------------------------------------------------
// Linha da tabela — {percentual, fixoCentavos}
// ---------------------------------------------------------------------------

/**
 * Uma linha da tabela de taxa (RN-178): percentual em % (passo 0,01 — basis
 * point, mantém o produto cent-exato) + componente fixo em CENTAVOS inteiros
 * (P-TAXAFLEX-4: nunca reais fracionários — casa com o rateio de maior resto
 * RN-181 e o half-up RN-183 sem erro de ponto flutuante).
 */
export interface TaxaMeio {
  /** Percentual da taxa (0–100, passo 0,01%). */
  percentual: number;
  /** Componente fixo POR VENDA em centavos inteiros (≥ 0). */
  fixoCentavos: number;
}

/** Teto de sanidade do fixo por venda: R$ 1.000,00 (guard anti-typo). */
export const TAXA_FIXO_CENTAVOS_MAX = 100_000;

/**
 * Linha estruturalmente válida? percentual finito 0–100 em passo de 0,01%
 * (basis point — mesmo guard da comissão de afiliado) e fixoCentavos inteiro
 * em [0, TAXA_FIXO_CENTAVOS_MAX]. @pure
 */
export function isTaxaMeioValida(value: unknown): value is TaxaMeio {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const linha = value as Record<string, unknown>;
  const chaves = Object.keys(linha);
  if (chaves.length !== 2) return false;
  const pct = linha['percentual'];
  const fixo = linha['fixoCentavos'];
  return (
    typeof pct === 'number' &&
    Number.isFinite(pct) &&
    pct >= 0 &&
    pct <= 100 &&
    // passo de 0,01% (basis point) — produto cent-exato (molde afiliado.ts)
    Math.abs(pct * 100 - Math.round(pct * 100)) < 0.001 &&
    Number.isInteger(fixo) &&
    (fixo as number) >= 0 &&
    (fixo as number) <= TAXA_FIXO_CENTAVOS_MAX
  );
}

// ---------------------------------------------------------------------------
// Tabelas — global (completa) e override (parcial por meio)
// ---------------------------------------------------------------------------

/**
 * Tabela GLOBAL da plataforma (`platform/config.taxaPlataforma`) — as TRÊS
 * linhas obrigatórias (boleto especificado mesmo inerte — P-TAXAFLEX-2).
 */
export type TabelaTaxaPlataforma = Record<MeioTaxa, TaxaMeio>;

/**
 * Override POR ORGANIZADOR (`commercialTerms/current.taxaTabela`) — parcial:
 * só as linhas negociadas; linha ausente herda a global (RN-178).
 */
export type TaxaTabelaOverride = Partial<Record<MeioTaxa, TaxaMeio>>;

/**
 * Valida a tabela GLOBAL (completa). Retorna lista de erros (vazia = válida).
 * @pure
 */
export function validarTabelaTaxaPlataforma(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['taxaPlataforma deve ser um objeto com as linhas pix/cartao/boleto.'];
  }
  const erros: string[] = [];
  const tabela = raw as Record<string, unknown>;
  for (const chave of Object.keys(tabela)) {
    if (!isMeioTaxa(chave)) erros.push(`linha desconhecida na tabela: "${chave}".`);
  }
  for (const meio of MEIOS_TAXA) {
    if (!isTaxaMeioValida(tabela[meio])) {
      erros.push(
        `linha "${meio}" inválida — exige {percentual: 0–100 em passo 0,01, ` +
          `fixoCentavos: inteiro 0–${TAXA_FIXO_CENTAVOS_MAX}}.`
      );
    }
  }
  return erros;
}

/**
 * Valida um OVERRIDE por organizador (parcial). Retorna lista de erros.
 * Objeto vazio é válido (nenhuma linha negociada = herda tudo da global).
 * @pure
 */
export function validarTaxaTabelaOverride(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['taxaTabela deve ser um objeto (linhas parciais pix/cartao/boleto).'];
  }
  const erros: string[] = [];
  const tabela = raw as Record<string, unknown>;
  for (const [chave, linha] of Object.entries(tabela)) {
    if (!isMeioTaxa(chave)) {
      erros.push(`linha desconhecida no override: "${chave}".`);
      continue;
    }
    if (!isTaxaMeioValida(linha)) {
      erros.push(
        `override "${chave}" inválido — exige {percentual: 0–100 em passo 0,01, ` +
          `fixoCentavos: inteiro 0–${TAXA_FIXO_CENTAVOS_MAX}}.`
      );
    }
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Resolução — override > global > legado (RN-178/179)
// ---------------------------------------------------------------------------

/** Origem da linha resolvida — rastro do carimbo RN-179. */
export type OrigemTaxaMeio = 'override' | 'global' | 'legado';

/** Linha resolvida do meio, com rastro de onde veio (carimbo RN-179). */
export interface TaxaMeioResolvida extends TaxaMeio {
  origem: OrigemTaxaMeio;
}

/**
 * Resolve a linha do meio no ATO DA COMPRA (RN-179): override do organizador
 * > global da plataforma > legado (`platformFeePct` pct-único, fixo 0 —
 * comportamento vigente, docs/tenants sem tabela precificam idêntico).
 * Linha estruturalmente inválida (doc corrompido) é IGNORADA — cai no nível
 * seguinte (fail-safe de leitura; a escrita já é fail-closed em Rules/core).
 * @pure
 */
export function resolverTaxaMeio(
  meio: MeioTaxa,
  global: TabelaTaxaPlataforma | null | undefined,
  override: TaxaTabelaOverride | null | undefined,
  platformFeePctLegado: number
): TaxaMeioResolvida {
  const doOverride = override?.[meio];
  if (isTaxaMeioValida(doOverride)) {
    return { ...doOverride, origem: 'override' };
  }
  const daGlobal = global?.[meio];
  if (isTaxaMeioValida(daGlobal)) {
    return { ...daGlobal, origem: 'global' };
  }
  if (
    !Number.isFinite(platformFeePctLegado) ||
    platformFeePctLegado < 0 ||
    platformFeePctLegado > 100
  ) {
    throw new RangeError(
      'resolverTaxaMeio: platformFeePct legado fora de 0–100 — termo corrompido.'
    );
  }
  return { percentual: platformFeePctLegado, fixoCentavos: 0, origem: 'legado' };
}

// ---------------------------------------------------------------------------
// Cálculo — fonte ÚNICA (RN-183: half-up em centavos inteiros)
// ---------------------------------------------------------------------------

/**
 * Taxa da plataforma de UMA venda, em CENTAVOS (RN-183/RN-180):
 *   `taxa = round_half_up(face × percentual) + fixo`
 * Centavos inteiros × basis points inteiros — a MESMA aritmética cent-exata
 * do COMF2 (`computeComissaoConversao`). O componente fixo soma DEPOIS do
 * arredondamento do percentual (a regra escrita: `round(face × percentual)
 * + fixoCentavos`). Sem constante hardcoded — os params vêm da tabela.
 * @pure
 */
export function computeTaxaPlataforma(
  faceCentavos: number,
  params: { percentualBp: number; fixoCentavos: number }
): number {
  if (!Number.isInteger(faceCentavos) || faceCentavos < 0) {
    throw new RangeError('faceCentavos deve ser inteiro ≥ 0 (centavos).');
  }
  const { percentualBp, fixoCentavos } = params;
  if (
    !Number.isInteger(percentualBp) ||
    percentualBp < 0 ||
    percentualBp > 10_000
  ) {
    throw new RangeError('percentualBp deve ser inteiro em [0, 10000] (0–100%).');
  }
  if (!Number.isInteger(fixoCentavos) || fixoCentavos < 0) {
    throw new RangeError('fixoCentavos deve ser inteiro ≥ 0 (centavos).');
  }
  return Math.round((faceCentavos * percentualBp) / 10_000) + fixoCentavos;
}

/** Converte a linha `{percentual, fixoCentavos}` para os params em bp. @pure */
export function taxaMeioParaBp(linha: TaxaMeio): {
  percentualBp: number;
  fixoCentavos: number;
} {
  if (!isTaxaMeioValida(linha)) {
    throw new RangeError('taxaMeioParaBp: linha de taxa inválida (RN-178).');
  }
  return {
    percentualBp: Math.round(linha.percentual * 100),
    fixoCentavos: linha.fixoCentavos,
  };
}

/**
 * Conveniência em REAIS para o `computeSaleState` (que opera em R$/2 casas):
 * converte o face para centavos inteiros na borda, calcula cent-exato via
 * `computeTaxaPlataforma` e devolve R$. @pure
 */
export function computeTaxaPlataformaReais(
  faceReais: number,
  linha: TaxaMeio
): number {
  if (!Number.isFinite(faceReais) || faceReais < 0) {
    throw new RangeError('faceReais deve ser um número ≥ 0.');
  }
  const faceCentavos = Math.round(faceReais * 100);
  return computeTaxaPlataforma(faceCentavos, taxaMeioParaBp(linha)) / 100;
}

// ---------------------------------------------------------------------------
// Paths canônicos (fonte única de fiação — Functions/api-client/testes)
// ---------------------------------------------------------------------------

/** Doc da config GLOBAL da plataforma (Rules: leitura só platform_admin; escrita SÓ Admin SDK). */
export const PLATFORM_CONFIG_DOC_PATH = 'platform/config';

/** Campo da tabela global dentro de `platform/config`. */
export const CAMPO_TAXA_PLATAFORMA = 'taxaPlataforma';
