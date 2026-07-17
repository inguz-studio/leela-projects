/**
 * Camada de aliases shadcn→brasa (tokens/shadcn.json) — prova por número.
 *
 * Três garantias, nos 2 temas (brasa escuro, wine claro):
 *   1. Todo alias resolve para um token SEMÂNTICO existente (nunca dangle).
 *   2. O CSS gerado emite `--<alias>: var(--<semantic>)` exatamente como
 *      mapeado — a ponte é gerada pelo pipeline, nunca escrita à mão.
 *   3. Transferência de AA: todo par fg/bg que um componente shadcn stock
 *      pode formar com os aliases cai num par da matriz de contraste do E01
 *      (contrast.test.ts) — re-provado aqui direto nos hex resolvidos:
 *      texto ≥ 4.5:1 (WCAG 1.4.3), não-texto ≥ 3.0:1 (WCAG 1.4.11).
 *
 * Componente shadcn novo que introduzir par fg/bg FORA desta tabela deve
 * adicionar o par aqui E na matriz principal — regra de lote do brief
 * ds-consolidacao-shadcn-brasa.
 */

import { describe, it, expect } from 'vitest';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesWine from '../../../tokens/primitives.wine.json';
import semanticBase from '../../../tokens/semantic.json';
import semanticWine from '../../../tokens/semantic.wine.json';
import component from '../../../tokens/component.json';
import shadcnAliases from '../../../tokens/shadcn.json';
import {
  generateCSS,
  generateRNTheme,
  mergeTokens,
  type TokenRecord,
  type FlatTokens,
} from '../generate';

// ---------------------------------------------------------------------------
// WCAG 2.x contrast (cópia local mínima — candidata a util compartilhado no
// Lote A; contrast.test.ts mantém a original para não acoplar arquivos de teste)
// ---------------------------------------------------------------------------

function srgbChannel(hex8bit: number): number {
  const c = hex8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Mapa alias → token semântico (espelho de tokens/shadcn.json)
// ---------------------------------------------------------------------------

const ALIAS_TO_SEMANTIC: Record<string, string> = {
  background: 'surface-base',
  foreground: 'text-primary',
  card: 'surface-raised',
  'card-foreground': 'text-primary',
  popover: 'surface-overlay',
  'popover-foreground': 'text-primary',
  primary: 'action-primary',
  'primary-foreground': 'action-primary-fg',
  secondary: 'action-secondary',
  'secondary-foreground': 'action-secondary-fg',
  muted: 'surface-overlay',
  'muted-foreground': 'text-tertiary',
  accent: 'action-ghost-hover',
  'accent-foreground': 'action-ghost-fg',
  destructive: 'action-destructive',
  'destructive-foreground': 'action-destructive-fg',
  border: 'border-default',
  input: 'border-strong',
  ring: 'border-focus',
  // radius-lg desde o patch de congruência 2026-07-06 (card do mockup = 12px;
  // rounded-md/sm derivam por calc -4/-6 no preset → 8px/6px, degraus da escala)
  radius: 'radius-lg',
};

// Pares fg/bg que componentes shadcn stock formam com os aliases
const ALIAS_TEXT_PAIRS: Array<[fg: string, bg: string]> = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
];

const ALIAS_NON_TEXT_PAIRS: Array<[fg: string, bg: string]> = [
  ['ring', 'background'],
  ['input', 'background'],
];

// ---------------------------------------------------------------------------
// Temas resolvidos a hex (mesmo pipeline do generate-tokens)
// ---------------------------------------------------------------------------

const brasa: FlatTokens = generateRNTheme(
  primitivesBrasa as TokenRecord,
  semanticBase as TokenRecord,
  component as TokenRecord,
);

const wine: FlatTokens = generateRNTheme(
  primitivesWine as TokenRecord,
  mergeTokens(semanticBase as TokenRecord, semanticWine as TokenRecord),
  component as TokenRecord,
);

const themes: Array<[string, FlatTokens]> = [
  ['brasa', brasa],
  ['wine', wine],
];

function resolveAlias(tokens: FlatTokens, alias: string): string {
  const semantic = ALIAS_TO_SEMANTIC[alias];
  const value = semantic !== undefined ? tokens[semantic] : undefined;
  if (value === undefined) throw new Error(`alias ${alias} não resolve`);
  return value;
}

// ---------------------------------------------------------------------------
// 1+2 — mapa completo e CSS emitido pelo pipeline
// ---------------------------------------------------------------------------

describe('Aliases shadcn — integridade do mapa', () => {
  it('tokens/shadcn.json cobre exatamente os aliases do mapa espelho', () => {
    const fromDisk = Object.keys(shadcnAliases as TokenRecord).sort();
    const mirror = Object.keys(ALIAS_TO_SEMANTIC).sort();
    expect(fromDisk).toEqual(mirror);
  });

  for (const [themeName, tokens] of themes) {
    it(`todo alias de cor resolve a hex no tema ${themeName}`, () => {
      for (const [alias, semantic] of Object.entries(ALIAS_TO_SEMANTIC)) {
        if (alias === 'radius') continue; // dimensional, não cor
        expect(tokens[semantic], `alias ${alias} → ${semantic} ausente`).toMatch(
          /^#[0-9a-fA-F]{6}$/,
        );
      }
    });
  }

  it('CSS gerado emite --<alias>: var(--<semantic>) para os 2 temas', () => {
    const brasaCSS = generateCSS(
      'brasa',
      primitivesBrasa as TokenRecord,
      semanticBase as TokenRecord,
      component as TokenRecord,
      { aliases: shadcnAliases as TokenRecord },
    );
    const wineCSS = generateCSS(
      'wine',
      primitivesWine as TokenRecord,
      mergeTokens(semanticBase as TokenRecord, semanticWine as TokenRecord),
      component as TokenRecord,
      { aliases: shadcnAliases as TokenRecord },
    );
    for (const [alias, semantic] of Object.entries(ALIAS_TO_SEMANTIC)) {
      const expected = `  --${alias}: var(--${semantic});`;
      expect(brasaCSS, `brasa sem ${expected}`).toContain(expected);
      expect(wineCSS, `wine sem ${expected}`).toContain(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// 3 — transferência de AA para componentes shadcn stock
// ---------------------------------------------------------------------------

for (const [themeName, tokens] of themes) {
  describe(`Contraste AA via aliases — tema ${themeName}`, () => {
    describe('texto ≥ 4.5:1', () => {
      for (const [fg, bg] of ALIAS_TEXT_PAIRS) {
        it(`${fg} sobre ${bg}`, () => {
          const ratio = contrastRatio(resolveAlias(tokens, fg), resolveAlias(tokens, bg));
          expect(
            ratio,
            `${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 < 4.5:1`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    });

    describe('não-texto ≥ 3.0:1', () => {
      for (const [fg, bg] of ALIAS_NON_TEXT_PAIRS) {
        it(`${fg} sobre ${bg}`, () => {
          const ratio = contrastRatio(resolveAlias(tokens, fg), resolveAlias(tokens, bg));
          expect(
            ratio,
            `${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 < 3.0:1`,
          ).toBeGreaterThanOrEqual(3.0);
        });
      }
    });
  });
}
