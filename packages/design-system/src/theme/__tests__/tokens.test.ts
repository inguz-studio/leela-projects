import { describe, it, expect } from 'vitest';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesLeela from '../../../tokens/primitives.leela.json';
import semantic from '../../../tokens/semantic.json';
import component from '../../../tokens/component.json';
import {
  collectRefs,
  resolvePath,
  generateCSS,
  generateRNTheme,
  type TokenRecord,
} from '../generate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const brasa = primitivesBrasa as TokenRecord;
const leela = primitivesLeela as TokenRecord;
const sem   = semantic as TokenRecord;
const comp  = component as TokenRecord;

const semanticRefs  = collectRefs(sem);
const componentRefs = collectRefs(comp);
const allRefs       = [...semanticRefs, ...componentRefs];

// ---------------------------------------------------------------------------
// RULE: every {ref} in semantic + component resolves in BOTH themes
// ---------------------------------------------------------------------------

describe('Semantic tokens resolve to existing primitives', () => {
  for (const ref of allRefs) {
    it(`"${ref}" → brasa`, () => {
      const path = ref.slice(1, -1).split('.');
      const value = resolvePath(brasa, path);
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
    });

    it(`"${ref}" → leela`, () => {
      const path = ref.slice(1, -1).split('.');
      const value = resolvePath(leela, path);
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
    });
  }
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
    const css = generateCSS('leela', leela, sem, comp);
    expect(css).toContain('[data-theme="leela"]');
  });

  it('leela CSS contains Oxblood #7A1520', () => {
    const css = generateCSS('leela', leela, sem, comp);
    expect(css).toContain('#7A1520');
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
    const tokens = generateRNTheme(leela, sem, comp);
    for (const [, value] of Object.entries(tokens)) {
      expect(value).not.toMatch(/^\{.+\}$/);
    }
  });

  it('brasa surface-base resolves to #0C0C0C', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    expect(tokens['surface-base']).toBe('#0C0C0C');
  });

  it('leela surface-base resolves to light background', () => {
    const tokens = generateRNTheme(leela, sem, comp);
    // leela neutral-950 = #FDFAF7 (light)
    expect(tokens['surface-base']).toBe('#FDFAF7');
  });

  it('brasa action-primary resolves to #FF450C', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    expect(tokens['action-primary']).toBe('#FF450C');
  });
});
