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
 * Used to apply per-theme semantic overrides (e.g. semantic.leela.json)
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
}

/**
 * Generate a CSS block for a given theme.
 *
 * Output shape:
 * ```css
 * [data-theme="brasa"] {
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

  const allVars = [...primVars, ...semVars, ...compVars, ...aliasVars];

  const selector = options.rootFallback
    ? `:root:not([data-theme]),\n[data-theme="${theme}"] {`
    : `[data-theme="${theme}"] {`;

  const lines = [
    selector,
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
