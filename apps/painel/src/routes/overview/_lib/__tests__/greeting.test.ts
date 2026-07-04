import { describe, expect, it } from 'vitest';
import { primeiroNome, saudacaoProfissional } from '../greeting';

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
