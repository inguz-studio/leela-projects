/**
 * taxaFlexRules.integration.test.ts — LEELA-TAXAFLEX-T1 (RN-178/404)
 *
 * Rules + callable da tabela de taxa-flex no Firestore Emulator:
 *   - `commercialTerms.taxaTabela` (override por organizador): admin grava
 *     com shape válido; passo/range/chave estranha NEGADOS (fail-closed);
 *     tenant_owner nunca grava (RN-404);
 *   - `platform/config`: write de cliente NEGADO até para platform_admin
 *     (postura pós-19c8afe — escrita só via callable/Admin SDK); read só
 *     platform_admin;
 *   - `setTaxaPlataformaGlobalCore`: só platform_admin; tabela COMPLETA
 *     validada; merge preserva campos alheios de `platform/config`.
 *
 * Emulator da lane: honra LEELA_FS_EMU_PORT (r6 = 8480) — padrão ck2Rules.
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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  setTaxaPlataformaGlobalCore,
} from '../platform/setTaxaPlataformaGlobal';
import type { AuthClaims, TabelaTaxaPlataforma } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const FS_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_UID = 'uid-platform-admin';

const TABELA: TabelaTaxaPlataforma = {
  pix: { percentual: 6, fixoCentavos: 200 },
  cartao: { percentual: 8, fixoCentavos: 150 },
  boleto: { percentual: 4, fixoCentavos: 350 },
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Payload válido de termos (shape completo exigido pela Rule). */
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

beforeAll(async () => {
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
  batch.set(
    adminDb.collection('tenants').doc(CASTELO_ID)
      .collection('commercialTerms').doc('current'),
    validTerms(1)
  );
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

const asAdmin = () =>
  testEnv.authenticatedContext(ADMIN_UID, { role: 'platform_admin' }).firestore();
const asOwner = () =>
  testEnv
    .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
    .firestore();

const termsRef = (db: ReturnType<typeof asAdmin>) =>
  doc(db, 'tenants', CASTELO_ID, 'commercialTerms', 'current');

// ── Override no termo (Rules — RN-178/404 fail-closed) ─────────────────────
describe('Rules — commercialTerms.taxaTabela (override por organizador)', () => {
  it('platform_admin grava override VÁLIDO (parcial, com bump de versão)', async () => {
    await assertSucceeds(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5, fixoCentavos: 100 } },
      }))
    );
  });

  it('percentual fora do passo de 0,01% é NEGADO', async () => {
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5.001, fixoCentavos: 100 } },
      }))
    );
  });

  it('fixoCentavos float / negativo / acima do teto é NEGADO', async () => {
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5, fixoCentavos: 100.5 } },
      }))
    );
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5, fixoCentavos: -1 } },
      }))
    );
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5, fixoCentavos: 100001 } },
      }))
    );
  });

  it('chave de meio estranha e chave extra na linha são NEGADAS', async () => {
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { credit_card: { percentual: 5, fixoCentavos: 0 } },
      }))
    );
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5, fixoCentavos: 0, extra: 1 } },
      }))
    );
    await assertFails(
      setDoc(termsRef(asAdmin()), validTerms(2, {
        taxaTabela: { pix: { percentual: 5 } },
      }))
    );
  });

  it('tenant_owner NÃO grava override — nem no próprio termo (RN-404)', async () => {
    await assertFails(
      setDoc(termsRef(asOwner()), validTerms(2, {
        taxaTabela: { pix: { percentual: 0, fixoCentavos: 0 } },
      }))
    );
    await assertFails(
      updateDoc(termsRef(asOwner()), {
        taxaTabela: { pix: { percentual: 0, fixoCentavos: 0 } },
      })
    );
  });
});

// ── platform/config (Rules — write:false p/ TODO cliente) ──────────────────
describe('Rules — platform/config (tabela GLOBAL)', () => {
  it('write de cliente NEGADO até para platform_admin (escrita = só callable)', async () => {
    await assertFails(
      setDoc(doc(asAdmin(), 'platform', 'config'), { taxaPlataforma: TABELA })
    );
  });

  it('read: platform_admin SIM; tenant_owner NÃO', async () => {
    await adminDb.doc('platform/config').set({ taxaPlataforma: TABELA });
    await assertSucceeds(getDoc(doc(asAdmin(), 'platform', 'config')));
    await assertFails(getDoc(doc(asOwner(), 'platform', 'config')));
  });
});

// ── Callable core — setTaxaPlataformaGlobal (RN-178/404) ───────────────────
describe('setTaxaPlataformaGlobalCore', () => {
  const adminCaller = {
    uid: ADMIN_UID,
    claims: { role: 'platform_admin' } as AuthClaims,
  };

  it('platform_admin grava a tabela completa em platform/config', async () => {
    const r = await setTaxaPlataformaGlobalCore(
      adminDb,
      { taxaPlataforma: TABELA },
      adminCaller
    );
    expect(r.ok).toBe(true);
    const snap = await adminDb.doc('platform/config').get();
    expect(snap.get('taxaPlataforma')).toEqual(TABELA);
    expect(snap.get('taxaPlataformaAtualizadoPor')).toBe(ADMIN_UID);
  });

  it('merge: gravar a tabela PRESERVA campos alheios de platform/config', async () => {
    await adminDb.doc('platform/config').set({ outroCampoMacro: 42 });
    await setTaxaPlataformaGlobalCore(adminDb, { taxaPlataforma: TABELA }, adminCaller);
    const snap = await adminDb.doc('platform/config').get();
    expect(snap.get('outroCampoMacro')).toBe(42);
    expect(snap.get('taxaPlataforma')).toEqual(TABELA);
  });

  it('não-admin recebe permission-denied (tenant_owner não edita a economia global)', async () => {
    await expect(
      setTaxaPlataformaGlobalCore(adminDb, { taxaPlataforma: TABELA }, {
        uid: MARINA_UID,
        claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('tabela INCOMPLETA (sem boleto) e linha inválida ⇒ invalid-argument', async () => {
    await expect(
      setTaxaPlataformaGlobalCore(
        adminDb,
        { taxaPlataforma: { pix: TABELA.pix, cartao: TABELA.cartao } },
        adminCaller
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      setTaxaPlataformaGlobalCore(
        adminDb,
        {
          taxaPlataforma: {
            ...TABELA,
            pix: { percentual: 5.001, fixoCentavos: 0 },
          },
        },
        adminCaller
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      setTaxaPlataformaGlobalCore(adminDb, {}, adminCaller)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
