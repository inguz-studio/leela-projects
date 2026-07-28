/**
 * marcoComissaoCore.test.ts — LEELA-E08 · S706-T1 (RN-386)
 *
 * Unit (sem emulator): a régua pura do marco de comissão. É ela que decide se
 * o afiliado recebe "sua comissão chegou a X" — e, principalmente, quando NÃO
 * recebe: descida por estorno e recruzamento da mesma faixa não são notícia.
 */
import { describe, expect, it } from 'vitest';
import {
  chaveAvisoMarco,
  faixaCruzada,
  faixaDoAcumulado,
  MARCO_PRIMEIRA_COMISSAO,
  PASSO_MARCO_COMISSAO,
  CHAVE_LOG_COMUNICACAO_RE,
} from '@leela/core';

describe('faixaDoAcumulado', () => {
  it('devolve o maior múltiplo do passo já alcançado', () => {
    expect(faixaDoAcumulado(0)).toBe(0);
    expect(faixaDoAcumulado(99.99)).toBe(0);
    expect(faixaDoAcumulado(100)).toBe(100);
    expect(faixaDoAcumulado(100.01)).toBe(100);
    expect(faixaDoAcumulado(350)).toBe(300);
  });

  it('não quebra em valor não positivo nem em não-número', () => {
    expect(faixaDoAcumulado(-50)).toBe(0);
    expect(faixaDoAcumulado(Number.NaN)).toBe(0);
  });

  it('300 exato é 300 (a conta roda em centavos inteiros, não em float)', () => {
    // Com `%` de float, 3 × 100.00 já apareceu como 299.99999999999994.
    expect(faixaDoAcumulado(0.1 + 0.2 + 299.7)).toBe(300);
  });
});

describe('faixaCruzada', () => {
  it('primeira comissão do afiliado é marco', () => {
    expect(faixaCruzada(0, 15.5)).toBe(MARCO_PRIMEIRA_COMISSAO);
  });

  it('subida simples cruzando a faixa avisa a faixa', () => {
    expect(faixaCruzada(90, 130)).toBe(100);
  });

  it('subida que pula duas faixas avisa SÓ a maior alcançada', () => {
    expect(faixaCruzada(90, 350)).toBe(300);
  });

  it('subida DENTRO da mesma faixa não é marco', () => {
    expect(faixaCruzada(40, 60)).toBeNull();
    expect(faixaCruzada(130, 180)).toBeNull();
  });

  it('descida nunca é marco (estorno não avisa)', () => {
    expect(faixaCruzada(130, 80)).toBeNull();
    expect(faixaCruzada(350, 0)).toBeNull();
  });

  it('valor parado não é marco', () => {
    expect(faixaCruzada(130, 130)).toBeNull();
  });

  it('recruzar a MESMA faixa devolve a faixa de novo — quem não duplica é o log', () => {
    // 90 → 130 avisa 100; estorno leva a 80; venda nova traz a 110. A função
    // devolve 100 outra vez de propósito: a supressão do segundo aviso é o
    // docId determinístico `marco-100` do log de comunicação, não um contador
    // paralelo aqui dentro (RN-386).
    expect(faixaCruzada(80, 110)).toBe(100);
  });

  it('cruzar de zero direto para além do passo avisa a faixa, não a primeira', () => {
    // Um e-mail por venda, não dois.
    expect(faixaCruzada(0, 150)).toBe(100);
  });

  it('exatamente no passo conta como alcançado', () => {
    expect(faixaCruzada(99.99, 100)).toBe(100);
  });

  it('não-número não vira marco', () => {
    expect(faixaCruzada(Number.NaN, 100)).toBeNull();
    expect(faixaCruzada(0, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('chaveAvisoMarco', () => {
  it('primeira comissão tem chave própria', () => {
    expect(chaveAvisoMarco(MARCO_PRIMEIRA_COMISSAO)).toBe('marco-primeira');
  });

  it('múltiplos viram marco-{faixa}', () => {
    expect(chaveAvisoMarco(100)).toBe('marco-100');
    expect(chaveAvisoMarco(300)).toBe('marco-300');
  });

  it('toda chave gerada cabe no formato que o log aceita (sem "_")', () => {
    for (const faixa of [0, 100, 200, 900, 10_000]) {
      expect(chaveAvisoMarco(faixa)).toMatch(CHAVE_LOG_COMUNICACAO_RE);
    }
  });

  it('faixa inválida falha alto', () => {
    expect(() => chaveAvisoMarco(-1)).toThrow(/faixa inválida/);
  });
});

describe('PASSO_MARCO_COMISSAO', () => {
  it('é a constante única da régua (RN-386) e é positiva', () => {
    expect(PASSO_MARCO_COMISSAO).toBeGreaterThan(0);
    // A régua vale para o passo que estiver configurado, não para o 100.
    expect(faixaCruzada(0, PASSO_MARCO_COMISSAO)).toBe(PASSO_MARCO_COMISSAO);
    expect(faixaCruzada(PASSO_MARCO_COMISSAO, PASSO_MARCO_COMISSAO + 1)).toBeNull();
  });
});
