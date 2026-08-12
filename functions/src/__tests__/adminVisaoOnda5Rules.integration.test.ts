/**
 * adminVisaoOnda5Rules.integration.test.ts — ADMIN-VISAO onda 5 · S1615-T5 ·
 * RN-540
 *
 * O CANÁRIO da onda 5, com CRACHÁ DE ADMINISTRADOR nas duas pernas do RN-401
 * (papel legado `role: 'platform_admin'` E capacidade `platformAdmin: true`):
 *
 *   (a) `pessoas` SEGUE NEGADA. É a coleção de CPF em claro do sistema
 *       inteiro, e as Rules a fecham para TODO cliente (`firestore.rules:2724`
 *       — `allow read, write: if false`), inclusive para o administrador. O
 *       V-4 decidiu que o diretório identifica por CPF e o mecanismo é o
 *       callable auditado — a Rule NÃO foi aberta, e este teste é o alarme que
 *       dispara no dia em que alguém a abrir "só para simplificar a tela".
 *
 *   (b) `collectionGroup` SEGUE NEGADO. Não existe `match /{path=**}` nem
 *       nenhuma Rule de collection group no arquivo, então toda query de CG é
 *       negada — e a negativa chega com uma mensagem que PARECE falta de
 *       índice. É a armadilha nomeada na spec, e é por isso que os readers
 *       desta onda varrem coleção RAIZ doc a doc.
 *
 * E a contraprova, que é o que dá sentido às duas negativas: as leituras que a
 * S1615-T1 usa de verdade (`profissionais` e `atletas`) CONTINUAM permitidas
 * ao administrador. Sem ela, um arquivo que negasse tudo passaria igual.
 *
 * Pré-requisito: Firestore Emulator (Rules carregadas de verdade). Rodar na
 * raiz com `firebase emulators:exec --only firestore "<comando>"`.
 *
 * ⚠️ NÃO EXECUTADO na máquina que escreveu este arquivo: `firebase-tools` exige
 * JDK 21+ e o JDK instalado é o 17 (`firebase-tools no longer supports Java
 * version before 21`). O arquivo está no mesmo lugar, no mesmo formato e com o
 * mesmo runner do canário da onda 1 (`adminVisaoOnda1.integration.test.ts`).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { COLECAO_PESSOAS } from '@leela/core';

const PROJECT_ID = 'demo-leela-admin-visao-onda5';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_LEGADO_UID = 'uid-platform-admin-legado';
const ADMIN_CAPACIDADE_UID = 'uid-platform-admin-capacidade';
const PESSOA_ID = 'cpf_hmac_de_teste';
const CONTA_ESPERANDO_UID = 'uid-conta-esperando';
const ATLETA_UID = 'uid-atleta-qualquer';

type AnyRec = Record<string, unknown>;

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ctxAs(uid: string, claims: AnyRec) {
  return testEnv.authenticatedContext(uid, claims);
}
const adminLegado = () => ctxAs(ADMIN_LEGADO_UID, { role: 'platform_admin' });
/** Capacidade PURA — a perna do RN-401 que o canário legado nunca exercitou. */
const adminCapacidade = () =>
  ctxAs(ADMIN_CAPACIDADE_UID, { role: 'athlete', platformAdmin: true });
const ownerCastelo = () =>
  ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: Number(
        process.env['LEELA_FS_EMU_PORT'] ??
          process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
          8080
      ),
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ??
      `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = FieldValue.serverTimestamp();

  // Semeado por Admin SDK (bypassa Rules) — o que se testa é a LEITURA.
  await adminDb.collection(COLECAO_PESSOAS).doc(PESSOA_ID).set({
    cpf: '11144477735',
    contaUid: CONTA_ESPERANDO_UID,
    contaEmail: 'marina@exemplo.com',
    criadoEm: now,
    atualizadoEm: now,
  });

  await adminDb.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID,
    nome: 'Castelo Produções',
    slug: CASTELO_ID,
    status: 'ativo',
    ownerUid: MARINA_UID,
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });

  await adminDb.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set({
    platformFeePct: 10.5,
    versao: 1,
    atualizadoPor: ADMIN_LEGADO_UID,
    atualizadoEm: now,
  });

  await adminDb.collection('profissionais').doc(CONTA_ESPERANDO_UID).set({
    id: CONTA_ESPERANDO_UID,
    nome: 'Marina Duarte',
    email: 'marina@exemplo.com',
    telefone: '48999998888',
    organizacao: 'Castelo Produções',
    statusOnboarding: 'aguardando_convite',
    criadoEm: now,
    atualizadoEm: now,
  });

  await adminDb.collection('atletas').doc(ATLETA_UID).set({
    id: ATLETA_UID,
    nome: 'Atleta Qualquer',
    email: 'atleta@exemplo.com',
    criadoEm: now,
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// ---------------------------------------------------------------------------
// (a) `pessoas` SEGUE NEGADA — inclusive para o administrador (RN-540 · V-4)
// ---------------------------------------------------------------------------

describe('S1615-T5 (a) — `pessoas` segue fechada mesmo com crachá de administrador', () => {
  it('platform_admin LEGADO não lê o doc de `pessoas`', async () => {
    await assertFails(
      getDoc(doc(adminLegado().firestore(), COLECAO_PESSOAS, PESSOA_ID))
    );
  });

  it('platform_admin por CAPACIDADE também não lê — as duas pernas do RN-401', async () => {
    await assertFails(
      getDoc(doc(adminCapacidade().firestore(), COLECAO_PESSOAS, PESSOA_ID))
    );
  });

  it('list (query) TAMBÉM é negado — mutação que abrisse só `allow list` não passa', async () => {
    await assertFails(
      getDocs(query(collection(adminLegado().firestore(), COLECAO_PESSOAS)))
    );
    await assertFails(
      getDocs(query(collection(adminCapacidade().firestore(), COLECAO_PESSOAS)))
    );
  });

  it('nem a query POR `contaUid` passa — o caminho que o callable usa NÃO existe no cliente', async () => {
    // É esta a query que `consultarDocumentoDaConta` roda com Admin SDK. Ela
    // ser negada aqui é a prova de que a leitura auditada é o ÚNICO caminho:
    // não há atalho pelo client SDK nem para quem tem o crachá.
    await assertFails(
      getDocs(
        query(
          collection(adminLegado().firestore(), COLECAO_PESSOAS),
          where('contaUid', '==', CONTA_ESPERANDO_UID),
          limit(1)
        )
      )
    );
  });

  it('escrita segue negada ao administrador — a coleção é da Function do checkout', async () => {
    await assertFails(
      getDocs(query(collection(ownerCastelo().firestore(), COLECAO_PESSOAS)))
    );
  });
});

// ---------------------------------------------------------------------------
// (b) `collectionGroup` SEGUE NEGADO — a armadilha nomeada na spec
// ---------------------------------------------------------------------------

describe('S1615-T5 (b) — `collectionGroup` segue negado com crachá de administrador', () => {
  it('CG de `commercialTerms` é negado, e o mesmo doc pelo caminho DIRETO é permitido', async () => {
    // O contraste é o ponto: a Rule direta abre para o administrador
    // (`firestore.rules:266`), o CG não. A negativa é do CAMINHO, não da
    // coleção — e ela chega parecendo falta de índice, que é a armadilha.
    await assertSucceeds(
      getDoc(
        doc(
          adminLegado().firestore(),
          'tenants',
          CASTELO_ID,
          'commercialTerms',
          'current'
        )
      )
    );

    await assertFails(
      getDocs(query(collectionGroup(adminLegado().firestore(), 'commercialTerms')))
    );
  });

  it('CG negado também na perna da CAPACIDADE', async () => {
    await assertFails(
      getDocs(query(collectionGroup(adminCapacidade().firestore(), 'commercialTerms')))
    );
  });

  it('CG de `crmClientes` é negado — nenhuma coleção ganha CG de graça', async () => {
    await assertFails(
      getDocs(query(collectionGroup(adminLegado().firestore(), 'crmClientes')))
    );
  });

  it('CG de `inscritos` é negado — a varredura de PII de participante não tem porta', async () => {
    await assertFails(
      getDocs(query(collectionGroup(adminLegado().firestore(), 'inscritos')))
    );
  });
});

// ---------------------------------------------------------------------------
// Contraprova — o que a S1615-T1 lê DE VERDADE continua permitido
// ---------------------------------------------------------------------------

describe('S1615-T1 — as duas leituras do diretório continuam abertas ao administrador', () => {
  it('`profissionais` é listado pelo administrador (as duas pernas)', async () => {
    await assertSucceeds(
      getDocs(query(collection(adminLegado().firestore(), 'profissionais'), limit(20)))
    );
    await assertSucceeds(
      getDocs(query(collection(adminCapacidade().firestore(), 'profissionais'), limit(20)))
    );
  });

  it('o recorte da Fila (`statusOnboarding`) passa sem índice composto novo', async () => {
    const snap = await getDocs(
      query(
        collection(adminLegado().firestore(), 'profissionais'),
        where('statusOnboarding', '==', 'aguardando_convite'),
        limit(20)
      )
    );
    expect(snap.size).toBe(1);
  });

  it('`atletas` é listado pelo administrador (as duas pernas)', async () => {
    await assertSucceeds(
      getDocs(query(collection(adminLegado().firestore(), 'atletas'), limit(20)))
    );
    await assertSucceeds(
      getDocs(query(collection(adminCapacidade().firestore(), 'atletas'), limit(20)))
    );
  });

  it('quem NÃO é administrador não lista o diretório', async () => {
    await assertFails(
      getDocs(query(collection(ownerCastelo().firestore(), 'atletas'), limit(20)))
    );
  });

  it('nenhum doc do diretório carrega CPF — a minimização é da ORIGEM, não do reader', async () => {
    const snap = await getDocs(
      query(collection(adminLegado().firestore(), 'profissionais'), limit(20))
    );
    for (const d of snap.docs) {
      expect(d.data()).not.toHaveProperty('cpf');
    }
  });
});
