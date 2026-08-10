// =============================================================================
// Reanimação escopada (REFACTOR item 10) — o que se cobra aqui.
//
// A parte visível da regra ("só o gráfico afetado reanima") é testada na View,
// pela troca de classe. Aqui ficam as duas invariantes que sustentam o
// mecanismo: os nomes alternam (senão o browser não roda a animação de novo) e
// a preferência de movimento reduzido viaja SEMPRE junto com a classe — não é
// possível animar sem carregar o desligamento.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { classeDeReanimacao, proximaFase } from '../reanimacao';

describe('reanimação · alternância', () => {
  it('as fases alternam — dois nomes de keyframe, nunca o mesmo duas vezes seguidas', () => {
    expect(proximaFase('a')).toBe('b');
    expect(proximaFase('b')).toBe('a');
  });

  it('cada fase tem um nome de animação distinto (é a troca de nome que reanima)', () => {
    expect(classeDeReanimacao('a')).toContain('animate-revela-grafico-a');
    expect(classeDeReanimacao('b')).toContain('animate-revela-grafico-b');
    expect(classeDeReanimacao('a')).not.toContain('animate-revela-grafico-b');
  });
});

describe('reanimação · movimento reduzido', () => {
  it('quem pede menos movimento não pode receber gráfico invisível: animate-none em toda fase', () => {
    for (const fase of ['a', 'b'] as const) {
      expect(classeDeReanimacao(fase)).toContain('motion-reduce:animate-none');
    }
  });
});
