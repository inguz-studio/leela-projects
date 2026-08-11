import { describe, expect, it } from 'vitest';
import { PANORAMA_V3, primeiroNome, saudacaoPanorama, saudacaoProfissional } from '../greeting';

describe('primeiroNome', () => {
  it('extrai o primeiro nome de um nome completo', () => {
    expect(primeiroNome('Marina Castelo')).toBe('Marina');
  });

  it('lida com espaços extras', () => {
    expect(primeiroNome('  Marina   Castelo  ')).toBe('Marina');
  });

  it('null/vazio → null', () => {
    expect(primeiroNome(null)).toBeNull();
    expect(primeiroNome(undefined)).toBeNull();
    expect(primeiroNome('   ')).toBeNull();
  });
});

describe('saudacaoProfissional', () => {
  it('usuário "Marina Castelo" → saudação do aceite (S600-T1)', () => {
    expect(saudacaoProfissional('Marina Castelo')).toBe(
      'Olá, Marina — aqui está o resumo das suas operações.'
    );
  });

  it('sem nome → saudação genérica, nunca "undefined"', () => {
    expect(saudacaoProfissional(null)).toBe(
      'Olá — aqui está o resumo das suas operações.'
    );
  });
});

describe('saudacaoPanorama (HIFI-REC · protótipo v3)', () => {
  it('nome em MAIÚSCULAS + frase do protótipo', () => {
    expect(saudacaoPanorama('Marina Castelo')).toEqual({
      nome: 'MARINA',
      frase: PANORAMA_V3,
    });
    expect(PANORAMA_V3).toBe('aqui está o panorama do seu ecossistema.');
  });

  it('sem nome → nome null, nunca "undefined" na frase', () => {
    expect(saudacaoPanorama(null)).toEqual({ nome: null, frase: PANORAMA_V3 });
    expect(saudacaoPanorama('   ')).toEqual({ nome: null, frase: PANORAMA_V3 });
  });
});
