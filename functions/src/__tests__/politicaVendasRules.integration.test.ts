/**
 * politicaVendasRules.integration.test.ts — LEELA-S305-T1 (E04 · Rules)
 *
 * ATAQUES contra `eventos/{id}/politicaVendas/config` no Firestore Emulator:
 *   - escrita: SÓ o tenant OWNER (staff NEGADO — política é contrato legal
 *     do organizador); promoter/athlete/cross-tenant/anônimo NEGADOS;
 *     papel de evento (organizador ativo na equipe) NEGADO na escrita;
 *   - payload direto: shape inválido (float/negativo/teto/tipo), docId fora
 *     do canônico `config`, tenantId forjado — todos NEGADOS;
 *   - delete: NEGADO para todo cliente (owner incluso) — trilha de política;
 *   - leitura: owner/staff/platform_admin + papel financeiro ATIVO leem;
 *     promoter/athlete/cross-tenant/anônimo NÃO.
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
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const STAFF_UID = 'uid-castelo-staff';
const PROMOTER_UID = 'uid-castelo-promoter';
const PASSO_OWNER_UID = 'uid-passo-owner';
const ADMIN_UID = 'uid-platform-admin';
const ATHLETE_UID = 'uid-atleta-global';
const FINANCEIRO_UID = 'uid-equipe-financeiro';

const EVENTO_ID = 'meia-floripa-2026';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Payload VÁLIDO de política (espelho de politicaVendasPadrao + tenant).
 *  Client SDK: atualizadoEm = serverTimestamp() (sentinel do SDK web). */
function politicaValida(overrides: Record<string, unknown> = {}) {
  return {
    id: 'config',
    tenantId: CASTELO_ID,
    eventoId: EVENTO_ID,
    reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
    transferencia: { habilitada: true, janelaHoras: 72, taxa: 0 },
    trocaIngresso: { habilitada: true, janelaHoras: 48, permiteReembolsoDowngrade: false },
    atualizadoEm: serverTimestamp(),
    ...overrides,
  };
}

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
}, 30_000);

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia de Floripa 2026', slug: EVENTO_ID, status: 'publicado',
    data: Timestamp.fromDate(new Date('2026-04-25T12:00:00Z')),
    local: 'Florianópolis', modalidades: ['10k', '21k'],
    usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  // Âncora VIVA de equipe p/ papel financeiro (S304-T1 · papelEventoAtivo)
  batch.set(
    adminDb.collection('eventos').doc(EVENTO_ID).collection('equipe').doc(FINANCEIRO_UID),
    {
      eventoId: EVENTO_ID, tenantId: CASTELO_ID, uid: FINANCEIRO_UID,
      nome: 'Fin Anceiro', papel: 'financeiro', status: 'ativo',
      criadoEm: now, atualizadoEm: now,
    }
  );
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}
const ownerA = () => ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
const staffA = () => ctxAs(STAFF_UID, { role: 'tenant_staff', tenantId: CASTELO_ID });
const promoterA = () => ctxAs(PROMOTER_UID, { role: 'promoter', tenantId: CASTELO_ID });
const ownerB = () => ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
const platformAdmin = () => ctxAs(ADMIN_UID, { role: 'platform_admin' });
const athlete = () => ctxAs(ATHLETE_UID, { role: 'athlete' });
const papelFinanceiro = () =>
  ctxAs(FINANCEIRO_UID, { role: 'athlete', eventos: { [EVENTO_ID]: 'financeiro' } });

const P_POL = ['eventos', EVENTO_ID, 'politicaVendas', 'config'] as const;

async function seedPoliticaViaAdmin() {
  await adminDb.doc(P_POL.join('/')).set({ ...politicaValida(), atualizadoEm: Timestamp.now() });
}

describe('politicaVendas — escrita SÓ owner (aceite S305-T1)', () => {
  it('OWNER cria com shape válido no docId canônico', async () => {
    await assertSucceeds(setDoc(doc(ownerA().firestore(), ...P_POL), politicaValida()));
  });

  it('OWNER edita a política existente (shape válido, tenant imutável)', async () => {
    await seedPoliticaViaAdmin();
    await assertSucceeds(
      updateDoc(doc(ownerA().firestore(), ...P_POL), {
        reembolso: { janelaArrependimentoDias: 10, corteHoras: 72, slaAnaliseDias: 5 },
      })
    );
  });

  it('STAFF NÃO escreve (política é contrato do organizador — não-owner nega)', async () => {
    await assertFails(setDoc(doc(staffA().firestore(), ...P_POL), politicaValida()));
    await seedPoliticaViaAdmin();
    await assertFails(
      updateDoc(doc(staffA().firestore(), ...P_POL), {
        transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
      })
    );
  });

  it('promoter, athlete, owner de OUTRO tenant e anônimo NÃO escrevem', async () => {
    await assertFails(setDoc(doc(promoterA().firestore(), ...P_POL), politicaValida()));
    await assertFails(setDoc(doc(athlete().firestore(), ...P_POL), politicaValida()));
    await assertFails(setDoc(doc(ownerB().firestore(), ...P_POL), politicaValida()));
    await assertFails(
      setDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P_POL), politicaValida())
    );
  });

  it('papel de evento (financeiro ATIVO na equipe) LÊ mas NÃO escreve', async () => {
    await seedPoliticaViaAdmin();
    await assertSucceeds(getDoc(doc(papelFinanceiro().firestore(), ...P_POL)));
    await assertFails(
      updateDoc(doc(papelFinanceiro().firestore(), ...P_POL), {
        transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
      })
    );
  });
});

describe('politicaVendas — payload direto (a Rule segura SOZINHA)', () => {
  it('docId fora do canônico `config` ⇒ NEGA (doc fantasma de política)', async () => {
    await assertFails(
      setDoc(
        doc(ownerA().firestore(), 'eventos', EVENTO_ID, 'politicaVendas', 'config2'),
        politicaValida({ id: 'config2' })
      )
    );
  });

  it('tenantId FORJADO (de outro tenant) ⇒ NEGA', async () => {
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...P_POL), politicaValida({ tenantId: PASSO_ID }))
    );
  });

  it('shape inválido ⇒ NEGA: float, negativo, acima do teto, tipo errado', async () => {
    const db = ownerA().firestore();
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        reembolso: { janelaArrependimentoDias: 7.5, corteHoras: 48, slaAnaliseDias: 3 },
      }))
    );
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        reembolso: { janelaArrependimentoDias: 7, corteHoras: -1, slaAnaliseDias: 3 },
      }))
    );
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        reembolso: { janelaArrependimentoDias: 91, corteHoras: 48, slaAnaliseDias: 3 },
      }))
    );
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        transferencia: { habilitada: 'sim', janelaHoras: 72, taxa: 0 },
      }))
    );
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        transferencia: { habilitada: true, janelaHoras: 72, taxa: -5 },
      }))
    );
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        transferencia: { habilitada: true, janelaHoras: 72, taxa: 999999 },
      }))
    );
    await assertFails(
      setDoc(doc(db, ...P_POL), politicaValida({
        trocaIngresso: { habilitada: true, janelaHoras: 0, permiteReembolsoDowngrade: false },
      }))
    );
    // Bloco ausente (map incompleto) ⇒ acesso a campo inexistente falha ⇒ deny
    const semTroca = politicaValida() as Record<string, unknown>;
    delete semTroca['trocaIngresso'];
    await assertFails(setDoc(doc(db, ...P_POL), semTroca));
  });

  it('update trocando o tenantId ⇒ NEGA (imutável)', async () => {
    await seedPoliticaViaAdmin();
    await assertFails(
      updateDoc(doc(ownerA().firestore(), ...P_POL), { tenantId: PASSO_ID })
    );
  });

  it('DELETE negado para TODO cliente — inclusive owner e platform_admin (trilha)', async () => {
    await seedPoliticaViaAdmin();
    await assertFails(deleteDoc(doc(ownerA().firestore(), ...P_POL)));
    await assertFails(deleteDoc(doc(platformAdmin().firestore(), ...P_POL)));
  });
});

describe('politicaVendas — leitura (matriz S304)', () => {
  beforeEach(seedPoliticaViaAdmin);

  it('owner, staff e platform_admin LEEM', async () => {
    await assertSucceeds(getDoc(doc(ownerA().firestore(), ...P_POL)));
    await assertSucceeds(getDoc(doc(staffA().firestore(), ...P_POL)));
    await assertSucceeds(getDoc(doc(platformAdmin().firestore(), ...P_POL)));
  });

  it('promoter, athlete, cross-tenant e anônimo NÃO leem', async () => {
    await assertFails(getDoc(doc(promoterA().firestore(), ...P_POL)));
    await assertFails(getDoc(doc(athlete().firestore(), ...P_POL)));
    await assertFails(getDoc(doc(ownerB().firestore(), ...P_POL)));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P_POL)));
  });

  it('papel financeiro com claim mas âncora REMOVIDA ⇒ NEGA (token velho morre)', async () => {
    await adminDb
      .doc(`eventos/${EVENTO_ID}/equipe/${FINANCEIRO_UID}`)
      .update({ status: 'removido' });
    await assertFails(getDoc(doc(papelFinanceiro().firestore(), ...P_POL)));
  });
});
