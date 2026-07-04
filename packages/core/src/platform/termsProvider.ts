// =============================================================================
// packages/core/src/platform/termsProvider.ts
//
// Contrato de CONSUMO dos termos comerciais (LEELA-S1602-T3 · RN-406).
//
// E04 (checkout/parcelamento) e E09 (split/taxa) NUNCA usam constante de
// taxa: leem o termo do tenant por este contrato. O provider é puro sobre um
// leitor injetado (client SDK no api-client, Admin SDK nas Functions), com
// cache TTL opcional — "leitura cacheável dos termos por tenant".
//
// Falha explícita: tenant sem termos → TermsNotFoundError. NÃO existe
// fallback silencioso para default — mascarar a ausência de termo reinstala
// a constante que RN-406 proíbe.
// =============================================================================

import type { CommercialTerms, InstallmentRules } from './commercialTerms';

/** Leitor bruto dos termos vigentes (`commercialTerms/current`) do tenant. */
export type TermsReader = (tenantId: string) => Promise<CommercialTerms | null>;

/** Contrato consumido por E04 (parcelamento) e E09 (taxa/split). */
export interface TermsProvider {
  /** Termos completos e vigentes do tenant. */
  getCommercialTerms(tenantId: string): Promise<CommercialTerms>;
  /** Taxa da plataforma (%) — fonte de RN-330/RN-406. */
  getPlatformFeePct(tenantId: string): Promise<number>;
  /** Regras de parcelamento do checkout — RN-311. */
  getInstallmentRules(tenantId: string): Promise<InstallmentRules>;
  /** Invalida o cache (após o platform_admin editar termos). */
  invalidate(tenantId?: string): void;
}

/** Tenant sem termos provisionados — erro explícito, sem fallback (RN-406). */
export class TermsNotFoundError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(
      `Tenant '${tenantId}' não tem commercialTerms/current provisionado — ` +
        'termos são criados no provisionamento (S1601-T1) ou pelo platform_admin (RN-404).'
    );
    this.name = 'TermsNotFoundError';
    this.tenantId = tenantId;
  }
}

interface CacheEntry {
  terms: CommercialTerms;
  expiresAt: number;
}

/** TTL default do cache de termos (termos mudam raramente). */
export const DEFAULT_TERMS_CACHE_TTL_MS = 60_000;

/**
 * Cria um TermsProvider sobre um leitor injetado.
 *
 * @param reader   leitura bruta de `commercialTerms/current` (SDK-specific)
 * @param options  ttlMs = 0 desliga o cache (ex.: testes de Rules)
 */
export function createTermsProvider(
  reader: TermsReader,
  options: { ttlMs?: number; now?: () => number } = {}
): TermsProvider {
  const ttlMs = options.ttlMs ?? DEFAULT_TERMS_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();

  async function getCommercialTerms(tenantId: string): Promise<CommercialTerms> {
    if (ttlMs > 0) {
      const hit = cache.get(tenantId);
      if (hit && hit.expiresAt > now()) return hit.terms;
    }

    const terms = await reader(tenantId);
    if (terms === null) throw new TermsNotFoundError(tenantId);

    if (ttlMs > 0) {
      cache.set(tenantId, { terms, expiresAt: now() + ttlMs });
    }
    return terms;
  }

  return {
    getCommercialTerms,
    async getPlatformFeePct(tenantId: string): Promise<number> {
      return (await getCommercialTerms(tenantId)).platformFeePct;
    },
    async getInstallmentRules(tenantId: string): Promise<InstallmentRules> {
      return (await getCommercialTerms(tenantId)).installmentRules;
    },
    invalidate(tenantId?: string): void {
      if (tenantId === undefined) cache.clear();
      else cache.delete(tenantId);
    },
  };
}
