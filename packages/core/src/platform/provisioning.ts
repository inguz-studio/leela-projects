// =============================================================================
// packages/core/src/platform/provisioning.ts
//
// Input e validação pura do provisionamento de tenant (LEELA-S1601-T1).
//
// O provisionamento em si (Auth + Firestore + claims, atômico — RN-403) vive
// em functions/src/platform/provisionTenant.ts; aqui ficam apenas o contrato
// e as validações puras reusadas por Function, UI (L2) e testes.
//
// Decisão de identidade: tenantId == slug (kebab-case único). Deterministico
// torna o provisionamento naturalmente idempotente/retry-safe: o retry do
// mesmo pedido encontra o MESMO doc, em vez de criar um duplicado com uuid
// novo. Os tenants canônicos do repo (castelo-producoes, passo-certo) já
// seguem essa convenção.
// =============================================================================

import {
  validateCommercialTerms,
  DEFAULT_COMMERCIAL_TERMS,
  type CommercialTermsInput,
} from './commercialTerms';
import type { TenantTipo } from './tenant';

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

/** Payload do provisionamento (RN-403). Termos iniciais opcionais (RN-404). */
export interface ProvisionInput {
  nome: string;
  /** Slug único da plataforma — vira o tenantId (kebab-case) */
  slug: string;
  tipo: TenantTipo;
  /** E-mail do owner — conta existente no Auth ou criada no provisionamento */
  ownerEmail: string;
  /** Nome de exibição do owner (default: derivado do e-mail) */
  ownerNome?: string;
  /** Termo inicial opcional — default 10,5% (canônico) */
  platformFeePct?: number;
  /** Termo inicial opcional — 0 é VÁLIDO (produtor-sócio, RN-405) */
  saasMonthlyFee?: number;
}

// ---------------------------------------------------------------------------
// Validação pura
// ---------------------------------------------------------------------------

/** kebab-case: minúsculas/dígitos separados por hífen simples. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validação estrutural mínima de e-mail (a canônica é do Firebase Auth). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIPOS_VALIDOS: ReadonlySet<TenantTipo> = new Set(['produtor', 'promotor']);

/**
 * Valida um ProvisionInput. Retorna lista de erros (vazia = válido).
 * Pura — reusada pela Function (server) e pela UI de L2 (client).
 */
export function validateProvisionInput(input: ProvisionInput): string[] {
  const errors: string[] = [];

  if (typeof input.nome !== 'string' || input.nome.trim().length < 2 || input.nome.trim().length > 80) {
    errors.push('nome deve ter entre 2 e 80 caracteres.');
  }

  if (typeof input.slug !== 'string' || !SLUG_RE.test(input.slug) || input.slug.length > 60) {
    errors.push('slug deve ser kebab-case (a-z, 0-9, hífens) com até 60 caracteres.');
  }

  if (!TIPOS_VALIDOS.has(input.tipo)) {
    errors.push("tipo deve ser 'produtor' ou 'promotor'.");
  }

  if (typeof input.ownerEmail !== 'string' || !EMAIL_RE.test(input.ownerEmail)) {
    errors.push('ownerEmail inválido.');
  }

  // Termos iniciais opcionais: valida via regras canônicas dos termos
  if (input.platformFeePct !== undefined || input.saasMonthlyFee !== undefined) {
    const termErrors = validateCommercialTerms(buildInitialTerms(input));
    errors.push(...termErrors);
  }

  return errors;
}

/**
 * Monta o termo comercial inicial do tenant: defaults canônicos + overrides
 * opcionais do admin (`platformFeePct`, `saasMonthlyFee`).
 */
export function buildInitialTerms(input: ProvisionInput): CommercialTermsInput {
  return {
    ...DEFAULT_COMMERCIAL_TERMS,
    ...(input.platformFeePct !== undefined
      ? { platformFeePct: input.platformFeePct }
      : {}),
    ...(input.saasMonthlyFee !== undefined
      ? { saasMonthlyFee: input.saasMonthlyFee }
      : {}),
  };
}
