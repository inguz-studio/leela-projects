/**
 * perfisRules.integration.test.ts — LEELA-S1700-T1 + DN-1 (Onda 3)
 *
 * Integração (Firestore Emulator): REGISTRY `salvarPerfilCore` + Security
 * Rules de `perfis/{handle}`.
 *
 * Ataques provados (aceite do brief O3-L2SEC · Frente A):
 *   - FORJAR handle: cliente (mesmo tenant_owner / platform_admin via client
 *     SDK) NÃO cria/edita/deleta `perfis/*` — write é EXCLUSIVO da Function;
 *   - DUPLICAR case-variante: 'Corrida_SP' colide com 'corrida_sp' já
 *     registrado por outro tenant (already-exists) — unicidade
 *     case-insensitive estrutural via docId normalizado;
 *   - ESCREVER projeção: update de visibilidade/nome por cliente é negado;
 *   - LER PII: perfil `privada` é ilegível para anônimo e para outro tenant
 *     (404 público); o tenant dono lê o próprio (editor do painel);
 *   - IMUTABILIDADE (RN-160): segundo handle para o mesmo tenant é negado;
 *   - RESERVADOS (RN-160): '@admin' etc. nunca registram;
 *   - subcoleção `posts` (Onda 4) cai no deny-by-default.
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { salvarPerfilCore } from '../perfil/salvarPerfil';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo'; // tenant_owner de castelo
const PASSO_OWNER_UID = 'uid-passo-owner'; // tenant_owner de passo-certo

const CALLER_MARINA = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as never,
};
const CALLER_PASSO = {
  uid: PASSO_OWNER_UID,
  claims: { role: 'tenant_owner', tenantId: PASSO_ID } as never,
};

const INPUT_CASTELO = {
  handle: '@Castelo_Producoes', // casing proposital — normaliza p/ minúsculo
  nome: 'Castelo Produções',
  bio: 'Eventos de corrida em SC.',
  visibilidade: 'publica' as const,
  linksExternos: [{ label: 'Instagram', url: 'https://instagram.com/castelo' }],
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('perfis — registry + Rules (S1700-T1 · DN-1)', () => {
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
    await batch.commit();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function ctxAs(uid: string, claims: Record<string, unknown>) {
    return testEnv.authenticatedContext(uid, claims);
  }

  // ── Registry: salvarPerfilCore ──────────────────────────────────────────

  describe('registry salvarPerfilCore (RN-160)', () => {
    it('cria o perfil com docId NORMALIZADO minúsculo (case-insensitive)', async () => {
      const r = await salvarPerfilCore(adminDb, INPUT_CASTELO, CALLER_MARINA);
      expect(r).toEqual({ ok: true, handle: 'castelo_producoes', criado: true });

      const snap = await adminDb.collection('perfis').doc('castelo_producoes').get();
      expect(snap.exists).toBe(true);
      expect(snap.get('handle')).toBe('castelo_producoes');
      expect(snap.get('tipo')).toBe('organizador'); // DN-1
      expect(snap.get('ownerUid')).toBe(MARINA_UID);
      expect(snap.get('tenantId')).toBe(CASTELO_ID);
    });

    it('ATAQUE duplicar case-variante: outro tenant com "Castelo_Producoes" colide', async () => {
      await salvarPerfilCore(adminDb, INPUT_CASTELO, CALLER_MARINA);
      await expect(
        salvarPerfilCore(
          adminDb,
          { ...INPUT_CASTELO, handle: '@CASTELO_PRODUCOES', nome: 'Fake Castelo' },
          CALLER_PASSO
        )
      ).rejects.toMatchObject({ code: 'already-exists' });
      // O doc original segue intacto (o ataque não sobrescreveu nada)
      const snap = await adminDb.collection('perfis').doc('castelo_producoes').get();
      expect(snap.get('tenantId')).toBe(CASTELO_ID);
      expect(snap.get('nome')).toBe('Castelo Produções');
    });

    it('IMUTABILIDADE: segundo handle do MESMO tenant é negado (rename disfarçado)', async () => {
      await salvarPerfilCore(adminDb, INPUT_CASTELO, CALLER_MARINA);
      await expect(
        salvarPerfilCore(
          adminDb,
          { ...INPUT_CASTELO, handle: '@castelo_novo' },
          CALLER_MARINA
        )
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('RESERVADO: handle @admin nunca registra', async () => {
      await expect(
        salvarPerfilCore(adminDb, { ...INPUT_CASTELO, handle: '@admin' }, CALLER_MARINA)
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    it('UPDATE: mesmo handle re-salva editáveis e PRESERVA identidade', async () => {
      await salvarPerfilCore(adminDb, INPUT_CASTELO, CALLER_MARINA);
      const antes = await adminDb.collection('perfis').doc('castelo_producoes').get();

      const r = await salvarPerfilCore(
        adminDb,
        {
          handle: 'castelo_producoes',
          nome: 'Castelo Produções SC',
          visibilidade: 'indexavel' as const,
          // bio/links ausentes ⇒ removidos (form manda estado completo)
        },
        CALLER_MARINA
      );
      expect(r.criado).toBe(false);

      const depois = await adminDb.collection('perfis').doc('castelo_producoes').get();
      expect(depois.get('nome')).toBe('Castelo Produções SC');
      expect(depois.get('visibilidade')).toBe('indexavel');
      expect(depois.get('bio')).toBeUndefined(); // limpo de verdade
      expect(depois.get('ownerUid')).toBe(MARINA_UID);
      expect(depois.get('tenantId')).toBe(CASTELO_ID);
      expect(depois.get('criadoEm')).toEqual(antes.get('criadoEm'));
    });

    it('promoter (sem papel de escrita) é negado (RN-401)', async () => {
      await expect(
        salvarPerfilCore(adminDb, INPUT_CASTELO, {
          uid: 'uid-promoter',
          claims: { role: 'promoter', tenantId: CASTELO_ID } as never,
        })
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });

    it('tenant suspenso é negado (RN-402)', async () => {
      await adminDb.collection('tenants').doc(CASTELO_ID).update({ status: 'suspenso' });
      await expect(
        salvarPerfilCore(adminDb, INPUT_CASTELO, CALLER_MARINA)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('payload com URL perigosa é negado na fronteira do servidor', async () => {
      await expect(
        salvarPerfilCore(
          adminDb,
          { ...INPUT_CASTELO, avatarUrl: 'javascript:alert(1)' },
          CALLER_MARINA
        )
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });
  });

  // ── Rules: escrita congelada + leitura por visibilidade ─────────────────

  describe('Rules de perfis (escrita SÓ via Function · leitura RN-161)', () => {
    beforeEach(async () => {
      await salvarPerfilCore(adminDb, INPUT_CASTELO, CALLER_MARINA);
      await salvarPerfilCore(
        adminDb,
        {
          handle: 'passo_certo',
          nome: 'Passo Certo',
          visibilidade: 'privada' as const,
        },
        CALLER_PASSO
      );
    });

    it('ATAQUE forjar handle: tenant_owner NÃO cria perfis/* pelo client SDK', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(ctx.firestore(), 'perfis', 'handle-forjado'), {
          handle: 'handle-forjado', tenantId: CASTELO_ID, ownerUid: MARINA_UID,
          nome: 'Forjado', visibilidade: 'publica', tipo: 'organizador',
        })
      );
    });

    it('ATAQUE escrever projeção: dono NÃO edita o próprio perfil pelo client SDK', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'perfis', 'castelo_producoes'), {
          nome: 'Editado por fora da Function',
        })
      );
    });

    it('ATAQUE: nem platform_admin escreve perfis via client SDK (pós-19c8afe)', async () => {
      const ctx = ctxAs('uid-platform-admin', { role: 'platform_admin' });
      await assertFails(
        setDoc(doc(ctx.firestore(), 'perfis', 'admin-forjado'), {
          handle: 'admin-forjado', nome: 'X', visibilidade: 'publica',
        })
      );
      await assertFails(
        deleteDoc(doc(ctx.firestore(), 'perfis', 'castelo_producoes'))
      );
    });

    it('anônimo LÊ perfil publica (página /@handle)', async () => {
      const ctx = testEnv.unauthenticatedContext();
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'perfis', 'castelo_producoes'))
      );
    });

    it('ATAQUE ler PII: perfil privada é ilegível p/ anônimo e p/ outro tenant', async () => {
      const anon = testEnv.unauthenticatedContext();
      await assertFails(getDoc(doc(anon.firestore(), 'perfis', 'passo_certo')));

      const outroTenant = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        getDoc(doc(outroTenant.firestore(), 'perfis', 'passo_certo'))
      );
    });

    it('tenant dono LÊ o próprio perfil privada (editor do painel)', async () => {
      const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertSucceeds(getDoc(doc(ctx.firestore(), 'perfis', 'passo_certo')));
    });

    it('subcoleção posts (Onda 4) cai no deny-by-default — leitura e escrita', async () => {
      const anon = testEnv.unauthenticatedContext();
      await assertFails(
        getDoc(doc(anon.firestore(), 'perfis/castelo_producoes/posts', 'p1'))
      );
      const dono = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(dono.firestore(), 'perfis/castelo_producoes/posts', 'p1'), {
          texto: 'primeiro post',
        })
      );
    });
  });
});
