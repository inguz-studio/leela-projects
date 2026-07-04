/**
 * desafiosAggregates.test.ts — LEELA-S105-T1
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * lógica da Cloud Function onDesafioWrite SEM subir o Functions emulator.
 *
 * Cobre:
 *   - recontarDesafiosAtivos: ∑ por RECONTAGEM — idempotente sob retry
 *     (reprocessar o mesmo evento nunca duplica); fecha a pendência
 *     herdada do E05-L1 (qtdDesafiosAtivos sem Function mantenedora);
 *   - sincronizarDesafio: propaga tenantId do clube pai (ADR-009),
 *     no-op na 2ª passada (término da cadeia de trigger);
 *   - seedDesafios: catálogo com EXATAMENTE 16 ações (7/5/4 — RN-114),
 *     5 desafios canônicos (3 ativos), junção `acoes` persistida com meta
 *     por ação no Modelo A, idempotente em rerun.
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import {
  recontarDesafiosAtivos,
  sincronizarDesafio,
} from '../clubs/desafiosAggregates';
import {
  QTD_DESAFIOS_ATIVOS_SEED,
  TOTAL_DESAFIOS_SEED,
  seedDesafios,
} from '../seed/desafios.seed';
import { CLUBE_CPS_SLUG } from '../seed/clubes.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CLUBE_ID = 'clube-desafios-agg';
const TENANT_ID = 'castelo-producoes';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('desafios — Function de agregados (S105-T1)', () => {
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
    await adminDb.collection('clubes').doc(CLUBE_ID).set({
      id: CLUBE_ID,
      tenantId: TENANT_ID,
      nome: 'Clube Agregados Desafios',
      visibilidade: 'privada',
      qtdMembrosAtivos: 0,
      qtdDesafiosAtivos: 0,
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function desafioRef(id: string) {
    return adminDb
      .collection('clubes')
      .doc(CLUBE_ID)
      .collection('desafios')
      .doc(id);
  }

  async function criarDesafio(id: string, status: string): Promise<void> {
    await desafioRef(id).set({
      id,
      tenantId: TENANT_ID,
      nome: `Desafio ${id}`,
      modelo: 'B',
      status,
      recompensaTipo: 'medalha_digital',
      visibilidade: 'membros',
      qtdParticipantes: 0,
      progressoPct: 0,
    });
  }

  // ── recontarDesafiosAtivos ───────────────────────────────────────────────

  describe('recontarDesafiosAtivos (∑ por recontagem)', () => {
    it('conta apenas status ativo (rascunho/encerrado ficam fora)', async () => {
      await criarDesafio('d-ativo-1', 'ativo');
      await criarDesafio('d-ativo-2', 'ativo');
      await criarDesafio('d-rascunho', 'rascunho');
      await criarDesafio('d-encerrado', 'encerrado');

      const mudou = await recontarDesafiosAtivos(adminDb, CLUBE_ID);
      expect(mudou).toBe(true);

      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdDesafiosAtivos')).toBe(2);
    });

    it('é idempotente sob retry — reprocessar não duplica', async () => {
      await criarDesafio('d-ativo', 'ativo');

      await recontarDesafiosAtivos(adminDb, CLUBE_ID);
      // Simula retry at-least-once do trigger: 3 reprocessamentos
      const r2 = await recontarDesafiosAtivos(adminDb, CLUBE_ID);
      const r3 = await recontarDesafiosAtivos(adminDb, CLUBE_ID);
      expect(r2).toBe(false); // nada a corrigir
      expect(r3).toBe(false);

      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdDesafiosAtivos')).toBe(1);
    });

    it('encerrar desafio decrementa via recontagem', async () => {
      await criarDesafio('d-vai-encerrar', 'ativo');
      await recontarDesafiosAtivos(adminDb, CLUBE_ID);

      await desafioRef('d-vai-encerrar').update({ status: 'encerrado' });
      const mudou = await recontarDesafiosAtivos(adminDb, CLUBE_ID);
      expect(mudou).toBe(true);

      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdDesafiosAtivos')).toBe(0);
    });

    it('clube inexistente → no-op (delete concorrente do pai)', async () => {
      const mudou = await recontarDesafiosAtivos(adminDb, 'clube-fantasma');
      expect(mudou).toBe(false);
    });
  });

  // ── sincronizarDesafio ───────────────────────────────────────────────────

  describe('sincronizarDesafio (tenantId do pai — ADR-009)', () => {
    it('corrige tenantId divergente e vira no-op na 2ª passada', async () => {
      await desafioRef('d-tenant-errado').set({
        id: 'd-tenant-errado',
        tenantId: 'tenant-intruso',
        nome: 'Desafio Divergente',
        modelo: 'A',
        status: 'rascunho',
        recompensaTipo: 'custom',
        visibilidade: 'membros',
      });

      const corrigiu = await sincronizarDesafio(
        adminDb,
        CLUBE_ID,
        'd-tenant-errado'
      );
      expect(corrigiu).toBe(true);

      const doc = await desafioRef('d-tenant-errado').get();
      expect(doc.get('tenantId')).toBe(TENANT_ID);

      // 2ª passada (o write de correção re-dispara o trigger): no-op
      const denovo = await sincronizarDesafio(
        adminDb,
        CLUBE_ID,
        'd-tenant-errado'
      );
      expect(denovo).toBe(false);
    });

    it('desafio deletado entre trigger e get → no-op', async () => {
      const corrigiu = await sincronizarDesafio(adminDb, CLUBE_ID, 'd-fantasma');
      expect(corrigiu).toBe(false);
    });
  });

  // ── seedDesafios ─────────────────────────────────────────────────────────

  describe('seedDesafios (canônico HANDOFF-05)', () => {
    it('cria EXATAMENTE 16 ações no catálogo (7/5/4 por pilar — RN-114)', async () => {
      await seedDesafios(adminDb);

      const catalogo = await adminDb.collection('catalogoAcoes').get();
      expect(catalogo.size).toBe(16);

      const porPilar: Record<string, number> = {};
      for (const doc of catalogo.docs) {
        const pilar = doc.get('pilar') as string;
        porPilar[pilar] = (porPilar[pilar] ?? 0) + 1;
      }
      expect(porPilar).toEqual({ fisico: 7, mental: 5, espiritual: 4 });

      // Ícones e pontos canônicos (aceite do brief)
      const correr = await adminDb.collection('catalogoAcoes').doc('correr').get();
      expect(correr.data()).toMatchObject({
        icone: 'footprints',
        pontosBase: 2,
        unidadeBase: 1,
        unidade: 'km',
      });
      const meditar = await adminDb.collection('catalogoAcoes').doc('meditar').get();
      expect(meditar.data()).toMatchObject({
        icone: 'sparkles',
        pontosBase: 5,
        unidadeBase: 10,
        unidade: 'min',
      });
    });

    it('cria 5 desafios canônicos (3 ativos) e reconta qtdDesafiosAtivos', async () => {
      await seedDesafios(adminDb);

      const desafios = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('desafios')
        .get();
      expect(desafios.size).toBe(TOTAL_DESAFIOS_SEED);

      const ativos = desafios.docs.filter((d) => d.get('status') === 'ativo');
      expect(ativos).toHaveLength(QTD_DESAFIOS_ATIVOS_SEED);

      const clube = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .get();
      expect(clube.get('qtdDesafiosAtivos')).toBe(QTD_DESAFIOS_ATIVOS_SEED);
    });

    it('junção acoes persiste com meta (Modelo A/C com metas do protótipo)', async () => {
      await seedDesafios(adminDb);

      const meiaRef = adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('desafios')
        .doc('preparacao-meia-floripa');

      const meia = await meiaRef.get();
      expect(meia.data()).toMatchObject({
        modelo: 'C',
        metaTotalPontos: 2000,
        minimoPorPilar: { fisico: 300, mental: 300, espiritual: 300 },
        eventoVinculadoId: 'meia-floripa-2026',
        qtdParticipantes: 48,
        progressoPct: 62,
      });

      const acoes = await meiaRef.collection('acoes').get();
      expect(acoes.size).toBe(9); // 9 de 16 ativas (HANDOFF-05)
      const correr = acoes.docs.find((d) => d.id === 'correr');
      expect(correr?.data()).toEqual({ acaoRef: 'correr', meta: 80 });

      // Modelo B (Marcha Mental): junção sem meta por ação
      const marchaAcoes = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('desafios')
        .doc('marcha-mental')
        .collection('acoes')
        .get();
      expect(marchaAcoes.size).toBeGreaterThan(0);
      for (const acao of marchaAcoes.docs) {
        expect(acao.get('meta')).toBeUndefined();
      }
    });

    it('rerun é idempotente (contagens e agregado não mudam)', async () => {
      await seedDesafios(adminDb);
      await seedDesafios(adminDb);

      const catalogo = await adminDb.collection('catalogoAcoes').get();
      expect(catalogo.size).toBe(16);

      const clube = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .get();
      expect(clube.get('qtdDesafiosAtivos')).toBe(QTD_DESAFIOS_ATIVOS_SEED);
    });
  });
});
