/**
 * ck2Rules.integration.test.ts — LEELA-CK2 (Rules do lote CHECKOUT2-MODELO)
 *
 * ATAQUES no Firestore Emulator (rules carregadas de verdade):
 *   1. `pessoas/{id}` (RN-173): TUDO negado para TODO cliente — leitura
 *      incluída (PII cross-tenant; a única superfície é o callable de
 *      prefill, que devolve só o PRÓPRIO).
 *   2. `eventos/{e}/inscritos/{i}.pessoaRef`: campo Function-only — nem
 *      nasce nem é tocado por cliente (religar identidade = fraude de
 *      CRM/prefill).
 *   3. `eventos/{e}/termoSaude/config` (RN-156): escrita SÓ owner; campos
 *      de versão congelados (forjar versão invalidaria a prova de aceite
 *      `saudeCustom`); shape/teto; delete nunca; leitura de gestão.
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
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela-ck2rules';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const STAFF_UID = 'uid-castelo-staff';
const ADMIN_UID = 'uid-platform-admin';
const ATHLETE_UID = 'uid-atleta-global';
const EVENTO_ID = 'meia-floripa-2026';
const PESSOA_ID = 'cpf_0123456789abcdef0123456789abcdef';
const INSCRITO_ID = 'ped-x-i1';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  const FS_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: FS_PORT,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${FS_PORT}`;
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
  batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia de Floripa 2026', slug: EVENTO_ID, status: 'publicado',
    data: Timestamp.fromDate(new Date('2026-04-25T12:00:00Z')),
    local: 'Florianópolis', modalidades: ['10k'],
    usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  // Pessoa (Admin — como a Function grava)
  batch.set(adminDb.collection('pessoas').doc(PESSOA_ID), {
    id: PESSOA_ID, cpf: '52998224725', contaUid: null,
    dadosConhecidos: {
      nome: 'Ana', genero: 'feminino', nascimento: '1990-05-17',
      telefone: '48999990001',
    },
    criadoEm: now, atualizadoEm: now,
  });
  // Inscrito com pessoaRef (Admin — como a Function grava)
  batch.set(
    adminDb.doc(`eventos/${EVENTO_ID}/inscritos/${INSCRITO_ID}`),
    {
      id: INSCRITO_ID, tenantId: CASTELO_ID, atletaId: 'uid-ana',
      atletaNome: 'Ana Atleta', kit: 'sem_kit', chipNumero: null,
      status: 'pendente', modalidade: '10k', pedidoRef: 'ped-x',
      ehResponsavel: false, tamanhos: {}, pessoaRef: PESSOA_ID,
      criadoEm: now, atualizadoEm: now,
    }
  );
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

const ctxAs = (uid: string, claims: Record<string, unknown>) =>
  testEnv.authenticatedContext(uid, claims);
const owner = () => ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
const staff = () => ctxAs(STAFF_UID, { role: 'tenant_staff', tenantId: CASTELO_ID });
const platformAdmin = () => ctxAs(ADMIN_UID, { role: 'platform_admin' });
const athlete = () => ctxAs(ATHLETE_UID, { role: 'athlete' });

const P_PESSOA = ['pessoas', PESSOA_ID] as const;
const P_TERMO = ['eventos', EVENTO_ID, 'termoSaude', 'config'] as const;
const P_INSCRITO = ['eventos', EVENTO_ID, 'inscritos', INSCRITO_ID] as const;

function termoValido(overrides: Record<string, unknown> = {}) {
  return {
    id: 'config',
    tenantId: CASTELO_ID,
    texto: 'Termo do organizador: declaro aptidão conforme regulamento.',
    atualizadoEm: serverTimestamp(),
    ...overrides,
  };
}

describe('pessoas — deny-all para cliente (RN-173/172)', () => {
  it('LEITURA negada: owner, admin (client SDK), athlete, anônimo', async () => {
    await assertFails(getDoc(doc(owner().firestore(), ...P_PESSOA)));
    await assertFails(getDoc(doc(platformAdmin().firestore(), ...P_PESSOA)));
    await assertFails(getDoc(doc(athlete().firestore(), ...P_PESSOA)));
    await assertFails(
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P_PESSOA))
    );
  });

  it('ESCRITA negada: reivindicar contaUid / forjar dados / delete', async () => {
    await assertFails(
      updateDoc(doc(athlete().firestore(), ...P_PESSOA), { contaUid: ATHLETE_UID })
    );
    await assertFails(
      setDoc(doc(owner().firestore(), 'pessoas', 'cpf_forjada'), {
        cpf: '16899535009', contaUid: MARINA_UID,
      })
    );
    await assertFails(deleteDoc(doc(platformAdmin().firestore(), ...P_PESSOA)));
  });
});

describe('inscritos.pessoaRef — Function-only (RN-173)', () => {
  it('cliente NÃO toca pessoaRef (religar identidade = fraude de CRM/prefill)', async () => {
    await assertFails(
      updateDoc(doc(owner().firestore(), ...P_INSCRITO), {
        pessoaRef: 'cpf_de_outra_pessoa',
      })
    );
    await assertFails(
      updateDoc(doc(owner().firestore(), ...P_INSCRITO), { pessoaRef: null })
    );
  });
});

describe('termoSaude — escrita SÓ owner + versão congelada (RN-156)', () => {
  it('OWNER cria/edita com shape válido no docId canônico', async () => {
    await assertSucceeds(setDoc(doc(owner().firestore(), ...P_TERMO), termoValido()));
    await assertSucceeds(
      updateDoc(doc(owner().firestore(), ...P_TERMO), {
        texto: 'Texto revisado.', atualizadoEm: serverTimestamp(),
      })
    );
    // Desativação legítima = texto vazio (nunca delete)
    await assertSucceeds(
      updateDoc(doc(owner().firestore(), ...P_TERMO), { texto: '' })
    );
  });

  it('FORJA de versão negada: create com versao/hash; update tocando os 3 campos (owner E admin)', async () => {
    await assertFails(
      setDoc(doc(owner().firestore(), ...P_TERMO), termoValido({ versao: 99 }))
    );
    await assertFails(
      setDoc(
        doc(owner().firestore(), ...P_TERMO),
        termoValido({ termoTextoHash: 'a'.repeat(64) })
      )
    );
    await adminDb.doc(P_TERMO.join('/')).set({
      ...termoValido(), atualizadoEm: Timestamp.now(),
      versao: 2, termoTextoHash: 'b'.repeat(64),
      versaoAtualizadaEm: Timestamp.now(),
    });
    for (const patch of [
      { versao: 99 },
      { termoTextoHash: 'c'.repeat(64) },
      { versaoAtualizadaEm: serverTimestamp() },
    ]) {
      await assertFails(updateDoc(doc(owner().firestore(), ...P_TERMO), patch));
      await assertFails(updateDoc(doc(platformAdmin().firestore(), ...P_TERMO), patch));
    }
  });

  it('STAFF/athlete/anônimo NÃO escrevem; docId fora do canônico e tenant forjado negados', async () => {
    await assertFails(setDoc(doc(staff().firestore(), ...P_TERMO), termoValido()));
    await assertFails(setDoc(doc(athlete().firestore(), ...P_TERMO), termoValido()));
    await assertFails(
      setDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P_TERMO), termoValido())
    );
    await assertFails(
      setDoc(
        doc(owner().firestore(), 'eventos', EVENTO_ID, 'termoSaude', 'outro-doc'),
        termoValido()
      )
    );
    await assertFails(
      setDoc(doc(owner().firestore(), ...P_TERMO), termoValido({ tenantId: 'outro-tenant' }))
    );
  });

  it('shape: texto não-string e doc-bomba (>20k) negados; delete NUNCA', async () => {
    await assertFails(
      setDoc(doc(owner().firestore(), ...P_TERMO), termoValido({ texto: 123 }))
    );
    await assertFails(
      setDoc(
        doc(owner().firestore(), ...P_TERMO),
        termoValido({ texto: 'x'.repeat(20_001) })
      )
    );
    await adminDb.doc(P_TERMO.join('/')).set({ ...termoValido(), atualizadoEm: Timestamp.now() });
    await assertFails(deleteDoc(doc(owner().firestore(), ...P_TERMO)));
  });

  it('LEITURA: owner/staff/admin leem; athlete/anônimo NÃO (texto é do organizador — leitor público serve a landing)', async () => {
    await adminDb.doc(P_TERMO.join('/')).set({ ...termoValido(), atualizadoEm: Timestamp.now() });
    await assertSucceeds(getDoc(doc(owner().firestore(), ...P_TERMO)));
    await assertSucceeds(getDoc(doc(staff().firestore(), ...P_TERMO)));
    await assertSucceeds(getDoc(doc(platformAdmin().firestore(), ...P_TERMO)));
    await assertFails(getDoc(doc(athlete().firestore(), ...P_TERMO)));
    await assertFails(
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...P_TERMO))
    );
  });
});
