import { describe, it, expect } from 'vitest';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesWine from '../../../tokens/primitives.wine.json';
import primitivesDarkWine from '../../../tokens/primitives.dark-wine.json';
import semantic from '../../../tokens/semantic.json';
import semanticBrasaOverrides from '../../../tokens/semantic.brasa.json';
import semanticWineOverrides from '../../../tokens/semantic.wine.json';
import semanticDarkWineOverrides from '../../../tokens/semantic.dark-wine.json';
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
const darkWine = primitivesDarkWine as TokenRecord;
const sem   = semantic as TokenRecord;
// Semantic efetiva por tema = base + overrides (mesmo pipeline do gerador).
// brasa entrou nesta lista em REDESIGN-V2 · item 2: até aqui o brasa era
// validado contra a BASE crua, porque semantic.brasa.json nasceu (lane BLUR)
// com um único valor literal e nenhuma {ref}. Era um buraco de gate real — um
// `{accent.400}` no brasa (rampa que só existe em wine/dark-wine) passaria
// limpo aqui e viraria `var(--accent-400)` inexistente no CSS e string crua no
// RN. Validar o MERGE, e não a base, é o que fecha esse buraco para os três.
const semBrasa = mergeTokens(sem, semanticBrasaOverrides as TokenRecord);
const semWine = mergeTokens(sem, semanticWineOverrides as TokenRecord);
const semDarkWine = mergeTokens(sem, semanticDarkWineOverrides as TokenRecord);
const comp  = component as TokenRecord;

const componentRefs = collectRefs(comp);
const brasaRefs = [...collectRefs(semBrasa), ...componentRefs];
const wineRefs = [...collectRefs(semWine), ...componentRefs];
const darkWineRefs = [...collectRefs(semDarkWine), ...componentRefs];

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

  for (const ref of darkWineRefs) {
    it(`"${ref}" → dark-wine`, () => {
      const path = ref.slice(1, -1).split('.');
      const value = resolvePath(darkWine, path);
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

  it('dark-wine CSS contains [data-theme="dark-wine"] block', () => {
    const css = generateCSS('dark-wine', darkWine, semDarkWine, comp);
    expect(css).toContain('[data-theme="dark-wine"]');
  });

  it('dark-wine CSS contains o lime da marca #C8E84A (accent, ação do tema)', () => {
    const css = generateCSS('dark-wine', darkWine, semDarkWine, comp);
    expect(css).toContain('#C8E84A');
  });

  it('dark-wine CSS: surface-base continua escuro (vinho, não inverte como o wine)', () => {
    const css = generateCSS('dark-wine', darkWine, semDarkWine, comp);
    expect(css).toMatch(/--surface-base:\s*var\(--neutral-950\)/);
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
    // semBrasa (merge), não `sem` (base): é o mesmo insumo que
    // generate-tokens.ts usa. Com a base crua, uma {ref} quebrada vinda de
    // semantic.brasa.json escapava desta rede — ver nota no topo do arquivo.
    const tokens = generateRNTheme(brasa, semBrasa, comp);
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

  it('dark-wine RN theme has no unresolved {refs}', () => {
    const tokens = generateRNTheme(darkWine, semDarkWine, comp);
    for (const [, value] of Object.entries(tokens)) {
      expect(value).not.toMatch(/^\{.+\}$/);
    }
  });

  it('dark-wine surface-base resolves to #080306', () => {
    const tokens = generateRNTheme(darkWine, semDarkWine, comp);
    expect(tokens['surface-base']).toBe('#080306');
  });

  it('dark-wine action-primary resolves ao lime da marca (accent.400, não vinho)', () => {
    const tokens = generateRNTheme(darkWine, semDarkWine, comp);
    // README §1: vinho é atmosfera (fundo/glow/bordas), lime é ação — nunca o
    // inverso. action-primary tem que ser o accent, não o primary (vinho).
    expect(tokens['action-primary']).toBe('#C8E84A');
  });

  it('brasa action-primary resolves to #D63500 (D4: laranja escurecido p/ fg branco AA)', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    // D-PATCH D4 (decisão Vitor): fg branco + bg escurecido até branco ≥ 4.5:1.
    // #D63500 = 4.81:1 com branco; a marca #FF450C segue em text-brand/border-brand.
    expect(tokens['action-primary']).toBe('#D63500');
    expect(tokens['action-primary-fg']).toBe('#FFFFFF');
  });

  it('REDESIGN-DS-0809 §3: brasa é pareado — display (Exo 2) ≠ ui (Rubik)', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    expect(tokens['font-family-display']).toBe('"Exo 2", sans-serif');
    expect(tokens['font-family-ui']).toBe('"Rubik", sans-serif');
    expect(tokens['font-family-display']).not.toBe(tokens['font-family-ui']);
  });

  it('REDESIGN-DS-0809 §3: os 4 papéis de peso do brasa existem e são numéricos', () => {
    const tokens = generateRNTheme(brasa, sem, comp);
    // Números derivados da regra do handoff aplicada aos cortes REALMENTE
    // carregados (ver $description de tokens/primitives.brasa.json → peso):
    // display pede 800 "ou o maior corte disponível" — Exo 2 só carrega até
    // 700, então cai para 700; os demais já batem sem precisar cair.
    expect(tokens['peso-display']).toBe('700');
    expect(tokens['peso-forte']).toBe('700');
    expect(tokens['peso-medio']).toBe('600');
    expect(tokens['peso-suave']).toBe('500');
  });

  it('REDESIGN-DS-0809 §3: wine e dark-wine NÃO ganham --peso-* (só o brasa pediu pareamento)', () => {
    const wineTokens = generateRNTheme(wine, semWine, comp);
    const darkWineTokens = generateRNTheme(darkWine, semDarkWine, comp);
    expect(wineTokens['peso-display']).toBeUndefined();
    expect(darkWineTokens['peso-display']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// REDESIGN-V2 · item 2 — rampa contínua chart.accent/accent-2 nos TRÊS temas
// ---------------------------------------------------------------------------

describe('REDESIGN-V2 item 2: rampa de dataviz existe nos três temas', () => {
  // A medição da lane TELA: --chart-accent e --chart-accent-2 só existiam em
  // dark-wine.css. Como o painel do organizador roda em brasa, a rampa nunca
  // aparecia em produção e os rankings caíam na paleta categórica. Este bloco
  // é o gate que impede a regressão nos três temas de uma vez.
  const casos = [
    // FLIP-ACCENT: chart.accent brasa = #FF450C ({primary.500}) — decisão do dono 10/08 (antes #FF6520/{primary.400}).
    { tema: 'brasa', prims: brasa, semantic: semBrasa, accent: '#FF450C', accent2: '#C8E84A' },
    { tema: 'wine', prims: wine, semantic: semWine, accent: '#7A1520', accent2: '#7E9B12' },
    { tema: 'dark-wine', prims: darkWine, semantic: semDarkWine, accent: '#C8E84A' },
  ] as const;

  for (const caso of casos) {
    it(`${caso.tema}: chart-accent e chart-accent-2 existem e não são iguais`, () => {
      const tokens = generateRNTheme(caso.prims as TokenRecord, caso.semantic, comp);
      expect(tokens['chart-accent'], `${caso.tema} sem chart-accent`).toBeDefined();
      expect(tokens['chart-accent-2'], `${caso.tema} sem chart-accent-2`).toBeDefined();
      // Uma rampa precisa de dois extremos DISTINTOS para interpolar.
      expect(tokens['chart-accent']).not.toBe(tokens['chart-accent-2']);
    });

    it(`${caso.tema}: os extremos da rampa resolvem a cor final (nada de {ref} cru)`, () => {
      const tokens = generateRNTheme(caso.prims as TokenRecord, caso.semantic, comp);
      expect(tokens['chart-accent']).toBe(caso.accent);
      if ('accent2' in caso) expect(tokens['chart-accent-2']).toBe(caso.accent2);
      expect(tokens['chart-accent-2']).not.toMatch(/^\{.+\}$/);
    });
  }

  it('a rampa não invade a paleta categórica (cat-1..5 seguem intactos no brasa)', () => {
    // "O que NÃO tocar": nenhum valor pré-existente de brasa muda além do item 2.
    const tokens = generateRNTheme(brasa, semBrasa, comp);
    const base = generateRNTheme(brasa, sem, comp);
    for (const chave of ['chart-cat-1', 'chart-cat-2', 'chart-cat-3', 'chart-cat-4', 'chart-cat-5', 'chart-track', 'chart-grid']) {
      expect(tokens[chave], `${chave} mudou`).toBe(base[chave]);
    }
  });

  it('o CSS do brasa emite as duas pontas como var/valor, nunca como var(--accent-*) inexistente', () => {
    // brasa não tem rampa `accent` em primitives — a ponta lime é literal de
    // propósito. Se alguém a trocar por {accent.400}, este teste cai.
    const css = generateCSS('brasa', brasa, semBrasa, comp, { rootFallback: true });
    // FLIP-ACCENT: var(--primary-500) = #FF450C — decisão do dono 10/08.
    expect(css).toContain('--chart-accent: var(--primary-500);');
    expect(css).toContain('--chart-accent-2: #C8E84A;');
    expect(css).not.toContain('var(--accent-400)');
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

  it('meio-passos do mockup existem nos 3 temas (2/6/10/14px)', () => {
    for (const prims of [brasa, wine, darkWine]) {
      expect(resolvePath(prims, ['spacing', '0-5'])).toBe('2px');
      expect(resolvePath(prims, ['spacing', '1-5'])).toBe('6px');
      expect(resolvePath(prims, ['spacing', '2-5'])).toBe('10px');
      expect(resolvePath(prims, ['spacing', '3-5'])).toBe('14px');
    }
  });
});
