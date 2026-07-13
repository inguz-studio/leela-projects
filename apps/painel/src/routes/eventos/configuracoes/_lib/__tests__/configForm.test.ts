// =============================================================================
// Testes da lógica pura do form de Configurações gerais (S304-T2). Validação,
// derivação de capacidade e URL pública (sempre {DOMINIO_LEELA}, nunca host
// legado).
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  capacidadeParaNumero,
  urlPublicaEvento,
  valoresDoEvento,
  validaConfigGerais,
} from '../configForm';

describe('urlPublicaEvento', () => {
  it('usa o placeholder {DOMINIO_LEELA} e nunca vaza o host legado', () => {
    const url = urlPublicaEvento('meia-floripa-2026');
    expect(url).toBe('{DOMINIO_LEELA}/meia-floripa-2026');
    expect(url).not.toContain('be-hero');
    expect(url).not.toContain('beh.ro');
  });
});

describe('capacidadeParaNumero', () => {
  it('vazio → null (desconhecida)', () => {
    expect(capacidadeParaNumero('')).toBeNull();
    expect(capacidadeParaNumero('   ')).toBeNull();
  });
  it('inteiro > 0 → número', () => {
    expect(capacidadeParaNumero('500')).toBe(500);
  });
  it('não-inteiro / ≤ 0 → null', () => {
    expect(capacidadeParaNumero('0')).toBeNull();
    expect(capacidadeParaNumero('-3')).toBeNull();
    expect(capacidadeParaNumero('12.5')).toBeNull();
    expect(capacidadeParaNumero('abc')).toBeNull();
  });
});

describe('valoresDoEvento', () => {
  it('preenche a partir do evento; capacidade null → campo vazio', () => {
    expect(
      valoresDoEvento({ nome: 'Meia', local: 'Floripa', usaChip: true, capacidade: null }),
    ).toEqual({ nome: 'Meia', local: 'Floripa', usaChip: true, capacidade: '' });
    expect(
      valoresDoEvento({ nome: 'Meia', local: 'Floripa', usaChip: false, capacidade: 500 }),
    ).toEqual({ nome: 'Meia', local: 'Floripa', usaChip: false, capacidade: '500' });
  });
});

describe('validaConfigGerais', () => {
  const base = { nome: 'Meia Floripa', local: 'Floripa', usaChip: true, capacidade: '' };

  it('form válido passa', () => {
    expect(validaConfigGerais(base).valido).toBe(true);
  });

  it('nome vazio bloqueia', () => {
    const { valido, erros } = validaConfigGerais({ ...base, nome: '   ' });
    expect(valido).toBe(false);
    expect(erros.nome).toBeTruthy();
  });

  it('capacidade inválida bloqueia; vazia é aceita', () => {
    expect(validaConfigGerais({ ...base, capacidade: '0' }).valido).toBe(false);
    expect(validaConfigGerais({ ...base, capacidade: '12.5' }).valido).toBe(false);
    expect(validaConfigGerais({ ...base, capacidade: '' }).valido).toBe(true);
    expect(validaConfigGerais({ ...base, capacidade: '500' }).valido).toBe(true);
  });
});
