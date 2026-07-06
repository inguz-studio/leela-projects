/**
 * Vite config do showroom do LEELA Design System.
 *
 * - root = esta pasta (showcase/) — index.html vive aqui.
 * - base './' — o build abre por duplo clique (assets relativos).
 * - alias '@leela/design-system' → ../src/index.ts (fonte, não dist).
 * - Sem @vitejs/plugin-react: o esbuild do Vite 5 compila .tsx com o
 *   JSX runtime automático (tsconfig raiz já tem jsx: react-jsx).
 *   Custo aceito: dev server sem fast-refresh (recarrega a página).
 */

import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  resolve: {
    alias: {
      '@leela/design-system': path.resolve(here, '../src/index.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
