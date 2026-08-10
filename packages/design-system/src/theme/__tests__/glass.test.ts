/**
 * Camada glass (REDESIGN-DS-0809 · handoff §2) — prova por número, não a
 * olho. Três regras não-negociáveis do handoff:
 *   1. O glow de fundo é fixo no viewport (background-attachment: fixed —
 *      isso é responsabilidade de quem CONSOME --page-glow, fora do
 *      território desta lane; aqui só se prova que o token existe).
 *   2. A superfície é translúcida; o texto NUNCA é — todo par
 *      superfície/texto mantém 4.5:1 medido sobre o fundo COMPOSTO.
 *   3. Fallback obrigatório: sem `backdrop-filter`, o card cai para a
 *      superfície opaca do tema.
 *
 * Este arquivo prova o MECANISMO (tokens + CSS gerado), não o pixel — nenhum
 * componente foi tocado por esta lane (nenhum lê `--card-blur` ainda; ver
 * handoff `.nirvana/handoffs/leela-redesign-ds-20260809-TOKENS.md`).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import glassTokensJson from '../../../tokens/glass.json';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesWine from '../../../tokens/primitives.wine.json';
import primitivesDarkWine from '../../../tokens/primitives.dark-wine.json';
import semanticBase from '../../../tokens/semantic.json';
import semanticWine from '../../../tokens/semantic.wine.json';
import semanticDarkWine from '../../../tokens/semantic.dark-wine.json';
import component from '../../../tokens/component.json';
import {
  generateCSS,
  generateRNTheme,
  generateGlassActivationBlock,
  glassExtraFor,
  mergeTokens,
  type TokenRecord,
  type FlatTokens,
  type GlassTokens,
} from '../generate';

const RAIZ_DS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const glass = glassTokensJson as GlassTokens;

// ---------------------------------------------------------------------------
// Contraste local (cópia mínima — mesma razão de contrast.test.ts/
// shadcn-aliases.test.ts: não acoplar arquivos de teste)
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

function parseRgba(value: string): { r: number; g: number; b: number; a: number } {
  const match = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(value);
  if (!match) throw new Error(`valor não é rgba(): ${value}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: Number(match[4]) };
}

function composeOver(rgba: string, bgHex: string): string {
  const { r, g, b, a } = parseRgba(rgba);
  const clean = bgHex.replace('#', '');
  const bg = [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ] as const;
  const out = [r, g, b].map((c, i) => Math.round(a * c + (1 - a) * bg[i]!));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// Temas resolvidos (mesmo pipeline do generate-tokens)
// ---------------------------------------------------------------------------

const brasa = primitivesBrasa as TokenRecord;
const wine = primitivesWine as TokenRecord;
const darkWine = primitivesDarkWine as TokenRecord;
const semBrasa = semanticBase as TokenRecord;
const semWine = mergeTokens(semanticBase as TokenRecord, semanticWine as TokenRecord);
const semDarkWine = mergeTokens(semanticBase as TokenRecord, semanticDarkWine as TokenRecord);
const comp = component as TokenRecord;

const TEMAS = [
  { nome: 'brasa', prims: brasa, semantic: semBrasa },
  { nome: 'wine', prims: wine, semantic: semWine },
  { nome: 'dark-wine', prims: darkWine, semantic: semDarkWine },
] as const;

const brasaTokens: FlatTokens = generateRNTheme(brasa, semBrasa, comp);
const wineTokens: FlatTokens = generateRNTheme(wine, semWine, comp);
const darkWineTokens: FlatTokens = generateRNTheme(darkWine, semDarkWine, comp);
const themes: Array<[string, FlatTokens]> = [
  ['brasa', brasaTokens],
  ['wine', wineTokens],
  ['dark-wine', darkWineTokens],
];

// ---------------------------------------------------------------------------
// glass.json — estrutura
// ---------------------------------------------------------------------------

describe('tokens/glass.json — estrutura', () => {
  it('declara os 3 temas em cada propriedade', () => {
    const propriedades = ['blur', 'surface-raised', 'surface-overlay', 'elevation', 'page-glow'] as const;
    for (const prop of propriedades) {
      const temas = Object.keys(glass.glass[prop]).sort();
      expect(temas, `glass.${prop}`).toEqual(['brasa', 'dark-wine', 'wine']);
    }
  });

  it('surface-raised e surface-overlay são rgba (translúcidos por definição)', () => {
    for (const { nome } of TEMAS) {
      expect(glass.glass['surface-raised'][nome]).toMatch(/^rgba\(/);
      expect(glass.glass['surface-overlay'][nome]).toMatch(/^rgba\(/);
    }
  });
});

// ---------------------------------------------------------------------------
// Fio de luz — inset 0 1px 0 (regra do handoff: "é ele que faz o vidro
// parecer vidro. Não remover.") — critério de aceite explícito da lane.
// ---------------------------------------------------------------------------

describe('fio de luz do glass (inset 0 1px 0) presente em --glass-elevation', () => {
  it.each(TEMAS.map((t) => t.nome))('%s', (nome) => {
    expect(glass.glass.elevation[nome]).toMatch(/inset 0 1px 0 rgba\(255,255,255,/);
  });
});

// ---------------------------------------------------------------------------
// Bloco [data-glass="on"] + fallback @supports — no CSS gerado (por tema) e
// nos arquivos publicados (themes/*.css) — critério de aceite explícito.
// ---------------------------------------------------------------------------

describe('[data-glass="on"] remapeia os tokens genéricos, por tema', () => {
  for (const { nome, prims, semantic } of TEMAS) {
    it(`${nome}: --glass-* nasce dentro do próprio bloco [data-theme]`, () => {
      const css = generateCSS(nome, prims, semantic, comp, { extra: glassExtraFor(glass, nome) });
      const [bloco] = css.split(/\n\[data-glass/); // só o bloco de tema, antes do glass block
      expect(bloco).toContain(`--glass-blur: ${glass.glass.blur[nome]};`);
      expect(bloco).toContain(`--glass-surface-raised: ${glass.glass['surface-raised'][nome]};`);
      expect(bloco).toContain(`--glass-surface-overlay: ${glass.glass['surface-overlay'][nome]};`);
      expect(bloco).toContain(`--glass-elevation: ${glass.glass.elevation[nome]};`);
      expect(bloco).toContain(`--glass-page-glow: ${glass.glass['page-glow'][nome]};`);
    });
  }

  it('bloco de ativação é idêntico em texto, independente do tema (a cascata resolve)', () => {
    const bloco = generateGlassActivationBlock();
    expect(bloco).toContain('--card-blur: var(--glass-blur);');
    expect(bloco).toContain('--surface-raised: var(--glass-surface-raised);');
    expect(bloco).toContain('--surface-overlay: var(--glass-surface-overlay);');
    expect(bloco).toContain('--elevation-2: var(--glass-elevation);');
    expect(bloco).toContain('--page-glow: var(--glass-page-glow);');
  });

  it('fallback @supports presente, remapeia surface-raised para o companheiro opaco', () => {
    const bloco = generateGlassActivationBlock();
    expect(bloco).toContain('@supports not (backdrop-filter: blur(1px))');
    expect(bloco).toContain('--surface-raised: var(--surface-raised-opaque);');
  });
});

describe('os arquivos de tema publicados carregam o bloco glass', () => {
  const ARQUIVOS = ['themes/brasa.css', 'themes/wine.css', 'themes/dark-wine.css', 'themes/index.css'];

  it.each(ARQUIVOS)('%s contém [data-glass="on"] e o fallback @supports', (arquivo) => {
    const css = readFileSync(resolve(RAIZ_DS, arquivo), 'utf8');
    expect(css, `${arquivo} sem [data-glass="on"] — rode generate-tokens`).toContain('[data-glass="on"]');
    expect(css, `${arquivo} sem fallback @supports — rode generate-tokens`).toContain(
      '@supports not (backdrop-filter: blur(1px))',
    );
  });

  it('card.blur (component tier) nasce "none" nos 3 temas — default opaco', () => {
    const css = readFileSync(resolve(RAIZ_DS, 'themes/index.css'), 'utf8');
    const ocorrencias = css.match(/--card-blur: none;/g) ?? [];
    expect(ocorrencias.length, 'card-blur: none deveria aparecer 1x por tema (3 temas)').toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Regra não-negociável #2 — "a superfície é translúcida, o texto NUNCA é":
// todo par texto/surface-raised mantém 4.5:1 medido sobre o fundo GLASS
// composto (surface-base + glass-surface-raised), não sobre a cor nominal.
// ---------------------------------------------------------------------------

describe('glass — texto sobre glass-surface-raised composto (regra não-negociável #2)', () => {
  const TEXT_ROLES = ['text-primary', 'text-secondary', 'text-tertiary'] as const;

  for (const [nome, tokens] of themes) {
    describe(`tema ${nome}`, () => {
      const glassSurfaceRaised = glass.glass['surface-raised'][nome]!;

      it('glass-surface-raised é rgba compositável', () => {
        expect(() => parseRgba(glassSurfaceRaised)).not.toThrow();
      });

      for (const role of TEXT_ROLES) {
        it(`${role} sobre glass-surface-raised@surface-base ≥ 4.5:1`, () => {
          const bg = composeOver(glassSurfaceRaised, tokens['surface-base']!);
          const ratio = contrastRatio(tokens[role]!, bg);
          expect(
            ratio,
            `${role} (${tokens[role]}) sobre glass-surface-raised composto (${bg}) = ${ratio.toFixed(2)}:1 < 4.5:1`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }
});
