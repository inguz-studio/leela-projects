/**
 * clubesRules.test.ts — LEELA-S101-T1
 *
 * Integração (Firestore Emulator): Security Rules de `clubes` + seed canônico.
 *
 * Cobre:
 *   - visibilidade (RN-140): leitura pública p/ 'publica'/'indexavel',
 *     clube 'privada' só para membros do tenant dono (não-owner NEGADO);
 *   - agregados ∑ (qtdMembrosAtivos/qtdDesafiosAtivos): cliente NUNCA
 *     escreve — create exige 0/ausente, update não pode tocá-los;
 *   - isolamento cross-tenant preservado (padrão S1600-T3);
 *   - seedClubes: clube canônico com código 8A3K9 válido, idempotente.
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
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validarCodigoConvite } from '@leela/core';
import {
  CLUBE_CPS_CODIGO_CONVITE,
  CLUBE_CPS_SLUG,
  CORRIDA_PERFEITA_TENANT_ID,
  seedClubes,
} from '../seed/clubes.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo'; // tenant_owner de castelo
const PASSO_OWNER_UID = 'uid-passo-owner'; // tenant_owner de passo-certo
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('clubes — Rules + seed (S101-T1)', () => {
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

    // Clube PRIVADO do Castelo
    batch.set(adminDb.collection('clubes').doc('clube-privado-castelo'), {
      id: 'clube-privado-castelo', tenantId: CASTELO_ID,
      nome: 'Clube Privado Castelo', slug: 'clube-privado-castelo',
      visibilidade: 'privada', ownerId: MARINA_UID,
      codigoConvite: 'ABCDE', qtdMembrosAtivos: 7, qtdDesafiosAtivos: 2,
      criadoEm: now, atualizadoEm: now,
    });

    // Clube PÚBLICO do Castelo
    batch.set(adminDb.collection('clubes').doc('clube-publico-castelo'), {
      id: 'clube-publico-castelo', tenantId: CASTELO_ID,
      nome: 'Clube Público Castelo', slug: 'clube-publico-castelo',
      visibilidade: 'publica', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 3, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    // Clube INDEXÁVEL do Castelo
    batch.set(adminDb.collection('clubes').doc('clube-indexavel-castelo'), {
      id: 'clube-indexavel-castelo', tenantId: CASTELO_ID,
      nome: 'Clube Indexável Castelo', slug: 'clube-indexavel-castelo',
      visibilidade: 'indexavel', ownerId: MARINA_UID,
      codigoConvite: 'MNPQR', qtdMembrosAtivos: 1, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    await batch.commit();
  }

  function ctxAs(uid: string, claims: Record<string, unknown>) {
    return testEnv.authenticatedContext(uid, claims);
  }

  // ── Visibilidade (RN-140) ───────────────────────────────────────────────

  describe('visibilidade (RN-140)', () => {
    it('não-owner (outro tenant) NÃO lê clube privado', async () => {
      const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'))
      );
    });

    it('anônimo NÃO lê clube privado', async () => {
      const ctx = testEnv.unauthenticatedContext();
      await assertFails(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'))
      );
    });

    it('anônimo LÊ clube publica (página pública)', async () => {
      const ctx = testEnv.unauthenticatedContext();
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-publico-castelo'))
      );
    });

    it('anônimo LÊ clube indexavel', async () => {
      const ctx = testEnv.unauthenticatedContext();
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-indexavel-castelo'))
      );
    });

    it('membro de OUTRO tenant lê clube publica', async () => {
      const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-publico-castelo'))
      );
    });

    it('owner do tenant lê o próprio clube privado', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'))
      );
    });

    it('platform_admin lê clube privado de qualquer tenant', async () => {
      const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'))
      );
    });
  });

  // ── Agregados ∑ — cliente nunca escreve ─────────────────────────────────

  describe('agregados ∑ (escrita só via Function)', () => {
    it('create com qtdMembrosAtivos > 0 é NEGADO', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-novo-fraude'), {
          id: 'clube-novo-fraude', tenantId: CASTELO_ID,
          nome: 'Clube Fraude', visibilidade: 'privada',
          qtdMembrosAtivos: 120, qtdDesafiosAtivos: 0,
        })
      );
    });

    it('create com agregados zerados é PERMITIDO (owner do tenant)', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-novo-ok'), {
          id: 'clube-novo-ok', tenantId: CASTELO_ID,
          nome: 'Clube Novo', visibilidade: 'privada',
          qtdMembrosAtivos: 0, qtdDesafiosAtivos: 0,
        })
      );
    });

    it('create sem os campos ∑ é PERMITIDO (nascem via Function)', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-novo-sem-agg'), {
          id: 'clube-novo-sem-agg', tenantId: CASTELO_ID,
          nome: 'Clube Sem Agg', visibilidade: 'privada',
        })
      );
    });

    it('update tocando qtdMembrosAtivos é NEGADO', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          qtdMembrosAtivos: 999,
        })
      );
    });

    it('update tocando qtdDesafiosAtivos é NEGADO', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          qtdDesafiosAtivos: 42,
        })
      );
    });

    it('update REMOVENDO campo ∑ é NEGADO (delete de campo conta como toque)', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          qtdMembrosAtivos: deleteField(),
        })
      );
    });

    it('update de campos comuns SEM tocar ∑ é PERMITIDO', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          nome: 'Clube Privado Castelo (editado)',
        })
      );
    });

    it('Function (Admin SDK) escreve agregados normalmente (bypassa Rules)', async () => {
      await adminDb
        .collection('clubes')
        .doc('clube-privado-castelo')
        .update({ qtdMembrosAtivos: 8 });
      const snap = await adminDb
        .collection('clubes')
        .doc('clube-privado-castelo')
        .get();
      expect(snap.get('qtdMembrosAtivos')).toBe(8);
    });
  });

  // ── Isolamento cross-tenant preservado (padrão S1600) ───────────────────

  describe('isolamento cross-tenant preservado', () => {
    it('owner de A NÃO cria clube carimbando tenant B', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-hijack'), {
          id: 'clube-hijack', tenantId: PASSO_ID, nome: 'Hijack',
          visibilidade: 'privada',
        })
      );
    });

    it('owner de A NÃO atualiza clube privado de B (mesmo sem tocar ∑)', async () => {
      const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          nome: 'HIJACK',
        })
      );
    });

    it('clube PÚBLICO é legível por terceiros mas NÃO gravável', async () => {
      const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-publico-castelo'), {
          nome: 'HIJACK',
        })
      );
    });

    it('promoter NÃO cria clube (não é writer — RBAC)', async () => {
      const ctx = ctxAs('uid-promoter-castelo', { role: 'promoter', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-promoter'), {
          id: 'clube-promoter', tenantId: CASTELO_ID, nome: 'x',
          visibilidade: 'privada',
        })
      );
    });
  });

  // ── Campo-set do update — identidade/propriedade imutáveis (suplementar S1)

  describe('update não muda identidade/propriedade (review suplementar S1)', () => {
    const staffCtx = () =>
      ctxAs('uid-staff-castelo', { role: 'tenant_staff', tenantId: CASTELO_ID });

    it('T1: staff NÃO atualiza ownerId (transferência só via Function — RN-106)', async () => {
      await assertFails(
        updateDoc(doc(staffCtx().firestore(), 'clubes', 'clube-privado-castelo'), {
          ownerId: 'uid-staff-castelo',
        })
      );
    });

    it('T2: staff NÃO atualiza codigoConvite (RN-101)', async () => {
      await assertFails(
        updateDoc(doc(staffCtx().firestore(), 'clubes', 'clube-privado-castelo'), {
          codigoConvite: 'ZZZZZ',
        })
      );
    });

    it('T3: staff NÃO atualiza o campo slug (docId é o slug — mudar é recriar)', async () => {
      await assertFails(
        updateDoc(doc(staffCtx().firestore(), 'clubes', 'clube-privado-castelo'), {
          slug: 'outro-slug',
        })
      );
    });

    it('T3b: nem o owner reescreve ownerId por write direto', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          ownerId: 'uid-qualquer',
        })
      );
    });

    it('T6: caminho feliz da tela S110 segue permitido (nome/descricao; visibilidade; aprovacaoManual+modeloEntrada gratuito)', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          nome: 'Clube Privado Castelo (S110)',
          descricao: 'Descrição editada na tela de configurações',
        })
      );
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          visibilidade: 'publica',
        })
      );
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          aprovacaoManual: true, modeloEntrada: 'gratuito',
        })
      );
    });

    it('Function (Admin SDK) segue transferindo propriedade (bypassa Rules)', async () => {
      await adminDb.collection('clubes').doc('clube-privado-castelo')
        .update({ ownerId: 'uid-novo-owner' });
      const snap = await adminDb.collection('clubes').doc('clube-privado-castelo').get();
      expect(snap.get('ownerId')).toBe('uid-novo-owner');
    });
  });

  // ── Espelho de shape (suplementar S6e/S6f — T4/T5) ───────────────────────

  describe('espelho server-side de shape (review suplementar S6e/S6f)', () => {
    it("T4: update modeloEntrada:'pago' é NEGADO (RN-104 — Pago não existe na V1)", async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          modeloEntrada: 'pago',
        })
      );
    });

    it("T5: update nome:'' é NEGADO (nome obrigatório — validarClube espelhada)", async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          nome: '',
        })
      );
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          nome: '   ',
        })
      );
    });

    it('create sem nome válido ou com modeloEntrada:\'pago\' é NEGADO', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-sem-nome'), {
          id: 'clube-sem-nome', tenantId: CASTELO_ID,
          nome: '', visibilidade: 'privada',
        })
      );
      await assertFails(
        setDoc(doc(ctx.firestore(), 'clubes', 'clube-pago'), {
          id: 'clube-pago', tenantId: CASTELO_ID,
          nome: 'Clube Pago', visibilidade: 'privada', modeloEntrada: 'pago',
        })
      );
    });

    it("update modeloEntrada:'gratuito' e nome válido seguem permitidos", async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'clubes', 'clube-privado-castelo'), {
          nome: 'Clube Renomeado', modeloEntrada: 'gratuito',
        })
      );
    });
  });

  // ── Seed canônico ────────────────────────────────────────────────────────

  describe('seedClubes (Emulator-only)', () => {
    it('cria o clube canônico com código 8A3K9 válido (RN-101)', async () => {
      await seedClubes(adminDb);

      const snap = await adminDb.collection('clubes').doc(CLUBE_CPS_SLUG).get();
      expect(snap.exists).toBe(true);
      expect(snap.get('nome')).toBe('Corrida Perfeita Sul');
      expect(snap.get('tenantId')).toBe(CORRIDA_PERFEITA_TENANT_ID);
      expect(snap.get('codigoConvite')).toBe(CLUBE_CPS_CODIGO_CONVITE);
      expect(validarCodigoConvite(snap.get('codigoConvite') as string)).toBe(true);
      expect(snap.get('qtdMembrosAtivos')).toBe(0);
      expect(snap.get('qtdDesafiosAtivos')).toBe(0);

      // Tenant da assessoria também nasce (pré-requisito de tenantAtivo)
      const tenantSnap = await adminDb
        .collection('tenants').doc(CORRIDA_PERFEITA_TENANT_ID).get();
      expect(tenantSnap.exists).toBe(true);
      expect(tenantSnap.get('status')).toBe('ativo');
    });

    it('é idempotente: rerun não regrava criadoEm nem os agregados ∑', async () => {
      await seedClubes(adminDb);

      // Simula a Function tendo atualizado o agregado entre os reruns
      await adminDb.collection('clubes').doc(CLUBE_CPS_SLUG)
        .update({ qtdMembrosAtivos: 11 });

      const antes = await adminDb.collection('clubes').doc(CLUBE_CPS_SLUG).get();
      const criadoEmAntes = antes.get('criadoEm');

      await seedClubes(adminDb); // rerun

      const depois = await adminDb.collection('clubes').doc(CLUBE_CPS_SLUG).get();
      expect(depois.get('qtdMembrosAtivos')).toBe(11); // Function continua dona
      expect(depois.get('criadoEm')).toEqual(criadoEmAntes);
    });
  });
});
