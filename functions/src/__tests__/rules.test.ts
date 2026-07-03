/**
 * rules.test.ts — integração: Firestore Security Rules deny-by-default
 *
 * Requer o Firestore Emulator. A suite inteira é pulada de verdade
 * (describe.skipIf) quando FIRESTORE_EMULATOR_HOST não está definido —
 * sem emulador nenhum hook roda e a suite reporta "skipped", não "failed".
 *
 * Rodar isoladamente (Java 21+ no PATH):
 *   firebase emulators:exec --only firestore --project demo-leela \
 *     "npx vitest run src/__tests__/rules.test.ts"
 */

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { doc, getDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

// Skip real: sem FIRESTORE_EMULATOR_HOST a suite não executa nenhum hook.
// (Antes o beforeAll estourava timeout e a suite FALHAVA sem emulador — C1.)
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

let testEnv: RulesTestEnvironment;

describe.skipIf(!hasEmulator)(
  'Firestore Rules — deny-by-default (S000-2-T1)',
  () => {
    beforeAll(async () => {
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules: readFileSync(RULES_PATH, 'utf8'),
          host: 'localhost',
          port: 8080,
        },
      });
    });

    afterAll(async () => {
      await testEnv?.cleanup();
    });

    it('nega leitura de qualquer coleção por usuário anônimo', async () => {
      const ctx = testEnv.unauthenticatedContext();
      const docRef = doc(ctx.firestore(), 'atletas', 'qualquer-id');
      await assertFails(getDoc(docRef));
    });

    it('nega escrita de qualquer coleção por usuário anônimo', async () => {
      const ctx = testEnv.unauthenticatedContext();
      const { setDoc } = await import('firebase/firestore');
      const docRef = doc(ctx.firestore(), 'atletas', 'qualquer-id');
      await assertFails(
        setDoc(docRef, { nome: 'Teste', email: 'teste@leela.app' })
      );
    });

    it('nega leitura mesmo autenticado em coleção sem rule permissiva', async () => {
      // `pagamentos` não tem nenhuma rule permissiva para quem não é membro
      // do tenant: read exige claim tenantId compatível e write é `false`.
      // (atletas/{uid} permite self-read, então não serve para esta asserção.)
      const ctx = testEnv.authenticatedContext('uid-123');
      const docRef = doc(ctx.firestore(), 'pagamentos', 'qualquer-pagamento');
      await assertFails(getDoc(docRef));
    });

    it('nega escrita mesmo autenticado em coleção write-only-por-Function', async () => {
      // pagamentos: `allow write: if false` — nem platform_admin escreve pelo cliente.
      const ctx = testEnv.authenticatedContext('uid-123');
      const { setDoc } = await import('firebase/firestore');
      const docRef = doc(ctx.firestore(), 'pagamentos', 'qualquer-pagamento');
      await assertFails(setDoc(docRef, { tenantId: 't1', valor: 100 }));
    });
  }
);
