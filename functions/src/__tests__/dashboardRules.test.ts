/**
 * dashboardRules.test.ts — LEELA-S600-T2
 *
 * Integração (Firestore Emulator): Security Rules de
 * `profissionais/{profId}/dashboard/**` (agregado ∑ do painel — E02).
 *
 * Cobre o aceite do brief E02-L1:
 *   - cliente NÃO escreve `dashboard/**` (nem o próprio dono) — Rule nega;
 *   - leitura restrita ao próprio profissional (uid == profId);
 *   - outro usuário (mesmo do MESMO tenant) não lê o dashboard alheio;
 *   - platform_admin lê (leitura macro), mas também não escreve pelo cliente.
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
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
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const TENANT_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo'; // dona do dashboard
const STAFF_UID = 'uid-staff-castelo'; // MESMO tenant, outro uid
const OUTRO_UID = 'uid-passo-owner'; // outro tenant
const ADMIN_UID = 'uid-platform-admin';

const DASH_PATH = `profissionais/${MARINA_UID}/dashboard/current`;

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('dashboard — Rules (S600-T2)', () => {
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
    // Doc escrito como a Function escreveria (Admin SDK bypassa Rules)
    await adminDb.doc(DASH_PATH).set({
      inscricoesTotais: 1284,
      receitaConfirmada: 142280,
      vagasRestantes: 47,
      eventoEmRisco: { nome: 'Meia Maratona Floripa', slug: 'meia-floripa-2026' },
      taxaConversaoPct: null,
      alerts: [],
      computadoEm: Date.now(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function ctx(uid: string, claims: Record<string, unknown>) {
    return testEnv.authenticatedContext(uid, claims).firestore();
  }

  const marina = () => ctx(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
  const staff = () => ctx(STAFF_UID, { role: 'tenant_staff', tenantId: TENANT_ID });
  const outro = () => ctx(OUTRO_UID, { role: 'tenant_owner', tenantId: 'passo-certo' });
  const platformAdmin = () => ctx(ADMIN_UID, { role: 'platform_admin' });

  // ── Leitura ───────────────────────────────────────────────────────────────

  it('dono lê o próprio dashboard', async () => {
    await assertSucceeds(getDoc(doc(marina(), DASH_PATH)));
  });

  it('outro uid do MESMO tenant não lê o dashboard alheio', async () => {
    await assertFails(getDoc(doc(staff(), DASH_PATH)));
  });

  it('usuário de outro tenant não lê', async () => {
    await assertFails(getDoc(doc(outro(), DASH_PATH)));
  });

  it('anônimo não lê', async () => {
    await assertFails(
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), DASH_PATH))
    );
  });

  it('platform_admin lê (leitura macro)', async () => {
    await assertSucceeds(getDoc(doc(platformAdmin(), DASH_PATH)));
  });

  // ── Escrita: NEGADA a todo cliente (aceite do brief) ─────────────────────

  it('aceite: nem o DONO escreve o próprio dashboard (fraude de KPI)', async () => {
    await assertFails(
      updateDoc(doc(marina(), DASH_PATH), { inscricoesTotais: 99999 })
    );
  });

  it('dono não cria doc novo na subcoleção', async () => {
    await assertFails(
      setDoc(doc(marina(), `profissionais/${MARINA_UID}/dashboard/forjado`), {
        inscricoesTotais: 1,
      })
    );
  });

  it('dono não deleta o snapshot', async () => {
    await assertFails(deleteDoc(doc(marina(), DASH_PATH)));
  });

  it('platform_admin também não escreve pelo cliente (só Admin SDK)', async () => {
    await assertFails(
      updateDoc(doc(platformAdmin(), DASH_PATH), { vagasRestantes: 0 })
    );
  });

  it('outro tenant não escreve', async () => {
    await assertFails(
      setDoc(doc(outro(), DASH_PATH), { inscricoesTotais: 0 })
    );
  });
});
