/**
 * eventosRules.test.ts — LEELA-S200-T1
 *
 * Integração (Emulator): Security Rules da coleção `eventos` + query por
 * organizador do api-client.
 *
 * Cobre (aceite E03-L1):
 *   - `eventos where organizadorId==uid` só retorna eventos do owner
 *     (isolamento por tenant obrigatório na query — ADR-009)
 *   - Cliente NÃO escreve agregados ∑ `qtdInscritos`/`receitaConfirmada`
 *     (create E update negados; Function/Admin SDK bypassa)
 *   - Shape: status fora do enum negado na escrita
 *   - Seed canônico HANDOFF-05 (Meia Floripa 2026) via seedEventos real
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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { listarEventosDoOrganizador } from '@leela/api-client';
import {
  EVENTO_SEEDS,
  MARATONA_2027_ID,
  MEIA_FLORIPA_ID,
  seedEventos,
} from '../seed/eventos.seed';

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

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedFixtures();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

async function seedFixtures(): Promise<void> {
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

  // Evento de OUTRO tenant (Passo Certo) — não pode vazar na query da Marina
  batch.set(adminDb.collection('eventos').doc('trail-ratones-2026'), {
    id: 'trail-ratones-2026', tenantId: PASSO_ID,
    organizadorId: PASSO_OWNER_UID, nome: 'Trail Run Ratones 2026',
    data: admin.firestore.Timestamp.fromDate(new Date('2026-05-15T07:00:00-03:00')),
    local: 'Ratones, Florianópolis/SC', modalidades: ['11k'],
    slug: 'trail-ratones-2026', status: 'publicado', usaChip: false,
    qtdInscritos: 180, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });

  await batch.commit();

  // Seed canônico real (Meia Floripa 2026 + Maratona 2027 — Castelo)
  await seedEventos(adminDb);
}

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

function marinaDb(): Firestore {
  return ctxAs(MARINA_UID, {
    role: 'tenant_owner',
    tenantId: CASTELO_ID,
  }).firestore() as unknown as Firestore;
}

// ── Seed canônico ─────────────────────────────────────────────────────────

describe('seed canônico de eventos (HANDOFF-05)', () => {
  it('Meia Floripa 2026: 453 inscritos, R$ 85.617, 5k/10k/21k, usaChip', async () => {
    const snap = await adminDb.collection('eventos').doc(MEIA_FLORIPA_ID).get();
    expect(snap.exists).toBe(true);
    const data = snap.data() ?? {};
    expect(data['tenantId']).toBe(CASTELO_ID);
    expect(data['organizadorId']).toBe(MARINA_UID);
    expect(data['qtdInscritos']).toBe(453);
    expect(data['receitaConfirmada']).toBe(85617);
    expect(data['modalidades']).toEqual(['5k', '10k', '21k']);
    expect(data['usaChip']).toBe(true);
    expect(data['status']).toBe('publicado');
  });

  it('seedEventos é idempotente (rerun não duplica nem corrompe)', async () => {
    await seedEventos(adminDb);
    const snap = await adminDb
      .collection('eventos')
      .where('tenantId', '==', CASTELO_ID)
      .get();
    expect(snap.size).toBe(EVENTO_SEEDS.length);
  });
});

// ── Query por organizador (aceite L1) ─────────────────────────────────────

describe('listarEventosDoOrganizador (S200-T1)', () => {
  it('retorna SÓ os eventos do organizador, ordenados por data', async () => {
    const eventos = await listarEventosDoOrganizador(marinaDb(), {
      tenantId: CASTELO_ID,
      organizadorId: MARINA_UID,
    });

    expect(eventos.map((e) => e.id)).toEqual([MEIA_FLORIPA_ID, MARATONA_2027_ID]);
    // Nenhum evento de outro tenant/organizador vaza
    expect(eventos.some((e) => e.tenantId !== CASTELO_ID)).toBe(false);
    expect(eventos.some((e) => e.organizadorId !== MARINA_UID)).toBe(false);
  });

  it('parse do resultado expõe agregados ∑ canônicos (453 / 85.617)', async () => {
    const eventos = await listarEventosDoOrganizador(marinaDb(), {
      tenantId: CASTELO_ID,
      organizadorId: MARINA_UID,
    });
    const meia = eventos.find((e) => e.id === MEIA_FLORIPA_ID);
    expect(meia?.qtdInscritos).toBe(453);
    expect(meia?.receitaConfirmada).toBe(85617);
  });

  it('query SEM filtro de tenant é NEGADA pelas Rules (ADR-009)', async () => {
    const db = marinaDb();
    await assertFails(
      getDocs(
        query(
          collection(db, 'eventos'),
          where('organizadorId', '==', MARINA_UID),
          orderBy('data', 'asc')
        )
      )
    );
  });

  it('owner de A NÃO consulta eventos do tenant B', async () => {
    const db = marinaDb();
    await assertFails(
      getDocs(query(collection(db, 'eventos'), where('tenantId', '==', PASSO_ID)))
    );
  });
});

// ── Agregados ∑ — cliente nunca escreve (aceite L1) ───────────────────────

describe('agregados ∑ de eventos — escrita só por Function', () => {
  it('cliente NÃO cria evento carimbando qtdInscritos', async () => {
    const db = marinaDb();
    await assertFails(
      setDoc(doc(db, 'eventos', 'evento-fraude'), {
        id: 'evento-fraude', tenantId: CASTELO_ID,
        organizadorId: MARINA_UID, nome: 'Fraude',
        status: 'rascunho', qtdInscritos: 9999,
      })
    );
  });

  it('cliente NÃO cria evento carimbando receitaConfirmada', async () => {
    const db = marinaDb();
    await assertFails(
      setDoc(doc(db, 'eventos', 'evento-fraude-2'), {
        id: 'evento-fraude-2', tenantId: CASTELO_ID,
        organizadorId: MARINA_UID, nome: 'Fraude',
        status: 'rascunho', receitaConfirmada: 1_000_000,
      })
    );
  });

  it('cliente CRIA evento sem agregados (caminho feliz)', async () => {
    const db = marinaDb();
    await assertSucceeds(
      setDoc(doc(db, 'eventos', 'corrida-nova'), {
        id: 'corrida-nova', tenantId: CASTELO_ID,
        organizadorId: MARINA_UID, nome: 'Corrida Nova',
        status: 'rascunho',
      })
    );
  });

  it('cliente NÃO atualiza qtdInscritos (update parcial negado)', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { qtdInscritos: 454 })
    );
  });

  it('cliente NÃO atualiza receitaConfirmada', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { receitaConfirmada: 1 })
    );
  });

  it('cliente ATUALIZA campo comum sem tocar agregados (caminho feliz)', async () => {
    const db = marinaDb();
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), {
        local: 'Beira-Mar Norte, Florianópolis/SC',
      })
    );
    const snap = await getDoc(doc(db, 'eventos', MEIA_FLORIPA_ID));
    expect(snap.data()?.['qtdInscritos']).toBe(453);
  });

  it('platform_admin PODE corrigir agregados (papel de plataforma)', async () => {
    const db = ctxAs(PLATFORM_ADMIN_UID, {
      role: 'platform_admin',
    }).firestore() as unknown as Firestore;
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { qtdInscritos: 454 })
    );
  });
});

// ── Shape: status fora do enum ────────────────────────────────────────────

describe('shape de eventos — status válido obrigatório', () => {
  it('cliente NÃO cria evento com status fora do enum', async () => {
    const db = marinaDb();
    await assertFails(
      setDoc(doc(db, 'eventos', 'evento-status-invalido'), {
        id: 'evento-status-invalido', tenantId: CASTELO_ID,
        organizadorId: MARINA_UID, nome: 'X', status: 'hackeado',
      })
    );
  });

  it('cliente NÃO atualiza evento para status inválido', async () => {
    const db = marinaDb();
    await assertFails(
      updateDoc(doc(db, 'eventos', MEIA_FLORIPA_ID), { status: 'cancelado' })
    );
  });

  it('cliente atualiza status dentro do enum (rascunho → publicado ok no L1)', async () => {
    const db = marinaDb();
    await assertSucceeds(
      updateDoc(doc(db, 'eventos', MARATONA_2027_ID), { status: 'publicado' })
    );
  });
});
