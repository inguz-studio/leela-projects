/**
 * Motion tokenizado no preset (LEELA-DS-A2) — prova por número.
 *
 * O tailwindcss-animate entra no preset via `plugins: [...]` (embrulhado — ver
 * abaixo). O plugin lê `animationDuration.DEFAULT` em `.animate-in`/`.animate-out`
 * e, se não sobrescrito, HERDA animationDuration de `transitionDuration` e
 * animationTimingFunction de `transitionTimingFunction` — trazendo a duração e o
 * easing crus (hardcoded) do core Tailwind. Aqui garantimos que os
 * DEFAULT foram tokenizados: `animate-in` sem modificador roda em
 * var(--motion-duration-fast) + var(--motion-easing-default), zero valor cru.
 *
 * ANTI-REGRESSÃO (guarda p/ Dialog/Toast/DropdownMenu): o plugin cru registra
 * `duration`/`delay`/`ease`, que sombreiam os utilitários de TRANSIÇÃO do core e
 * fazem o Tailwind descartar `duration-[var(--motion-*)]`/`ease-[var(--motion-*)]`
 * (usados em transição por quase todos os componentes). O preset embrulha o
 * plugin p/ registrar só os utilitários de ANIMAÇÃO — o teste de CSS abaixo prova
 * que a transição sobrevive E que animate-in/fade/zoom/slide são emitidos.
 *
 * (Descoberta: o plugin NÃO aplica animationTimingFunction.DEFAULT em .animate-in
 * — só animationDuration.DEFAULT; o easing default é registrado aqui p/ que ease-*
 * e o resolvedor herdem o token.)
 */

import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import type { Config } from 'tailwindcss';
import leelaPreset from '../../tailwind-preset';

const extend = leelaPreset.theme?.extend as Record<string, unknown> | undefined;

function motionMap(key: string): Record<string, string> {
  const value = extend?.[key];
  expect(value, `preset.theme.extend.${key} ausente`).toBeTruthy();
  return value as Record<string, string>;
}

async function generateUtilities(classes: string): Promise<string> {
  const config = {
    presets: [leelaPreset],
    content: [{ raw: `<div class="${classes}"></div>`, extension: 'html' }],
    corePlugins: { preflight: false },
  } as unknown as Config;
  const result = await postcss([tailwind(config)]).process('@tailwind utilities;', {
    from: undefined,
  });
  return result.css;
}

describe('Motion tokenizado no preset (tailwindcss-animate)', () => {
  it('registra um plugin Tailwind (shape { handler, config }) embrulhando o animate', () => {
    expect(Array.isArray(leelaPreset.plugins)).toBe(true);
    const plugins = leelaPreset.plugins as Array<{ handler?: unknown; config?: unknown }>;
    expect(plugins).toHaveLength(1);
    const plugin = plugins[0];
    expect(typeof plugin?.handler).toBe('function');
    // config repassado do tailwindcss-animate (keyframes + defaults de animation*)
    expect(plugin?.config).toBeTruthy();
  });

  it('animationDuration tokenizado — DEFAULT === var(--motion-duration-fast)', () => {
    const dur = motionMap('animationDuration');
    expect(dur.DEFAULT).toBe('var(--motion-duration-fast)');
    expect(dur.fast).toBe('var(--motion-duration-fast)');
    expect(dur.normal).toBe('var(--motion-duration-normal)');
    expect(dur.slow).toBe('var(--motion-duration-slow)');
  });

  it('animationTimingFunction tokenizado — DEFAULT === var(--motion-easing-default)', () => {
    const ease = motionMap('animationTimingFunction');
    expect(ease.DEFAULT).toBe('var(--motion-easing-default)');
    expect(ease['ds-enter']).toBe('var(--motion-easing-enter)');
    expect(ease['ds-exit']).toBe('var(--motion-easing-exit)');
  });

  it('zero valor cru de motion — todo valor é var(--motion-*)', () => {
    const all = { ...motionMap('animationDuration'), ...motionMap('animationTimingFunction') };
    for (const [key, value] of Object.entries(all)) {
      expect(
        /^var\(--motion-[a-z-]+\)$/.test(value),
        `${key}=${value} não é var(--motion-*)`,
      ).toBe(true);
      expect(/\d+ms/.test(value), `${key}=${value} tem duração crua`).toBe(false);
      expect(/cubic-bezier\(/.test(value), `${key}=${value} tem easing cru`).toBe(false);
    }
  });
});

describe('Preset resolvido — animação sem sombrear transição (anti-regressão)', () => {
  it('duration/ease arbitrários seguem emitindo TRANSIÇÃO do core', async () => {
    const css = await generateUtilities(
      'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
    );
    expect(css).toMatch(/transition-duration:\s*var\(--motion-duration-fast\)/);
    expect(css).toMatch(/transition-timing-function:\s*var\(--motion-easing-default\)/);
  });

  it('utilitários de animação do shadcn são emitidos + animate-in tokenizado', async () => {
    const css = await generateUtilities(
      'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 data-[state=closed]:animate-out',
    );
    expect(css).toMatch(/\.animate-in\b/);
    expect(css).toMatch(/\.fade-in-0\b/);
    expect(css).toMatch(/\.zoom-in-95\b/);
    expect(css).toMatch(/\.slide-in-from-top-2\b/);
    // .animate-in usa animationDuration.DEFAULT tokenizado
    expect(css).toMatch(/animation-duration:\s*var\(--motion-duration-fast\)/);
  });
});
