/**
 * Token generator — produces CSS custom property blocks and typed RN theme objects
 * from the 3-tier token JSON files.
 *
 * Tier 1 — primitives.{theme}.json : raw color/spacing/radius scales (per-theme)
 * Tier 2 — semantic.json           : semantic aliases, reference primitives via {path}
 * Tier 3 — component.json          : component-level tokens, reference semantic/primitives
 *
 * CSS output:  [data-theme="brasa"] { --surface-base: var(--neutral-950); ... }
 * RN output:   { 'surface-base': '#0C0C0C', ... }  (resolved to hex values)
 */

export type TokenRecord = Record<string, unknown>;
export type FlatTokens = Record<string, string>;

// ---------------------------------------------------------------------------
// Path traversal
// ---------------------------------------------------------------------------

export function resolvePath(obj: TokenRecord, path: readonly string[]): string | undefined {
  let current: unknown = obj;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    const next = (current as TokenRecord)[key];
    current = next;
  }
  return typeof current === 'string' ? current : undefined;
}

// ---------------------------------------------------------------------------
// Reference helpers
// ---------------------------------------------------------------------------

function isRef(value: string): boolean {
  return value.startsWith('{') && value.endsWith('}');
}

function refToPath(ref: string): string[] {
  return ref.slice(1, -1).split('.');
}

/** For CSS output: {neutral.950} → var(--neutral-950) */
function refToCSSVar(ref: string): string {
  const path = refToPath(ref).join('-');
  return `var(--${path})`;
}

/** For RN output: {neutral.950} → actual hex resolved from primitives */
function refToValue(ref: string, primitives: TokenRecord): string {
  const resolved = resolvePath(primitives, refToPath(ref));
  return resolved ?? ref; // fall through as-is if not found (shouldn't happen after validation)
}

// ---------------------------------------------------------------------------
// Deep merge (per-theme semantic overrides over the shared semantic base)
// ---------------------------------------------------------------------------

/**
 * Deep-merges `overrides` over `base` without mutating either.
 * Used to apply per-theme semantic overrides (e.g. semantic.wine.json)
 * on top of the shared semantic.json before generating CSS/RN outputs.
 */
export function mergeTokens(base: TokenRecord, overrides: TokenRecord): TokenRecord {
  const result: TokenRecord = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = result[key];
    if (
      typeof value === 'object' && value !== null && !Array.isArray(value) &&
      typeof existing === 'object' && existing !== null && !Array.isArray(existing)
    ) {
      result[key] = mergeTokens(existing as TokenRecord, value as TokenRecord);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Flatten nested token object → flat list of [cssVarName, value] pairs
// ---------------------------------------------------------------------------

export function flattenTokens(
  obj: TokenRecord,
  prefix: string,
  primitives: TokenRecord,
  mode: 'css' | 'rn',
): Array<[string, string]> {
  const result: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(obj)) {
    // Chaves iniciadas em "$" são DOCUMENTAÇÃO (padrão DTCG, ex.: $description):
    // carregam a diretriz de uso do grupo dentro do próprio JSON de tokens e
    // NUNCA viram CSS var nem entrada RN.
    if (key.startsWith('$')) continue;
    const name = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value !== null) {
      result.push(...flattenTokens(value as TokenRecord, name, primitives, mode));
    } else if (typeof value === 'string') {
      const resolved = isRef(value)
        ? mode === 'css'
          ? refToCSSVar(value)
          : refToValue(value, primitives)
        : value;
      result.push([name, resolved]);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateCSSOptions {
  /**
   * When true, the block also matches `:root:not([data-theme])`, making this
   * theme the paint-time default. Anti-FOUC em SSR: o HTML chega sem
   * `data-theme` (o atributo só é aplicado no cliente) e ainda assim pinta
   * com o tema padrão em vez de flash sem estilo.
   */
  rootFallback?: boolean;
  /**
   * Extra alias tier appended AFTER primitives/semantic/component — used for
   * the shadcn/ui bridge (tokens/shadcn.json): `--background: var(--surface-base)`.
   * Refs here point at SEMANTIC names ({surface.base} → var(--surface-base)),
   * so this tier is CSS-only (generateRNTheme não recebe aliases: RN não
   * consome shadcn e refs semânticas não resolvem contra primitives).
   */
  aliases?: TokenRecord;
  /**
   * Extra CSS-only tier appended AFTER aliases — usada pela camada glass
   * (tokens/glass.json), que vive fora do pipeline de 3 tiers porque cada
   * propriedade tem um valor POR TEMA num único arquivo compartilhado (a
   * forma é `{ propriedade: { tema: valor } }`, não um JSON por tema como
   * primitives/semantic). O chamador (generate-tokens.ts) já extrai a coluna
   * do tema certo antes de passar aqui. Valores são sempre literais (nunca
   * `{ref}`) — RN não consome este tier (glass é conceito só-CSS,
   * `[data-glass="on"]` não existe em React Native).
   */
  extra?: TokenRecord;
}

/**
 * Generate a CSS block for a given theme.
 *
 * Output shape:
 * ```css
 * [data-theme="brasa"] {
 *   color-scheme: dark;
 *   --primary-500: #FF450C;
 *   --surface-base: var(--neutral-950);
 *   ...
 * }
 * ```
 */
export function generateCSS(
  theme: string,
  primitives: TokenRecord,
  semantic: TokenRecord,
  component: TokenRecord,
  options: GenerateCSSOptions = {},
): string {
  const primVars = flattenTokens(primitives, '', primitives, 'css');
  const semVars  = flattenTokens(semantic,   '', primitives, 'css');
  const compVars = flattenTokens(component,  '', primitives, 'css');
  const aliasVars = options.aliases
    ? flattenTokens(options.aliases, '', primitives, 'css')
    : [];
  const extraVars = options.extra
    ? flattenTokens(options.extra, '', primitives, 'css')
    : [];

  const allVars = [...primVars, ...semVars, ...compVars, ...aliasVars, ...extraVars];

  const selector = options.rootFallback
    ? `:root:not([data-theme]),\n[data-theme="${theme}"] {`
    : `[data-theme="${theme}"] {`;

  // `color-scheme` é o ÚNICO token que também sai como DECLARAÇÃO, não só como
  // custom property. Uma var sozinha não pinta nada: quem lê `--color-scheme`
  // é o nosso CSS, e o cromo que precisa obedecer ao tema não é nosso — barra
  // de rolagem nativa, controles de formulário, caret e autofill são desenhados
  // pelo navegador, e ele só olha para a propriedade `color-scheme`. Sem essa
  // linha o navegador assume o esquema claro e pinta uma barra cinza-clara
  // sobre a interface escura (observação do dono, 04/08).
  //
  // O valor vem do token do tema (`tokens/semantic*.json` → `color.scheme`),
  // nunca de um literal aqui: brasa é escuro e wine é claro, e um tema futuro
  // declara o seu sem tocar no gerador. Token ausente ⇒ nenhuma declaração
  // (o navegador volta ao `normal`), em vez de carimbar um esquema errado.
  //
  // Vai ANTES das vars, e a var `--color-scheme` continua emitida junto com as
  // outras: é dela que uma barra estilizada por token se serviria, se o dono
  // pedir (proposta SCROLLBAR-1 em leela-specs/01-produto/DECISOES-ABERTAS.md).
  const colorScheme = allVars.find(([name]) => name === 'color-scheme')?.[1];

  const lines = [
    selector,
    ...(colorScheme === undefined ? [] : [`  color-scheme: ${colorScheme};`]),
    ...allVars.map(([name, value]) => `  --${name}: ${value};`),
    '}',
  ];

  return lines.join('\n');
}

/**
 * Generate a flat, typed token map for React Native (all values resolved to raw strings).
 *
 * Semantic tokens that reference primitives are resolved to their actual values,
 * since React Native cannot consume CSS custom properties.
 */
export function generateRNTheme(
  primitives: TokenRecord,
  semantic: TokenRecord,
  component: TokenRecord,
): FlatTokens {
  const primVars = flattenTokens(primitives, '', primitives, 'rn');
  const semVars  = flattenTokens(semantic,   '', primitives, 'rn');
  const compVars = flattenTokens(component,  '', primitives, 'rn');

  const allVars = [...primVars, ...semVars, ...compVars];
  return Object.fromEntries(allVars);
}

// ---------------------------------------------------------------------------
// Collect all {ref} strings from a nested token object (used in tests)
// ---------------------------------------------------------------------------

export function collectRefs(obj: TokenRecord): string[] {
  const refs: string[] = [];
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && isRef(value)) {
      refs.push(value);
    } else if (typeof value === 'object' && value !== null) {
      refs.push(...collectRefs(value as TokenRecord));
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Glass layer — bloco de ativação teórico-agnóstico (mesmo texto em todo
// tema, ver handoff §2). Extrai a coluna do tema certo de tokens/glass.json
// (per-property, `{ propriedade: { tema: valor } }`) para o tier `extra` de
// generateCSS, e o bloco `[data-glass="on"]` + fallback `@supports` remapeia
// tokens genéricos (card-blur/surface-raised/surface-overlay/elevation-2/
// page-glow) para os `--glass-*` que acabaram de nascer NAQUELE bloco de
// tema — a cascata do CSS resolve sozinha qual tema está ativo.
// ---------------------------------------------------------------------------

export interface GlassTokens {
  glass: {
    blur: Record<string, string>;
    'surface-raised': Record<string, string>;
    'surface-overlay': Record<string, string>;
    elevation: Record<string, string>;
    'page-glow': Record<string, string>;
  };
}

/**
 * Extrai a coluna de um tema de tokens/glass.json, no formato que
 * generateCSS({ extra }) espera: flatten produz `--glass-blur`,
 * `--glass-surface-raised`, `--glass-surface-overlay`, `--glass-elevation`,
 * `--glass-page-glow` — exatamente os nomes que o README §2 usa no bloco
 * `[data-glass="on"]`.
 */
export function glassExtraFor(glass: GlassTokens, theme: string): TokenRecord {
  const g = glass.glass;
  return {
    glass: {
      blur: g.blur[theme],
      'surface-raised': g['surface-raised'][theme],
      'surface-overlay': g['surface-overlay'][theme],
      elevation: g.elevation[theme],
      'page-glow': g['page-glow'][theme],
    },
  };
}

/**
 * Bloco `[data-glass="on"]` + fallback `@supports not (backdrop-filter)` —
 * texto idêntico em todo tema (handoff §2, "Regra de arquitetura" e "Três
 * regras não-negociáveis"). Remapeia tokens genéricos para os `--glass-*`
 * do tema ativo; `--surface-raised-opaque` (tier semantic, per-tema) é o
 * fallback quando `backdrop-filter` não existe — regra #3 do handoff.
 */
export function generateGlassActivationBlock(): string {
  return [
    '[data-glass="on"] {',
    '  --card-blur: var(--glass-blur);',
    '  --surface-raised: var(--glass-surface-raised);',
    '  --surface-overlay: var(--glass-surface-overlay);',
    '  --elevation-2: var(--glass-elevation);',
    '  --page-glow: var(--glass-page-glow);',
    '}',
    '',
    '@supports not (backdrop-filter: blur(1px)) {',
    '  [data-glass="on"] { --surface-raised: var(--surface-raised-opaque); }',
    '}',
  ].join('\n');
}
