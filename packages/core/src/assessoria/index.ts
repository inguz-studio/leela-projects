// =============================================================================
// packages/core/src/assessoria — Assessorias parceiras (LEELA-E18).
// Documento CNPJ/CPF (RN-361) + parceria organizador↔club parceiro
// (RN-360..365). A assessoria em si é um CLUBE (E05); o desconto é um CUPOM
// escopado (E04, ADR-012) — este módulo só carrega o VÍNCULO e a validação
// de documento.
// =============================================================================

export type {
  TipoDocumento,
  DocumentoAssessoria,
  ResultadoDocumento,
} from './documento';
export {
  TIPOS_DOCUMENTO,
  isTipoDocumento,
  normalizarDocumento,
  tipoDoDocumento,
  isCpfValido,
  isCnpjValido,
  validarDocumento,
  formatarDocumento,
} from './documento';

export type {
  StatusParceriaAssessoria,
  CondicaoDesconto,
  ParceriaAssessoria,
} from './parceria-assessoria';
export {
  COLECAO_PARCEIROS_ASSESSORIA,
  STATUS_PARCERIA_ASSESSORIA,
  isStatusParceriaAssessoria,
  podeTransicionarParceria,
  parseParceriaAssessoria,
} from './parceria-assessoria';
