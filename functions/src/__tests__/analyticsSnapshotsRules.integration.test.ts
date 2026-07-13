/**
 * analyticsSnapshotsRules.integration.test.ts — LEELA-S821-T1a (E11 · T2-L1)
 *
 * Security Rules de `profissionais/{profId}/analyticsSnapshots/{dia}` no
 * Firestore Emulator (via emulators:exec — porta 8080).
 *
 * Aceites do brief:
 *   - marina LÊ o próprio `analyticsSnapshots/2026-07-04`;
 *   - felipe NÃO lê o de marina (dono-lê — histórico é do indivíduo);
 *   - cliente tenta `set` em analyticsSnapshots/{qualquer} → NEGADO
 *     (só Function escreve — nem o próprio dono, nem platform_admin via
 *     client SDK);
 *   - passado imutável: update de cliente em doc de dia anterior → NEGADO
 *     (decorre do write:false — asserção antagonista explícita).
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const MARINA_UID = 'uid-marina-castelo';
const FELIPE_UID = 'uid-felipe-martins';
const ADMIN_UID = 'uid-platform-admin';
const DIA = '2026-07-04';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function snapPath(profId: string, dia: string): [string, string, string, string] {
  return ['profissionais', profId, 'analyticsSnapshots', dia];
}

const SNAPSHOT_DOC = {
  data: DIA,
  profId: MARINA_UID,
  capturadoEm: 1770000000000,
  inscricoesTotais: 1284,
  inscricoesTrendPct: 12.5,
  receitaConfirmada: 142280,
  receitaTrendPct: null,
  vagasRestantes: 47,
  eventoEmRisco: null,
  taxaConversaoPct: null,
  conversaoSparkline: [],
  membrosAtivosTotais: 120,
  desafiosAtivosTotais: 3,
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });

  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed via Admin SDK (o caminho privilegiado da Function — bypassa Rules)
  await adminDb
    .collection('profissionais').doc(MARINA_UID)
    .collection('analyticsSnapshots').doc(DIA)
    .set(SNAPSHOT_DOC);
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

describe('analyticsSnapshots — leitura (dono-lê)', () => {
  it('marina LÊ o próprio snapshot', async () => {
    const db = ctxAs(MARINA_UID, {
      role: 'tenant_owner', tenantId: 'castelo-producoes',
    }).firestore();
    await assertSucceeds(getDoc(doc(db, ...snapPath(MARINA_UID, DIA))));
  });

  it('felipe NÃO lê o snapshot de marina (mesmo sendo tenant_owner de outro tenant)', async () => {
    const db = ctxAs(FELIPE_UID, {
      role: 'tenant_owner', tenantId: 'corrida-perfeita',
    }).firestore();
    await assertFails(getDoc(doc(db, ...snapPath(MARINA_UID, DIA))));
  });

  it('platform_admin lê (visão macro — mesma taxonomia do dashboard)', async () => {
    const db = ctxAs(ADMIN_UID, { role: 'platform_admin' }).firestore();
    await assertSucceeds(getDoc(doc(db, ...snapPath(MARINA_UID, DIA))));
  });

  it('anônimo NÃO lê', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, ...snapPath(MARINA_UID, DIA))));
  });
});

describe('analyticsSnapshots — escrita de cliente SEMPRE negada', () => {
  it('o PRÓPRIO dono não escreve snapshot (fraude de histórico)', async () => {
    const db = ctxAs(MARINA_UID, {
      role: 'tenant_owner', tenantId: 'castelo-producoes',
    }).firestore();
    await assertFails(
      setDoc(doc(db, ...snapPath(MARINA_UID, '2026-07-05')), {
        ...SNAPSHOT_DOC, data: '2026-07-05', receitaConfirmada: 999999,
      })
    );
  });

  it('cliente NÃO muta doc de dia PASSADO (histórico imutável)', async () => {
    const db = ctxAs(MARINA_UID, {
      role: 'tenant_owner', tenantId: 'castelo-producoes',
    }).firestore();
    await assertFails(
      updateDoc(doc(db, ...snapPath(MARINA_UID, DIA)), { receitaConfirmada: 1 })
    );
  });

  it('cliente NÃO deleta snapshot', async () => {
    const db = ctxAs(MARINA_UID, {
      role: 'tenant_owner', tenantId: 'castelo-producoes',
    }).firestore();
    await assertFails(deleteDoc(doc(db, ...snapPath(MARINA_UID, DIA))));
  });

  it('nem platform_admin escreve via client SDK (só Admin SDK/Function)', async () => {
    const db = ctxAs(ADMIN_UID, { role: 'platform_admin' }).firestore();
    await assertFails(
      setDoc(doc(db, ...snapPath(MARINA_UID, '2026-07-06')), {
        ...SNAPSHOT_DOC, data: '2026-07-06',
      })
    );
  });
});
