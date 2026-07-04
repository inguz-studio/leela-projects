/**
 * termsProvider.test.ts — LEELA-S1602-T3 (unit, contrato de consumo RN-406).
 *
 * Cobre createTermsProvider sobre um leitor fake:
 *   - E09: computeTaxa usa a taxa DO TERMO do tenant (10,5%), não constante
 *   - isolamento econômico: 2 tenants com taxas distintas → cada consumo
 *     usa a SUA (aceite do brief E16-L1)
 *   - tenant sem termos → TermsNotFoundError (sem fallback silencioso)
 *   - cache TTL: dentro do TTL não relê; expirado relê; invalidate() força
 *   - getInstallmentRules devolve as regras do termo (consumo E04)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createTermsProvider,
  TermsNotFoundError,
  computeTaxa,
  buildInstallmentOptions,
  type CommercialTerms,
  type TermsReader,
} from '@leela/core';

function terms(overrides: Partial<CommercialTerms> = {}): CommercialTerms {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: 'uid-platform-admin',
    atualizadoEm: { seconds: 0, nanoseconds: 0 } as CommercialTerms['atualizadoEm'],
    ...overrides,
  };
}

/** Leitor fake com termos distintos por tenant (Castelo 10,5% · Passo 8%). */
function fakeReader(): TermsReader {
  const byTenant: Record<string, CommercialTerms> = {
    'castelo-producoes': terms({ platformFeePct: 10.5 }),
    'passo-certo': terms({ platformFeePct: 8 }),
  };
  return async (tenantId: string) => byTenant[tenantId] ?? null;
}

describe('termsProvider — consumo E09 (taxa do termo, RN-406)', () => {
  it('computeTaxa usa 10,5% vindo do TERMO do tenant, não constante', async () => {
    const provider = createTermsProvider(fakeReader(), { ttlMs: 0 });
    const fee = await provider.getPlatformFeePct('castelo-producoes');

    expect(fee).toBe(10.5);
    // R$ 1.000,00 de receita bruta → R$ 105,00 de taxa Leela
    expect(computeTaxa(1000, fee)).toBe(105);
  });

  it('2 tenants com taxas distintas → cada um usa a SUA (isolamento econômico)', async () => {
    const provider = createTermsProvider(fakeReader(), { ttlMs: 0 });

    const feeCastelo = await provider.getPlatformFeePct('castelo-producoes');
    const feePasso = await provider.getPlatformFeePct('passo-certo');

    expect(feeCastelo).toBe(10.5);
    expect(feePasso).toBe(8);
    // Mesmo GMV, receitas Leela diferentes — nada de constante compartilhada
    expect(computeTaxa(1000, feeCastelo)).toBe(105);
    expect(computeTaxa(1000, feePasso)).toBe(80);
  });

  it('tenant sem termos → TermsNotFoundError (sem fallback para default)', async () => {
    const provider = createTermsProvider(fakeReader(), { ttlMs: 0 });
    await expect(provider.getPlatformFeePct('fantasma')).rejects.toBeInstanceOf(
      TermsNotFoundError
    );
    await expect(provider.getCommercialTerms('fantasma')).rejects.toMatchObject({
      tenantId: 'fantasma',
    });
  });
});

describe('termsProvider — consumo E04 (parcelamento do termo, RN-311)', () => {
  it('getInstallmentRules alimenta buildInstallmentOptions', async () => {
    const provider = createTermsProvider(fakeReader(), { ttlMs: 0 });
    const rules = await provider.getInstallmentRules('castelo-producoes');

    expect(rules).toEqual({ maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 });

    const options = buildInstallmentOptions(120, rules);
    // 120/12 = 10 ≥ parcelaMinima → todas as 12 opções ofertadas
    expect(options).toHaveLength(12);
    expect(options[0]).toEqual({ parcelas: 1, valorParcela: 120, valorTotal: 120 });
    expect(options[11]).toEqual({ parcelas: 12, valorParcela: 10, valorTotal: 120 });
  });
});

describe('termsProvider — cache TTL', () => {
  it('dentro do TTL não relê; expirado relê', async () => {
    let clock = 0;
    const reader = vi.fn(async () => terms());
    const provider = createTermsProvider(reader, {
      ttlMs: 1000,
      now: () => clock,
    });

    await provider.getCommercialTerms('castelo-producoes');
    await provider.getCommercialTerms('castelo-producoes');
    expect(reader).toHaveBeenCalledTimes(1); // cache hit

    clock = 1001; // TTL expirado
    await provider.getCommercialTerms('castelo-producoes');
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it('invalidate(tenantId) força releitura só do tenant; invalidate() limpa tudo', async () => {
    const reader = vi.fn(fakeReader());
    const provider = createTermsProvider(reader, { ttlMs: 60_000 });

    await provider.getCommercialTerms('castelo-producoes');
    await provider.getCommercialTerms('passo-certo');
    expect(reader).toHaveBeenCalledTimes(2);

    provider.invalidate('castelo-producoes');
    await provider.getCommercialTerms('castelo-producoes'); // relê
    await provider.getCommercialTerms('passo-certo'); // cache
    expect(reader).toHaveBeenCalledTimes(3);

    provider.invalidate();
    await provider.getCommercialTerms('passo-certo'); // relê
    expect(reader).toHaveBeenCalledTimes(4);
  });

  it('ttlMs 0 desliga o cache (toda chamada relê)', async () => {
    const reader = vi.fn(async () => terms());
    const provider = createTermsProvider(reader, { ttlMs: 0 });

    await provider.getCommercialTerms('castelo-producoes');
    await provider.getCommercialTerms('castelo-producoes');
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it('erro de tenant sem termos NÃO envenena o cache', async () => {
    const results: (CommercialTerms | null)[] = [null, terms()];
    const reader = vi.fn(async () => results.shift() ?? null);
    const provider = createTermsProvider(reader, { ttlMs: 60_000 });

    await expect(provider.getCommercialTerms('x')).rejects.toBeInstanceOf(
      TermsNotFoundError
    );
    // Termo provisionado depois → passa a resolver (null não foi cacheado)
    await expect(provider.getCommercialTerms('x')).resolves.toMatchObject({
      platformFeePct: 10.5,
    });
  });
});
