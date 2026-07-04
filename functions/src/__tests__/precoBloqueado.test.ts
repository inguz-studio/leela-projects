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
import { doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
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
