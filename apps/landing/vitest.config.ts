import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Testes da landing (unit + RTL) — bootstrap no lote LANDING-SECFIX (W2-F-01 e
// W2-F-05 exigem prova executável). Espelha o setup do painel/DS: jsdom +
// globals off (imports explícitos de `vitest`). O alias do DS aponta para o
// SRC (como o tsconfig) — evita depender de dist build para rodar teste.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Subpaths ANTES da base — o alias do Vite casa por prefixo e o
      // primeiro match vence (ADR-017: entradas server/dialog Radix-free).
      '@leela/design-system/server': fileURLToPath(
        new URL('../../packages/design-system/src/server.ts', import.meta.url),
      ),
      '@leela/design-system/dialog': fileURLToPath(
        new URL('../../packages/design-system/src/dialog.ts', import.meta.url),
      ),
      '@leela/design-system': fileURLToPath(
        new URL('../../packages/design-system/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    css: false,
  },
});
