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
import primitivesDarkWine from '../../tokens/primitives.dark-wine.json';
import semanticBase from '../../tokens/semantic.json';
import semanticBrasa from '../../tokens/semantic.brasa.json';
import semanticWine from '../../tokens/semantic.wine.json';
import semanticDarkWine from '../../tokens/semantic.dark-wine.json';
import component from '../../tokens/component.json';
import shadcnAliases from '../../tokens/shadcn.json';
import glassTokens from '../../tokens/glass.json';

import {
  generateCSS,
  generateRNTheme,
  mergeTokens,
  glassExtraFor,
  generateGlassActivationBlock,
  type TokenRecord,
  type GlassTokens,
} from '../theme/generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(__dirname, '..', '..');

// Semantic por tema: base compartilhada + overrides por tema (brasa, wine,
// dark-wine). A base descreve o tema escuro (brasa) quase por inteiro; wine
// inverte os papéis dos neutros; dark-wine é um terceiro escuro (vinho +
// lime), overrides próprios. brasa ganhou seu primeiro override em BLUR
// (REDESIGN-DS-0809 §6, tokens/semantic.brasa.json): chart.accent-2 é
// específico do brasa e não pode morar em semantic.json (mergeTokens é deep
// merge — qualquer chave nova na base vaza para wine/dark-wine por herança).
const semanticBrasaMerged = mergeTokens(semanticBase as TokenRecord, semanticBrasa as TokenRecord);
const semanticWineMerged = mergeTokens(semanticBase as TokenRecord, semanticWine as TokenRecord);
const semanticDarkWineMerged = mergeTokens(semanticBase as TokenRecord, semanticDarkWine as TokenRecord);

// ---------------------------------------------------------------------------
// Generate CSS files
// ---------------------------------------------------------------------------

// Camada glass (tokens/glass.json): uma coluna por tema, extraída aqui e
// passada como tier `extra` de generateCSS — produz --glass-blur/
// --glass-surface-raised/--glass-surface-overlay/--glass-elevation/
// --glass-page-glow DENTRO do bloco de cada tema. O bloco de ativação
// `[data-glass="on"]` + fallback `@supports` é texto idêntico em todo tema
// (handoff §2) — apensado ao CSS de CADA tema para o arquivo publicado
// ficar self-sufficient (brasa.css sozinho já sabe ligar/desligar glass,
// igual ao rootFallback do brasa hoje).
const glass = glassTokens as GlassTokens;
const glassBlock = generateGlassActivationBlock();

// brasa é o tema padrão: também cobre :root sem data-theme (anti-FOUC SSR)
// aliases: ponte shadcn→brasa (tokens/shadcn.json) — CSS-only, vale nos 3 temas
const brasaCSS = generateCSS('brasa', primitivesBrasa as TokenRecord, semanticBrasaMerged, component as TokenRecord, { rootFallback: true, aliases: shadcnAliases as TokenRecord, extra: glassExtraFor(glass, 'brasa') }) + '\n\n' + glassBlock;
const wineCSS = generateCSS('wine', primitivesWine as TokenRecord, semanticWineMerged, component as TokenRecord, { aliases: shadcnAliases as TokenRecord, extra: glassExtraFor(glass, 'wine') }) + '\n\n' + glassBlock;
const darkWineCSS = generateCSS('dark-wine', primitivesDarkWine as TokenRecord, semanticDarkWineMerged, component as TokenRecord, { aliases: shadcnAliases as TokenRecord, extra: glassExtraFor(glass, 'dark-wine') }) + '\n\n' + glassBlock;
const indexCSS = `/* Leela Design System — all themes combined */\n\n${brasaCSS}\n\n${wineCSS}\n\n${darkWineCSS}`;

const themesDir = resolve(pkg, 'themes');
mkdirSync(themesDir, { recursive: true });

writeFileSync(resolve(themesDir, 'brasa.css'), brasaCSS, 'utf8');
writeFileSync(resolve(themesDir, 'wine.css'), wineCSS, 'utf8');
writeFileSync(resolve(themesDir, 'dark-wine.css'), darkWineCSS, 'utf8');
writeFileSync(resolve(themesDir, 'index.css'), indexCSS, 'utf8');

// ---------------------------------------------------------------------------
// Generate RN theme file
// ---------------------------------------------------------------------------

const brasaRN = generateRNTheme(primitivesBrasa as TokenRecord, semanticBrasaMerged, component as TokenRecord);
const wineRN = generateRNTheme(primitivesWine as TokenRecord, semanticWineMerged, component as TokenRecord);
const darkWineRN = generateRNTheme(primitivesDarkWine as TokenRecord, semanticDarkWineMerged, component as TokenRecord);

const rnContent = `// AUTO-GENERATED — do not edit manually. Run: pnpm generate-tokens
import type { FlatTokens } from './generate';

export const brasaTheme: FlatTokens = ${JSON.stringify(brasaRN, null, 2)};

export const wineTheme: FlatTokens = ${JSON.stringify(wineRN, null, 2)};

export const darkWineTheme: FlatTokens = ${JSON.stringify(darkWineRN, null, 2)};
`;

writeFileSync(resolve(pkg, 'src', 'theme', 'rn-themes.ts'), rnContent, 'utf8');

console.warn('[generate-tokens] brasa.css, wine.css, dark-wine.css, index.css, rn-themes.ts → written.');
