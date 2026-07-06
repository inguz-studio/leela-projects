/**
 * Tailwind config do showroom — consome o preset oficial do DS.
 * Paths de content em absoluto: o Tailwind resolve globs relativos ao CWD
 * (que é a raiz do pacote quando o script roda via npm), não ao config.
 */

import type { Config } from 'tailwindcss';
import path from 'node:path';
import leelaPreset from '../src/tailwind-preset';

const here = __dirname;

const config: Config = {
  presets: [leelaPreset as Config],
  content: [
    path.join(here, 'index.html'),
    path.join(here, 'src/**/*.{ts,tsx}'),
    path.join(here, '../src/**/*.{ts,tsx}'),
  ],
};

export default config;
