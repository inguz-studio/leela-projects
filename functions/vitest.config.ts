import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@leela/core': resolve(__dirname, '../packages/core/src/index.ts'),
      // api-client direto da fonte: os testes de Rules exercitam as queries
      // reais (paginação por cursor etc.) contra o Emulator (E03-L1).
      '@leela/api-client': resolve(__dirname, '../packages/api-client/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30_000,
    setupFiles: [],
    // Coleta SÓ os testes-fonte; lib/ contém artefatos compilados (tsc)
    // que quebravam a coleta do vitest (F6 — review S1600).
    include: ['src/**/*.test.ts'],
    exclude: ['lib/**', 'node_modules/**'],
    // Suites de Rules compartilham o MESMO Firestore Emulator e chamam
    // clearFirestore() — arquivos em paralelo raceiam. Sequencial por arquivo.
    fileParallelism: false,
  },
});
