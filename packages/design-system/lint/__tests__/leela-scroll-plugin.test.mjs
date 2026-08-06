/**
 * Testes do lint de rolagem (BUILD-SCROLL-PADRAO).
 *
 * Cada caso aqui é um vetor de reincidência do "scroll duplo": as três formas
 * exatas em que o defeito entrou no sistema (menu secundário do evento, CRM,
 * kits) e as formas legítimas que a regra NÃO pode barrar.
 */

import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import plugin, { findEixoSolto } from '../leela-scroll-plugin.mjs';
import {
  SCROLL_Y_ONLY,
  SCROLL_X_ONLY,
  SCROLL_X_ONLY_SEM_CROMO,
} from '../../src/utils/scroll.ts';

describe('findEixoSolto — o defeito que o dono reportou três vezes', () => {
  it('flagra `overflow-y-auto` sozinho (o eixo x vira `auto` e nasce a barra horizontal)', () => {
    expect(findEixoSolto('flex flex-col flex-1 overflow-y-auto')).toBe('overflow-y-auto');
  });

  it('flagra `overflow-x-auto` sozinho (o eixo y vira `auto` e nasce a barra vertical)', () => {
    expect(findEixoSolto('w-full overflow-x-auto')).toBe('overflow-x-auto');
  });

  it('flagra `overflow-x-scroll` e `overflow-y-scroll` também', () => {
    expect(findEixoSolto('overflow-x-scroll')).toBe('overflow-x-scroll');
    expect(findEixoSolto('overflow-y-scroll')).toBe('overflow-y-scroll');
  });

  it('flagra um eixo `hidden` sozinho — `hidden` também promove o oposto a `auto`', () => {
    expect(findEixoSolto('rounded-md overflow-x-hidden')).toBe('overflow-x-hidden');
  });

  it('flagra o eixo solto sob modificador responsivo', () => {
    expect(findEixoSolto('max-lg:overflow-y-auto')).toBe('max-lg:overflow-y-auto');
  });

  it('não deixa o par de OUTRO modificador cobrir o eixo solto do base', () => {
    // `max-lg:` declara os dois; o base declara só o x. O base continua ofensor.
    expect(findEixoSolto('overflow-x-auto max-lg:overflow-visible')).toBe('overflow-x-auto');
  });
});

describe('findEixoSolto — o que é legítimo e não pode ser barrado', () => {
  it('deixa passar o par completo no mesmo literal', () => {
    expect(findEixoSolto('overflow-y-auto overflow-x-hidden')).toBeNull();
    expect(findEixoSolto('overflow-x-auto overflow-y-hidden')).toBeNull();
  });

  it('deixa passar os atalhos — declaram os dois eixos por definição', () => {
    expect(findEixoSolto('flex h-screen w-full overflow-hidden')).toBeNull();
    expect(findEixoSolto('max-lg:overflow-visible max-lg:bg-transparent')).toBeNull();
    expect(findEixoSolto('overflow-auto')).toBeNull();
  });

  it('deixa passar o par sob o mesmo modificador', () => {
    expect(findEixoSolto('max-lg:overflow-x-auto max-lg:overflow-y-hidden')).toBeNull();
  });

  it('ignora classe que só CONTÉM a palavra overflow', () => {
    expect(findEixoSolto('max-lg:[overflow-wrap:anywhere]')).toBeNull();
    expect(findEixoSolto('flex items-center gap-2')).toBeNull();
  });

  it('ignora o cromo da barra — não é declaração de eixo', () => {
    expect(findEixoSolto('[scrollbar-width:none] [&::-webkit-scrollbar]:hidden')).toBeNull();
  });
});

// =============================================================================
// REV-SCROLL-RET — os vetores de fuga que a análise por utilitário não via.
//
// A regra nasceu lendo `overflow-x-*`/`overflow-y-*`. O repo escreve CSS de duas
// maneiras, não uma: a utilitária e a arbitrária (`[overflow-wrap:anywhere]` na
// Table, `[scrollbar-width:none]` no SubNav). Quem escrever o eixo na segunda
// grafia passava em silêncio — e é a grafia que a casa já usa, então era a mais
// provável de reintroduzir o defeito por baixo do gate.
// =============================================================================
describe('findEixoSolto — o eixo solto escrito como propriedade arbitrária', () => {
  it('flagra `[overflow-y:auto]` — a grafia arbitrária promove o x igual à utilitária', () => {
    expect(findEixoSolto('flex-1 [overflow-y:auto]')).toBe('[overflow-y:auto]');
  });

  it('flagra `[overflow-x:auto]` sozinho', () => {
    expect(findEixoSolto('w-full [overflow-x:auto]')).toBe('[overflow-x:auto]');
  });

  it('flagra a arbitrária sob modificador — o `:` de dentro do colchete não é o corte', () => {
    // `lastIndexOf(':')` cru cortava `max-lg:[overflow-y:auto]` em
    // (`max-lg:[overflow-y:`, `auto]`) e o token inteiro saía do radar.
    expect(findEixoSolto('max-lg:[overflow-y:auto]')).toBe('max-lg:[overflow-y:auto]');
  });

  it('cruza as duas grafias: par completo escrito metade em cada uma', () => {
    expect(findEixoSolto('[overflow-y:auto] overflow-x-hidden')).toBeNull();
    expect(findEixoSolto('overflow-x-auto [overflow-y:hidden]')).toBeNull();
  });

  it('deixa passar a arbitrária de atalho — declara os dois eixos', () => {
    expect(findEixoSolto('[overflow:hidden]')).toBeNull();
  });

  it('não confunde propriedade VIZINHA que começa com overflow', () => {
    // `overflow-wrap` é quebra de palavra, não eixo de rolagem. É idioma vivo na
    // Table — um falso positivo aqui pararia o gate do repo inteiro.
    expect(findEixoSolto('max-lg:min-w-0 max-lg:[overflow-wrap:anywhere]')).toBeNull();
    expect(findEixoSolto('[overflow-wrap:break-word]')).toBeNull();
  });
});

// =============================================================================
// REV-SCROLL-RET — o eixo solto por objeto de estilo.
//
// É o vetor MAIS perigoso dos três: `style={{ overflowY: 'auto' }}` vence
// qualquer utilitário, então nem a trava depois do `className` no `cn()` — a
// que a REV-LOTES construiu — segura. A análise por literal de classe não via
// nada aqui, porque `'auto'` sozinho não é uma classe de overflow.
// =============================================================================
describe('a regra em objeto de estilo — onde a trava do `cn()` não alcança', () => {
  const tester = new RuleTester();
  const regra = plugin.rules['no-scroll-de-um-eixo'];

  it('reprova `overflowY` sozinho e aprova o par', () => {
    expect(() =>
      tester.run('no-scroll-de-um-eixo', regra, {
        valid: [
          // O par declarado: nada a promover.
          { code: "const e = { overflowX: 'hidden', overflowY: 'auto' };" },
          // Atalho: declara os dois por definição.
          { code: "const e = { overflow: 'hidden' };" },
          // Grafia CSS entre aspas, também em par.
          { code: "const e = { 'overflow-x': 'hidden', 'overflow-y': 'auto' };" },
          // Objeto que não fala de overflow nenhum.
          { code: "const e = { display: 'flex', width: '100%' };" },
        ],
        invalid: [
          {
            code: "const e = { overflowY: 'auto' };",
            errors: [{ messageId: 'eixoSoltoEmEstilo' }],
          },
          {
            code: "const e = { overflowX: 'scroll' };",
            errors: [{ messageId: 'eixoSoltoEmEstilo' }],
          },
          // A grafia CSS entre aspas some do radar se a regra só olhar camelCase.
          {
            code: "const e = { 'overflow-y': 'auto' };",
            errors: [{ messageId: 'eixoSoltoEmEstilo' }],
          },
        ],
      }),
    ).not.toThrow();
  });
});

describe('as três constantes do padrão passam na própria regra', () => {
  // Se algum dia alguém "simplificar" uma constante para um eixo só, este teste
  // cai junto com o contrato em utils/__tests__/scroll.test.ts.
  it.each([
    ['SCROLL_Y_ONLY', SCROLL_Y_ONLY],
    ['SCROLL_X_ONLY', SCROLL_X_ONLY],
    ['SCROLL_X_ONLY_SEM_CROMO', SCROLL_X_ONLY_SEM_CROMO],
  ])('%s não é eixo solto', (_nome, classes) => {
    expect(findEixoSolto(classes)).toBeNull();
  });
});
