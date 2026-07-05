/**
 * clubeLgpd.integration.test.ts — LEELA-E05 · S110-T2 (backend)
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): Functions
 * `deleteClube` (exclusão irreversível em cascata + retenção LGPD 90d)
 * e `exportClubeData` (export com guard de 90 dias) — RN-144.
 *
 * Cobre:
 *   - deleteClube: cascata COMPLETA (membros, permissoesAdmin, desafios +
 *     acoes, parcerias + conversoes, comunicados, convites); snapshot de
 *     retenção em `clubesExcluidos/{id}` (+`documentos`) ANTES dos deletes;
 *     expiraEm = deletadoEm + 90d; SÓ o owner do clube (staff nega);
 *     cross-tenant/inexistente com o MESMO permission-denied; tenant
 *     suspenso (RN-402); replay pós-conclusão e replay mid-run preservam
 *     deletadoEm/expiraEm do PRIMEIRO delete;
 *   - exportClubeData: clube vivo (expira +90d da solicitação) e retido
 *     (expira JUNTO com a retenção); janela vencida → failed-precondition;
 *     registro durável em `exportsClube/{exportId}`;
 *   - Rules endurecidas: NENHUM cliente deleta `clubes/{id}` (nem o owner,
 *     nem platform_admin via client SDK); `clubesExcluidos` e `exportsClube`
 *     são Function-only (deny-by-default provado); update de clube pelo
 *     tenant writer segue permitido (endurecimento não regrediu o CRUD).
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
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import {
  RETENCAO_LGPD_DIAS,
  chaveSnapshot,
  deleteClubeCore,
} from '../clubs/deleteClube';
import { exportClubeDataCore } from '../clubs/exportClubeData';
import type { ClubsCaller } from '../clubs/membrosMutations';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const MS_90_DIAS = RETENCAO_LGPD_DIAS * 24 * 60 * 60 * 1000;

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const SUSPENSO_ID = 'tenant-suspenso';

const MARINA_UID = 'uid-marina-castelo';
const CLUBE_ID = 'clube-lgpd-castelo';
const CLUBE_SUSPENSO_ID = 'clube-do-suspenso';

/** Caminhos RELATIVOS da subárvore seedada (fonte de verdade dos aceites). */
const SUBARVORE = [
  'membros/membro-marina',
  'membros/membro-ana',
  'permissoesAdmin/perm-bia',
  'desafios/d1',
  'desafios/d1/acoes/a1',
  'parcerias/p1',
  'parcerias/p1/conversoes/c1',
  'comunicados/com1',
  'convites/conv1',
] as const;

const marina: ClubsCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID },
};
const staffCastelo: ClubsCaller = {
  uid: 'uid-staff-castelo',
  claims: { role: 'tenant_staff', tenantId: CASTELO_ID },
};
const passoOwner: ClubsCaller = {
  uid: 'uid-passo-owner',
  claims: { role: 'tenant_owner', tenantId: PASSO_ID },
};
const athlete: ClubsCaller = {
  uid: 'uid-atleta',
  claims: { role: 'athlete' },
};
const ownerSuspenso: ClubsCaller = {
  uid: 'uid-suspenso-owner',
  claims: { role: 'tenant_owner', tenantId: SUSPENSO_ID },
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

async function expectHttpsError(
  promise: Promise<unknown>,
  code: string,
  contains?: string
): Promise<void> {
  try {
    await promise;
    expect.unreachable(`esperava HttpsError '${code}'`);
  } catch (err) {
    expect(err).toBeInstanceOf(https.HttpsError);
    const httpsErr = err as https.HttpsError;
    expect(httpsErr.code).toBe(code);
    if (contains) expect(httpsErr.message).toContain(contains);
  }
}

describe.skipIf(!hasEmulator)('clubs — deleteClube + exportClubeData (LGPD RN-144)', () => {
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
    db = admin.firestore();
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
    const batch = db.batch();

    batch.set(db.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('tenants').doc(PASSO_ID), {
      id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
      status: 'ativo', ownerUid: passoOwner.uid, tipo: 'promotor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('tenants').doc(SUSPENSO_ID), {
      id: SUSPENSO_ID, nome: 'Tenant Suspenso', slug: SUSPENSO_ID,
      status: 'suspenso', ownerUid: ownerSuspenso.uid, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });

    const clubeRef = db.collection('clubes').doc(CLUBE_ID);
    batch.set(clubeRef, {
      id: CLUBE_ID, tenantId: CASTELO_ID,
      nome: 'Clube LGPD Castelo', slug: CLUBE_ID,
      visibilidade: 'privada', ownerId: MARINA_UID,
      codigoConvite: 'FGHJK', qtdMembrosAtivos: 2, qtdDesafiosAtivos: 1,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('clubes').doc(CLUBE_SUSPENSO_ID), {
      id: CLUBE_SUSPENSO_ID, tenantId: SUSPENSO_ID,
      nome: 'Clube do Suspenso', slug: CLUBE_SUSPENSO_ID,
      visibilidade: 'privada', ownerId: ownerSuspenso.uid,
      codigoConvite: 'MNPQR', qtdMembrosAtivos: 0, qtdDesafiosAtivos: 0,
      criadoEm: now, atualizadoEm: now,
    });

    // Subárvore completa: toda subcoleção conhecida + junções aninhadas.
    batch.set(clubeRef.collection('membros').doc('membro-marina'), {
      id: 'membro-marina', tenantId: CASTELO_ID, atletaId: MARINA_UID,
      atletaNome: 'Marina Castelo', papel: 'owner', entrouVia: 'codigo',
      status: 'ativo', entrouEm: now, criadoEm: now, atualizadoEm: now,
    });
    batch.set(clubeRef.collection('membros').doc('membro-ana'), {
      id: 'membro-ana', tenantId: CASTELO_ID, atletaId: 'uid-ana',
      atletaNome: 'Ana Prado', papel: 'membro', entrouVia: 'convite',
      status: 'ativo', entrouEm: now, criadoEm: now, atualizadoEm: now,
    });
    batch.set(clubeRef.collection('permissoesAdmin').doc('perm-bia'), {
      id: 'perm-bia', tenantId: CASTELO_ID, membroId: 'membro-bia',
      criarDesafio: true, criadoEm: now,
    });
    batch.set(clubeRef.collection('desafios').doc('d1'), {
      id: 'd1', tenantId: CASTELO_ID, nome: 'Desafio Julho',
      status: 'em-andamento', modelo: 'A', criadoEm: now,
    });
    batch.set(
      clubeRef.collection('desafios').doc('d1').collection('acoes').doc('a1'),
      { id: 'a1', tenantId: CASTELO_ID, acaoId: 'correr-5k', pontos: 10 }
    );
    batch.set(clubeRef.collection('parcerias').doc('p1'), {
      id: 'p1', tenantId: CASTELO_ID, tipo: 'patrocinador',
      status: 'ativa', criadoEm: now,
    });
    batch.set(
      clubeRef.collection('parcerias').doc('p1').collection('conversoes').doc('c1'),
      { id: 'c1', tenantId: CASTELO_ID, valor: 120, criadoEm: now }
    );
    batch.set(clubeRef.collection('comunicados').doc('com1'), {
      id: 'com1', tenantId: CASTELO_ID, titulo: 'Bem-vindos',
      status: 'rascunho', canal: 'push', criadoEm: now,
    });
    batch.set(clubeRef.collection('convites').doc('conv1'), {
      id: 'conv1', tenantId: CASTELO_ID, email: 'ana@leela.com.br',
      status: 'pendente', criadoEm: now,
    });

    await batch.commit();
  }

  function retencaoRef() {
    return db.collection('clubesExcluidos').doc(CLUBE_ID);
  }

  // ── deleteClube — cascata + retenção ────────────────────────────────────

  describe('deleteClube (cascata + retenção 90d)', () => {
    it('owner exclui: cascata COMPLETA + snapshot de retenção + expiraEm +90d', async () => {
      const deletadoEm = new Date('2026-07-04T21:00:00.000Z');
      const resultado = await deleteClubeCore(
        db,
        { clubeId: CLUBE_ID },
        marina,
        () => deletadoEm
      );
      expect(resultado).toEqual({ deletado: true });

      // Doc do clube e TODA a subárvore não existem mais.
      expect((await db.collection('clubes').doc(CLUBE_ID).get()).exists).toBe(false);
      for (const caminho of SUBARVORE) {
        const snap = await db.doc(`clubes/${CLUBE_ID}/${caminho}`).get();
        expect(snap.exists, `esperava '${caminho}' deletado`).toBe(false);
      }

      // Marcador de retenção (RN-144).
      const marcador = await retencaoRef().get();
      expect(marcador.exists).toBe(true);
      expect(marcador.get('tenantId')).toBe(CASTELO_ID);
      expect(marcador.get('ownerId')).toBe(MARINA_UID);
      expect(marcador.get('deletadoPor')).toBe(MARINA_UID);
      expect(marcador.get('nome')).toBe('Clube LGPD Castelo');
      expect(marcador.get('totalDocumentos')).toBe(SUBARVORE.length);
      const expiraEm = (marcador.get('expiraEm') as admin.firestore.Timestamp).toDate();
      expect(expiraEm.getTime() - deletadoEm.getTime()).toBe(MS_90_DIAS);

      // Snapshot íntegro: um doc por caminho, com chave determinística.
      for (const caminho of SUBARVORE) {
        const snap = await retencaoRef()
          .collection('documentos')
          .doc(chaveSnapshot(caminho))
          .get();
        expect(snap.exists, `esperava snapshot de '${caminho}'`).toBe(true);
        expect(snap.get('caminho')).toBe(caminho);
        expect(snap.get('dados')).toBeTruthy();
      }
      // Conteúdo preservado (amostra: junção aninhada).
      const acao = await retencaoRef()
        .collection('documentos')
        .doc(chaveSnapshot('desafios/d1/acoes/a1'))
        .get();
      expect(acao.get('dados.acaoId')).toBe('correr-5k');
    });

    it('staff do tenant NÃO exclui — só o owner do clube (RN-144)', async () => {
      await expectHttpsError(
        deleteClubeCore(db, { clubeId: CLUBE_ID }, staffCastelo),
        'permission-denied',
        'owner'
      );
      expect((await db.collection('clubes').doc(CLUBE_ID).get()).exists).toBe(true);
    });

    it('cross-tenant e inexistente devolvem o MESMO permission-denied (não vaza)', async () => {
      await expectHttpsError(
        deleteClubeCore(db, { clubeId: CLUBE_ID }, passoOwner),
        'permission-denied',
        'não pertence ao seu tenant'
      );
      await expectHttpsError(
        deleteClubeCore(db, { clubeId: 'clube-fantasma' }, marina),
        'permission-denied',
        'não pertence ao seu tenant'
      );
    });

    it('athlete (sem papel de escrita) é negado', async () => {
      await expectHttpsError(
        deleteClubeCore(db, { clubeId: CLUBE_ID }, athlete),
        'permission-denied'
      );
    });

    it('tenant suspenso bloqueia (RN-402)', async () => {
      await expectHttpsError(
        deleteClubeCore(db, { clubeId: CLUBE_SUSPENSO_ID }, ownerSuspenso),
        'failed-precondition',
        'RN-402'
      );
    });

    it('input inválido → invalid-argument', async () => {
      await expectHttpsError(
        deleteClubeCore(db, {}, marina),
        'invalid-argument'
      );
    });

    it('replay pós-conclusão devolve sucesso SEM deslizar a janela LGPD', async () => {
      const primeiro = new Date('2026-07-04T21:00:00.000Z');
      await deleteClubeCore(db, { clubeId: CLUBE_ID }, marina, () => primeiro);
      const expiraOriginal = (
        (await retencaoRef().get()).get('expiraEm') as admin.firestore.Timestamp
      ).toDate();

      const retry = new Date('2026-07-10T09:00:00.000Z');
      const resultado = await deleteClubeCore(
        db,
        { clubeId: CLUBE_ID },
        marina,
        () => retry
      );
      expect(resultado).toEqual({ deletado: true });

      const marcador = await retencaoRef().get();
      expect(
        (marcador.get('expiraEm') as admin.firestore.Timestamp).toDate().getTime()
      ).toBe(expiraOriginal.getTime());
      expect(
        (marcador.get('deletadoEm') as admin.firestore.Timestamp).toDate().getTime()
      ).toBe(primeiro.getTime());
    });

    it('replay mid-run CONCLUI a cascata preservando deletadoEm/expiraEm originais', async () => {
      // Simula run anterior morto após gravar o marcador (clube ainda vivo).
      const primeiro = new Date('2026-07-01T12:00:00.000Z');
      await retencaoRef().set({
        clubeId: CLUBE_ID, tenantId: CASTELO_ID, ownerId: MARINA_UID,
        nome: 'Clube LGPD Castelo', clube: { id: CLUBE_ID },
        deletadoPor: MARINA_UID,
        deletadoEm: admin.firestore.Timestamp.fromDate(primeiro),
        expiraEm: admin.firestore.Timestamp.fromDate(
          new Date(primeiro.getTime() + MS_90_DIAS)
        ),
        totalDocumentos: SUBARVORE.length,
      });

      const retry = new Date('2026-07-04T21:00:00.000Z');
      await deleteClubeCore(db, { clubeId: CLUBE_ID }, marina, () => retry);

      // Cascata concluída…
      expect((await db.collection('clubes').doc(CLUBE_ID).get()).exists).toBe(false);
      // …e a janela LGPD é a do PRIMEIRO delete.
      const marcador = await retencaoRef().get();
      expect(
        (marcador.get('deletadoEm') as admin.firestore.Timestamp).toDate().getTime()
      ).toBe(primeiro.getTime());
      expect(
        (marcador.get('expiraEm') as admin.firestore.Timestamp).toDate().getTime()
      ).toBe(primeiro.getTime() + MS_90_DIAS);
    });
  });

  // ── exportClubeData — guard 90d ─────────────────────────────────────────

  describe('exportClubeData (export LGPD)', () => {
    it('clube VIVO: registra solicitação e expira +90d da solicitação', async () => {
      const agora = new Date('2026-07-04T21:00:00.000Z');
      const resultado = await exportClubeDataCore(
        db,
        { clubeId: CLUBE_ID },
        marina,
        () => agora
      );
      expect(resultado.exportId).toBeTruthy();
      expect(resultado.expiraEm).toBe(
        new Date(agora.getTime() + MS_90_DIAS).toISOString()
      );

      const exportDoc = await db
        .collection('exportsClube')
        .doc(resultado.exportId)
        .get();
      expect(exportDoc.exists).toBe(true);
      expect(exportDoc.get('clubeId')).toBe(CLUBE_ID);
      expect(exportDoc.get('tenantId')).toBe(CASTELO_ID);
      expect(exportDoc.get('origem')).toBe('ativo');
      expect(exportDoc.get('solicitadoPor')).toBe(MARINA_UID);
      expect(exportDoc.get('status')).toBe('solicitado');
      // Doc do clube + subárvore inteira.
      expect(exportDoc.get('totalDocumentos')).toBe(SUBARVORE.length + 1);
    });

    it('clube RETIDO dentro da janela: export expira JUNTO com a retenção', async () => {
      const deletadoEm = new Date('2026-07-04T21:00:00.000Z');
      await deleteClubeCore(db, { clubeId: CLUBE_ID }, marina, () => deletadoEm);

      const solicitadoEm = new Date('2026-08-01T10:00:00.000Z');
      const resultado = await exportClubeDataCore(
        db,
        { clubeId: CLUBE_ID },
        marina,
        () => solicitadoEm
      );
      expect(resultado.expiraEm).toBe(
        new Date(deletadoEm.getTime() + MS_90_DIAS).toISOString()
      );

      const exportDoc = await db
        .collection('exportsClube')
        .doc(resultado.exportId)
        .get();
      expect(exportDoc.get('origem')).toBe('retido');
      expect(exportDoc.get('totalDocumentos')).toBe(SUBARVORE.length + 1);
    });

    it('retenção EXPIRADA → failed-precondition (guard 90d)', async () => {
      const deletadoEm = new Date('2026-07-04T21:00:00.000Z');
      await deleteClubeCore(db, { clubeId: CLUBE_ID }, marina, () => deletadoEm);

      const depoisDos90 = new Date(deletadoEm.getTime() + MS_90_DIAS);
      await expectHttpsError(
        exportClubeDataCore(db, { clubeId: CLUBE_ID }, marina, () => depoisDos90),
        'failed-precondition',
        'RN-144'
      );
    });

    it('staff (não-owner) e cross-tenant negados; tenant suspenso bloqueia', async () => {
      await expectHttpsError(
        exportClubeDataCore(db, { clubeId: CLUBE_ID }, staffCastelo),
        'permission-denied',
        'owner'
      );
      await expectHttpsError(
        exportClubeDataCore(db, { clubeId: CLUBE_ID }, passoOwner),
        'permission-denied',
        'não pertence ao seu tenant'
      );
      await expectHttpsError(
        exportClubeDataCore(db, { clubeId: CLUBE_SUSPENSO_ID }, ownerSuspenso),
        'failed-precondition',
        'RN-402'
      );
    });
  });

  // ── Rules endurecidas (S110-T2) ─────────────────────────────────────────

  describe('Rules — delete de clube e coleções LGPD são Function-only', () => {
    function ctxAs(uid: string, claims: Record<string, unknown>) {
      return testEnv.authenticatedContext(uid, claims);
    }

    it('NEM o owner do clube deleta via client SDK (retenção nunca é pulada)', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(deleteDoc(doc(ctx.firestore(), 'clubes', CLUBE_ID)));
    });

    it('platform_admin via client SDK também NÃO deleta', async () => {
      const ctx = ctxAs('uid-platform-admin', { role: 'platform_admin' });
      await assertFails(deleteDoc(doc(ctx.firestore(), 'clubes', CLUBE_ID)));
    });

    it('update de clube pelo tenant writer SEGUE permitido (sem regressão)', async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'clubes', CLUBE_ID), {
          nome: 'Clube LGPD Renomeado',
        })
      );
    });

    it('cliente não LÊ nem ESCREVE clubesExcluidos (deny-by-default)', async () => {
      await db.collection('clubesExcluidos').doc(CLUBE_ID).set({
        clubeId: CLUBE_ID, tenantId: CASTELO_ID, ownerId: MARINA_UID,
      });
      await db
        .collection('clubesExcluidos').doc(CLUBE_ID)
        .collection('documentos').doc(chaveSnapshot('membros/m1'))
        .set({ caminho: 'membros/m1', dados: { id: 'm1' } });

      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const clientDb = ctx.firestore();
      await assertFails(getDoc(doc(clientDb, 'clubesExcluidos', CLUBE_ID)));
      await assertFails(
        getDoc(
          doc(
            clientDb,
            'clubesExcluidos',
            CLUBE_ID,
            'documentos',
            chaveSnapshot('membros/m1')
          )
        )
      );
      await assertFails(
        setDoc(doc(clientDb, 'clubesExcluidos', 'clube-forjado'), { x: 1 })
      );
    });

    it('cliente não LÊ nem ESCREVE exportsClube (deny-by-default)', async () => {
      await db.collection('exportsClube').doc('export-1').set({
        exportId: 'export-1', clubeId: CLUBE_ID, tenantId: CASTELO_ID,
      });

      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      const clientDb = ctx.firestore();
      await assertFails(getDoc(doc(clientDb, 'exportsClube', 'export-1')));
      await assertFails(
        setDoc(doc(clientDb, 'exportsClube', 'export-forjado'), { x: 1 })
      );
    });
  });
});
