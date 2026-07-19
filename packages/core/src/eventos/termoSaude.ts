// =============================================================================
// packages/core/src/eventos/termoSaude.ts
//
// Termo de saúde CUSTOM do organizador (LEELA-CK2-T4 · RN-156 · DEC-0719 D-7).
//
// SEMÂNTICA (verbatim do Vitor: "é um termo base que teremos, mas deixamos
// também o organizador ter os seus, para personalizar, caso deseje"):
//   - O termo de saúde BASE da plataforma é SEMPRE obrigatório no pagar
//     (template do produto, TERMO_SAUDE_VERSAO_VIGENTE — aceites.ts; o flip
//     F-4a do CKFORM já o exige incondicionalmente — deixou de ser
//     condicional a flag).
//   - O organizador PODE ADICIONAR um termo próprio (ADITIVO, nunca
//     substituto): doc único `eventos/{eventoId}/termoSaude/config` com o
//     TEXTO dele. Texto vazio/doc ausente = termo custom INATIVO.
//   - Termo custom ATIVO ⇒ o checkout exige um TERCEIRO aceite
//     (`aceites.saudeCustom` — fence server-side, mesmo padrão F-4a) e
//     carimba versão+hash vigentes lidos NA MESMA tx do pedido.
//
// VERSIONAMENTO (padrão politicaVendas/RN-149): `versao` MONOTÔNICA, bump em
// mudança MATERIAL do texto, escrita EXCLUSIVA server-side (trigger
// versionarTermoSaude; Rules congelam versao/versaoAtualizadaEm/
// termoTextoHash para o cliente).
//
// RECONCILIAÇÃO RN-146/147: os DADOS plenos de saúde (atestado/PAR-Q) seguem
// condicionais à flag `exigenciasSaude` do evento (exigenciasSaude.ts /
// saudeInscrito.ts — intocados). Aqui é ACEITE DE TERMO, não dado de saúde.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** docId canônico do termo custom (1 doc por evento — truque paginaVendas). */
export const TERMO_SAUDE_CUSTOM_DOC_ID = 'config';

/** Teto sanitário do texto (payload direto não vira doc-bomba). */
export const TERMO_SAUDE_CUSTOM_TEXTO_MAX = 20_000;

/**
 * Campos com escrita EXCLUSIVA server-side (trigger versionarTermoSaude) —
 * espelhados nas Rules. Versão forjada invalidaria a prova de aceite.
 */
export const CAMPOS_FUNCTION_TERMO_SAUDE = [
  'versao',
  'versaoAtualizadaEm',
  'termoTextoHash',
] as const;

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Doc `eventos/{eventoId}/termoSaude/config` — termo custom ADITIVO. */
export interface TermoSaudeCustom {
  /** docId canônico (`config`). */
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009). */
  tenantId: string;
  /** Texto do organizador. '' = termo custom INATIVO (desativação). */
  texto: string;
  atualizadoEm: Timestamp;
  /** Versão vigente (monotônica, server-side). Ausente = nunca versionado. */
  versao?: number;
  versaoAtualizadaEm?: Timestamp;
}

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/**
 * Projeção MATERIAL do termo — o que, mudando, exige novo aceite: o TEXTO
 * normalizado (CR/LF → LF, trim). Mudança só de whitespace de borda não é
 * edição material. @pure
 */
export function materialTermoSaude(texto: string): string {
  return texto.replace(/\r\n?/g, '\n').trim();
}

/** Termo custom ATIVO? (texto material não-vazio). @pure */
export function termoSaudeCustomAtivo(texto: string | undefined): boolean {
  return typeof texto === 'string' && materialTermoSaude(texto).length > 0;
}

/** Versão vigente do termo custom (sem campo ⇒ 1 — primeira publicação). @pure */
export function versaoTermoSaude(versao: number | undefined): number {
  return typeof versao === 'number' && Number.isInteger(versao) && versao > 0
    ? versao
    : 1;
}

// ---------------------------------------------------------------------------
// Validação / parsing (payload de escrita do painel + leitura defensiva)
// ---------------------------------------------------------------------------

/** Valida o SHAPE do doc (espelhado nas Rules). Vazia = válido. @pure */
export function validarTermoSaudeCustom(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Termo de saúde custom é obrigatório.'];
  }
  const d = raw as Record<string, unknown>;
  const erros: string[] = [];
  if (typeof d['tenantId'] !== 'string' || d['tenantId'].length === 0) {
    erros.push('"tenantId" é obrigatório (ADR-009).');
  }
  if (typeof d['texto'] !== 'string') {
    erros.push('"texto" deve ser string (\'\' = termo inativo).');
  } else if (d['texto'].length > TERMO_SAUDE_CUSTOM_TEXTO_MAX) {
    erros.push(`"texto" excede ${TERMO_SAUDE_CUSTOM_TEXTO_MAX} caracteres.`);
  }
  return erros;
}

/** Parsing fail-fast (prova de aceite depende deste material). @pure */
export function parseTermoSaudeCustom(
  id: string,
  data: Record<string, unknown>
): TermoSaudeCustom {
  const erros = validarTermoSaudeCustom(data);
  if (erros.length > 0) {
    throw new Error(`termoSaude/${id} inválido: ${erros.join(' ')}`);
  }
  const versaoRaw = data['versao'];
  if (
    versaoRaw !== undefined &&
    (typeof versaoRaw !== 'number' || !Number.isInteger(versaoRaw) || versaoRaw < 1)
  ) {
    throw new Error(`termoSaude/${id} com "versao" inválida (inteiro ≥ 1).`);
  }
  return {
    id,
    tenantId: data['tenantId'] as string,
    texto: data['texto'] as string,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
    ...(versaoRaw !== undefined ? { versao: versaoRaw as number } : {}),
    ...(data['versaoAtualizadaEm'] !== undefined
      ? { versaoAtualizadaEm: data['versaoAtualizadaEm'] as Timestamp }
      : {}),
  };
}
