/**
 * inscrito.test.ts — LEELA-S203-T1
 *
 * Unit: tipos/derivações de `Inscrito` em @leela/core + gerador determinístico
 * do seed canônico (453 — HANDOFF-05). Sem I/O.
 */

import { describe, expect, it } from 'vitest';
import {
  CAMPOS_FUNCTION_INSCRITO,
  chipVinculado,
  inscritoAtivo,
  isKitInscrito,
  isStatusInscrito,
  KITS_INSCRITO,
  parseInscrito,
} from '@leela/core';
import {
  gerarInscritosSeed,
  TOTAL_INSCRITOS_MEIA_FLORIPA,
} from '../seed/inscritos.seed';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

function docInscrito(): Record<string, unknown> {
  return {
    tenantId: 'castelo-producoes',
    atletaId: 'atleta-0001',
    atletaNome: 'Marina Silva',
    kit: 'kit_ouro',
    chipNumero: null,
    status: 'confirmado',
    modalidade: '21k',
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };
}

describe('enums de Inscrito (RN-202/204)', () => {
  it('kit aceita exatamente os 4 valores canônicos (RN-202)', () => {
    expect(KITS_INSCRITO).toEqual(['kit_ouro', 'kit_prata', 'kit_basico', 'sem_kit']);
    for (const kit of KITS_INSCRITO) {
      expect(isKitInscrito(kit)).toBe(true);
    }
    expect(isKitInscrito('kit_diamante')).toBe(false);
    expect(isKitInscrito('tier_ouro')).toBe(false); // RN-216: "tier" não existe
  });

  it('status aceita confirmado/pendente/cancelado (RN-204)', () => {
    expect(isStatusInscrito('confirmado')).toBe(true);
    expect(isStatusInscrito('pendente')).toBe(true);
    expect(isStatusInscrito('cancelado')).toBe(true);
    expect(isStatusInscrito('pago')).toBe(false);
  });
});

describe('parseInscrito (S203-T1)', () => {
  it('parseia doc válido com chip null (RN-203)', () => {
    const inscrito = parseInscrito('insc-0001', docInscrito());
    expect(inscrito.id).toBe('insc-0001');
    expect(inscrito.chipNumero).toBeNull();
    expect(inscrito.kit).toBe('kit_ouro');
    expect(inscrito.status).toBe('confirmado');
  });

  it('chipNumero ausente normaliza para null (RN-203)', () => {
    const raw = docInscrito();
    delete raw['chipNumero'];
    expect(parseInscrito('x', raw).chipNumero).toBeNull();
  });

  it('lança com kit fora do enum (RN-202)', () => {
    const raw = docInscrito();
    raw['kit'] = 'kit_diamante';
    expect(() => parseInscrito('x', raw)).toThrow(/RN-202/);
  });

  it('lança com status fora do enum (RN-204)', () => {
    const raw = docInscrito();
    raw['status'] = 'reembolsado';
    expect(() => parseInscrito('x', raw)).toThrow(/RN-204/);
  });

  it('lança sem tenantId (ADR-009)', () => {
    const raw = docInscrito();
    delete raw['tenantId'];
    expect(() => parseInscrito('x', raw)).toThrow(/tenantId/);
  });

  it('preserva carimbos de Function quando presentes', () => {
    const raw = docInscrito();
    raw['kitEntregueEm'] = fakeTs;
    raw['qrToken'] = 'tok-opaco';
    const inscrito = parseInscrito('x', raw);
    expect(inscrito.kitEntregueEm).toEqual(fakeTs);
    expect(inscrito.qrToken).toBe('tok-opaco');
  });

  it('kitId (fulfillment E12): string preserva, null preserva, ausente NÃO inventa', () => {
    // O balcão distingue: string = id exato do kit cobrado; null = comprado
    // sem kit; ausente = doc legado pré-persistência (não vira null forjado).
    const comKit = docInscrito();
    comKit['kitId'] = 'kit-vip-do-organizador';
    expect(parseInscrito('x', comKit).kitId).toBe('kit-vip-do-organizador');

    const semKit = docInscrito();
    semKit['kitId'] = null;
    expect(parseInscrito('x', semKit).kitId).toBeNull();

    expect('kitId' in parseInscrito('x', docInscrito())).toBe(false);
  });

  it('lança com kitId vazio ou não-string (link de entrega corrompido — E12)', () => {
    const vazio = docInscrito();
    vazio['kitId'] = '';
    expect(() => parseInscrito('x', vazio)).toThrow(/kitId/);

    const numerico = docInscrito();
    numerico['kitId'] = 7;
    expect(() => parseInscrito('x', numerico)).toThrow(/kitId/);
  });
});

describe('derivações puras de Inscrito', () => {
  it('chipVinculado: null/vazio → false; string → true', () => {
    expect(chipVinculado({ chipNumero: null })).toBe(false);
    expect(chipVinculado({ chipNumero: '' })).toBe(false);
    expect(chipVinculado({ chipNumero: 'CHIP-8891' })).toBe(true);
  });

  it('inscritoAtivo: cancelado fica fora da operação', () => {
    expect(inscritoAtivo({ status: 'confirmado' })).toBe(true);
    expect(inscritoAtivo({ status: 'pendente' })).toBe(true);
    expect(inscritoAtivo({ status: 'cancelado' })).toBe(false);
  });

  it('CAMPOS_FUNCTION_INSCRITO espelha as Rules (escrita só por Function)', () => {
    // FABLE-A-T2 (ADR-011): + pedidoRef/ehResponsavel/dadosPessoais/tamanhos
    // (escritos pela Function do checkout — S1203-T5).
    // Follow-up review kit (E12): + kitId (id do kit COBRADO — fulfillment).
    expect(CAMPOS_FUNCTION_INSCRITO).toEqual([
      'kitEntregueEm',
      'checkinEm',
      'qrToken',
      'ingressoEmitidoEm',
      'pedidoRef',
      'ehResponsavel',
      'dadosPessoais',
      'tamanhos',
      'kitId',
    ]);
  });
});

describe('gerador do seed canônico (453 — HANDOFF-05)', () => {
  const seed = gerarInscritosSeed();

  it('gera exatamente 453 inscritos com ids únicos', () => {
    expect(seed).toHaveLength(TOTAL_INSCRITOS_MEIA_FLORIPA);
    expect(new Set(seed.map((s) => s.id)).size).toBe(453);
  });

  it('distribuição por kit espelha o protótipo (43/218/168/24)', () => {
    const porKit = (kit: string) => seed.filter((s) => s.kit === kit).length;
    expect(porKit('kit_ouro')).toBe(43);
    expect(porKit('kit_prata')).toBe(218);
    expect(porKit('kit_basico')).toBe(168);
    expect(porKit('sem_kit')).toBe(24);
  });

  it('todo chip começa null (RN-203) e todo doc carrega tenantId (ADR-009)', () => {
    expect(seed.every((s) => s.chipNumero === null)).toBe(true);
    expect(seed.every((s) => s.tenantId === 'castelo-producoes')).toBe(true);
  });

  it('modalidades coerentes: ouro só 21k; sem_kit só 5k', () => {
    expect(seed.filter((s) => s.kit === 'kit_ouro').every((s) => s.modalidade === '21k')).toBe(true);
    expect(seed.filter((s) => s.kit === 'sem_kit').every((s) => s.modalidade === '5k')).toBe(true);
  });

  it('é determinístico (duas gerações idênticas — seed idempotente)', () => {
    expect(gerarInscritosSeed()).toEqual(seed);
  });

  it('inclui atleta "Marina" para a busca canônica da tela (§2.5)', () => {
    expect(seed.some((s) => s.atletaNome.startsWith('Marina '))).toBe(true);
  });
});
