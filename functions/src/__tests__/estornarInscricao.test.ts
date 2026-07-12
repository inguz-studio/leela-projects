/**
 * estornarInscricao.test.ts — LEELA-FABLE-B (ADR-011 · RN-337/RN-341)
 *
 * Unit PURO (sem I/O, sem Emulator): validação de input do estorno, chave de
 * idempotência determinística, matriz canônica de transição do inscrito
 * ('estornado' terminal) e coerência de parse do inscrito estornado.
 * O comportamento transacional/idempotente de ponta a ponta vive em
 * estornarInscricao.integration.test.ts (Emulator).
 */

import { describe, expect, it } from 'vitest';
import {
  inscritoAtivo,
  isStatusInscrito,
  parseInscrito,
  podeTransicionarStatusInscrito,
  STATUS_INSCRITO,
  TRANSICOES_STATUS_INSCRITO,
} from '@leela/core';
import {
  MOTIVO_MAX,
  refundIdempotencyKey,
  validarEstornarInscricaoInput,
} from '../checkout/estornarInscricao';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

function docEstornado(): Record<string, unknown> {
  return {
    tenantId: 'castelo-producoes',
    atletaId: 'atleta-0001',
    atletaNome: 'Marina Silva',
    kit: 'sem_kit',
    chipNumero: null,
    status: 'estornado',
    modalidade: '10k',
    pedidoRef: 'ped-0001',
    estornadoEm: fakeTs,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };
}

describe('StatusInscrito com estornado (RN-341 · matriz canônica)', () => {
  it('enum canônico inclui estornado; type guard aceita', () => {
    expect(STATUS_INSCRITO).toContain('estornado');
    expect(isStatusInscrito('estornado')).toBe(true);
  });

  it('só confirmado → estornado; pendente/cancelado NÃO estornam (não pagos)', () => {
    expect(podeTransicionarStatusInscrito('confirmado', 'estornado')).toBe(true);
    expect(podeTransicionarStatusInscrito('pendente', 'estornado')).toBe(false);
    expect(podeTransicionarStatusInscrito('cancelado', 'estornado')).toBe(false);
  });

  it('estornado é TERMINAL — não ressuscita nem re-estorna', () => {
    expect(TRANSICOES_STATUS_INSCRITO.estornado).toEqual([]);
    for (const para of STATUS_INSCRITO) {
      expect(podeTransicionarStatusInscrito('estornado', para)).toBe(false);
    }
  });

  it('inscritoAtivo: estornado fica FORA da operação (não retira kit, não corre)', () => {
    expect(inscritoAtivo({ status: 'estornado' })).toBe(false);
    expect(inscritoAtivo({ status: 'confirmado' })).toBe(true);
  });
});

describe('parseInscrito — coerência do estorno (fail-fast em dinheiro)', () => {
  it('parseia inscrito estornado válido (status + carimbo + pedidoRef)', () => {
    const inscrito = parseInscrito('insc-e1', docEstornado());
    expect(inscrito.status).toBe('estornado');
    expect(inscrito.estornadoEm).toEqual(fakeTs);
    expect(inscrito.pedidoRef).toBe('ped-0001');
  });

  it('lança: estornado SEM estornadoEm (flip fora da Function)', () => {
    const raw = docEstornado();
    delete raw['estornadoEm'];
    expect(() => parseInscrito('x', raw)).toThrow(/estornadoEm/);
  });

  it('lança: estornado SEM pedidoRef (estorno opera dentro de um pedido)', () => {
    const raw = docEstornado();
    raw['pedidoRef'] = null;
    expect(() => parseInscrito('x', raw)).toThrow(/pedidoRef/);
  });

  it('lança: estornadoEm presente com status confirmado (carimbo forjado)', () => {
    const raw = docEstornado();
    raw['status'] = 'confirmado';
    expect(() => parseInscrito('x', raw)).toThrow(/estornadoEm/);
  });
});

describe('validarEstornarInscricaoInput (fronteira do servidor)', () => {
  const valido = { pedidoId: 'ped-1', inscritoId: 'ped-1-i1', motivo: 'Atleta desistiu' };

  it('input válido → sem erros', () => {
    expect(validarEstornarInscricaoInput(valido)).toEqual([]);
  });

  it('nega input não-objeto / vazio', () => {
    expect(validarEstornarInscricaoInput(null)).not.toEqual([]);
    expect(validarEstornarInscricaoInput('x')).not.toEqual([]);
    expect(validarEstornarInscricaoInput([])).not.toEqual([]);
  });

  it('nega pedidoId/inscritoId ausentes ou vazios', () => {
    expect(validarEstornarInscricaoInput({ ...valido, pedidoId: '' })).not.toEqual([]);
    expect(validarEstornarInscricaoInput({ ...valido, inscritoId: 7 })).not.toEqual([]);
  });

  it('motivo é OBRIGATÓRIO (auditoria): ausente/curto/estourado negados', () => {
    expect(validarEstornarInscricaoInput({ ...valido, motivo: undefined })).not.toEqual([]);
    expect(validarEstornarInscricaoInput({ ...valido, motivo: '  a ' })).not.toEqual([]);
    expect(
      validarEstornarInscricaoInput({ ...valido, motivo: 'x'.repeat(MOTIVO_MAX + 1) })
    ).not.toEqual([]);
  });

  it('input NÃO tem canal de valor — campo extra "valor" não valida nada', () => {
    // O quanto estornar é decisão do SERVIDOR (pedido.itens[]): um campo
    // "valor" no input é simplesmente ignorado pelo contrato.
    expect(validarEstornarInscricaoInput({ ...valido, valor: 0.01 })).toEqual([]);
  });
});

describe('refundIdempotencyKey (RN-333 — replay nunca duplica refund)', () => {
  it('determinística por (pedido, inscrito) e distinta entre inscritos', () => {
    const k1 = refundIdempotencyKey('ped-1', 'ped-1-i1');
    expect(k1).toBe(refundIdempotencyKey('ped-1', 'ped-1-i1'));
    expect(k1).not.toBe(refundIdempotencyKey('ped-1', 'ped-1-i2'));
    expect(k1).not.toBe(refundIdempotencyKey('ped-2', 'ped-1-i1'));
  });
});
