/**
 * demografiaCore.test.ts — LEELA-BEPEND-T1 (E11 §RN-820)
 *
 * Domínio PURO da demografia agregada (@leela/core) — sem Emulator:
 *   - idadeCivil: aritmética civil ISO×ISO determinística (aniversário
 *     inclusive), rejeição de data inválida;
 *   - faixaEtariaDaIdade: fronteiras exatas dos buckets; negativo → null;
 *   - computeDemografia: recontagem íntegra (Σ buckets + semDado == total),
 *     determinismo (mesma entrada ⇒ mesma saída), NENHUM dado individual no
 *     resultado;
 *   - demografiaInalterada: no-op de idempotência campo a campo.
 */
import { describe, expect, it } from 'vitest';
import {
  computeDemografia,
  demografiaInalterada,
  demografiaVazia,
  faixaEtariaDaIdade,
  FAIXAS_ETARIAS,
  GENEROS_INSCRITO,
  idadeCivil,
} from '@leela/core';

const REF = '2026-04-25'; // data civil da prova (referência determinística)

describe('idadeCivil (ISO × ISO — determinístico)', () => {
  it('idade completa antes/depois do aniversário no ano de referência', () => {
    expect(idadeCivil('1990-04-25', REF)).toBe(36); // aniversário NO dia
    expect(idadeCivil('1990-04-26', REF)).toBe(35); // ainda não fez
    expect(idadeCivil('1990-04-24', REF)).toBe(36); // já fez
  });

  it('data inválida (formato/lixo/ausente) → null, nunca idade fabricada', () => {
    expect(idadeCivil('25/04/1990', REF)).toBeNull();
    expect(idadeCivil('1990-13-40', REF)).toBeNull();
    expect(idadeCivil(undefined, REF)).toBeNull();
    expect(idadeCivil(42, REF)).toBeNull();
    expect(idadeCivil('1990-04-25', '')).toBeNull(); // referência inválida
  });
});

describe('faixaEtariaDaIdade (fronteiras dos buckets)', () => {
  it('mapeia as fronteiras exatas', () => {
    expect(faixaEtariaDaIdade(17)).toBe('ate_17');
    expect(faixaEtariaDaIdade(18)).toBe('18_24');
    expect(faixaEtariaDaIdade(24)).toBe('18_24');
    expect(faixaEtariaDaIdade(25)).toBe('25_34');
    expect(faixaEtariaDaIdade(34)).toBe('25_34');
    expect(faixaEtariaDaIdade(35)).toBe('35_44');
    expect(faixaEtariaDaIdade(44)).toBe('35_44');
    expect(faixaEtariaDaIdade(45)).toBe('45_54');
    expect(faixaEtariaDaIdade(54)).toBe('45_54');
    expect(faixaEtariaDaIdade(55)).toBe('55_mais');
    expect(faixaEtariaDaIdade(90)).toBe('55_mais');
  });

  it('idade negativa/NaN (nascimento no futuro = corrompido) → null', () => {
    expect(faixaEtariaDaIdade(-1)).toBeNull();
    expect(faixaEtariaDaIdade(Number.NaN)).toBeNull();
  });
});

describe('computeDemografia (recontagem íntegra, sem PII)', () => {
  const inscritos = [
    { nascimento: '2000-01-01', genero: 'feminino' }, // 26 → 25_34
    { nascimento: '2004-06-01', genero: 'masculino' }, // 21 → 18_24
    { nascimento: '1980-04-25', genero: 'feminino' }, // 46 → 45_54
    { nascimento: '2010-01-01', genero: 'outro' }, // 16 → ate_17
    { genero: 'nao_informado' }, // sem nascimento
    {}, // checkout mínimo — sem nada
    { nascimento: 'lixo', genero: 'invalido' }, // corrompido
  ];

  it('Σ faixas + semNascimento == total; Σ gêneros + semGenero == total', () => {
    const d = computeDemografia(inscritos, REF);
    expect(d.totalConfirmados).toBe(7);
    const somaFaixas = FAIXAS_ETARIAS.reduce((acc, f) => acc + d.faixasEtarias[f], 0);
    const somaGeneros = GENEROS_INSCRITO.reduce((acc, g) => acc + d.porGenero[g], 0);
    expect(somaFaixas + d.semNascimento).toBe(7);
    expect(somaGeneros + d.semGenero).toBe(7);
    expect(d.faixasEtarias['25_34']).toBe(1);
    expect(d.faixasEtarias['18_24']).toBe(1);
    expect(d.faixasEtarias['45_54']).toBe(1);
    expect(d.faixasEtarias.ate_17).toBe(1);
    expect(d.semNascimento).toBe(3);
    expect(d.porGenero.feminino).toBe(2);
    expect(d.porGenero.nao_informado).toBe(1);
    expect(d.semGenero).toBe(2); // {} + genero inválido
  });

  it('determinismo: mesma entrada ⇒ resultado idêntico (recontagem, não incremento)', () => {
    const a = computeDemografia(inscritos, REF);
    const b = computeDemografia(inscritos, REF);
    expect(b).toEqual(a);
    expect(demografiaInalterada(a, b)).toBe(true);
  });

  it('resultado carrega SÓ contagens — nenhuma data de nascimento sai (LGPD)', () => {
    const d = computeDemografia(inscritos, REF);
    const serializado = JSON.stringify(d);
    expect(serializado).not.toContain('2000-01-01');
    expect(serializado).not.toContain('1980-04-25');
    expect(Object.keys(d).sort()).toEqual([
      'faixasEtarias',
      'porGenero',
      'referencia',
      'semGenero',
      'semNascimento',
      'totalConfirmados',
    ]);
  });

  it('referência inválida (evento sem data) → todos em semNascimento, nada inventado', () => {
    const d = computeDemografia(inscritos, '');
    expect(d.semNascimento).toBe(7);
    const somaFaixas = FAIXAS_ETARIAS.reduce((acc, f) => acc + d.faixasEtarias[f], 0);
    expect(somaFaixas).toBe(0);
  });
});

describe('demografiaInalterada (no-op de idempotência)', () => {
  it('qualquer contagem diferente quebra a igualdade', () => {
    const a = computeDemografia([{ nascimento: '2000-01-01', genero: 'feminino' }], REF);
    const b = { ...a, faixasEtarias: { ...a.faixasEtarias, '25_34': 99 } };
    expect(demografiaInalterada(a, b)).toBe(false);
    const c = { ...a, referencia: '2027-01-01' };
    expect(demografiaInalterada(a, c)).toBe(false);
  });

  it('vazia == vazia (shape estável com todas as chaves canônicas)', () => {
    expect(demografiaInalterada(demografiaVazia(REF), demografiaVazia(REF))).toBe(true);
  });
});
