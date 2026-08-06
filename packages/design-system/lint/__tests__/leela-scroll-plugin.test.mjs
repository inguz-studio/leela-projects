/**
 * Testes do lint de rolagem (BUILD-SCROLL-PADRAO).
 *
 * Cada caso aqui é um vetor de reincidência do "scroll duplo": as três formas
 * exatas em que o defeito entrou no sistema (menu secundário do evento, CRM,
 * kits) e as formas legítimas que a regra NÃO pode barrar.
 */

import { describe, it, expect } from 'vitest';
import { findEixoSolto } from '../leela-scroll-plugin.mjs';
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
