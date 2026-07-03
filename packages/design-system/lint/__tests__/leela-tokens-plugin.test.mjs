/**
 * Testes do lint de tokens (F11) — cada furo fechado tem caso de regressão.
 */

import { describe, it, expect } from 'vitest';
import { findViolation } from '../leela-tokens-plugin.mjs';

describe('findViolation — detecções originais', () => {
  it('flagra hex 6 dígitos', () => {
    expect(findViolation('bg-[#FF450C]')).toBe('#FF450C');
  });

  it('flagra hex curto e hex com alpha', () => {
    expect(findViolation('color: #fff')).toBe('#fff');
    expect(findViolation('#ffffff80')).toBe('#ffffff80');
  });

  it('flagra funções de cor clássicas', () => {
    expect(findViolation('rgba(0,0,0,0.5)')).toBe('rgba(');
    expect(findViolation('hsl(20 100% 50%)')).toBe('hsl(');
  });

  it('flagra px/rem/em crus em arbitrary values', () => {
    expect(findViolation('h-[64px]')).toBe('[64px]');
    expect(findViolation('p-[1.5rem]')).toBe('[1.5rem]');
  });

  it('permite tokens semânticos e calc só com var()', () => {
    expect(findViolation('h-[var(--table-row-height)]')).toBeNull();
    expect(findViolation('max-w-[calc(100vw-var(--spacing-8))]')).toBeNull();
    expect(findViolation('text-[length:var(--font-size-sm)]')).toBeNull();
  });
});

describe('F11 furo #1 — calc() com var() não isenta o resto do segmento', () => {
  it('flagra px cru misturado com var() no mesmo calc', () => {
    expect(findViolation('w-[calc(100px+var(--spacing-4))]')).toBe(
      '[calc(100px+var(--spacing-4))]',
    );
  });

  it('flagra rem cru ao lado de var() no mesmo segmento', () => {
    expect(findViolation('m-[max(2rem,var(--spacing-8))]')).toBe(
      '[max(2rem,var(--spacing-8))]',
    );
  });

  it('continua permitindo múltiplos var() encadeados', () => {
    expect(
      findViolation('p-[calc(var(--spacing-2)+var(--spacing-1))]'),
    ).toBeNull();
  });
});

describe('F11 furo #2 — paleta default do Tailwind é cor hardcoded sem hex', () => {
  it('flagra text-white / bg-black', () => {
    expect(findViolation('flex text-white')).toBe('text-white');
    expect(findViolation('bg-black/50')).toBe('bg-black');
  });

  it('flagra paleta com shade (bg-red-500, from-slate-900)', () => {
    expect(findViolation('bg-red-500 p-2')).toBe('bg-red-500');
    expect(findViolation('from-slate-900')).toBe('from-slate-900');
  });

  it('flagra com prefixo de estado (hover:bg-white)', () => {
    expect(findViolation('hover:bg-white')).toBe('bg-white');
  });

  it('NÃO flagra os utilitários do preset do DS (mesmos prefixos, nomes semânticos)', () => {
    expect(findViolation('bg-surface-base text-text-primary')).toBeNull();
    expect(findViolation('border-strong ring-offset-2')).toBeNull();
    expect(findViolation('bg-[var(--surface-overlay)]')).toBeNull();
  });
});

describe('F11 furo #3 — funções de cor modernas e cores nomeadas', () => {
  it('flagra hwb(), color-mix() e color()', () => {
    expect(findViolation('hwb(200 0% 0%)')).toBe('hwb(');
    expect(findViolation('color-mix(in srgb, red, blue)')).toBe('color-mix(');
    expect(findViolation('color(display-p3 1 0 0)')).toBe('color(');
  });

  it('flagra cor nomeada em arbitrary value (bg-[white])', () => {
    expect(findViolation('bg-[white]')).toBe('[white]');
    expect(findViolation('border-[rebeccapurple]')).toBe('[rebeccapurple]');
  });

  it('NÃO flagra palavras comuns fora de contexto de cor', () => {
    expect(findViolation('Cartão do evento')).toBeNull();
    expect(findViolation('whitespace-nowrap select-none')).toBeNull();
  });
});
