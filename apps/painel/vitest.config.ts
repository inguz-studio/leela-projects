import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Testes do painel (RTL + unit). Espelha o setup do design-system:
// jsdom + jest-dom + globals. Não roda Emulator aqui — telas testam
// comportamento com dados mockados (api-client) e helpers puros.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
