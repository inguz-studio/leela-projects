/**
 * CLI script: generates themes/brasa.css, themes/leela.css, themes/index.css
 * and src/theme/rn-themes.ts.
 *
 * Run: pnpm generate-tokens   (uses tsx — excluded from tsup build)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Static JSON imports (tsx resolves these natively, resolveJsonModule in base tsconfig)
import primitivesBrasa from '../../tokens/primitives.brasa.json';
import primitivesLeela from '../../tokens/primitives.leela.json';
import semanticBase from '../../tokens/semantic.json';
import semanticLeela from '../../tokens/semantic.leela.json';
import component from '../../tokens/component.json';

import { generateCSS, generateRNTheme, mergeTokens, type TokenRecord } from '../theme/generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(__dirname, '..', '..');

// Semantic por tema: base compartilhada + overrides do tema claro (leela).
// A base descreve o tema escuro (brasa); leela inverte os papéis dos neutros.
const semanticBrasa = semanticBase as TokenRecord;
const semanticLeelaMerged = mergeTokens(semanticBase as TokenRecord, semanticLeela as TokenRecord);

// ---------------------------------------------------------------------------
// Generate CSS files
// ---------------------------------------------------------------------------

// brasa é o tema padrão: também cobre :root sem data-theme (anti-FOUC SSR)
const brasaCSS = generateCSS('brasa', primitivesBrasa as TokenRecord, semanticBrasa, component as TokenRecord, { rootFallback: true });
const leelaCSS = generateCSS('leela', primitivesLeela as TokenRecord, semanticLeelaMerged, component as TokenRecord);
const indexCSS = `/* Leela Design System — all themes combined */\n\n${brasaCSS}\n\n${leelaCSS}`;

const themesDir = resolve(pkg, 'themes');
mkdirSync(themesDir, { recursive: true });

writeFileSync(resolve(themesDir, 'brasa.css'), brasaCSS, 'utf8');
writeFileSync(resolve(themesDir, 'leela.css'), leelaCSS, 'utf8');
writeFileSync(resolve(themesDir, 'index.css'), indexCSS, 'utf8');

// ---------------------------------------------------------------------------
// Generate RN theme file
// ---------------------------------------------------------------------------

const brasaRN = generateRNTheme(primitivesBrasa as TokenRecord, semanticBrasa, component as TokenRecord);
const leelaRN = generateRNTheme(primitivesLeela as TokenRecord, semanticLeelaMerged, component as TokenRecord);

const rnContent = `// AUTO-GENERATED — do not edit manually. Run: pnpm generate-tokens
import type { FlatTokens } from './generate';

export const brasaTheme: FlatTokens = ${JSON.stringify(brasaRN, null, 2)};

export const leelaTheme: FlatTokens = ${JSON.stringify(leelaRN, null, 2)};
`;

writeFileSync(resolve(pkg, 'src', 'theme', 'rn-themes.ts'), rnContent, 'utf8');

console.warn('[generate-tokens] brasa.css, leela.css, index.css, rn-themes.ts → written.');
