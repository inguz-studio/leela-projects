// =============================================================================
// Fixtures da back-office de repasses (RTL / testes puros). Sem Firebase.
// Timestamp portátil do core: toDate + toMillis (a fila ordena por toMillis).
// =============================================================================

import type { Repasse, Timestamp } from '@leela/core';
import type { RepasseFilaItem } from '../../../../lib/query/queries';

export function ts(iso: string): Timestamp {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

const snapshot = {
  tenantId: 'castelo-producoes',
  banco: '260 — Nubank',
  agencia: '0001',
  contaMascarada: '****3456',
  tipo: 'corrente' as const,
  pixMascarado: '***@g***.com',
  titular: 'Marina Castelo',
  cpfCnpjMascarado: '***.***.***-12',
};

export function mkRepasse(overrides: Partial<Repasse> = {}): Repasse {
  return {
    id: 'rep-1',
    tenantId: 'castelo-producoes',
    valor: 8500,
    estado: 'solicitado',
    dadosBancariosSnapshot: snapshot,
    transicoes: [
      { de: null, para: 'solicitado', em: ts('2026-04-10T12:00:00Z'), por: 'uid-owner', papel: 'tenant_owner' },
    ],
    criadoEm: ts('2026-04-10T12:00:00Z'),
    atualizadoEm: ts('2026-04-10T12:00:00Z'),
    ...overrides,
  };
}

export function mkFilaItem(
  repasse: Partial<Repasse> = {},
  tenantNome = 'Castelo Produções',
): RepasseFilaItem {
  return { repasse: mkRepasse(repasse), tenantNome };
}
