/**
 * desafiosRules.test.ts — LEELA-S105-T1
 *
 * Integração (Firestore Emulator): Security Rules de
 * `clubes/{clubeId}/desafios` + junção `acoes` + catálogo global.
 *
 * Cobre:
 *   - agregados ∑ (qtdParticipantes, progressoPct, progressoPorPilar) são
 *     de escrita EXCLUSIVA da Function: create não carimba, update não toca;
 *   - enums de shape (modelo/status/recompensa/visibilidade) travados;
 *   - tenantId coerente com o clube pai (ADR-009) e RBAC (promoter não
 *     escreve; cross-tenant negado);
 *   - junção `acoes`: acaoRef coerente com docId; meta > 0 quando presente;
 *   - `catalogoAcoes`: leitura autenticada global; escrita de cliente negada.
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
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo'; // tenant_owner de castelo
const PASSO_OWNER_UID = 'uid-passo-owner'; // tenant_owner de passo-certo
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

const CLUBE_ID = 'clube-desafios-castelo';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('desafios — Rules (S105-T1)', () => {
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

    batch.set(adminDb.collection('clubes').doc(CLUBE_ID), {
      id: CLUBE_ID, tenantId: CASTELO_ID,
      nome: 'Clube Desafios Castelo', slug: CLUBE_ID,
      visibilidade: 'privada', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 0, qtdDesafiosAtivos: 1,
      criadoEm: now, atualizadoEm: now,
    });

    // Desafio existente (como a Function/seed escreveria — com ∑ reais)
    batch.set(desafioAdminRef('desafio-base'), {
      id: 'desafio-base', tenantId: CASTELO_ID,
      nome: 'Desafio Base', descricao: 'existente',
      modelo: 'B', status: 'ativo', metaTotalPontos: 500,
      dataInicio: admin.firestore.Timestamp.fromDate(new Date('2026-07-01T12:00:00Z')),
      dataFim: admin.firestore.Timestamp.fromDate(new Date('2026-07-31T12:00:00Z')),
      recompensaTipo: 'medalha_digital', visibilidade: 'membros',
      qtdParticipantes: 10, progressoPct: 40,
      criadoEm: now, atualizadoEm: now,
    });

    batch.set(desafioAdminRef('desafio-base').collection('acoes').doc('ler'), {
      acaoRef: 'ler',
    });

    batch.set(adminDb.collection('catalogoAcoes').doc('correr'), {
      id: 'correr', nome: 'Correr', pilar: 'fisico',
      unidade: 'km', pontosBase: 2, unidadeBase: 1, icone: 'footprints',
    });

    await batch.commit();
  }

  function desafioAdminRef(desafioId: string) {
    return adminDb
      .collection('clubes').doc(CLUBE_ID)
      .collection('desafios').doc(desafioId);
  }

  /** Firestore client autenticado com claims (padrão inscritosRules — E03). */
  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  }

  function desafioDoc(db: Firestore, desafioId: string) {
    return doc(db, 'clubes', CLUBE_ID, 'desafios', desafioId);
  }

  function acaoDoc(db: Firestore, desafioId: string, acaoId: string) {
    return doc(db, 'clubes', CLUBE_ID, 'desafios', desafioId, 'acoes', acaoId);
  }

  const desafioValido = {
    tenantId: CASTELO_ID,
    nome: 'Novo Desafio',
    descricao: 'criado pelo painel',
    modelo: 'C',
    status: 'rascunho',
    metaTotalPontos: 1000,
    minimoPorPilar: { fisico: 100, mental: 100, espiritual: 100 },
    recompensaTipo: 'cupom',
    visibilidade: 'membros',
    // Datas obrigatórias no shape (S6d) — client SDK converte Date→Timestamp
    dataInicio: new Date('2026-07-01T12:00:00Z'),
    dataFim: new Date('2026-07-31T12:00:00Z'),
  };

  // ── Leitura ──────────────────────────────────────────────────────────────

  describe('leitura (tenant-only)', () => {
    it('membro do tenant dono LÊ desafio', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(getDoc(desafioDoc(db, 'desafio-base')));
    });

    it('outro tenant NÃO lê desafios', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(getDoc(desafioDoc(db, 'desafio-base')));
    });

    it('anônimo NÃO lê desafios', async () => {
      const db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
      await assertFails(getDoc(desafioDoc(db, 'desafio-base')));
    });
  });

  // ── Create — agregados são da Function ───────────────────────────────────

  describe('create (cliente nunca inventa progresso)', () => {
    it('tenant_owner cria desafio válido SEM agregados → permitido', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(setDoc(desafioDoc(db, 'desafio-novo'), desafioValido));
    });

    it('create com qtdParticipantes > 0 é NEGADO (∑ só via Function)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(desafioDoc(db, 'desafio-fraude'), {
          ...desafioValido, qtdParticipantes: 999,
        })
      );
    });

    it('create com progressoPorPilar carimbado é NEGADO', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(desafioDoc(db, 'desafio-fraude-2'), {
          ...desafioValido,
          progressoPorPilar: { fisico: { atual: 700, meta: 700 } },
        })
      );
    });

    it('modelo fora do enum é NEGADO (RN-110)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(desafioDoc(db, 'desafio-modelo-x'), {
          ...desafioValido, modelo: 'D',
        })
      );
    });

    it('recompensa fora do enum é NEGADA (RN-116)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(desafioDoc(db, 'desafio-recompensa-x'), {
          ...desafioValido, recompensaTipo: 'pix',
        })
      );
    });

    it('create com tenantId de OUTRO tenant é NEGADO (ADR-009)', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        setDoc(desafioDoc(db, 'desafio-hijack'), {
          ...desafioValido, tenantId: PASSO_ID,
        })
      );
    });

    it('promoter (não-writer) NÃO cria desafio (RBAC)', async () => {
      const db = dbAs('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID });
      await assertFails(setDoc(desafioDoc(db, 'desafio-promoter'), desafioValido));
    });
  });

  // ── Update / delete ──────────────────────────────────────────────────────

  describe('update/delete (gestão sem tocar ∑)', () => {
    it('editar nome/status SEM tocar agregados → permitido', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(desafioDoc(db, 'desafio-base'), {
          nome: 'Desafio Renomeado',
          status: 'encerrado',
        })
      );
    });

    it('update tocando progressoPct é NEGADO (∑ só via Function)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), { progressoPct: 100 })
      );
    });

    it('update tocando qtdParticipantes é NEGADO', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), { qtdParticipantes: 1000 })
      );
    });

    it('tenant writer deleta desafio do próprio tenant', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(deleteDoc(desafioDoc(db, 'desafio-base')));
    });

    it('outro tenant NÃO deleta', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(deleteDoc(desafioDoc(db, 'desafio-base')));
    });
  });

  // ── Espelhos server-side do fix-loop (suplementar S6b/S6d + T12/T13) ─────

  describe('espelhos server-side (review suplementar S6/T12/T13)', () => {
    it('T12: update tocando progressoPorPilar é NEGADO (∑ só via Function)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), {
          progressoPorPilar: { fisico: { atual: 999, meta: 999 } },
        })
      );
    });

    it('S6d: create sem dataInicio/dataFim é NEGADO', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const { dataInicio: _di, dataFim: _df, ...semDatas } = desafioValido;
      await assertFails(setDoc(desafioDoc(db, 'desafio-sem-datas'), semDatas));
    });

    it('S6d: create com dataFim <= dataInicio é NEGADO (espelho de validarDesafio)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(desafioDoc(db, 'desafio-datas-invertidas'), {
          ...desafioValido,
          dataInicio: new Date('2026-07-31T12:00:00Z'),
          dataFim: new Date('2026-07-01T12:00:00Z'),
        })
      );
    });

    it("T13 · estado VIGENTE (decisão de produto PENDENTE): create 'ativo' Modelo C sem minimoPorPilar PASSA na rule — RN-111 segue client-side (punt S6b)", async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const { minimoPorPilar: _m, ...semMinimo } = desafioValido;
      // Congela o comportamento atual: se este teste quebrar, alguém
      // espelhou RN-111 no servidor — exige decisão de produto ratificada.
      await assertSucceeds(
        setDoc(desafioDoc(db, 'desafio-c-sem-minimo'), {
          ...semMinimo, status: 'ativo',
        })
      );
    });
  });

  // ── Matriz de transição — reabertura owner-only (S7/T14, decisão Vitor) ──

  describe('reabertura de desafio encerrado (S7/T14 — owner-only)', () => {
    beforeEach(async () => {
      await desafioAdminRef('desafio-base').update({ status: 'encerrado' });
    });

    it('dono do clube REABRE desafio encerrado (encerrado→ativo)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(desafioDoc(db, 'desafio-base'), { status: 'ativo' })
      );
    });

    it('tenant_staff NÃO reabre desafio encerrado', async () => {
      const db = dbAs('uid-staff-castelo', { role: 'tenant_staff', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), { status: 'ativo' })
      );
    });

    it('membro (athlete) NÃO reabre desafio encerrado', async () => {
      const db = dbAs('uid-membro-castelo', { role: 'athlete' });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), { status: 'ativo' })
      );
    });

    it('cross-tenant NÃO reabre desafio encerrado', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), { status: 'ativo' })
      );
    });

    it("encerrado NÃO vira 'rascunho' (nem pelo dono — reabertura é só →ativo)", async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(desafioDoc(db, 'desafio-base'), { status: 'rascunho' })
      );
    });

    it('editar campos comuns de desafio encerrado sem mudar status segue permitido (writer)', async () => {
      const db = dbAs('uid-staff-castelo', { role: 'tenant_staff', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(desafioDoc(db, 'desafio-base'), { descricao: 'ajuste pós-encerramento' })
      );
    });
  });

  // ── Junção acoes ─────────────────────────────────────────────────────────

  describe('junção acoes (docId = id da ação no catálogo)', () => {
    it('tenant writer adiciona ação com acaoRef == docId', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        setDoc(acaoDoc(db, 'desafio-base', 'correr'), {
          acaoRef: 'correr', meta: 80,
        })
      );
    });

    it('ação sem meta é válida (Modelo B/C)', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        setDoc(acaoDoc(db, 'desafio-base', 'meditar'), { acaoRef: 'meditar' })
      );
    });

    it('acaoRef DIVERGENTE do docId é NEGADA', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(acaoDoc(db, 'desafio-base', 'correr'), { acaoRef: 'nadar' })
      );
    });

    it('meta ≤ 0 é NEGADA', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(acaoDoc(db, 'desafio-base', 'correr'), {
          acaoRef: 'correr', meta: 0,
        })
      );
    });

    it('outro tenant NÃO escreve na junção', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        setDoc(acaoDoc(db, 'desafio-base', 'correr'), {
          acaoRef: 'correr', meta: 10,
        })
      );
    });

    it('tenant writer remove ação da junção', async () => {
      const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(deleteDoc(acaoDoc(db, 'desafio-base', 'ler')));
    });
  });

  // ── Catálogo global ──────────────────────────────────────────────────────

  describe('catalogoAcoes (global, seed fixo — RN-114)', () => {
    it('autenticado de QUALQUER tenant lê o catálogo', async () => {
      const db = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertSucceeds(getDoc(doc(db, 'catalogoAcoes', 'correr')));
    });

    it('anônimo NÃO lê o catálogo', async () => {
      const db = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
      await assertFails(getDoc(doc(db, 'catalogoAcoes', 'correr')));
    });

    it('cliente NUNCA escreve no catálogo (nem platform_admin via client)', async () => {
      const db = dbAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
      await assertFails(
        setDoc(doc(db, 'catalogoAcoes', 'crossfit'), {
          id: 'crossfit', nome: 'Crossfit', pilar: 'fisico',
          unidade: 'sessoes', pontosBase: 10, unidadeBase: 1, icone: 'dumbbell',
        })
      );
    });
  });
});
