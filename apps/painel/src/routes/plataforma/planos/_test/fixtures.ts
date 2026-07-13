// =============================================================================
// Fixtures da tela de planos de cobrança (RTL / testes puros). Sem Firebase.
// Timestamp portátil do core: seconds/nanoseconds + toDate/toMillis.
// =============================================================================

import { CHAVES_TABELA_PARCELAS, type PlanoCobranca, type TabelaTaxasParcela, type Timestamp } from '@leela/core';

export function ts(iso: string): Timestamp {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

/** Tabela 2x-12x completa com taxa uniforme (default 0). */
export function tabela(taxa = 0): TabelaTaxasParcela {
  const t: TabelaTaxasParcela = {};
  for (const chave of CHAVES_TABELA_PARCELAS) t[chave] = taxa;
  return t;
}

export function mkPlano(overrides: Partial<PlanoCobranca> = {}): PlanoCobranca {
  return {
    id: 'padrao',
    nome: 'Padrão',
    tabelaTaxasParcela: tabela(0),
    taxaPix: 8,
    taxaCartaoAVista: 10,
    saasMonthlyFee: 0,
    criadoEm: ts('2026-07-05T12:00:00Z'),
    atualizadoEm: ts('2026-07-05T12:00:00Z'),
    ...overrides,
  };
}
