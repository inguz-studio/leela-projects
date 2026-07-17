import { describe, it, expect } from 'vitest';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesWine from '../../../tokens/primitives.wine.json';
import semantic from '../../../tokens/semantic.json';
import semanticWineOverrides from '../../../tokens/semantic.wine.json';
import component from '../../../tokens/component.json';
import {
  collectRefs,
  resolvePath,
  generateCSS,
  generateRNTheme,
  mergeTokens,
  type TokenRecord,
} from '../generate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const brasa = primitivesBrasa as TokenRecord;
const wine = primitivesWine as TokenRecord;
const sem   = semantic as TokenRecord;
// Semantic efetiva do tema wine = base + overrides (mesmo pipeline do gerador)
const semWine = mergeTokens(sem, semanticWineOverrides as TokenRecord);
const comp  = component as TokenRecord;

const componentRefs = collectRefs(comp);
const brasaRefs = [...collectRefs(sem), ...componentRefs];
const wineRefs = [...collectRefs(semWine), ...componentRefs];

// ---------------------------------------------------------------------------
// RULE: every {ref} in semantic (per-theme) + component resolves in its theme
// ---------------------------------------------------------------------------

describe('Semantic tokens resolve to existing primitives', () => {
  for (const ref of brasaRefs) {
    it(`"${ref}" → brasa`, () => {
      const path = ref.slice(1, -1).split('.');
      const value = resolvePath(brasa, path);
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
    });
  }

  for (const ref of wineRefs) {
    it(`"${ref}" → wine`, () => {
      const path = ref.slice(1, -1).split('.');
      const value = resolvePath(wine, path);
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
    });
  }
});

// ---------------------------------------------------------------------------
// mergeTokens
// ---------------------------------------------------------------------------

describe('mergeTokens', () => {
  it('override raso vence e resto da base sobrevive', () => {
    const merged = mergeTokens(
      { a: '1', nested: { x: '1', y: '2' } },
      { nested: { y: '9' } },
    );
    expect(merged).toEqual({ a: '1', nested: { x: '1', y: '9' } });
  });

  it('não muta base nem overrides', () => {
    const base = { nested: { x: '1' } };
    const over = { nested: { x: '2' } };
    mergeTokens(base, over);
    expect(base.nested.x).toBe('1');
    expect(over.nested.x).toBe('2');
  });

  it('wine herda text.brand da base e sobrescreve text.primary', () => {
    const text = semWine['text'] as Record<string, string>;
    expect(text['brand']).toBe('{primary.500}');
    expect(text['primary']).toBe('{neutral.900}');
  });
});

// ---------------------------------------------------------------------------
// CSS generation
// ---------------------------------------------------------------------------

describe('generateCSS', () => {
  it('brasa CSS contains [data-theme="brasa"] block', () => {
    const css = generateCSS('brasa', brasa, sem, comp);
    expect(css).toContain('[data-theme="brasa"]');
  });

  it('brasa CSS contains brand color #FF450C', () => {
    const css = generateCSS('brasa', brasa, sem, comp);
    expect(css).toContain('#FF450C');
  });

  it('wine CSS contains [data-theme="wine"] block', () => {
    const css = generateCSS('wine', wine, semWine, comp);
    expect(css).toContain('[data-theme="wine"]');
  });

  it('wine CSS contains Oxblood #7A1520', () => {
    const css = generateCSS('wine', wine, semWine, comp);
    expect(css).toContain('#7A1520');
  });

  it('wine CSS: surface-base referencia o neutro claro (papel invertido)', () => {
    const css = generateCSS('wine', wine, semWine, comp);
    expect(css).toMatch(/--surface-base:\s*var\(--neutral-50\)/);
  });

  it('CSS semantic var references a CSS var (not a raw hex)', () => {
    const css = generateCSS('brasa', brasa, sem, comp);
    // surface-base should chain to a primitive var, not a raw hex
    expect(css).toMatch(/--surface-base:\s*var\(--neutral-950\)/);
  });

  it('CSS contains btn-height-md component token', () => {
    // 36px = altura md do mockup be-hero (patch de congruência 2026-07-06)
    const css = generateCSS('brasa', brasa, sem, comp);
    expect(css).toContain('--btn-height-md: 36px');
  });

  it('rootFallback: brasa também pinta :root sem data-theme (anti-FOUC SSR)', () => {
    const css = generateCSS('brasa', brasa, sem, comp, { rootFallback: true });
    expect(css).toContain(':root:not([data-theme])');
    expect(css).toContain('[data-theme="brasa"]');
  });

  it('sem rootFallback o seletor fica restrito ao data-theme', () => {
    const css = generateCSS('wine', wine, semWine, comp);
    expect(css).not.toContain(':root');
  });
});

// ---------------------------------------------------------------------------
// RN theme generation
// ---------------------------------------------------------------------------

describe('generateRNTheme', () => {
  it('brasa RN theme has no unresolved {refs}', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    for (const [, value] of Object.entries(tokens)) {
      expect(value).not.toMatch(/^\{.+\}$/);
    }
  });

  it('wine RN theme has no unresolved {refs}', () => {
    const tokens = generateRNTheme(wine, semWine, comp);
    for (const [, value] of Object.entries(tokens)) {
      expect(value).not.toMatch(/^\{.+\}$/);
    }
  });

  it('brasa surface-base resolves to #0C0C0C', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    expect(tokens['surface-base']).toBe('#0C0C0C');
  });

  it('wine surface-base resolves to light background', () => {
    const tokens = generateRNTheme(wine, semWine, comp);
    // wine surface.base = {neutral.50} = #FDFAF7 (tema claro)
    expect(tokens['surface-base']).toBe('#FDFAF7');
  });

  it('brasa action-primary resolves to #D63500 (D4: laranja escurecido p/ fg branco AA)', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    // D-PATCH D4 (decisão Vitor): fg branco + bg escurecido até branco ≥ 4.5:1.
    // #D63500 = 4.81:1 com branco; a marca #FF450C segue em text-brand/border-brand.
    expect(tokens['action-primary']).toBe('#D63500');
    expect(tokens['action-primary-fg']).toBe('#FFFFFF');
  });
});

// ---------------------------------------------------------------------------
// Chaves "$..." são documentação (diretriz DTCG) — nunca viram var/entrada RN
// ---------------------------------------------------------------------------

describe('Chaves $doc não vazam para o output', () => {
  it('CSS não contém "--$" nem a diretriz de spacing como var', () => {
    const css = generateCSS('brasa', brasa, sem, comp, { rootFallback: true });
    expect(css).not.toContain('$description');
    expect(css).not.toContain('--spacing-$');
  });

  it('RN theme não contém chaves $', () => {
    const rn = generateRNTheme(brasa, sem, comp);
    expect(Object.keys(rn).some((k) => k.includes('$'))).toBe(false);
  });

  it('meio-passos do mockup existem nos 2 temas (2/6/10/14px)', () => {
    for (const prims of [brasa, wine]) {
      expect(resolvePath(prims, ['spacing', '0-5'])).toBe('2px');
      expect(resolvePath(prims, ['spacing', '1-5'])).toBe('6px');
      expect(resolvePath(prims, ['spacing', '2-5'])).toBe('10px');
      expect(resolvePath(prims, ['spacing', '3-5'])).toBe('14px');
    }
  });
});
