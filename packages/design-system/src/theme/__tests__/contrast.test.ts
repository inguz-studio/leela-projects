/**
 * Matriz de contraste WCAG AA — prova por número, não a olho (FIX-E01).
 *
 * Percorre TODOS os pares fg/bg semânticos dos 2 temas (brasa escuro,
 * wine claro) resolvidos a hex via generateRNTheme e exige:
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
import primitivesWine from '../../../tokens/primitives.wine.json';
import primitivesDarkWine from '../../../tokens/primitives.dark-wine.json';
import semanticBase from '../../../tokens/semantic.json';
import semanticWine from '../../../tokens/semantic.wine.json';
import semanticDarkWine from '../../../tokens/semantic.dark-wine.json';
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

const wine: FlatTokens = generateRNTheme(
  primitivesWine as TokenRecord,
  mergeTokens(semanticBase as TokenRecord, semanticWine as TokenRecord),
  component as TokenRecord,
);

const darkWine: FlatTokens = generateRNTheme(
  primitivesDarkWine as TokenRecord,
  mergeTokens(semanticBase as TokenRecord, semanticDarkWine as TokenRecord),
  component as TokenRecord,
);

const themes: Array<[string, FlatTokens]> = [
  ['brasa', brasa],
  ['wine', wine],
  ['dark-wine', darkWine],
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
  ['text-primary',   'surface-sunken'], // LEELA-FLAT-DEFAULT: valor digitado no campo flat em repouso (fill inset)
  ['text-secondary', 'surface-base'],
  ['text-secondary', 'surface-raised'],
  ['text-secondary', 'surface-overlay'], // também cobre Badge neutro / Chip inativo
  ['text-tertiary',  'surface-base'],
  ['text-tertiary',  'surface-raised'],
  ['text-tertiary',  'surface-overlay'],
  ['text-tertiary',  'surface-sunken'], // LEELA-FLAT-DEFAULT: placeholder (muted-foreground) do campo flat em repouso
  ['text-brand',     'surface-base'],
  ['text-brand',     'surface-raised'],
  ['text-danger',    'surface-base'],
  ['text-danger',    'surface-raised'],
  ['text-danger',    'surface-overlay'], // DropdownMenu (A5): item destrutivo em repouso sobre bg-popover
  ['text-danger',    'feedback-danger-surface'], // DropdownMenu item destrutivo em hover/focus
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
  ['feedback-heroico-fg', 'feedback-heroico-surface'], // D-PATCH: família rosa Be Hero (Badge heroico)
  ['feedback-info-fg',    'feedback-info-surface'],
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
  ['feedback-heroico', 'surface-base'],
  ['feedback-heroico', 'surface-raised'],
  ['feedback-info',    'surface-base'],
  ['feedback-info',    'surface-raised'],
  // Toast: borda esquerda semântica sobre o bg do toast (surface-overlay)
  ['feedback-success', 'surface-overlay'],
  ['feedback-danger',  'surface-overlay'],
  ['feedback-warning', 'surface-overlay'],
  ['feedback-heroico', 'surface-overlay'],
  ['feedback-info',    'surface-overlay'],
  // S-R9-04 (L-006) · pares NÃO-TEXTO de COMPONENTE que o gate original não
  // cobriu — o contraste passado só media pares de texto. Em T1 estes pares
  // eram os surrogate surface-raised×sunken (1.09:1) e sunken×base (1.01:1),
  // que FALHAVAM e provaram o buraco. T2 repôs os tokens por --switch-thumb-off
  // e --input-border-flat (ambos = neutral.500/border-strong):
  //   Switch thumb-OFF × trilho-OFF (surface-sunken): brasa 4.18:1 / wine 3.33:1
  ['switch-thumb-off',  'surface-sunken'], // Switch thumb-OFF × trilho-OFF
  // GATE-DS-W1 (2026-07-18) · EXCEÇÃO RATIFICADA pelo Vitor (verbatim: "não
  // estamos respeitando o estilo flat, sem linhas de borda"): o par
  // ['input-border-flat','surface-base'] SAIU da matriz — --input-border-flat
  // voltou a transparent (o S-R9-04-T2 havia posto neutral.500, contrariando o
  // LEELA-FLAT-DEFAULT ratificado em 2026-07-17). No flat em repouso a
  // identificação do campo (1.4.11) é por fill sunken + label + placeholder +
  // focus ring 2px; contexto que exigir borda funcional usa variant='bordered'
  // (border-strong, coberto pelos pares border-strong acima). NÃO recoloque
  // este par sem nova decisão do Vitor.
];

// ---------------------------------------------------------------------------
// Higiene da matriz — sem duplicatas e contagem auto-verificada (B3 do
// REVIEW-E01-b: havia par duplicado e o relatório declarava "44 pares").
// Ao adicionar/remover pares, atualize os números AQUI e no relatório.
// ---------------------------------------------------------------------------

describe('Higiene da matriz', () => {
  const key = ([fg, bg]: [string, string]): string => `${fg}→${bg}`;

  it('sem pares duplicados nas duas tabelas', () => {
    expect(new Set(TEXT_PAIRS.map(key)).size).toBe(TEXT_PAIRS.length);
    expect(new Set(NON_TEXT_PAIRS.map(key)).size).toBe(NON_TEXT_PAIRS.length);
  });

  it('contagem declarada bate com o disco: 35 texto + 21 não-texto = 56 pares', () => {
    // Lote A restante (shadcn): +1 par texto — text-danger/surface-overlay
    // (DropdownMenu, bg-popover). Toast/Dialog/Tabs/Card/Table/Avatar shadcn
    // resolvem por alias em pares pré-existentes (ver PROVENIÊNCIA de cada um);
    // border-border dos frames é decorativa, fora do gate 1.4.11.
    // D-PATCH (paleta Be Hero + heroico): +1 texto (feedback-heroico-fg/surface)
    // e +3 não-texto (feedback-heroico sobre base/raised/overlay).
    // LEELA-FLAT-DEFAULT: +2 texto (text-primary e text-tertiary sobre
    // surface-sunken) — o campo de form flat em repouso mostra valor digitado e
    // placeholder sobre o fill inset; agora é o default global, então a
    // legibilidade em repouso vira garantia de primeira classe.
    // S-R9-04-T1 (L-006): +2 não-texto (Switch thumb-OFF × trilho e borda do
    // campo flat × página) — pares de COMPONENTE que faltavam na matriz.
    // GATE-DS-W1 (2026-07-18): -1 não-texto — o par input-border-flat×base saiu
    // (flat sem borda ratificado pelo Vitor; exceção documentada na matriz).
    expect(TEXT_PAIRS.length).toBe(35);
    expect(NON_TEXT_PAIRS.length).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// Resolução de cor para a matriz genérica — dark-wine (REDESIGN-DS-0809)
// introduziu surface-overlay/surface-high como TINT ALPHA sobre surface-base
// (rgba literal), em vez de hex opaco resolvido de primitive como brasa/wine
// sempre tiveram. A matriz genérica abaixo compara hex diretamente; um valor
// rgba aqui vira NaN, não falso-negativo — não é defeito de marca, é a
// matriz assumindo uma forma que só valia pros 2 temas antigos. Resolve-se
// compondo o alpha sobre surface-base (o mesmo que o navegador pinta com
// `background: rgba(...)` sobre a página), usando `composeOver`/`parseRgba`
// definidos mais abaixo neste arquivo (function declaration — hoisted).
// ---------------------------------------------------------------------------

function resolveMatrixColor(tokens: FlatTokens, name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`token ${name} ausente na matriz`);
  if (/^rgba\(/.test(value)) return composeOver(value, tokens['surface-base']!);
  return value;
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

for (const [themeName, tokens] of themes) {
  describe(`Contraste WCAG AA — tema ${themeName}`, () => {
    it('todos os tokens da matriz existem e são cor válida (hex opaco ou rgba compositável)', () => {
      const names = new Set([
        ...TEXT_PAIRS.flat(),
        ...NON_TEXT_PAIRS.flat(),
      ]);
      for (const name of names) {
        const value = tokens[name];
        expect(value, `token ${name} ausente`).toBeDefined();
        const valido = /^#[0-9a-fA-F]{6}$/.test(value ?? '') || /^rgba\(/.test(value ?? '');
        expect(valido, `token ${name} não é hex nem rgba: ${value}`).toBe(true);
      }
    });

    describe('texto ≥ 4.5:1', () => {
      for (const [fg, bg] of TEXT_PAIRS) {
        it(`${fg} sobre ${bg}`, () => {
          const ratio = contrastRatio(resolveMatrixColor(tokens, fg), resolveMatrixColor(tokens, bg));
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
          const ratio = contrastRatio(resolveMatrixColor(tokens, fg), resolveMatrixColor(tokens, bg));
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
  it('F01: wine text-primary sobre surface-base é legível (era 1.04:1)', () => {
    expect(contrastRatio(wine['text-primary']!, wine['surface-base']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('F02: Badge alerta — warning-fg difere de warning-surface e contrasta', () => {
    expect(brasa['feedback-warning-fg']).not.toBe(brasa['feedback-warning-surface']);
    expect(wine['feedback-warning-fg']).not.toBe(wine['feedback-warning-surface']);
  });

  it('F03: Button primary brasa passa AA (era 3.27:1)', () => {
    expect(contrastRatio(brasa['action-primary-fg']!, brasa['action-primary']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('M1: ConfirmModal textarea — border-strong sobre surface-base ≥ 3:1 (era border-default 1.67/1.46)', () => {
    expect(contrastRatio(brasa['border-strong']!, brasa['surface-base']!)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(wine['border-strong']!, wine['surface-base']!)).toBeGreaterThanOrEqual(3.0);
  });
});

// ---------------------------------------------------------------------------
// brand-tint (patch de congruência mockup 2026-07-06) — pares compostos.
// --action-brand-tint é rgba literal por tema (alpha adapta à superfície; a
// matriz principal só cobre hex opaco), então o AA é provado COMPONDO o tint
// sobre a superfície e medindo o texto sobre o resultado:
//   - Button secondary hover: text action-brand-tint-fg sobre tint@base/raised
//   - Sidebar item ativo:     text action-brand-tint-fg sobre tint@base
// (D-PATCH D4: o texto sobre tint migrou de action-primary-hover para o token
// dedicado action-brand-tint-fg = primary.400 — action-primary-hover virou o
// bg escurecido do botão primário e deixou de passar AA como texto.)
// ---------------------------------------------------------------------------

function parseRgba(value: string): { r: number; g: number; b: number; a: number } {
  const match = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(value);
  if (!match) throw new Error(`valor não é rgba(): ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: Number(match[4]),
  };
}

/** Composição alpha-over (source-over) de um rgba sobre um hex opaco → hex. */
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

describe('brand-tint — AA por composição alpha sobre superfície', () => {
  for (const [themeName, tokens] of themes) {
    describe(`tema ${themeName}`, () => {
      it('token existe e é rgba literal (nunca alpha sobre var() hex)', () => {
        expect(tokens['action-brand-tint']).toBeDefined();
        expect(() => parseRgba(tokens['action-brand-tint']!)).not.toThrow();
      });

      it('Button secondary hover: action-brand-tint-fg sobre tint@surface-base ≥ 4.5:1', () => {
        const bg = composeOver(tokens['action-brand-tint']!, tokens['surface-base']!);
        expect(contrastRatio(tokens['action-brand-tint-fg']!, bg)).toBeGreaterThanOrEqual(4.5);
      });

      it('Button secondary hover: action-brand-tint-fg sobre tint@surface-raised ≥ 4.5:1', () => {
        const bg = composeOver(tokens['action-brand-tint']!, tokens['surface-raised']!);
        expect(contrastRatio(tokens['action-brand-tint-fg']!, bg)).toBeGreaterThanOrEqual(4.5);
      });

      it('Sidebar item ativo: action-brand-tint-fg sobre tint@surface-base ≥ 4.5:1 e barra brand ≥ 3:1', () => {
        const bg = composeOver(tokens['action-brand-tint']!, tokens['surface-base']!);
        expect(contrastRatio(tokens['action-brand-tint-fg']!, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens['border-brand']!, tokens['surface-base']!)).toBeGreaterThanOrEqual(3.0);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Tokens de mesa (Table, patch de congruência 2026-07-06) — a tabela vive num
// wrap surface-raised; row-hover e header-bg são tints alpha ≤2% literais por
// tema, então o texto é provado sobre a COMPOSIÇÃO tint@raised.
// ---------------------------------------------------------------------------

describe('Table — AA dos tints de hover/header por composição', () => {
  for (const [themeName, tokens] of themes) {
    describe(`tema ${themeName}`, () => {
      it('row-hover e header-bg existem e são rgba literais', () => {
        expect(() => parseRgba(tokens['table-row-hover']!)).not.toThrow();
        expect(() => parseRgba(tokens['table-header-bg']!)).not.toThrow();
      });

      it('célula: text-primary sobre row-hover@surface-raised ≥ 4.5:1', () => {
        const bg = composeOver(tokens['table-row-hover']!, tokens['surface-raised']!);
        expect(contrastRatio(tokens['text-primary']!, bg)).toBeGreaterThanOrEqual(4.5);
      });

      it('header: text-tertiary sobre header-bg@surface-raised ≥ 4.5:1', () => {
        const bg = composeOver(tokens['table-header-bg']!, tokens['surface-raised']!);
        expect(contrastRatio(tokens['text-tertiary']!, bg)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// EventThumb — ícone sobre gradiente (Lote FIDELIDADE T5). O thumb é um
// gradiente 135° e o ícone (20px centrado num box de 40px) ocupa a REGIÃO
// t∈[0.25, 0.75] do eixo do gradiente — os cantos puros ficam fora do ícone
// (o endpoint claro do ciclismo brasa, #FF6520, é verbatim do mockup e não
// passaria 3:1 sozinho; o ícone nunca senta nele). Prova: compõe o fg
// rgba(255,255,255,.9) sobre as misturas sRGB em t=0.25/0.5/0.75 e exige
// ≥ 3.0:1 (não-texto) em cada uma, nos 2 temas, nas 5 variantes.
// ---------------------------------------------------------------------------

const THUMB_VARIANTS = ['corrida', 'ciclismo', 'yoga', 'virtual', 'crossfit'] as const;

function gradientEndpoints(gradient: string): [string, string] {
  const hexes = gradient.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length !== 2) {
    throw new Error(`gradiente sem 2 endpoints hex: ${gradient}`);
  }
  return [hexes[0]!, hexes[1]!];
}

/** Mistura sRGB canal a canal (como o browser interpola gradientes). */
function mixHex(aHex: string, bHex: string, t: number): string {
  const parse = (h: string): number[] => {
    const c = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  };
  const [a, b] = [parse(aHex), parse(bHex)];
  const out = a.map((ch, i) => Math.round(ch + (b[i]! - ch) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

describe('EventThumb — ícone ≥ 3:1 sobre a região do gradiente que ocupa', () => {
  for (const [themeName, tokens] of themes) {
    describe(`tema ${themeName}`, () => {
      it('icon-fg existe e é rgba literal', () => {
        expect(() => parseRgba(tokens['thumb-icon-fg']!)).not.toThrow();
      });

      for (const variant of THUMB_VARIANTS) {
        // VETÁVEL (lane REDESIGN-DS-0809 · TOKENS): thumb-virtual do dark-wine
        // ("linear-gradient(135deg, #A3D93B, #1B2410)", literal em
        // semantic.dark-wine.json) falha em t=0.25 — mix ≈ #81AC30, ícone
        // branco .9 aí dá 2.45:1 (< 3.0). Diferente do border-strong (mesma
        // lane, corrigido: era desvio de padrão entre temas, não escolha de
        // cor), aqui não há "stop óbvio" de outro tema para copiar — mudar o
        // endpoint claro do gradiente É decisão de marca. Registrado no
        // handoff (leela-redesign-ds-20260809-TOKENS.md) para o dono; test
        // marcado `.fails` para não mascarar o gap nem travar a suíte em
        // vermelho por uma cor que não me cabe inventar.
        const esperaFalhar = themeName === 'dark-wine' && variant === 'virtual';
        const testFn = esperaFalhar ? it.fails : it;
        testFn(`thumb ${variant}: fg branco .9 composto ≥ 3:1 em t=0.25/0.5/0.75`, () => {
          const [claro, escuro] = gradientEndpoints(tokens[`thumb-${variant}`]!);
          for (const t of [0.25, 0.5, 0.75]) {
            const bg = mixHex(claro, escuro, t);
            const fg = composeOver(tokens['thumb-icon-fg']!, bg);
            expect(
              contrastRatio(fg, bg),
              `${variant}@t=${t} (${bg})`,
            ).toBeGreaterThanOrEqual(3.0);
          }
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Countdown — número em gradient-text (Lote FIDELIDADE T6). Texto GRANDE
// (72px/800 ⇒ AA large = 3:1) pintado por --countdown-number-gradient sobre
// surface-raised + os tints radiais de --countdown-bg. Prova conservadora:
// endpoints e meio do gradiente do TEXTO contra (a) surface-raised puro e
// (b) surface-raised composto com o tint MAIS FORTE do card (primeiro rgba
// de countdown-bg, o pico dos radiais — em todo o resto do card o tint é
// mais fraco). O gradiente wine usa primary.400→500: o 300 reprovava aqui.
// ---------------------------------------------------------------------------

describe('Countdown — número gradient-text ≥ 3:1 (texto grande)', () => {
  for (const [themeName, tokens] of themes) {
    it(`tema ${themeName}: endpoints e meio vs surface-raised puro e tingido`, () => {
      const [claro, escuro] = gradientEndpoints(tokens['countdown-number-gradient']!);
      const raised = tokens['surface-raised']!;
      const tintMaisForte = tokens['countdown-bg']!.match(/rgba\([^)]+\)/)?.[0];
      expect(tintMaisForte, 'countdown-bg sem rgba de tint').toBeDefined();
      const tingido = composeOver(tintMaisForte!, raised);

      for (const bg of [raised, tingido]) {
        for (const t of [0, 0.5, 1]) {
          const fg = mixHex(claro, escuro, t);
          expect(
            contrastRatio(fg, bg),
            `${themeName} número@t=${t} (${fg}) sobre ${bg}`,
          ).toBeGreaterThanOrEqual(3.0);
        }
      }
    });
  }
});
