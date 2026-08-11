/**
 * Tokens do rail flutuante e do chrome v3 — lane HIFI-REC (10/08).
 *
 * O protótipo do dono (`Visao Geral v3.dc.html`, rodada 2026-08-09-redesign-ds)
 * é a decisão de design; cada medida dele que não existia na escala entrou como
 * TOKEN — nunca literal em componente. Este arquivo transforma essas medidas em
 * contrato: se alguém "ajustar" o rail de 84px ou o raio de 26px, a suíte cai.
 *
 * Também pina o `--elevation-brand` novo (o `--glow-brand` do protótipo, halo
 * do item ativo do rail): dark-wine já nascera nesse formato na lane TOKENS;
 * brasa e wine alinharam aqui. CardDesafio (glow de 100%) e Avatar VIP são os
 * outros consumidores — a mudança é de intensidade/anel, mesma família de cor.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../../../themes/brasa.css'), 'utf8');
const cssWine = readFileSync(resolve(__dirname, '../../../themes/wine.css'), 'utf8');
const cssDarkWine = readFileSync(resolve(__dirname, '../../../themes/dark-wine.css'), 'utf8');

describe('primitivos novos da HIFI-REC', () => {
  it('font.size.xl-mid = 1.625rem (número do KPI strip do v3)', () => {
    expect(css).toContain('--font-size-xl-mid: 1.625rem;');
  });

  it('spacing.4-5 = 18px (ritmo interno dos cards do v3)', () => {
    expect(css).toContain('--spacing-4-5: 18px;');
  });

  it('elevation.brand = glow-brand do protótipo, nos três temas', () => {
    expect(css).toContain(
      '--elevation-brand: 0 0 0 1px rgba(255,69,12,0.30), 0 0 22px 2px rgba(255,69,12,0.42);',
    );
    expect(cssWine).toContain(
      '--elevation-brand: 0 0 0 1px rgba(122,21,32,0.22), 0 0 20px 2px rgba(122,21,32,0.28);',
    );
    expect(cssDarkWine).toContain(
      '--elevation-brand: 0 0 0 1px rgba(200,232,74,0.25), 0 0 22px 2px rgba(200,232,74,0.38);',
    );
  });
});

describe('grupo rail — medidas do protótipo, byte a byte', () => {
  const esperado: Record<string, string> = {
    '--rail-width': '84px',
    '--rail-width-open': '248px',
    '--rail-radius': '26px',
    '--rail-margin': 'var(--spacing-5)',
    '--rail-pt': 'var(--spacing-4-5)',
    '--rail-pb': 'var(--spacing-3-5)',
    '--rail-px': 'var(--spacing-3-5)',
    '--rail-nav-pt': '34px',
    '--rail-nav-gap': 'var(--spacing-2-5)',
    '--rail-item-h': '46px',
    '--rail-item-radius': '14px',
    '--rail-item-gap': 'var(--spacing-3-5)',
    '--rail-item-px': 'var(--spacing-3)',
    '--rail-item-px-open': '13px',
    '--rail-icon-box': '22px',
    '--rail-icon-size': '21px',
    '--rail-toggle-size': '32px',
    '--rail-toggle-top': '34px',
    '--rail-toggle-icon': '16px',
    '--rail-toggle-stroke': '2.25',
    '--rail-icon-stroke': '2',
    '--rail-tip-gap': 'var(--spacing-3-5)',
    '--rail-tip-h': '34px',
    '--rail-tip-radius': '10px',
    '--rail-brand-h': '42px',
    '--rail-brand-icon': '42px',
    '--rail-brand-icon-radius': '14px',
    '--rail-brand-logo-h': '34px',
    '--rail-badge-px': '7px',
    '--rail-avatar': '44px',
    '--rail-dot': '10px',
    '--rail-motion': '650ms',
  };

  for (const [nome, valor] of Object.entries(esperado)) {
    it(`${nome}: ${valor}`, () => {
      expect(css).toContain(`${nome}: ${valor};`);
    });
  }
});

describe('grupo motion — §5 do estudo (paga o impedimento de 750ms da C2)', () => {
  const esperado: Record<string, string> = {
    '--motion-bar-duration': '750ms',
    '--motion-bar-easing': 'cubic-bezier(0.22, 1, 0.36, 1)',
    '--motion-area-duration': '600ms',
    '--motion-pop-duration': '160ms',
    '--motion-stagger': '60ms',
    '--motion-reveal-shift': '12px',
  };

  for (const [nome, valor] of Object.entries(esperado)) {
    it(`${nome}: ${valor}`, () => {
      expect(css).toContain(`${nome}: ${valor};`);
      expect(cssWine).toContain(`${nome}: ${valor};`);
      expect(cssDarkWine).toContain(`${nome}: ${valor};`);
    });
  }
});

describe('grupo v3 — chrome das seções do protótipo', () => {
  const esperado: Record<string, string> = {
    '--v3-gap': 'var(--spacing-5)',
    '--v3-card-p': 'var(--spacing-5)',
    '--v3-card-p-lg': 'var(--spacing-6)',
    '--v3-kpi-size': 'var(--font-size-xl-mid)',
    '--v3-kpi-icon': '46px',
    '--v3-alert-icon': '38px',
    '--v3-cal-cell-h': '34px',
    '--v3-cal-cell-radius': '10px',
    '--v3-cal-gap': '3px',
    '--v3-dot': '6px',
    '--v3-dot-sm': '4px',
    '--v3-swatch': '9px',
    '--v3-swatch-radius': '3px',
    '--v3-legend-dash-w': '14px',
    '--v3-legend-dash-h': '2.5px',
    '--v3-bar-h': '10px',
    '--v3-chart-h': '180px',
    '--v3-donut-size': '132px',
    '--v3-tile': '36px',
    '--v3-name-col': '200px',
    '--v3-count-col': '88px',
    '--v3-icon-sm': '15px',
    '--v3-icon-md': '20px',
    '--v3-alert-icon-svg': '18px',
    '--v3-cal-nav': '30px',
    '--v3-tag-py': '5px',
    // --v3-cta-h/-sm (48/44, pin l.281 do protótipo) NÃO existem mais:
    // D-1008-R7 inverteu o pin — altura de CTA é a canônica do Button
    // (--btn-height-md), e os tokens morreram na fonte (component.json).
    // O pin da decisão vive em Button.test.tsx (sizes cta/cta-sm).
    '--v3-label-spacing': '0.06em',
    '--v3-band-size': '1.0625rem',
  };

  for (const [nome, valor] of Object.entries(esperado)) {
    it(`${nome}: ${valor}`, () => {
      expect(css).toContain(`${nome}: ${valor};`);
    });
  }
});
