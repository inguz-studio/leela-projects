/**
 * marcaCore.test.ts — LEELA-R9E · S-R9-12-T1 (RN-171/123)
 *
 * Unit: validação condicional por modelo comercial + parse fail-fast do
 * registro reutilizável de marca/patrocinador.
 */
import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { parseMarca, validarMarcaInput } from '@leela/core';

const CONTRA = 'Logo no kit e no pórtico de largada';

describe('validarMarcaInput (RN-123 condicional)', () => {
  it('financeiro exige valorAnual > 0', () => {
    expect(
      validarMarcaInput({ nome: 'CDL Wellness', modeloComercial: 'financeiro', valorAnual: 12000 })
    ).toEqual([]);
    expect(
      validarMarcaInput({ nome: 'CDL', modeloComercial: 'financeiro' }).join(' ')
    ).toMatch(/valorAnual/);
    expect(
      validarMarcaInput({ nome: 'CDL', modeloComercial: 'financeiro', valorAnual: 0 })
    ).not.toEqual([]);
    expect(
      validarMarcaInput({ nome: 'CDL', modeloComercial: 'financeiro', valorAnual: Infinity })
    ).not.toEqual([]);
  });

  it('permuta exige contrapartida ≥ 20 chars', () => {
    expect(
      validarMarcaInput({ nome: 'ACATE', modeloComercial: 'permuta', contrapartida: CONTRA })
    ).toEqual([]);
    expect(
      validarMarcaInput({ nome: 'ACATE', modeloComercial: 'permuta', contrapartida: 'curta' }).join(' ')
    ).toMatch(/contrapartida/);
  });

  it('URLs de logo/contrato só http(s); status no enum', () => {
    const base = { nome: 'X', modeloComercial: 'permuta', contrapartida: CONTRA };
    expect(validarMarcaInput({ ...base, logoUrl: 'https://cdn.leela.dev/x.png' })).toEqual([]);
    expect(validarMarcaInput({ ...base, logoUrl: 'javascript:alert(1)' })).not.toEqual([]);
    expect(validarMarcaInput({ ...base, contratoUrl: 'ftp://x' })).not.toEqual([]);
    expect(validarMarcaInput({ ...base, status: 'zumbi' })).not.toEqual([]);
    expect(validarMarcaInput({ ...base, status: 'inativa' })).toEqual([]);
  });

  it('nome obrigatório 1..80; input não-objeto', () => {
    expect(validarMarcaInput(null)).toEqual(['Input é obrigatório.']);
    expect(
      validarMarcaInput({ nome: 'x'.repeat(81), modeloComercial: 'permuta', contrapartida: CONTRA })
    ).not.toEqual([]);
  });
});

describe('parseMarca (fail-fast)', () => {
  const now = Timestamp.fromDate(new Date('2026-07-18T12:00:00Z'));
  const docOk = {
    nome: 'CDL Wellness',
    modeloComercial: 'financeiro',
    valorAnual: 12000,
    status: 'ativa',
    logoUrl: 'https://cdn.leela.dev/cdl.png',
    criadoEm: now,
    atualizadoEm: now,
  };

  it('parseia válido; opcionais ausentes ficam fora', () => {
    const m = parseMarca('cdl-wellness', docOk);
    expect(m.valorAnual).toBe(12000);
    expect(m.logoUrl).toBe('https://cdn.leela.dev/cdl.png');
    expect(m.contrapartida).toBeUndefined();
  });

  it('financeiro sem valorAnual / enums fora morrem', () => {
    expect(() =>
      parseMarca('cdl', { ...docOk, valorAnual: undefined })
    ).toThrow(/valorAnual/);
    expect(() => parseMarca('cdl', { ...docOk, modeloComercial: 'doacao' })).toThrow();
    expect(() => parseMarca('cdl', { ...docOk, status: 'zumbi' })).toThrow();
    expect(() => parseMarca('cdl', { ...docOk, valorAnual: -5 })).toThrow();
  });
});
