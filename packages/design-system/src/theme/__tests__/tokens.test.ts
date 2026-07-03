import { describe, it, expect } from 'vitest';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesLeela from '../../../tokens/primitives.leela.json';
import semantic from '../../../tokens/semantic.json';
import semanticLeelaOverrides from '../../../tokens/semantic.leela.json';
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
const leela = primitivesLeela as TokenRecord;
const sem   = semantic as TokenRecord;
// Semantic efetiva do tema leela = base + overrides (mesmo pipeline do gerador)
const semLeela = mergeTokens(sem, semanticLeelaOverrides as TokenRecord);
const comp  = component as TokenRecord;

const componentRefs = collectRefs(comp);
const brasaRefs = [...collectRefs(sem), ...componentRefs];
const leelaRefs = [...collectRefs(semLeela), ...componentRefs];

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

  for (const ref of leelaRefs) {
    it(`"${ref}" → leela`, () => {
      const path = ref.slice(1, -1).split('.');
      const value = resolvePath(leela, path);
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

  it('leela herda text.brand da base e sobrescreve text.primary', () => {
    const text = semLeela['text'] as Record<string, string>;
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

  it('leela CSS contains [data-theme="leela"] block', () => {
    const css = generateCSS('leela', leela, semLeela, comp);
    expect(css).toContain('[data-theme="leela"]');
  });

  it('leela CSS contains Oxblood #7A1520', () => {
    const css = generateCSS('leela', leela, semLeela, comp);
    expect(css).toContain('#7A1520');
  });

  it('leela CSS: surface-base referencia o neutro claro (papel invertido)', () => {
    const css = generateCSS('leela', leela, semLeela, comp);
    expect(css).toMatch(/--surface-base:\s*var\(--neutral-50\)/);
  });

  it('CSS semantic var references a CSS var (not a raw hex)', () => {
    const css = generateCSS('brasa', brasa, sem, comp);
    // surface-base should chain to a primitive var, not a raw hex
    expect(css).toMatch(/--surface-base:\s*var\(--neutral-950\)/);
  });

  it('CSS contains btn-height-md component token', () => {
    const css = generateCSS('brasa', brasa, sem, comp);
    expect(css).toContain('--btn-height-md: 40px');
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

  it('leela RN theme has no unresolved {refs}', () => {
    const tokens = generateRNTheme(leela, semLeela, comp);
    for (const [, value] of Object.entries(tokens)) {
      expect(value).not.toMatch(/^\{.+\}$/);
    }
  });

  it('brasa surface-base resolves to #0C0C0C', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    expect(tokens['surface-base']).toBe('#0C0C0C');
  });

  it('leela surface-base resolves to light background', () => {
    const tokens = generateRNTheme(leela, semLeela, comp);
    // leela surface.base = {neutral.50} = #FDFAF7 (tema claro)
    expect(tokens['surface-base']).toBe('#FDFAF7');
  });

  it('brasa action-primary resolves to #FF450C', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    expect(tokens['action-primary']).toBe('#FF450C');
  });
});
