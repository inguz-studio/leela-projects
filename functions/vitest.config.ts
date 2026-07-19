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
    // CK2-T6: CRM_ID_PEPPER de TESTE global — o checkout (RN-173) passou a
    // exigir o pepper (fail-closed); ver vitest.setup.ts.
    setupFiles: ['./vitest.setup.ts'],
    // Coleta SÓ os testes-fonte; lib/ contém artefatos compilados (tsc)
    // que quebravam a coleta do vitest (F6 — review S1600).
    include: ['src/**/*.test.ts'],
    exclude: ['lib/**', 'node_modules/**'],
    // Suites de Rules compartilham o MESMO Firestore Emulator e chamam
    // clearFirestore() — arquivos em paralelo raceiam. Sequencial por arquivo.
    fileParallelism: false,
  },
});
