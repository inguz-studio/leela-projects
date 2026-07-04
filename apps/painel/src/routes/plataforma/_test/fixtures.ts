// =============================================================================
// Fixtures das telas de plataforma (RTL). Dados mockados — sem Firebase.
// =============================================================================

import type { CommercialTerms, PlatformRollups, Tenant } from '@leela/core';

const ts = (iso: string) => ({ toDate: () => new Date(iso) }) as unknown as Tenant['criadoEm'];

export function mkTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'castelo-producoes',
    nome: 'Castelo Produções',
    slug: 'castelo-producoes',
    status: 'ativo',
    ownerUid: 'uid-owner',
    tipo: 'produtor',
    criadoEm: ts('2026-01-10T12:00:00Z'),
    atualizadoEm: ts('2026-06-01T12:00:00Z'),
    gmvAcumulado: 85617,
    eventosAtivos: 3,
    ...overrides,
  };
}

export function mkTerms(overrides: Partial<CommercialTerms> = {}): CommercialTerms {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: 'uid-admin',
    atualizadoEm: ts('2026-06-01T12:00:00Z') as CommercialTerms['atualizadoEm'],
    ...overrides,
  };
}

export function mkRollups(overrides: Partial<PlatformRollups> = {}): PlatformRollups {
  return {
    gmvTotal: 120000,
    receitaLeelaTotal: 12600,
    tenantsAtivos: 2,
    tenants: {
      'castelo-producoes': {
        tenantId: 'castelo-producoes',
        nome: 'Castelo Produções',
        status: 'ativo',
        gmv: 100000,
        receitaLeela: 10500,
        platformFeePct: 10.5,
        eventosAtivos: 3,
        health: 'saudavel',
      },
      'passo-certo': {
        tenantId: 'passo-certo',
        nome: 'Passo Certo',
        status: 'pending',
        gmv: 0,
        receitaLeela: 0,
        platformFeePct: null,
        eventosAtivos: 0,
        health: 'atencao',
      },
    },
    atualizadoEm: ts('2026-07-04T10:00:00Z') as PlatformRollups['atualizadoEm'],
    ...overrides,
  };
}
