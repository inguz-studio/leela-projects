/**
 * precoBloqueado.test.ts — LEELA-S201-T3
 *
 * RN-200: após a 1ª venda, edição de preço do evento/kit é bloqueada.
 *
 * Cobre as três camadas:
 *   - core puro: `precoBloqueado` / `podeAlterarPreco` (unit)
 *   - guard de Function: `assertPrecoEditavel` (Admin SDK, Emulator)
 *   - Security Rules: update de `kits.preco` negado quando o evento pai
 *     tem venda; mesmo preço (outros campos) segue editável; evento sem
 *     venda edita preço livremente (aceite L2)
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import {
  MSG_PRECO_BLOQUEADO,
  podeAlterarPreco,
  precoBloqueado,
} from '@leela/core';
import { assertPrecoEditavel } from '../eventos/guardPreco';
import { seedEventos, MARATONA_2027_ID, MEIA_FLORIPA_ID } from '../seed/eventos.seed';
import { seedKits } from '../seed/kits.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

/** Evento com EXATAMENTE 1 venda — boundary da RN-200 (review #40). */
const EVENTO_1_VENDA = 'corrida-boundary-1-venda';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

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

afterAll(async () => {
  await testEnv?.cleanup();
});

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv
    .authenticatedContext(uid, claims)
    .firestore() as unknown as Firestore;
}

const marinaClaims = { role: 'tenant_owner', tenantId: CASTELO_ID };
const staffClaims = { role: 'tenant_staff', tenantId: CASTELO_ID };

async function seedBase(): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();
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
  await batch.commit();
  await seedEventos(adminDb); // meia-floripa: 453 vendas · maratona-2027: 0
  await seedKits(adminDb); // kits na meia-floripa (kit-ouro 89 etc.)

  // Kit no evento SEM venda (maratona-2027) — caminho feliz da edição
  await adminDb
    .collection('eventos').doc(MARATONA_2027_ID)
    .collection('kits').doc('kit-unico')
    .set({
      id: 'kit-unico', tenantId: CASTELO_ID, nome: 'Kit Único',
      preco: 50, capacidade: 100, modalidades: ['42k'],
      criadoEm: now, atualizadoEm: now,
    });

  // BOUNDARY RN-200 (review #40): evento com EXATAMENTE 1 venda — mata o
  // mutante `>0`→`>1` que sobrevivia com fixtures só de 453 ou 0.
  await adminDb.collection('eventos').doc(EVENTO_1_VENDA).set({
    id: EVENTO_1_VENDA, tenantId: CASTELO_ID,
    organizadorId: MARINA_UID, nome: 'Corrida Boundary 1 Venda',
    data: admin.firestore.Timestamp.fromDate(new Date('2026-11-10T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k'],
    percursos: [{ nome: '5k', preco: 80 }],
    slug: EVENTO_1_VENDA, status: 'publicado', usaChip: false,
    qtdInscritos: 1, receitaConfirmada: 80,
    criadoEm: now, atualizadoEm: now,
  });
  await adminDb
    .collection('eventos').doc(EVENTO_1_VENDA)
    .collection('kits').doc('kit-boundary')
    .set({
      id: 'kit-boundary', tenantId: CASTELO_ID, nome: 'Kit Boundary',
      preco: 30, capacidade: 50, modalidades: ['5k'],
      criadoEm: now, atualizadoEm: now,
    });
}

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBase();
});

// ── Core puro (unit) ───────────────────────────────────────────────────────

describe('precoBloqueado / podeAlterarPreco (core puro — RN-200)', () => {
  it('bloqueia com ≥1 venda; libera com 0', () => {
    expect(precoBloqueado({ qtdInscritos: 1 })).toBe(true);
    expect(precoBloqueado({ qtdInscritos: 453 })).toBe(true);
    expect(precoBloqueado({ qtdInscritos: 0 })).toBe(false);
  });

  it('manter o MESMO preço nunca é bloqueado (updates de outros campos)', () => {
    expect(podeAlterarPreco({ qtdInscritos: 453 }, 89, 89)).toBe(true);
    expect(podeAlterarPreco({ qtdInscritos: 453 }, 89, 99)).toBe(false);
    expect(podeAlterarPreco({ qtdInscritos: 0 }, 89, 99)).toBe(true);
  });

  it('mensagem canônica exportada para a UI (S206-T1)', () => {
    expect(MSG_PRECO_BLOQUEADO).toContain('RN-200');
  });
});

// ── Guard de Function (Admin SDK) ──────────────────────────────────────────

describe('assertPrecoEditavel — guard de servidor (S201-T3)', () => {
  it('evento COM venda: mudança de preço → failed-precondition', async () => {
    await expect(
      assertPrecoEditavel(adminDb, MEIA_FLORIPA_ID, { precoAtual: 89, novoPreco: 99 })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof https.HttpsError &&
        err.code === 'failed-precondition' &&
        err.message.includes('RN-200')
      );
    });
  });

  it('evento COM venda: preço INALTERADO passa (não trava outros updates)', async () => {
    await expect(
      assertPrecoEditavel(adminDb, MEIA_FLORIPA_ID, { precoAtual: 89, novoPreco: 89 })
    ).resolves.toBeUndefined();
  });

  it('evento SEM venda: mudança de preço passa', async () => {
    await expect(
      assertPrecoEditavel(adminDb, MARATONA_2027_ID, { precoAtual: 50, novoPreco: 75 })
    ).resolves.toBeUndefined();
  });

  it('evento inexistente → not-found', async () => {
    await expect(
      assertPrecoEditavel(adminDb, 'nao-existe', { precoAtual: 1, novoPreco: 2 })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof https.HttpsError && err.code === 'not-found'
    );
  });
});

// ── Security Rules (aceite L2: negado no servidor) ─────────────────────────

describe('Rules — kits.preco travado após 1ª venda (RN-200)', () => {
  function kitMeia(db: Firestore, kitId: string) {
    return doc(db, 'eventos', MEIA_FLORIPA_ID, 'kits', kitId);
  }

  it('owner NÃO altera preço de kit em evento COM venda', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(updateDoc(kitMeia(db, 'kit-ouro'), { preco: 99 }));
  });

  it('staff também NÃO altera preço com venda (papel de escrita não basta)', async () => {
    const db = dbAs('uid-staff-castelo', staffClaims);
    await assertFails(updateDoc(kitMeia(db, 'kit-prata'), { preco: 1 }));
  });

  it('com venda: editar OUTROS campos do kit segue permitido', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      updateDoc(kitMeia(db, 'kit-ouro'), { capacidade: 95 })
    );
    const snap = await getDoc(kitMeia(db, 'kit-ouro'));
    expect(snap.data()?.['preco']).toBe(89); // preço intacto
  });

  it('SEM venda: owner altera preço livremente (persiste)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const ref = doc(db, 'eventos', MARATONA_2027_ID, 'kits', 'kit-unico');
    await assertSucceeds(updateDoc(ref, { preco: 75 }));
    const snap = await getDoc(ref);
    expect(snap.data()?.['preco']).toBe(75);
  });

  it('SEM venda: "Sem kit" aceita preço ficar MAIS negativo (RN-211 preservada)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const ref = doc(db, 'eventos', MARATONA_2027_ID, 'kits', 'sem-kit-novo');
    await assertSucceeds(
      setDoc(ref, {
        id: 'sem-kit-novo', tenantId: CASTELO_ID, nome: 'Sem kit',
        preco: -15, capacidade: 60, modalidades: ['42k'],
      })
    );
    await assertSucceeds(updateDoc(ref, { preco: -25 }));
  });

  it('platform_admin corrige preço mesmo com venda (papel de plataforma)', async () => {
    const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(updateDoc(kitMeia(db, 'kit-ouro'), { preco: 90 }));
  });
});

// ── BOUNDARY: exatamente 1 venda já trava (review #40) ─────────────────────
//
// Fixtures anteriores só tinham 453 (meia) ou 0 (maratona) — o mutante
// `qtdInscritos > 0` → `> 1` sobrevivia 100% na camada Rules. Este describe
// fixa o boundary: a PRIMEIRA venda congela preço e estrutura.

describe('Rules — boundary RN-200: qtdInscritos = 1 já bloqueia (review #40)', () => {
  it('owner NÃO altera preço de kit com exatamente 1 venda', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_1_VENDA, 'kits', 'kit-boundary'), { preco: 31 })
    );
  });

  it('owner NÃO altera percursos com exatamente 1 venda', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(doc(db, 'eventos', EVENTO_1_VENDA), {
        percursos: [{ nome: '5k', preco: 999 }],
      })
    );
  });

  it('owner NÃO deleta nem recria kit com exatamente 1 venda (fecho do #04)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(deleteDoc(doc(db, 'eventos', EVENTO_1_VENDA, 'kits', 'kit-boundary')));
    await assertFails(
      setDoc(doc(db, 'eventos', EVENTO_1_VENDA, 'kits', 'kit-boundary-2'), {
        id: 'kit-boundary-2', tenantId: CASTELO_ID, nome: 'Kit Boundary 2',
        preco: 5, capacidade: 10, modalidades: ['5k'],
      })
    );
  });

  it('guard de Function também trava com exatamente 1 venda', async () => {
    await expect(
      assertPrecoEditavel(adminDb, EVENTO_1_VENDA, { precoAtual: 30, novoPreco: 31 })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof https.HttpsError && err.code === 'failed-precondition'
    );
  });

  it('com 1 venda: campo ≠ preco segue editável e core bloqueia igual', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', EVENTO_1_VENDA, 'kits', 'kit-boundary'), { capacidade: 60 })
    );
    expect(precoBloqueado({ qtdInscritos: 1 })).toBe(true);
    expect(podeAlterarPreco({ qtdInscritos: 1 }, 30, 31)).toBe(false);
    expect(podeAlterarPreco({ qtdInscritos: 1 }, 30, 30)).toBe(true);
  });
});

// O preço TAMBÉM mora em `eventos.percursos` (contrato L3 — S201-T1):
// a mesma RN-200 trava o array após a 1ª venda.

describe('Rules — eventos.percursos travado após 1ª venda (RN-200)', () => {
  it('COM venda: owner NÃO altera percursos (preço mora no percurso)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        percursos: [{ nome: '21k', preco: 999 }],
      })
    );
  });

  it('COM venda: editar OUTROS campos do evento segue permitido', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        local: 'Beira-Mar Norte, Florianópolis/SC',
      })
    );
  });

  it('SEM venda: owner edita percursos livremente (persiste)', async () => {
    const db = dbAs(MARINA_UID, marinaClaims);
    const ref = doc(db, 'eventos', MARATONA_2027_ID);
    await assertSucceeds(
      updateDoc(ref, { percursos: [{ nome: '42k', preco: 250 }] })
    );
    const snap = await getDoc(ref);
    expect(snap.data()?.['percursos']).toEqual([{ nome: '42k', preco: 250 }]);
  });
});
