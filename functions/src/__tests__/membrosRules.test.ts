/**
 * membrosRules.test.ts — LEELA-S103-T1
 *
 * Integração (Firestore Emulator): Security Rules da subcoleção
 * `clubes/{clubeId}/membros` + leitura tipada listMembros (api-client).
 *
 * Cobre:
 *   - `status` e `ultimaAtividadeEm` são de escrita EXCLUSIVA da Function
 *     (RN-102): create não pode carimbá-los, update não pode tocá-los;
 *   - tenantId do membro coerente com o clube pai (ADR-009) e imutável;
 *   - membros NUNCA são públicos — mesmo em clube com visibilidade 'publica',
 *     leitura só para membros do tenant dono;
 *   - RBAC: papel de escrita gerencia membros (remover/transferir — S103-T2),
 *     promoter não; cross-tenant negado;
 *   - listMembros: filtros status × papel são interseção, ordenado por nome.
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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteDoc, doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { listMembros } from '@leela/api-client';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo'; // tenant_owner de castelo
const PASSO_OWNER_UID = 'uid-passo-owner'; // tenant_owner de passo-certo
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

const CLUBE_ID = 'clube-publico-castelo'; // público de propósito: membros seguem privados

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('membros — Rules + listMembros (S103-T1)', () => {
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

    // Clube PÚBLICO do Castelo — visibilidade pública NÃO expõe membros
    batch.set(adminDb.collection('clubes').doc(CLUBE_ID), {
      id: CLUBE_ID, tenantId: CASTELO_ID,
      nome: 'Clube Público Castelo', slug: CLUBE_ID,
      visibilidade: 'publica', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 2, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    // Membros existentes (escritos como a Function escreveria — com status)
    batch.set(membroAdminRef('membro-ana'), {
      id: 'membro-ana', tenantId: CASTELO_ID,
      atletaId: 'uid-ana', atletaNome: 'Ana Prado',
      papel: 'membro', entrouVia: 'codigo',
      entrouEm: now, status: 'ativo',
    });
    batch.set(membroAdminRef('membro-caio'), {
      id: 'membro-caio', tenantId: CASTELO_ID,
      atletaId: 'uid-caio', atletaNome: 'Caio Nunes',
      papel: 'admin', entrouVia: 'convite',
      entrouEm: now, status: 'ativo',
    });
    batch.set(membroAdminRef('membro-duda'), {
      id: 'membro-duda', tenantId: CASTELO_ID,
      atletaId: 'uid-duda', atletaNome: 'Duda Reis',
      papel: 'membro', entrouVia: 'link',
      entrouEm: now, status: 'inativo',
    });

    await batch.commit();
  }

  function membroAdminRef(membroId: string) {
    return adminDb
      .collection('clubes').doc(CLUBE_ID)
      .collection('membros').doc(membroId);
  }

  /** Firestore client autenticado com claims (padrão inscritosRules — E03). */
  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  }

  function membroDoc(db: Firestore, membroId: string) {
    return doc(db, 'clubes', CLUBE_ID, 'membros', membroId);
  }

  // ── Leitura — membros nunca são públicos ────────────────────────────────

  describe('leitura (tenant-only, mesmo em clube público)', () => {
    it('membro do tenant dono LÊ membro do clube', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(getDoc(membroDoc(db, 'membro-ana')));
    });

    it('outro tenant NÃO lê membros (mesmo com clube público)', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(getDoc(membroDoc(db, 'membro-ana')));
    });

    it('anônimo NÃO lê membros (clube público não expõe a base)', async () => {
      const db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
      await assertFails(getDoc(membroDoc(db, 'membro-ana')));
    });

    it('platform_admin lê membros de qualquer clube', async () => {
      const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
      await assertSucceeds(getDoc(membroDoc(db, 'membro-ana')));
    });
  });

  // ── Create — status é da Function (RN-102) ──────────────────────────────

  describe('create (cliente nunca carimba campos de Function)', () => {
    const membroValido = {
      tenantId: CASTELO_ID,
      atletaId: 'uid-novato',
      atletaNome: 'Novato Silva',
      papel: 'membro',
      entrouVia: 'codigo',
      entrouEm: new Date(),
    };

    it('tenant_owner cria membro SEM status → permitido (Function deriva)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        setDoc(membroDoc(db, 'membro-novato'), membroValido)
      );
    });

    it('create COM status é NEGADO (RN-102)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(membroDoc(db, 'membro-fraude'), {
          ...membroValido, status: 'ativo',
        })
      );
    });

    it('create COM ultimaAtividadeEm é NEGADO (trilha de atividade é da Function)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(membroDoc(db, 'membro-fraude-2'), {
          ...membroValido, ultimaAtividadeEm: new Date(),
        })
      );
    });

    it('create com tenantId DIFERENTE do clube pai é NEGADO (ADR-009)', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        setDoc(membroDoc(db, 'membro-hijack'), {
          ...membroValido, tenantId: PASSO_ID,
        })
      );
    });

    it('papel fora do enum é NEGADO (RN-103)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(membroDoc(db, 'membro-papel-x'), {
          ...membroValido, papel: 'superadmin',
        })
      );
    });

    it('entrouVia fora do enum é NEGADA', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(membroDoc(db, 'membro-via-x'), {
          ...membroValido, entrouVia: 'teletransporte',
        })
      );
    });

    it('promoter (não-writer) NÃO cria membro (RBAC)', async () => {
      const db = dbAs('uid-promoter-castelo', { role: 'promoter', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(membroDoc(db, 'membro-promoter'), membroValido)
      );
    });
  });

  // ── Update — transferir papel sim, tocar status não ─────────────────────

  describe('update (gestão de membros sem tocar campos de Function)', () => {
    it('transferir papel (membro→admin) SEM tocar status → permitido (S103-T2)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(membroDoc(db, 'membro-ana'), { papel: 'admin' })
      );
    });

    it('update tocando status é NEGADO (só a Function deriva — RN-102)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(membroDoc(db, 'membro-duda'), { status: 'ativo' })
      );
    });

    it('update tocando ultimaAtividadeEm é NEGADO', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(membroDoc(db, 'membro-ana'), {
          ultimaAtividadeEm: new Date(),
        })
      );
    });

    it('update mudando tenantId é NEGADO (imutável)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(membroDoc(db, 'membro-ana'), { tenantId: PASSO_ID })
      );
    });

    it('outro tenant NÃO atualiza membro (cross-tenant)', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        updateDoc(membroDoc(db, 'membro-ana'), { atletaNome: 'HIJACK' })
      );
    });
  });

  // ── Delete — remover membro (S103-T2) ───────────────────────────────────

  describe('delete (remover membro)', () => {
    it('tenant writer REMOVE membro do próprio clube', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(deleteDoc(membroDoc(db, 'membro-duda')));
    });

    it('outro tenant NÃO remove membro', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(deleteDoc(membroDoc(db, 'membro-ana')));
    });
  });

  // ── Function (Admin SDK) bypassa Rules ──────────────────────────────────

  it('Function (Admin SDK) escreve status normalmente (bypassa Rules)', async () => {
    await membroAdminRef('membro-ana').update({ status: 'inativo' });
    expect((await membroAdminRef('membro-ana').get()).get('status')).toBe('inativo');
  });

  // ── listMembros (api-client) ─────────────────────────────────────────────

  describe('listMembros (api-client — filtros combináveis)', () => {
    it('sem filtro: lista todos ordenados por atletaNome', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const membros = await listMembros(db, CLUBE_ID);
      expect(membros.map((m) => m.atletaNome)).toEqual([
        'Ana Prado', 'Caio Nunes', 'Duda Reis',
      ]);
    });

    it('filtro por status=ativo', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const membros = await listMembros(db, CLUBE_ID, {
        status: 'ativo',
      });
      expect(membros.map((m) => m.id)).toEqual(['membro-ana', 'membro-caio']);
    });

    it('status × papel é INTERSEÇÃO (nunca união)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const membros = await listMembros(db, CLUBE_ID, {
        status: 'ativo',
        papel: 'admin',
      });
      expect(membros.map((m) => m.id)).toEqual(['membro-caio']);
    });

    it('interseção que zera retorna lista vazia (EmptyState no painel)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const membros = await listMembros(db, CLUBE_ID, {
        status: 'inativo',
        papel: 'admin',
      });
      expect(membros).toEqual([]);
    });

    it('outro tenant NÃO lista membros (query negada pelas Rules)', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        listMembros(db, CLUBE_ID) as Promise<unknown>
      );
    });
  });
});
