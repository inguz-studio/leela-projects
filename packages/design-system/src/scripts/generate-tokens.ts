/**
 * CLI script: generates themes/brasa.css, themes/wine.css, themes/index.css
 * and src/theme/rn-themes.ts.
 *
 * Run: pnpm generate-tokens   (uses tsx — excluded from tsup build)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Static JSON imports (tsx resolves these natively, resolveJsonModule in base tsconfig)
import primitivesBrasa from '../../tokens/primitives.brasa.json';
import primitivesWine from '../../tokens/primitives.wine.json';
import semanticBase from '../../tokens/semantic.json';
import semanticWine from '../../tokens/semantic.wine.json';
import component from '../../tokens/component.json';
import shadcnAliases from '../../tokens/shadcn.json';

import { generateCSS, generateRNTheme, mergeTokens, type TokenRecord } from '../theme/generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(__dirname, '..', '..');

// Semantic por tema: base compartilhada + overrides do tema claro (wine).
// A base descreve o tema escuro (brasa); wine inverte os papéis dos neutros.
const semanticBrasa = semanticBase as TokenRecord;
const semanticWineMerged = mergeTokens(semanticBase as TokenRecord, semanticWine as TokenRecord);

// ---------------------------------------------------------------------------
// Generate CSS files
// ---------------------------------------------------------------------------

// brasa é o tema padrão: também cobre :root sem data-theme (anti-FOUC SSR)
// aliases: ponte shadcn→brasa (tokens/shadcn.json) — CSS-only, vale nos 2 temas
const brasaCSS = generateCSS('brasa', primitivesBrasa as TokenRecord, semanticBrasa, component as TokenRecord, { rootFallback: true, aliases: shadcnAliases as TokenRecord });
const wineCSS = generateCSS('wine', primitivesWine as TokenRecord, semanticWineMerged, component as TokenRecord, { aliases: shadcnAliases as TokenRecord });
const indexCSS = `/* Leela Design System — all themes combined */\n\n${brasaCSS}\n\n${wineCSS}`;

const themesDir = resolve(pkg, 'themes');
mkdirSync(themesDir, { recursive: true });

writeFileSync(resolve(themesDir, 'brasa.css'), brasaCSS, 'utf8');
writeFileSync(resolve(themesDir, 'wine.css'), wineCSS, 'utf8');
writeFileSync(resolve(themesDir, 'index.css'), indexCSS, 'utf8');

// ---------------------------------------------------------------------------
// Generate RN theme file
// ---------------------------------------------------------------------------

const brasaRN = generateRNTheme(primitivesBrasa as TokenRecord, semanticBrasa, component as TokenRecord);
const wineRN = generateRNTheme(primitivesWine as TokenRecord, semanticWineMerged, component as TokenRecord);

const rnContent = `// AUTO-GENERATED — do not edit manually. Run: pnpm generate-tokens
import type { FlatTokens } from './generate';

export const brasaTheme: FlatTokens = ${JSON.stringify(brasaRN, null, 2)};

export const wineTheme: FlatTokens = ${JSON.stringify(wineRN, null, 2)};
`;

writeFileSync(resolve(pkg, 'src', 'theme', 'rn-themes.ts'), rnContent, 'utf8');

console.warn('[generate-tokens] brasa.css, wine.css, index.css, rn-themes.ts → written.');
