import { describe, it, expect } from 'vitest';
import type { Repasse, Timestamp } from '@leela/core';
import { badgeEstado, pagoEm } from '../estadoRepasse';

function ts(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms };
}

describe('badgeEstado', () => {
  it('mapeia estado → variante + rótulo (aceite T4)', () => {
    expect(badgeEstado('solicitado')).toEqual({ variant: 'alerta', label: 'Solicitado' });
    expect(badgeEstado('aprovado')).toEqual({ variant: 'alerta', label: 'Aprovado' });
    expect(badgeEstado('pago')).toEqual({ variant: 'vitoria', label: 'Pago' });
    expect(badgeEstado('recusado')).toEqual({ variant: 'vulcao', label: 'Recusado' });
    expect(badgeEstado('cancelado')).toEqual({ variant: 'neutro', label: 'Cancelado' });
  });
});

function mkRepasse(over: Partial<Repasse> = {}): Repasse {
  return {
    id: 'r1',
    tenantId: 'castelo',
    valor: 5000,
    estado: 'pago',
    dadosBancariosSnapshot: {
      tenantId: 'castelo',
      banco: '260 — Nubank',
      agencia: '0001',
      contaMascarada: '****1234',
      tipo: 'corrente',
      pixMascarado: null,
      titular: 'Marina Castelo',
      cpfCnpjMascarado: '***.***.***-12',
    },
    transicoes: [],
    criadoEm: ts(Date.UTC(2026, 3, 10)),
    atualizadoEm: ts(Date.UTC(2026, 3, 12)),
    ...over,
  };
}

describe('pagoEm', () => {
  it('repasse não pago → null', () => {
    expect(pagoEm(mkRepasse({ estado: 'solicitado' }))).toBeNull();
  });

  it('pago → data da transição para pago', () => {
    const emPago = ts(Date.UTC(2026, 3, 12, 9, 30));
    const r = mkRepasse({
      estado: 'pago',
      transicoes: [
        { de: null, para: 'solicitado', em: ts(Date.UTC(2026, 3, 10)), por: 'u1', papel: 'tenant_owner' },
        { de: 'solicitado', para: 'aprovado', em: ts(Date.UTC(2026, 3, 11)), por: 'a1', papel: 'platform_admin' },
        { de: 'aprovado', para: 'pago', em: emPago, por: 'a1', papel: 'platform_admin' },
      ],
    });
    expect(pagoEm(r)?.toMillis()).toBe(emPago.toMillis());
  });

  it('pago sem transição registrada → fallback atualizadoEm', () => {
    const r = mkRepasse({ estado: 'pago', transicoes: [] });
    expect(pagoEm(r)?.toMillis()).toBe(r.atualizadoEm.toMillis());
  });
});
