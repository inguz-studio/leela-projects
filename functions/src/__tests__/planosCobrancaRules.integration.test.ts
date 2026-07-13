/**
 * planosCobrancaRules.integration.test.ts — LEELA-T2-L4 · CB-T1
 *
 * Security Rules de `planosCobranca/{planoId}` no Firestore Emulator.
 *
 * Aceites do brief:
 *   - platform_admin cria/edita/lê planosCobranca/{id};
 *   - tenant_owner LENDO → NEGADO (catálogo é privado da plataforma);
 *   - tenant_owner ESCREVENDO → NEGADO; anônimo → negado;
 *   - seed grava o plano "Padrão" com taxaPix=8, taxaCartaoAVista=10.
 * Extra: shape inválido negado até para admin; termos com os novos campos
 * (taxaPorMetodo/tabelaTaxasParcela) passam na rule de commercialTerms e
 * range inválido é negado.
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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { seedPlanosCobranca } from '../seed/planosCobranca.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const ADMIN_UID = 'uid-platform-admin';
const MARINA_UID = 'uid-marina-castelo';
const TENANT = 'castelo-producoes';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function planoValido(over: Record<string, unknown> = {}) {
  const tabela: Record<string, number> = {};
  for (let p = 2; p <= 12; p++) tabela[String(p)] = 0;
  return {
    id: 'promo-agressivo',
    nome: 'Promo Agressivo',
    tabelaTaxasParcela: tabela,
    taxaPix: 5,
    taxaCartaoAVista: 7.5,
    saasMonthlyFee: 0,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
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
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

describe('planosCobranca — platform_admin only (read E write)', () => {
  it('platform_admin CRIA, EDITA e LÊ um plano', async () => {
    const db = ctxAs(ADMIN_UID, { role: 'platform_admin' }).firestore();
    const ref = doc(db, 'planosCobranca', 'promo-agressivo');
    await assertSucceeds(setDoc(ref, planoValido()));
    await assertSucceeds(setDoc(ref, planoValido({ taxaPix: 6 }), { merge: true }));
    await assertSucceeds(getDoc(ref));
  });

  it('tenant_owner LENDO plano → NEGADO (catálogo privado da plataforma)', async () => {
    await adminDb.collection('planosCobranca').doc('promo-agressivo').set(planoValido());
    const db = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT }).firestore();
    await assertFails(getDoc(doc(db, 'planosCobranca', 'promo-agressivo')));
  });

  it('tenant_owner ESCREVENDO plano → NEGADO', async () => {
    const db = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT }).firestore();
    await assertFails(
      setDoc(doc(db, 'planosCobranca', 'plano-pirata'), planoValido({ taxaPix: 0 }))
    );
  });

  it('anônimo e athlete → negados', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'planosCobranca', 'promo-agressivo')));
    const ath = ctxAs('uid-atleta', { role: 'athlete' }).firestore();
    await assertFails(
      setDoc(doc(ath, 'planosCobranca', 'x'), planoValido())
    );
  });

  it('shape inválido é negado ATÉ para platform_admin (taxa 200 / NaN-like)', async () => {
    const db = ctxAs(ADMIN_UID, { role: 'platform_admin' }).firestore();
    await assertFails(
      setDoc(doc(db, 'planosCobranca', 'ruim1'), planoValido({ taxaPix: 200 }))
    );
    await assertFails(
      setDoc(doc(db, 'planosCobranca', 'ruim2'), planoValido({ saasMonthlyFee: Number.POSITIVE_INFINITY }))
    );
    await assertFails(
      setDoc(doc(db, 'planosCobranca', 'ruim3'), planoValido({ nome: '   ' }))
    );
  });
});

describe('seed do plano "Padrão"', () => {
  it('grava taxaPix=8 e taxaCartaoAVista=10 (defaults 2026-07-05); rerun = no-op', async () => {
    await seedPlanosCobranca(adminDb);
    const snap = await adminDb.collection('planosCobranca').doc('padrao').get();
    expect(snap.exists).toBe(true);
    expect(snap.get('taxaPix')).toBe(8);
    expect(snap.get('taxaCartaoAVista')).toBe(10);
    expect(snap.get('nome')).toBe('Padrão');
    expect(Object.keys(snap.get('tabelaTaxasParcela') as Record<string, number>)).toHaveLength(11);

    const antes = snap.data();
    await seedPlanosCobranca(adminDb); // no-op
    const depois = (await adminDb.collection('planosCobranca').doc('padrao').get()).data();
    expect(depois).toEqual(antes);
  });
});

describe('commercialTerms — novos campos opcionais na Rule (S1602 estendida)', () => {
  function termsValidos(versao: number, extra: Record<string, unknown> = {}) {
    return {
      platformFeePct: 10.5,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao,
      atualizadoPor: ADMIN_UID,
      atualizadoEm: new Date(),
      ...extra,
    };
  }

  beforeEach(async () => {
    await adminDb.collection('tenants').doc(TENANT).set({
      id: TENANT, nome: 'Castelo', slug: TENANT, status: 'ativo',
      ownerUid: MARINA_UID, tipo: 'produtor',
    });
  });

  it('admin salva current v1 COM taxaPorMetodo/tabela válidos', async () => {
    const db = ctxAs(ADMIN_UID, { role: 'platform_admin' }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'tenants', TENANT, 'commercialTerms', 'current'),
        termsValidos(1, {
          taxaPorMetodo: { credit_card: 10, pix: 8 },
          tabelaTaxasParcela: { '2': 1.5, '12': 4.75 },
        }))
    );
  });

  it('taxaPorMetodo fora do range → negado (defesa em profundidade)', async () => {
    const db = ctxAs(ADMIN_UID, { role: 'platform_admin' }).firestore();
    await assertFails(
      setDoc(doc(db, 'tenants', TENANT, 'commercialTerms', 'current'),
        termsValidos(1, { taxaPorMetodo: { credit_card: 101, pix: 8 } }))
    );
    await assertFails(
      setDoc(doc(db, 'tenants', TENANT, 'commercialTerms', 'current'),
        termsValidos(1, { taxaPorMetodo: { credit_card: 10, pix: -1 } }))
    );
  });
});
