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
): string {
  const primVars = flattenTokens(primitives, '', primitives, 'css');
  const semVars  = flattenTokens(semantic,   '', primitives, 'css');
  const compVars = flattenTokens(component,  '', primitives, 'css');

  const allVars = [...primVars, ...semVars, ...compVars];

  const lines = [
    `[data-theme="${theme}"] {`,
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
