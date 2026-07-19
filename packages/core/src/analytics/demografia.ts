// =============================================================================
// packages/core/src/analytics/demografia.ts
//
// Demografia AGREGADA do evento — domínio puro (LEELA-BEPEND-T1 · E11
// §RN-820). Doc materializado: `eventos/{eventoId}/demografia/current`,
// escrita EXCLUSIVA da Function `agregarDemografia` (Rules: write false).
//
// PII (LGPD): a FONTE é o bloco `[reg]` do inscrito (nascimento/genero —
// dadosPessoais.ts), mas o AGREGADO carrega SÓ contagens por bucket: nenhuma
// data de nascimento, nenhum dado individual, nenhuma chave que identifique
// um inscrito sai daqui. A tela de Análise (RN-820) lê este doc — o dado
// individual NUNCA chega ao painel por esta via.
//
// DETERMINISMO (recontagem, não incremento): a idade é calculada contra a
// DATA CIVIL DO EVENTO (`referenciaISO`), não contra "agora" — reprocessar o
// mesmo conjunto de inscritos N vezes produz SEMPRE as mesmas contagens
// (idempotência por construção, mesmo padrão dos agregados ∑ do repo).
//
// HONESTIDADE: inscrito confirmado SEM `[reg]` (checkout mínimo da fundação
// E12, docs legados) NÃO entra em bucket nenhum — conta em `semNascimento`/
// `semGenero`. Nada é fabricado; a UI decide como declarar a lacuna.
// =============================================================================

import { isDataEventoISO } from '../eventos/dataEvento';
import {
  isGeneroInscrito,
  GENEROS_INSCRITO,
  type GeneroInscrito,
} from '../eventos/dadosPessoais';

// ---------------------------------------------------------------------------
// Buckets canônicos de faixa etária
// ---------------------------------------------------------------------------

/**
 * Chaves canônicas dos buckets etários em BANDAS DE 5 ANOS (RN-822 — padrão
 * corrida de rua: 18-24 é a banda jovem "open"; 5 em 5 de 25 em diante; bordas
 * `ate_17`/`60_mais` preservadas). Chaves ASCII-safe para campo de map no
 * Firestore; o rótulo de exibição é da UI.
 *
 * MIGRAÇÃO (RN-822): o shape anterior tinha 6 faixas grossas
 * (`25_34/35_44/45_54/55_mais`). Docs `demografia/current` no shape antigo são
 * detectados (não têm `faixaXGenero`) e reescritos pelo full-recompute — o
 * reader (api-client) trata o shape antigo como "ainda não computado".
 */
export const FAIXAS_ETARIAS = [
  'ate_17',
  '18_24',
  '25_29',
  '30_34',
  '35_39',
  '40_44',
  '45_49',
  '50_54',
  '55_59',
  '60_mais',
] as const;

export type FaixaEtaria = (typeof FAIXAS_ETARIAS)[number];

/** Bucket etário de uma idade (anos completos). Idade negativa → null
 *  (nascimento no futuro = dado corrompido; nunca inventar bucket). @pure */
export function faixaEtariaDaIdade(idade: number): FaixaEtaria | null {
  if (!Number.isFinite(idade) || idade < 0) return null;
  if (idade <= 17) return 'ate_17';
  if (idade <= 24) return '18_24';
  if (idade >= 60) return '60_mais';
  // Bandas de 5 em 5 (25_29 … 55_59): piso = múltiplo de 5 ≤ idade.
  const piso = Math.floor(idade / 5) * 5;
  return `${piso}_${piso + 4}` as FaixaEtaria;
}

// ---------------------------------------------------------------------------
// Idade civil determinística (ISO × ISO — sem Date/fuso no meio)
// ---------------------------------------------------------------------------

/**
 * Idade completa (anos) entre duas datas civis `yyyy-mm-dd` (mesma
 * aritmética de `idadeNaData`, sem passar por Date — determinístico por
 * construção). null quando alguma data não é civil válida. @pure
 */
export function idadeCivil(
  nascimentoISO: unknown,
  referenciaISO: string
): number | null {
  if (!isDataEventoISO(nascimentoISO) || !isDataEventoISO(referenciaISO)) {
    return null;
  }
  const anos =
    Number(referenciaISO.slice(0, 4)) - Number(nascimentoISO.slice(0, 4));
  // Ainda não fez aniversário no ano de referência? (compara mm-dd)
  return referenciaISO.slice(5) < nascimentoISO.slice(5) ? anos - 1 : anos;
}

// ---------------------------------------------------------------------------
// Contagens agregadas (o shape ∑ do doc — SEM PII)
// ---------------------------------------------------------------------------

/** Projeção mínima de UM inscrito para a demografia (só o que o cômputo lê). */
export interface InscritoDemografiaInput {
  /** `dadosPessoais.nascimento` (yyyy-mm-dd) — ausente no checkout mínimo */
  nascimento?: unknown;
  /** `dadosPessoais.genero` — enum canônico GeneroInscrito */
  genero?: unknown;
}

/**
 * Matriz idade × sexo (RN-822 — cohort): contagem por (faixa etária, gênero).
 * SÓ contagens agregadas — a célula exige AMBOS os dados válidos; quem tem só
 * um deles entra apenas no marginal 1D correspondente. A EXPOSIÇÃO desta
 * matriz na UI passa pela salvaguarda de k-anonimato (`cohortPrivacidade.ts`)
 * — o doc carrega contagens brutas, o reader suprime células pequenas.
 */
export type MatrizFaixaGenero = Record<
  FaixaEtaria,
  Record<GeneroInscrito, number>
>;

/** Matriz zerada (todas as chaves canônicas — shape estável). @pure */
export function matrizFaixaGeneroVazia(): MatrizFaixaGenero {
  const m = {} as MatrizFaixaGenero;
  for (const f of FAIXAS_ETARIAS) {
    const linha = {} as Record<GeneroInscrito, number>;
    for (const g of GENEROS_INSCRITO) linha[g] = 0;
    m[f] = linha;
  }
  return m;
}

/**
 * Contagens agregadas de demografia do evento (shape do doc
 * `demografia/current`, sem tenantId/carimbos). SÓ buckets — nenhum dado
 * individual (RN-820/LGPD).
 */
export interface DemografiaContagens {
  /** Nº de inscritos CONFIRMADOS considerados na recontagem */
  totalConfirmados: number;
  /** Contagem por faixa etária (idade na data civil do evento) */
  faixasEtarias: Record<FaixaEtaria, number>;
  /** Confirmados sem nascimento válido (checkout mínimo/legado) — honesto */
  semNascimento: number;
  /** Contagem por gênero declarado (enum canônico) */
  porGenero: Record<GeneroInscrito, number>;
  /** Confirmados sem gênero válido — honesto */
  semGenero: number;
  /** Cohort idade × sexo (RN-822) — célula exige idade E gênero válidos */
  faixaXGenero: MatrizFaixaGenero;
  /** Data civil de referência da idade (= data do evento) — determinismo */
  referencia: string;
}

/** Zera todos os buckets (chaves canônicas completas — shape estável). @pure */
export function demografiaVazia(referenciaISO: string): DemografiaContagens {
  const faixasEtarias = {} as Record<FaixaEtaria, number>;
  for (const f of FAIXAS_ETARIAS) faixasEtarias[f] = 0;
  const porGenero = {} as Record<GeneroInscrito, number>;
  for (const g of GENEROS_INSCRITO) porGenero[g] = 0;
  return {
    totalConfirmados: 0,
    faixasEtarias,
    semNascimento: 0,
    porGenero,
    semGenero: 0,
    faixaXGenero: matrizFaixaGeneroVazia(),
    referencia: referenciaISO,
  };
}

/**
 * Recontagem INTEGRAL da demografia (idempotente: mesma entrada ⇒ mesma
 * saída, nada acumula). `referenciaISO` = data civil do evento — a idade de
 * cada inscrito é a idade NA PROVA, estável entre reprocessamentos.
 * Nascimento/gênero inválidos ou ausentes caem em `semNascimento`/`semGenero`
 * (nunca inventar bucket). @pure
 */
export function computeDemografia(
  inscritos: readonly InscritoDemografiaInput[],
  referenciaISO: string
): DemografiaContagens {
  const out = demografiaVazia(referenciaISO);
  out.totalConfirmados = inscritos.length;

  for (const inscrito of inscritos) {
    const idade = idadeCivil(inscrito.nascimento, referenciaISO);
    const faixa = idade === null ? null : faixaEtariaDaIdade(idade);
    if (faixa === null) {
      out.semNascimento += 1;
    } else {
      out.faixasEtarias[faixa] += 1;
    }

    const generoValido = isGeneroInscrito(inscrito.genero);
    if (generoValido) {
      out.porGenero[inscrito.genero as GeneroInscrito] += 1;
    } else {
      out.semGenero += 1;
    }

    // Cohort (RN-822): a célula da matriz exige AMBOS válidos — quem tem só
    // idade ou só gênero fica nos marginais 1D (Σ matriz ≤ marginais).
    if (faixa !== null && generoValido) {
      out.faixaXGenero[faixa][inscrito.genero as GeneroInscrito] += 1;
    }
  }

  return out;
}

/**
 * As contagens ∑ são idênticas? (no-op de escrita no recompute — o doc só é
 * reescrito quando algo mudou; prova de idempotência usa `atualizadoEm`
 * intocado, padrão updateSaldoRepasse). @pure
 */
export function demografiaInalterada(
  a: DemografiaContagens,
  b: DemografiaContagens
): boolean {
  if (
    a.totalConfirmados !== b.totalConfirmados ||
    a.semNascimento !== b.semNascimento ||
    a.semGenero !== b.semGenero ||
    a.referencia !== b.referencia
  ) {
    return false;
  }
  for (const f of FAIXAS_ETARIAS) {
    if (a.faixasEtarias[f] !== b.faixasEtarias[f]) return false;
    for (const g of GENEROS_INSCRITO) {
      if (a.faixaXGenero[f][g] !== b.faixaXGenero[f][g]) return false;
    }
  }
  for (const g of GENEROS_INSCRITO) {
    if (a.porGenero[g] !== b.porGenero[g]) return false;
  }
  return true;
}
