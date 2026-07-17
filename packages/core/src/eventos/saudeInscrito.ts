// =============================================================================
// packages/core/src/eventos/saudeInscrito.ts
//
// Dado de SAÚDE do inscrito — subcoleção sensível ISOLADA
// (LEELA-S306-T1/T3 · E04 · RN-147 · LGPD Art. 11).
// Caminho físico: `eventos/{eventoId}/inscritos/{inscritoId}/saude/{current}`
// — doc ÚNICO por inscrito (docId canônico `current`).
//
// POR QUE SUBCOLEÇÃO PRÓPRIA (e não campo no inscrito): dado pessoal
// SENSÍVEL (Art. 11) exige base legal, superfície de acesso e RETENÇÃO
// próprias — isolar facilita a Rule restrita e o expurgo programado sem
// tocar o doc operacional do inscrito.
//
// BASE LEGAL (RN-147): consentimento ESPECÍFICO E DESTACADO do titular
// (Art. 11, I) — carimbado em `consentimentoSaudeEm` — ou tutela da saúde/
// proteção da vida (Art. 11, II). NUNCA "execução de contrato". SEM
// consentimento carimbado, o doc NÃO é válido (parse fail-fast).
//
// MINIMIZAÇÃO (RN-146): o doc SÓ existe quando o evento exige
// (`exigenciasSaude` ativa); os campos seguem as flags (atestado ⇒
// atestadoUrl; parq ⇒ parqRespostas).
//
// ACESSO (Rules): leitura owner/staff do tenant + papel de evento
// organizador/administrador + platform_admin; afiliado/patrocinador/
// promoter/athlete/operador/financeiro NEGADOS. Escrita de cliente: NUNCA
// (coleta é da Function do checkout — E12-S1207/E13).
//
// RETENÇÃO (RN-147/RN-144): ciclo do evento + janela legal —
// `RETENCAO_SAUDE_DIAS_POS_EVENTO` (90 dias, alinhado à janela de export
// RN-144; PREMISSA registrada — ajustável por decisão jurídica) — depois,
// EXPURGO programado (functions/eventos/expurgarSaude.ts, cron ADR-015).
// =============================================================================

import type { Timestamp } from '../index';

/** docId canônico do doc de saúde (1 por inscrito). */
export const SAUDE_DOC_ID = 'current';

/** Nome da subcoleção sensível. */
export const SAUDE_SUBCOL = 'saude';

/**
 * Retenção pós-evento em dias (RN-147: ciclo do evento + janela legal).
 * PREMISSA: 90 dias — espelha a janela de export LGPD (RN-144); decisão
 * jurídica pode ajustar sem mudar o mecanismo.
 */
export const RETENCAO_SAUDE_DIAS_POS_EVENTO = 90;

/** Base legal do tratamento (LGPD Art. 11 — RN-147). */
export type BaseLegalSaude = 'consentimento_destacado' | 'tutela_saude';

export interface SaudeInscrito {
  /** docId canônico (`current`). */
  id: string;
  /** Propagados do pai — self-locating (expurgo por collectionGroup). */
  tenantId: string;
  eventoId: string;
  inscritoId: string;
  /** URL do atestado médico (presente só com `exigenciasSaude.atestado`). */
  atestadoUrl?: string;
  /** Respostas do PAR-Q (presente só com `exigenciasSaude.parq`). */
  parqRespostas?: Record<string, boolean>;
  /** Base legal do tratamento (Art. 11) — default consentimento destacado. */
  baseLegal: BaseLegalSaude;
  /**
   * Carimbo do consentimento ESPECÍFICO E DESTACADO (Art. 11, I) —
   * OBRIGATÓRIO: doc sem consentimento não é válido (fail-fast).
   */
  consentimentoSaudeEm: Timestamp;
  criadoEm: Timestamp;
}

/**
 * Parsing defensivo (fail-fast): dado sensível fora do contrato NUNCA é
 * renderizado — pior que ausente. Consentimento ausente lança (RN-147). @pure
 */
export function parseSaudeInscrito(
  id: string,
  data: Record<string, unknown>
): SaudeInscrito {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const inscritoId = data['inscritoId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`SaudeInscrito ${id}: "tenantId" inválido (ADR-009)`);
  }
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`SaudeInscrito ${id}: "eventoId" inválido`);
  }
  if (typeof inscritoId !== 'string' || inscritoId.length === 0) {
    throw new Error(`SaudeInscrito ${id}: "inscritoId" inválido`);
  }
  if (data['consentimentoSaudeEm'] == null) {
    throw new Error(
      `SaudeInscrito ${id}: sem "consentimentoSaudeEm" — dado de saúde sem ` +
        `consentimento destacado não é tratável (LGPD Art. 11 · RN-147)`
    );
  }
  const baseLegalRaw = data['baseLegal'];
  const baseLegal: BaseLegalSaude =
    baseLegalRaw === 'tutela_saude' ? 'tutela_saude' : 'consentimento_destacado';

  const atestadoUrl = data['atestadoUrl'];
  if (
    atestadoUrl !== undefined &&
    (typeof atestadoUrl !== 'string' ||
      atestadoUrl.length === 0 ||
      !/^https?:\/\//.test(atestadoUrl))
  ) {
    throw new Error(`SaudeInscrito ${id}: "atestadoUrl" deve ser URL http(s)`);
  }
  const parqRaw = data['parqRespostas'];
  if (
    parqRaw !== undefined &&
    (parqRaw === null || typeof parqRaw !== 'object' || Array.isArray(parqRaw))
  ) {
    throw new Error(`SaudeInscrito ${id}: "parqRespostas" deve ser mapa`);
  }

  return {
    id,
    tenantId,
    eventoId,
    inscritoId,
    baseLegal,
    consentimentoSaudeEm: data['consentimentoSaudeEm'] as Timestamp,
    criadoEm: data['criadoEm'] as Timestamp,
    ...(atestadoUrl !== undefined ? { atestadoUrl } : {}),
    ...(parqRaw !== undefined
      ? { parqRespostas: parqRaw as Record<string, boolean> }
      : {}),
  };
}
