/**
 * onCreateUser.integration.test.ts — fix review Onda1-L2 #11
 *
 * Integração REAL no Emulator (Firestore + Auth): corrida residual do
 * trigger onCreateUser × provisionTenant — ordem adversa simulada (mesmo
 * método do hotfix #8: a suíte roda com --only firestore,auth, triggers de
 * Functions NÃO executam; invocamos a função do trigger DIRETAMENTE).
 *
 * O achado #11: a releitura do fix #8 fecha "provisionamento ANTES do
 * trigger", mas resta a janela getUser→setCustomUserClaims do trigger. Se a
 * escrita do provisionamento cair NO MEIO, o default 'athlete' clobbera
 * tenant_owner com provisionTenant JÁ retornado SUCESSO — lockout silencioso.
 * O fix adiciona verificação pós-escrita: papel final 'athlete' + doc
 * tenants/{slug} (ownerUid == uid, status ativo) → REPARO automático.
 *
 * A leitura stale do trigger é simulada zerando as claims do owner ANTES de
 * invocar o trigger: o getUser do trigger enxerga exatamente o que a janela
 * da corrida produz (snapshot sem role), grava o default por cima e o
 * pós-check precisa detectar e reparar contra o Emulator real.
 *
 * Pré-requisito: Emulator Firestore (8080) + Auth (9099) via emulators:exec.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { provisionTenantCore } from '../platform/provisionTenant';
import { onCreateUser } from '../auth/onCreateUser';
import {
  clearFirestoreRest,
  deleteAllUsersDrained,
  sleep,
  withTriggersPaused,
} from './helpers/stability';
import type { ProvisionInput } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const ADMIN_UID = 'uid-platform-admin';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

type AnyRec = Record<string, unknown>;

function input(overrides: Partial<ProvisionInput> = {}): ProvisionInput {
  return {
    nome: 'Castelo Produções',
    slug: 'castelo-producoes',
    tipo: 'produtor',
    ownerEmail: 'marina@castelo.com.br',
    ownerNome: 'Marina Castelo',
    ...overrides,
  };
}

function runTrigger(user: AnyRec): Promise<unknown> {
  return (
    onCreateUser as unknown as { run: (u: AnyRec) => Promise<unknown> }
  ).run(user);
}

async function clearAll(): Promise<void> {
  // Clear BULK via REST (o recursiveDelete doc-a-doc estourava hook timeout
  // com dataset residual grande — smoke T3 da lane SUITE-STAB).
  await clearFirestoreRest(PROJECT_ID);
  await deleteAllUsersDrained(auth);
}

/**
 * SUITE-STAB: o createUser do provisionamento dispara o onCreateUser REAL de
 * BACKGROUND no Functions Emulator — que competia com o `runTrigger` manual
 * destes testes (full5: doc atletas residual da entrega atrasada). Provisiona
 * e ESPERA a entrega de background convergir (role != athlete + doc atletas
 * removido pelo reparo) antes de simular a entrega manual. Sem Functions
 * Emulator o estado já nasce convergido — o poll fecha em 2 leituras.
 */
async function provisionarDrenado(): ReturnType<typeof provisionTenantCore> {
  const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
  const deadline = Date.now() + 8_000;
  let stable = 0;
  while (Date.now() < deadline && stable < 2) {
    const u = await auth.getUser(res.ownerUid);
    const atleta = await db.doc(`atletas/${res.ownerUid}`).get();
    if ((u.customClaims ?? {})['role'] === 'tenant_owner' && !atleta.exists) {
      stable++;
    } else {
      stable = 0;
    }
    await sleep(75);
  }
  return res;
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  auth = admin.auth();
});

beforeEach(async () => {
  await withTriggersPaused(() => clearAll());
}, 30_000);

describe('onCreateUser — reparo pós-escrita da corrida residual (fix Onda1-L2 #11)', () => {
  it('ordem ADVERSA (escrita do trigger por ÚLTIMO): owner clobberado é REPARADO para tenant_owner', async () => {
    // 1. Provisionamento completo — provisionTenant retornou SUCESSO.
    const res = await provisionarDrenado();
    const owner = await auth.getUser(res.ownerUid);

    // 2. Simular a leitura STALE da janela do achado: o getUser do trigger
    //    ocorreu ANTES da escrita das claims do provisionamento → snapshot
    //    sem role. Zeramos as claims para o trigger reviver esse mundo.
    await auth.setCustomUserClaims(res.ownerUid, null);

    // 3. Entrega do trigger (a escrita dele é a ÚLTIMA da corrida): grava o
    //    default athlete por cima — e o pós-check repara pelo doc do tenant.
    await runTrigger({
      uid: owner.uid,
      email: owner.email,
      displayName: owner.displayName,
    });

    const after = await auth.getUser(res.ownerUid);
    expect(after.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });

    // Fix #28: o doc atletas/{uid} criado por este run é removido no reparo
    // (owner não é atleta — poluição de segmentação E13).
    expect((await db.doc(`atletas/${res.ownerUid}`).get()).exists).toBe(false);
  });

  it('entrega tardia com role tenant_owner já presente → NÃO cria doc atletas (fix #28)', async () => {
    const res = await provisionarDrenado();
    const owner = await auth.getUser(res.ownerUid);

    await runTrigger({ uid: owner.uid, email: owner.email, displayName: owner.displayName });

    expect((await auth.getUser(res.ownerUid)).customClaims).toMatchObject({
      role: 'tenant_owner',
    });
    expect((await db.doc(`atletas/${res.ownerUid}`).get()).exists).toBe(false);
  });

  it('redelivery em owner JÁ rebaixado (athlete sem marcador) → repara sem nova demoção', async () => {
    // Estado pós-corrida persistido (crash antes do check): athlete cru.
    const res = await provisionarDrenado();
    await auth.setCustomUserClaims(res.ownerUid, { role: 'athlete' });

    const owner = await auth.getUser(res.ownerUid);
    await runTrigger({ uid: owner.uid, email: owner.email, displayName: owner.displayName });

    const after = await auth.getUser(res.ownerUid);
    expect(after.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('demoção DELIBERADA (athlete + demotedFromRole, doc intacto) → trigger NÃO re-eleva', async () => {
    // Contrato com o fix #12: a demoção via superfície admin carrega o
    // marcador demotedFromRole — byte-distinguível do artefato da corrida.
    const res = await provisionarDrenado();
    await auth.setCustomUserClaims(res.ownerUid, {
      role: 'athlete',
      demotedFromRole: 'tenant_owner',
    });

    const owner = await auth.getUser(res.ownerUid);
    await runTrigger({ uid: owner.uid, email: owner.email, displayName: owner.displayName });

    const after = await auth.getUser(res.ownerUid);
    expect(after.customClaims).toEqual({
      role: 'athlete',
      demotedFromRole: 'tenant_owner',
    });
  });

  it('atleta legítimo (sem tenant) segue athlete — pós-check não promove ninguém', async () => {
    const atleta = await auth.createUser({ email: 'atleta@leela.app', displayName: 'Atleta' });

    await runTrigger({ uid: atleta.uid, email: atleta.email, displayName: atleta.displayName });

    const after = await auth.getUser(atleta.uid);
    expect(after.customClaims).toEqual({ role: 'athlete' });
  });
});
