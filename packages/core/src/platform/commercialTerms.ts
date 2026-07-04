// =============================================================================
// packages/core/src/platform/commercialTerms.ts
//
// Termos comerciais por tenant (LEELA-S1602-T1 · ADR-009 §Termos comerciais).
//
// Doc canônico: `tenants/{tenantId}/commercialTerms/current` — escrita
// EXCLUSIVA do platform_admin (RN-404); o tenant lê read-only; E04 (checkout/
// parcelamento) e E09 (split/taxa) consomem via TermsProvider (S1602-T3).
//
// Versionamento: `current` carrega `versao` (int, começa em 1). Cada save
// grava também um snapshot imutável `commercialTerms/v{versao}` — histórico
// auditável de quem mudou a economia do tenant e quando. As Rules travam:
// create de current exige versao == 1; update exige versao == anterior + 1;
// snapshots v* são create-only (nunca update/delete).
//
// RNs: RN-404 (só admin escreve), RN-405 (saasMonthlyFee 0 é válido —
// produtor-sócio isento), RN-406 (o termo é a FONTE da taxa; nunca constante),
// RN-410 (anticipation existe como campo; mecânica é pós-V1).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Regras de parcelamento do checkout (consumidas por E04 — RN-311) */
export interface InstallmentRules {
  /** Número máximo de parcelas ofertadas (≥ 1) */
  maxParcelas: number;
  /** Juros ao mês em % (0 = sem juros) */
  jurosAoMes: number;
  /** Valor mínimo de cada parcela em R$ (≥ 0) */
  parcelaMinima: number;
}

/**
 * Antecipação de recebíveis (RN-410).
 * O CAMPO existe e é configurável desde a V1; a MECÂNICA é pós-V1.
 */
export interface Anticipation {
  disponivel: boolean;
  /** Custo da antecipação em % — só faz sentido quando disponivel */
  custoPct?: number;
}

/**
 * Termos comerciais do tenant — doc `commercialTerms/current`.
 * Escrita exclusiva do platform_admin (RN-404).
 */
export interface CommercialTerms {
  /** Taxa da plataforma em % sobre receita bruta confirmada (RN-406/RN-330) */
  platformFeePct: number;
  installmentRules: InstallmentRules;
  anticipation: Anticipation;
  /** Habilita mensalidade da comunidade (destrava clube pago — RN-104/407) */
  communityMonthlyEnabled: boolean;
  /** Mensalidade SaaS em R$ — 0 é VÁLIDO (produtor-sócio isento, RN-405) */
  saasMonthlyFee: number;
  /** Versão do termo (int ≥ 1); snapshots v{versao} são imutáveis */
  versao: number;
  /** uid do platform_admin que gravou esta versão */
  atualizadoPor: string;
  atualizadoEm: Timestamp;
}

/** Payload editável dos termos (sem metadados de versionamento/auditoria). */
export type CommercialTermsInput = Omit<
  CommercialTerms,
  'versao' | 'atualizadoPor' | 'atualizadoEm'
>;

// ---------------------------------------------------------------------------
// Defaults canônicos
// ---------------------------------------------------------------------------

/**
 * Termo canônico da V1 (mock Castelo Produções — HANDOFF-05 / E04 / E09):
 * 10,5% de taxa, até 12x sem juros, antecipação indisponível, comunidade
 * desabilitada, SaaS R$ 0 (produtor-sócio — RN-405).
 *
 * Usado como default seguro no provisionamento (S1601-T1) quando o admin
 * não informa termos iniciais.
 */
export const DEFAULT_COMMERCIAL_TERMS: CommercialTermsInput = {
  platformFeePct: 10.5,
  installmentRules: {
    maxParcelas: 12,
    jurosAoMes: 0,
    parcelaMinima: 10,
  },
  anticipation: { disponivel: false },
  communityMonthlyEnabled: false,
  saasMonthlyFee: 0,
};

// ---------------------------------------------------------------------------
// Validações puras (reusadas por Function, api-client e testes)
// ---------------------------------------------------------------------------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Valida um payload de termos comerciais. Retorna a lista de erros
 * (vazia = válido). Pura — sem efeitos colaterais.
 *
 * Regras:
 *   - platformFeePct ∈ [0, 100]
 *   - saasMonthlyFee ≥ 0 (0 é VÁLIDO — RN-405)
 *   - maxParcelas inteiro ≥ 1; jurosAoMes ≥ 0; parcelaMinima ≥ 0
 *   - anticipation.custoPct ∈ [0, 100] quando presente
 */
export function validateCommercialTerms(
  input: CommercialTermsInput
): string[] {
  const errors: string[] = [];

  if (!isFiniteNumber(input.platformFeePct) || input.platformFeePct < 0 || input.platformFeePct > 100) {
    errors.push('platformFeePct deve estar entre 0 e 100.');
  }

  if (!isFiniteNumber(input.saasMonthlyFee) || input.saasMonthlyFee < 0) {
    errors.push('saasMonthlyFee deve ser ≥ 0 (0 = isento, RN-405).');
  }

  const rules = input.installmentRules;
  if (!rules || typeof rules !== 'object') {
    errors.push('installmentRules é obrigatório.');
  } else {
    if (!Number.isInteger(rules.maxParcelas) || rules.maxParcelas < 1) {
      errors.push('installmentRules.maxParcelas deve ser inteiro ≥ 1.');
    }
    if (!isFiniteNumber(rules.jurosAoMes) || rules.jurosAoMes < 0) {
      errors.push('installmentRules.jurosAoMes deve ser ≥ 0.');
    }
    if (!isFiniteNumber(rules.parcelaMinima) || rules.parcelaMinima < 0) {
      errors.push('installmentRules.parcelaMinima deve ser ≥ 0.');
    }
  }

  const ant = input.anticipation;
  if (!ant || typeof ant !== 'object' || typeof ant.disponivel !== 'boolean') {
    errors.push('anticipation.disponivel é obrigatório (boolean).');
  } else if (ant.custoPct !== undefined) {
    if (!isFiniteNumber(ant.custoPct) || ant.custoPct < 0 || ant.custoPct > 100) {
      errors.push('anticipation.custoPct deve estar entre 0 e 100.');
    }
  }

  if (typeof input.communityMonthlyEnabled !== 'boolean') {
    errors.push('communityMonthlyEnabled é obrigatório (boolean).');
  }

  return errors;
}

/**
 * Versionamento: o bump válido é SEMPRE `anterior + 1`.
 * `anterior = null` (primeiro save) exige versao 1.
 */
export function isValidTermsVersionBump(
  previous: number | null,
  next: number
): boolean {
  if (!Number.isInteger(next) || next < 1) return false;
  if (previous === null) return next === 1;
  return next === previous + 1;
}
