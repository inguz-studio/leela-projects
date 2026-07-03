/**
 * rules.test.ts — integração: Firestore Security Rules deny-by-default
 *
 * Requer o Firestore Emulator rodando na porta 8080.
 * Pré-requisito: Java 17+ no PATH (JAVA_HOME configurado).
 *
 * Rodar isoladamente:
 *   export JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.19.10-hotspot"
 *   export PATH="$JAVA_HOME/bin:$PATH"
 *   firebase emulators:start --only firestore &
 *   pnpm test:rules
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

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Se o emulador não estiver rodando, initializeTestEnvironment falha —
  // o teste é pulado automaticamente ao reportar como suite sem executar.
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

describe('Firestore Rules — deny-by-default (S000-2-T1)', () => {
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

  it('nega leitura de coleção tenant-scoped sem claims de tenantId', async () => {
    // Após S1600-T3, atletas/{uid} permite leitura pelo próprio dono.
    // Este teste usa 'eventos' — coleção que requer claim tenantId (ADR-009).
    // Um usuário autenticado sem tenantId no claim não acessa dados tenant-scoped.
    const ctx = testEnv.authenticatedContext('uid-123');
    const docRef = doc(ctx.firestore(), 'eventos', 'qualquer-evento');
    await assertFails(getDoc(docRef));
  });
});
