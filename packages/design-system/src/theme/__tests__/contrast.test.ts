/**
 * Matriz de contraste WCAG AA — prova por número, não a olho (FIX-E01).
 *
 * Percorre TODOS os pares fg/bg semânticos dos 2 temas (brasa escuro,
 * leela claro) resolvidos a hex via generateRNTheme e exige:
 *   - texto normal:        ≥ 4.5:1  (WCAG 1.4.3 AA)
 *   - não-texto (bordas
 *     funcionais, focus,
 *     superfícies sólidas): ≥ 3.0:1  (WCAG 1.4.11 AA)
 *
 * text-disabled fica fora da matriz: estados disabled são isentos pela
 * própria 1.4.3 ("incidental: ...part of an inactive user interface
 * component").
 */

import { describe, it, expect } from 'vitest';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesLeela from '../../../tokens/primitives.leela.json';
import semanticBase from '../../../tokens/semantic.json';
import semanticLeela from '../../../tokens/semantic.leela.json';
import component from '../../../tokens/component.json';
import {
  generateRNTheme,
  mergeTokens,
  type TokenRecord,
  type FlatTokens,
} from '../generate';

// ---------------------------------------------------------------------------
// WCAG 2.x relative luminance + contrast ratio
// ---------------------------------------------------------------------------

function srgbChannel(hex8bit: number): number {
  const c = hex8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (
    0.2126 * srgbChannel(r) +
    0.7152 * srgbChannel(g) +
    0.0722 * srgbChannel(b)
  );
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Temas resolvidos (hex) — mesmo pipeline do generate-tokens
// ---------------------------------------------------------------------------

const brasa: FlatTokens = generateRNTheme(
  primitivesBrasa as TokenRecord,
  semanticBase as TokenRecord,
  component as TokenRecord,
);

const leela: FlatTokens = generateRNTheme(
  primitivesLeela as TokenRecord,
  mergeTokens(semanticBase as TokenRecord, semanticLeela as TokenRecord),
  component as TokenRecord,
);

const themes: Array<[string, FlatTokens]> = [
  ['brasa', brasa],
  ['leela', leela],
];

// ---------------------------------------------------------------------------
// Matriz de pares — texto (AA 4.5:1)
// ---------------------------------------------------------------------------

const TEXT_PAIRS: Array<[fg: string, bg: string]> = [
  // Texto corrente sobre superfícies
  ['text-primary',   'surface-base'],
  ['text-primary',   'surface-raised'],
  ['text-primary',   'surface-overlay'],
  ['text-primary',   'surface-high'],
  ['text-secondary', 'surface-base'],
  ['text-secondary', 'surface-raised'],
  ['text-secondary', 'surface-overlay'],
  ['text-tertiary',  'surface-base'],
  ['text-tertiary',  'surface-raised'],
  ['text-tertiary',  'surface-overlay'],
  ['text-brand',     'surface-base'],
  ['text-brand',     'surface-raised'],
  ['text-danger',    'surface-base'],
  ['text-danger',    'surface-raised'],
  ['text-danger',    'feedback-danger-surface'], // Popover item destrutivo em hover
  ['text-success',   'surface-base'],
  ['text-success',   'surface-raised'],
  // Botões (Button/Chip ativo/Badge brand) — todos os estados
  ['action-primary-fg',     'action-primary'],
  ['action-primary-fg',     'action-primary-hover'],
  ['action-primary-fg',     'action-primary-pressed'],
  ['action-secondary-fg',   'action-secondary'],
  ['action-secondary-fg',   'action-secondary-hover'],
  ['action-ghost-fg',       'surface-base'],
  ['action-ghost-fg',       'action-ghost-hover'],
  ['action-destructive-fg', 'action-destructive'],
  ['action-destructive-fg', 'action-destructive-hover'],
  ['action-destructive-fg', 'action-destructive-pressed'],
  // Badges/Toasts de feedback (F02: alerta era fg==surface, 1:1)
  ['feedback-success-fg', 'feedback-success-surface'],
  ['feedback-danger-fg',  'feedback-danger-surface'],
  ['feedback-warning-fg', 'feedback-warning-surface'],
  ['feedback-info-fg',    'feedback-info-surface'],
  // Badge neutro / Chip inativo
  ['text-secondary', 'surface-overlay'],
];

// ---------------------------------------------------------------------------
// Matriz de pares — não-texto (AA 3.0:1): focus ring, borda funcional,
// superfícies sólidas de ação/feedback contra o fundo
// ---------------------------------------------------------------------------

const NON_TEXT_PAIRS: Array<[fg: string, bg: string]> = [
  ['border-focus',  'surface-base'],
  ['border-strong', 'surface-base'],
  ['border-strong', 'surface-raised'],
  ['action-primary',     'surface-base'],
  ['action-destructive', 'surface-base'],
  ['feedback-success', 'surface-base'],
  ['feedback-success', 'surface-raised'],
  ['feedback-danger',  'surface-base'],
  ['feedback-danger',  'surface-raised'],
  ['feedback-warning', 'surface-base'],
  ['feedback-warning', 'surface-raised'],
  ['feedback-info',    'surface-base'],
  ['feedback-info',    'surface-raised'],
  // Toast: borda esquerda semântica sobre o bg do toast (surface-overlay)
  ['feedback-success', 'surface-overlay'],
  ['feedback-danger',  'surface-overlay'],
  ['feedback-warning', 'surface-overlay'],
  ['feedback-info',    'surface-overlay'],
];

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

for (const [themeName, tokens] of themes) {
  describe(`Contraste WCAG AA — tema ${themeName}`, () => {
    it('todos os tokens da matriz existem e são hex', () => {
      const names = new Set([
        ...TEXT_PAIRS.flat(),
        ...NON_TEXT_PAIRS.flat(),
      ]);
      for (const name of names) {
        expect(tokens[name], `token ${name} ausente`).toBeDefined();
        expect(tokens[name], `token ${name} não é hex: ${tokens[name]}`).toMatch(
          /^#[0-9a-fA-F]{6}$/,
        );
      }
    });

    describe('texto ≥ 4.5:1', () => {
      for (const [fg, bg] of TEXT_PAIRS) {
        it(`${fg} sobre ${bg}`, () => {
          const ratio = contrastRatio(tokens[fg]!, tokens[bg]!);
          expect(
            ratio,
            `${fg} (${tokens[fg]}) sobre ${bg} (${tokens[bg]}) = ${ratio.toFixed(2)}:1 < 4.5:1`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    });

    describe('não-texto ≥ 3.0:1', () => {
      for (const [fg, bg] of NON_TEXT_PAIRS) {
        it(`${fg} sobre ${bg}`, () => {
          const ratio = contrastRatio(tokens[fg]!, tokens[bg]!);
          expect(
            ratio,
            `${fg} (${tokens[fg]}) sobre ${bg} (${tokens[bg]}) = ${ratio.toFixed(2)}:1 < 3.0:1`,
          ).toBeGreaterThanOrEqual(3.0);
        });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Regressões nomeadas do audit (F01/F02/F03) — nunca voltar
// ---------------------------------------------------------------------------

describe('Regressões do REVIEW-E01', () => {
  it('F01: leela text-primary sobre surface-base é legível (era 1.04:1)', () => {
    expect(contrastRatio(leela['text-primary']!, leela['surface-base']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('F02: Badge alerta — warning-fg difere de warning-surface e contrasta', () => {
    expect(brasa['feedback-warning-fg']).not.toBe(brasa['feedback-warning-surface']);
    expect(leela['feedback-warning-fg']).not.toBe(leela['feedback-warning-surface']);
  });

  it('F03: Button primary brasa passa AA (era 3.27:1)', () => {
    expect(contrastRatio(brasa['action-primary-fg']!, brasa['action-primary']!)).toBeGreaterThanOrEqual(4.5);
  });
});
