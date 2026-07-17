/**
 * repasseRules.integration.test.ts — LEELA-E09s-L1-T2
 *
 * Security Rules das coleções do REPASSE (E09-slim) no Firestore Emulator:
 *   tenants/{tid}/dadosBancarios/current        (mascarado — RN-354)
 *   tenants/{tid}/dadosBancariosSecret/current  (cifrado — read:false TOTAL)
 *   tenants/{tid}/repasses/{repasseId}          (RN-353/357)
 *   tenants/{tid}/saldo/current                 (RN-350/351/357)
 * + campos opcionais de repasse em commercialTerms (RN-348/350 · decisão #4).
 *
 * Postura ANTAGONISTA — aceites falsificáveis do brief E09s-L1:
 *   - owner do tenant A LÊ seu dadosBancarios mascarado e seus repasses/saldo;
 *   - owner do tenant B lê tenants/A/... → NEGA (cross-tenant, RN-354/400);
 *   - QUALQUER cliente (owner incluso, admin incluso) lê
 *     dadosBancariosSecret → NEGA (read:false, RN-354);
 *   - cliente faz create/update/delete em repasses/saldo/dadosBancarios* →
 *     NEGA (write:false — RN-357), inclusive forjar estado 'pago';
 *   - platform_admin lê repasses de QUALQUER tenant → permite;
 *   - tenant_owner escreve retencaoRepassePct → NEGA; platform_admin grava
 *     (via termos versionados) com range travado (0..100; NaN nega).
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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const CASTELO_STAFF_UID = 'uid-castelo-staff';
const CASTELO_PROMOTER_UID = 'uid-castelo-promoter';
const PASSO_OWNER_UID = 'uid-passo-owner';
const ADMIN_UID = 'uid-platform-admin';
const ATHLETE_UID = 'uid-atleta-global';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Termo válido (shape completo exigido pela Rule de commercialTerms). */
function validTerms(versao: number, overrides: Record<string, unknown> = {}) {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao,
    atualizadoPor: ADMIN_UID,
    atualizadoEm: new Date(),
    ...overrides,
  };
}

/** Doc mascarado canônico (o que a Function saveDadosBancarios grava). */
function dadosBancariosMascarados(tenantId: string) {
  return {
    tenantId,
    banco: '260 — Nubank',
    agencia: '0001',
    contaMascarada: '****1234',
    tipo: 'corrente',
    pixMascarado: '***@g***.com',
    titular: 'Marina Castelo',
    cpfCnpjMascarado: '***.***.***-12',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

/** Envelope cifrado canônico (L2-T2 gravará algo com este shape). */
function secretEnvelope(tenantId: string) {
  return {
    tenantId,
    algoritmo: 'aes-256-gcm',
    ciphertext: 'Y2lmcmFkbw==',
    iv: 'aXYtZmFrZQ==',
    authTag: 'dGFnLWZha2U=',
    keyVersion: 1,
    atualizadoEm: new Date(),
  };
}

function repasseSolicitado(tenantId: string) {
  return {
    id: 'rep-001',
    tenantId,
    valor: 5000,
    estado: 'solicitado',
    dadosBancariosSnapshot: {
      tenantId,
      banco: '260 — Nubank',
      agencia: '0001',
      contaMascarada: '****1234',
      tipo: 'corrente',
      pixMascarado: '***@g***.com',
      titular: 'Marina Castelo',
      cpfCnpjMascarado: '***.***.***-12',
    },
    transicoes: [
      { de: null, para: 'solicitado', em: new Date(), por: MARINA_UID, papel: 'tenant_owner' },
    ],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

function saldoCurrent(tenantId: string) {
  return {
    tenantId,
    vendidoBruto: 85617,
    retido: 11494.1,
    disponivel: 60138.11,
    comprometido: 5000,
    dentroJanelaDN: 0,
    eventosSemTermo: 0,
    atualizadoEm: new Date(),
  };
}

type Seg = [string, ...string[]];
const pDados = (tid: string): Seg => ['tenants', tid, 'dadosBancarios', 'current'];
const pSecret = (tid: string): Seg => ['tenants', tid, 'dadosBancariosSecret', 'current'];
const pRepasse = (tid: string, id = 'rep-001'): Seg => ['tenants', tid, 'repasses', id];
const pSaldo = (tid: string): Seg => ['tenants', tid, 'saldo', 'current'];
const pTerms = (tid: string, docId = 'current'): Seg => ['tenants', tid, 'commercialTerms', docId];

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

  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  // Seed via Admin SDK (bypassa Rules — é o caminho da Function, RN-357)
  batch.set(adminDb.doc(pDados(CASTELO_ID).join('/')), dadosBancariosMascarados(CASTELO_ID));
  batch.set(adminDb.doc(pSecret(CASTELO_ID).join('/')), secretEnvelope(CASTELO_ID));
  batch.set(adminDb.doc(pRepasse(CASTELO_ID).join('/')), repasseSolicitado(CASTELO_ID));
  batch.set(adminDb.doc(pSaldo(CASTELO_ID).join('/')), saldoCurrent(CASTELO_ID));
  batch.set(adminDb.doc(pTerms(CASTELO_ID).join('/')), validTerms(1));
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}
const ownerA = () => ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
const staffA = () => ctxAs(CASTELO_STAFF_UID, { role: 'tenant_staff', tenantId: CASTELO_ID });
const promoterA = () => ctxAs(CASTELO_PROMOTER_UID, { role: 'promoter', tenantId: CASTELO_ID });
const ownerB = () => ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
const platformAdmin = () => ctxAs(ADMIN_UID, { role: 'platform_admin' });
const athlete = () => ctxAs(ATHLETE_UID, { role: 'athlete' });

// ── dadosBancarios/current (mascarado) — leitura (RN-354) ─────────────────
describe('dadosBancarios (mascarado) — leitura', () => {
  it('tenant_owner LÊ o próprio dadosBancarios mascarado', async () => {
    await assertSucceeds(getDoc(doc(ownerA().firestore(), ...pDados(CASTELO_ID))));
  });

  it('platform_admin LÊ o mascarado (back-office L4 confere favorecido)', async () => {
    await assertSucceeds(getDoc(doc(platformAdmin().firestore(), ...pDados(CASTELO_ID))));
  });

  it('owner de OUTRO tenant NÃO lê (cross-tenant — RN-354/400)', async () => {
    await assertFails(getDoc(doc(ownerB().firestore(), ...pDados(CASTELO_ID))));
  });

  it('tenant_staff NÃO lê dado bancário (minimização LGPD — owner-only)', async () => {
    await assertFails(getDoc(doc(staffA().firestore(), ...pDados(CASTELO_ID))));
  });

  it('promoter / athlete / anônimo NÃO leem', async () => {
    await assertFails(getDoc(doc(promoterA().firestore(), ...pDados(CASTELO_ID))));
    await assertFails(getDoc(doc(athlete().firestore(), ...pDados(CASTELO_ID))));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...pDados(CASTELO_ID))));
  });
});

// ── dadosBancariosSecret/current — ILEGÍVEL para TODO cliente (RN-354) ────
describe('dadosBancariosSecret — read:false total', () => {
  it('ATAQUE: o PRÓPRIO tenant_owner NÃO lê o secret do seu tenant', async () => {
    await assertFails(getDoc(doc(ownerA().firestore(), ...pSecret(CASTELO_ID))));
  });

  it('ATAQUE: platform_admin via CLIENT SDK também NÃO lê (só Function auditada L2-T5)', async () => {
    await assertFails(getDoc(doc(platformAdmin().firestore(), ...pSecret(CASTELO_ID))));
  });

  it('staff / promoter / owner de outro tenant / anônimo NÃO leem', async () => {
    await assertFails(getDoc(doc(staffA().firestore(), ...pSecret(CASTELO_ID))));
    await assertFails(getDoc(doc(promoterA().firestore(), ...pSecret(CASTELO_ID))));
    await assertFails(getDoc(doc(ownerB().firestore(), ...pSecret(CASTELO_ID))));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), ...pSecret(CASTELO_ID))));
  });

  it('Admin SDK (caminho da Function) lê e escreve — bypass documentado', async () => {
    const snap = await adminDb.doc(pSecret(CASTELO_ID).join('/')).get();
    if (!snap.exists) throw new Error('seed do secret sumiu');
    await adminDb.doc(pSecret(CASTELO_ID).join('/')).set(secretEnvelope(CASTELO_ID));
  });
});

// ── repasses — leitura ─────────────────────────────────────────────────────
describe('repasses — leitura', () => {
  it('tenant_owner LÊ os próprios repasses', async () => {
    await assertSucceeds(getDoc(doc(ownerA().firestore(), ...pRepasse(CASTELO_ID))));
  });

  it('tenant_staff LÊ (taxonomia financeira owner/staff — como financeiro/pedidos)', async () => {
    await assertSucceeds(getDoc(doc(staffA().firestore(), ...pRepasse(CASTELO_ID))));
  });

  it('platform_admin LÊ repasses de QUALQUER tenant (fila L4)', async () => {
    await assertSucceeds(getDoc(doc(platformAdmin().firestore(), ...pRepasse(CASTELO_ID))));
    await assertSucceeds(
      getDocs(collection(platformAdmin().firestore(), 'tenants', CASTELO_ID, 'repasses'))
    );
  });

  it('ATAQUE: owner do tenant B NÃO lê repasses do tenant A (nem por query)', async () => {
    await assertFails(getDoc(doc(ownerB().firestore(), ...pRepasse(CASTELO_ID))));
    await assertFails(
      getDocs(collection(ownerB().firestore(), 'tenants', CASTELO_ID, 'repasses'))
    );
  });

  it('promoter / athlete NÃO enxergam dinheiro pelo cliente', async () => {
    await assertFails(getDoc(doc(promoterA().firestore(), ...pRepasse(CASTELO_ID))));
    await assertFails(getDoc(doc(athlete().firestore(), ...pRepasse(CASTELO_ID))));
  });
});

// ── saldo/current — leitura ────────────────────────────────────────────────
describe('saldo — leitura', () => {
  it('owner e staff do tenant leem o saldo consolidado', async () => {
    await assertSucceeds(getDoc(doc(ownerA().firestore(), ...pSaldo(CASTELO_ID))));
    await assertSucceeds(getDoc(doc(staffA().firestore(), ...pSaldo(CASTELO_ID))));
  });

  it('platform_admin lê saldo de qualquer tenant', async () => {
    await assertSucceeds(getDoc(doc(platformAdmin().firestore(), ...pSaldo(CASTELO_ID))));
  });

  it('ATAQUE: cross-tenant e papéis sem gestão NÃO leem', async () => {
    await assertFails(getDoc(doc(ownerB().firestore(), ...pSaldo(CASTELO_ID))));
    await assertFails(getDoc(doc(promoterA().firestore(), ...pSaldo(CASTELO_ID))));
    await assertFails(getDoc(doc(athlete().firestore(), ...pSaldo(CASTELO_ID))));
  });
});

// ── RN-357: escrita de cliente NEGADA nas 4 coleções ───────────────────────
describe('RN-357 — write:false para TODO cliente', () => {
  it('ATAQUE: owner cria repasse direto (pularia validação RN-352) → NEGA', async () => {
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...pRepasse(CASTELO_ID, 'rep-forjado')), {
        ...repasseSolicitado(CASTELO_ID),
        id: 'rep-forjado',
        valor: 999999,
      })
    );
  });

  it("ATAQUE: owner forja estado 'pago' + comprovante via update → NEGA", async () => {
    await assertFails(
      updateDoc(doc(ownerA().firestore(), ...pRepasse(CASTELO_ID)), {
        estado: 'pago',
        comprovanteNumero: 'REP-2026-0001',
      })
    );
  });

  it('ATAQUE: owner deleta repasse (sumiria com a trilha) → NEGA', async () => {
    await assertFails(deleteDoc(doc(ownerA().firestore(), ...pRepasse(CASTELO_ID))));
  });

  it('ATAQUE (RN-349): owner forja/troca `eventoId` do repasse via update → NEGA (campo congelado)', async () => {
    await assertFails(
      updateDoc(doc(ownerA().firestore(), ...pRepasse(CASTELO_ID)), {
        eventoId: 'evento-que-vende-mais',
      })
    );
  });

  it('ATAQUE: owner infla o próprio saldo.disponivel → NEGA (create e update)', async () => {
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...pSaldo(CASTELO_ID)), {
        ...saldoCurrent(CASTELO_ID),
        disponivel: 1000000,
      })
    );
    await assertFails(
      updateDoc(doc(ownerA().firestore(), ...pSaldo(CASTELO_ID)), { disponivel: 1000000 })
    );
  });

  it('ATAQUE: owner escreve dadosBancarios direto (pularia mascaramento) → NEGA', async () => {
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...pDados(CASTELO_ID)), dadosBancariosMascarados(CASTELO_ID))
    );
    await assertFails(deleteDoc(doc(ownerA().firestore(), ...pDados(CASTELO_ID))));
  });

  it('ATAQUE: owner grava o próprio secret (cifra forjada/troca de conta) → NEGA', async () => {
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...pSecret(CASTELO_ID)), secretEnvelope(CASTELO_ID))
    );
  });

  it('ATAQUE: até platform_admin via CLIENT SDK não escreve repasse/saldo (só Admin SDK)', async () => {
    await assertFails(
      updateDoc(doc(platformAdmin().firestore(), ...pRepasse(CASTELO_ID)), { estado: 'aprovado' })
    );
    await assertFails(
      setDoc(doc(platformAdmin().firestore(), ...pSaldo(CASTELO_ID)), saldoCurrent(CASTELO_ID))
    );
  });

  it('ATAQUE: staff/promoter/cross-tenant também não escrevem', async () => {
    await assertFails(
      updateDoc(doc(staffA().firestore(), ...pRepasse(CASTELO_ID)), { valor: 1 })
    );
    await assertFails(
      setDoc(doc(promoterA().firestore(), ...pSaldo(CASTELO_ID)), saldoCurrent(CASTELO_ID))
    );
    await assertFails(
      setDoc(doc(ownerB().firestore(), ...pRepasse(CASTELO_ID, 'rep-b')), repasseSolicitado(CASTELO_ID))
    );
  });
});

// ── retencaoRepassePct / disponibilizacaoDiasUteis em commercialTerms ─────
describe('commercialTerms — campos de repasse (RN-348/350 · decisão #4)', () => {
  it('ATAQUE: tenant_owner grava retencaoRepassePct (liberaria o próprio retido) → NEGA', async () => {
    await assertFails(
      setDoc(doc(ownerA().firestore(), ...pTerms(CASTELO_ID)), validTerms(2, { retencaoRepassePct: 0 }))
    );
    await assertFails(
      updateDoc(doc(ownerA().firestore(), ...pTerms(CASTELO_ID)), { retencaoRepassePct: 0 })
    );
  });

  it('platform_admin grava retencaoRepassePct válido no bump de versão', async () => {
    await assertSucceeds(
      setDoc(
        doc(platformAdmin().firestore(), ...pTerms(CASTELO_ID)),
        validTerms(2, { retencaoRepassePct: 20, disponibilizacaoDiasUteis: 3 })
      )
    );
  });

  it('termo SEM os campos opcionais segue válido (retrocompat E16)', async () => {
    await assertSucceeds(
      setDoc(doc(platformAdmin().firestore(), ...pTerms(CASTELO_ID)), validTerms(2))
    );
  });

  it('range travado: retencaoRepassePct 150 / -5 / NaN → NEGA', async () => {
    const db = platformAdmin().firestore();
    await assertFails(
      setDoc(doc(db, ...pTerms(CASTELO_ID)), validTerms(2, { retencaoRepassePct: 150 }))
    );
    await assertFails(
      setDoc(doc(db, ...pTerms(CASTELO_ID)), validTerms(2, { retencaoRepassePct: -5 }))
    );
    await assertFails(
      setDoc(doc(db, ...pTerms(CASTELO_ID)), validTerms(2, { retencaoRepassePct: NaN }))
    );
  });

  it('disponibilizacaoDiasUteis: só int ≥ 0 (1.5 e -1 → NEGA)', async () => {
    const db = platformAdmin().firestore();
    await assertFails(
      setDoc(doc(db, ...pTerms(CASTELO_ID)), validTerms(2, { disponibilizacaoDiasUteis: 1.5 }))
    );
    await assertFails(
      setDoc(doc(db, ...pTerms(CASTELO_ID)), validTerms(2, { disponibilizacaoDiasUteis: -1 }))
    );
    await assertSucceeds(
      setDoc(doc(db, ...pTerms(CASTELO_ID)), validTerms(2, { disponibilizacaoDiasUteis: 0 }))
    );
  });
});
