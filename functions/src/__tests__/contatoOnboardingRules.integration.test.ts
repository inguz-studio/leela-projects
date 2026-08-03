/**
 * contatoOnboardingRules.integration.test.ts — LEELA-S1609-T2
 *
 * ATAQUE ao canal do CTA da conta travada (`platform/configOnboarding` —
 * RN-417) e, principalmente, PROVA DA PREMISSA que justificou o doc separado.
 *
 * A RN-417 grafou `platform/config.contatoOnboarding`. Esta lane não pôde
 * cumprir a letra: `platform/config` guarda a TABELA GLOBAL DE TAXA e as Rules
 * do Firestore NÃO filtram campo — abrir aquele doc para a conta travada ler o
 * contato entregaria a economia da plataforma junto. O contato passou a viver
 * em `platform/configOnboarding`, mesma coleção e mesma semântica.
 *
 * Estes testes existem para que a troca seja VERIFICÁVEL, não uma alegação:
 *   - a conta travada (autenticada, sem papel) LÊ o contato;
 *   - a MESMA conta continua SEM ler `platform/config` (a taxa segue fechada);
 *   - anônimo não lê nem o contato;
 *   - só `platform_admin` escreve, e só no shape declarado;
 *   - escrever outros campos no doc do contato é negado (`hasOnly`) — senão
 *     ele viraria um segundo depósito de dado sensível legível por todos.
 *
 * Pré-requisito: Firestore Emulator na porta 8080 (via emulators:exec).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PLATFORM_CONFIG_ONBOARDING_DOC } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const DOC_CONTATO = `platform/${PLATFORM_CONFIG_ONBOARDING_DOC}`;
const DOC_TAXA = 'platform/config';

let testEnv: RulesTestEnvironment;

/** Conta recém-cadastrada: autenticada, sem tenant e sem papel de plataforma. */
function ctxContaTravada() {
  return testEnv.authenticatedContext('uid-conta-travada', {
    email: 'novo@demo-leela.dev',
  });
}

function ctxAdmin() {
  return testEnv.authenticatedContext('uid-admin', { role: 'platform_admin' });
}

function ctxOwner() {
  return testEnv.authenticatedContext('uid-owner', {
    role: 'tenant_owner',
    tenantId: 'castelo-producoes',
  });
}

const contatoValido = { contatoOnboarding: { tipo: 'email', valor: 'time@leela.app' } };

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, DOC_CONTATO), contatoValido);
    // Doc vizinho com o dado caro: a taxa global da plataforma.
    await setDoc(doc(db, DOC_TAXA), { taxaPadraoPct: 7.5, repasseDias: 30 });
  });
});

describe('configOnboarding — leitura (RN-417)', () => {
  it('a conta TRAVADA lê o contato (é para ela que o CTA existe)', async () => {
    const db = ctxContaTravada().firestore();
    await assertSucceeds(getDoc(doc(db, DOC_CONTATO)));
  });

  it('tenant_owner e platform_admin também leem', async () => {
    await assertSucceeds(getDoc(doc(ctxOwner().firestore(), DOC_CONTATO)));
    await assertSucceeds(getDoc(doc(ctxAdmin().firestore(), DOC_CONTATO)));
  });

  it('anônimo NÃO lê o contato', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, DOC_CONTATO)));
  });
});

describe('configOnboarding — a taxa da plataforma SEGUE fechada (prova da premissa)', () => {
  it('a MESMA conta travada que lê o contato NÃO lê `platform/config`', async () => {
    // Este é o teste que justifica o doc separado existir. Se um dia alguém
    // "voltar para a letra da RN-417" e mover o contato para `platform/config`,
    // é aqui que a economia da plataforma vaza — e é aqui que se descobre.
    const db = ctxContaTravada().firestore();
    await assertFails(getDoc(doc(db, DOC_TAXA)));
  });

  it('tenant_owner também não lê a taxa global', async () => {
    await assertFails(getDoc(doc(ctxOwner().firestore(), DOC_TAXA)));
  });
});

describe('configOnboarding — escrita (RN-417)', () => {
  it('platform_admin grava o contato no shape declarado', async () => {
    const db = ctxAdmin().firestore();
    await assertSucceeds(
      setDoc(doc(db, DOC_CONTATO), {
        contatoOnboarding: { tipo: 'whatsapp', valor: '5548999999999' },
      }),
    );
  });

  it('a conta travada NÃO grava o próprio destino de contato', async () => {
    // Sem isso, quem está do lado de fora reescreveria o "Falar com o time"
    // para um canal dele — phishing dentro do próprio produto.
    const db = ctxContaTravada().firestore();
    await assertFails(setDoc(doc(db, DOC_CONTATO), contatoValido));
  });

  it('tenant_owner NÃO grava', async () => {
    await assertFails(setDoc(doc(ctxOwner().firestore(), DOC_CONTATO), contatoValido));
  });

  it('tipo fora do enum é negado', async () => {
    const db = ctxAdmin().firestore();
    await assertFails(
      setDoc(doc(db, DOC_CONTATO), {
        contatoOnboarding: { tipo: 'telegram', valor: '@leela' },
      }),
    );
  });

  it('valor vazio é negado (CTA sem destino é botão morto)', async () => {
    const db = ctxAdmin().firestore();
    await assertFails(
      setDoc(doc(db, DOC_CONTATO), { contatoOnboarding: { tipo: 'email', valor: '' } }),
    );
  });

  it('campo extra no doc do contato é negado (`hasOnly`)', async () => {
    // O doc é legível por QUALQUER conta autenticada. Deixar campo livre aqui
    // transforma o canal do CTA num segundo depósito de dado sensível aberto.
    const db = ctxAdmin().firestore();
    await assertFails(
      setDoc(doc(db, DOC_CONTATO), { ...contatoValido, taxaPadraoPct: 7.5 }),
    );
  });

  it('sub-campo extra dentro de `contatoOnboarding` é negado', async () => {
    const db = ctxAdmin().firestore();
    await assertFails(
      setDoc(doc(db, DOC_CONTATO), {
        contatoOnboarding: { tipo: 'email', valor: 'time@leela.app', interno: 'segredo' },
      }),
    );
  });
});
