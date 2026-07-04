/**
 * membrosAggregates.test.ts — LEELA-S103-T1
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * lógica da Cloud Function de membros SEM subir o Functions emulator.
 *
 * Cobre:
 *   - sincronizarMembro: deriva `status` (RN-102), propaga tenantId do pai
 *     (ADR-009), no-op na 2ª passada (término da cadeia de trigger);
 *   - recontarMembrosAtivos: ∑ por RECONTAGEM — idempotente sob retry
 *     (reprocessar o mesmo evento nunca duplica);
 *   - recalcularStatusMembrosCore (cron): envelhecimento novo→ativo e
 *     ativo→inativo SEM write no doc, agregados corrigidos, 2ª varredura
 *     imediata é no-op;
 *   - seedMembros: canônico, consistente com a recontagem, idempotente.
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
  recalcularStatusMembrosCore,
  recontarMembrosAtivos,
  sincronizarMembro,
} from '../clubs/membrosAggregates';
import {
  QTD_MEMBROS_ATIVOS_SEED,
  TOTAL_MEMBROS_SEED,
  seedMembros,
} from '../seed/membros.seed';
import { CLUBE_CPS_SLUG } from '../seed/clubes.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-07-04T12:00:00Z');

function diasAtras(n: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(
    new Date(AGORA.getTime() - n * DIA_MS)
  );
}

const CLUBE_ID = 'clube-agg-teste';
const TENANT_ID = 'castelo-producoes';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('membros — Function de agregados (S103-T1)', () => {
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
      nome: 'Clube Agregados',
      visibilidade: 'privada',
      qtdMembrosAtivos: 0,
      qtdDesafiosAtivos: 0,
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function membroRef(membroId: string) {
    return adminDb
      .collection('clubes')
      .doc(CLUBE_ID)
      .collection('membros')
      .doc(membroId);
  }

  // ── sincronizarMembro ────────────────────────────────────────────────────

  describe('sincronizarMembro (trigger onWrite)', () => {
    it('deriva status ausente por data (create de cliente vem SEM status)', async () => {
      await membroRef('m-sem-status').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-x',
        atletaNome: 'X',
        papel: 'membro',
        entrouVia: 'codigo',
        entrouEm: diasAtras(2),
      });

      const corrigiu = await sincronizarMembro(adminDb, CLUBE_ID, 'm-sem-status', AGORA);
      expect(corrigiu).toBe(true);
      expect((await membroRef('m-sem-status').get()).get('status')).toBe('novo');
    });

    it('corrige status divergente (fraude/estado velho) para o derivado', async () => {
      await membroRef('m-divergente').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-y',
        atletaNome: 'Y',
        papel: 'membro',
        entrouVia: 'link',
        entrouEm: diasAtras(120),
        ultimaAtividadeEm: diasAtras(60),
        status: 'ativo', // mentira — 60 dias parado é inativo
      });

      await sincronizarMembro(adminDb, CLUBE_ID, 'm-divergente', AGORA);
      expect((await membroRef('m-divergente').get()).get('status')).toBe('inativo');
    });

    it('propaga tenantId do clube pai quando diverge (ADR-009 — pai é fonte de verdade)', async () => {
      await membroRef('m-tenant-errado').set({
        tenantId: 'tenant-intruso',
        atletaId: 'uid-z',
        atletaNome: 'Z',
        papel: 'membro',
        entrouVia: 'codigo',
        entrouEm: diasAtras(10),
        status: 'ativo',
      });

      await sincronizarMembro(adminDb, CLUBE_ID, 'm-tenant-errado', AGORA);
      expect((await membroRef('m-tenant-errado').get()).get('tenantId')).toBe(TENANT_ID);
    });

    it('2ª passada é no-op (cadeia de trigger termina)', async () => {
      await membroRef('m-noop').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-n',
        atletaNome: 'N',
        papel: 'membro',
        entrouVia: 'codigo',
        entrouEm: diasAtras(10),
      });

      expect(await sincronizarMembro(adminDb, CLUBE_ID, 'm-noop', AGORA)).toBe(true);
      expect(await sincronizarMembro(adminDb, CLUBE_ID, 'm-noop', AGORA)).toBe(false);
    });

    it('membro deletado entre o evento e o processamento → no-op sem erro', async () => {
      expect(await sincronizarMembro(adminDb, CLUBE_ID, 'm-fantasma', AGORA)).toBe(false);
    });
  });

  // ── recontarMembrosAtivos ────────────────────────────────────────────────

  describe('recontarMembrosAtivos (∑ qtdMembrosAtivos)', () => {
    async function seedMix(): Promise<void> {
      const specs = [
        { id: 'm-a1', status: 'ativo' },
        { id: 'm-a2', status: 'ativo' },
        { id: 'm-n1', status: 'novo' },
        { id: 'm-i1', status: 'inativo' },
      ];
      for (const s of specs) {
        await membroRef(s.id).set({
          tenantId: TENANT_ID,
          atletaId: `uid-${s.id}`,
          atletaNome: s.id,
          papel: 'membro',
          entrouVia: 'codigo',
          entrouEm: diasAtras(10),
          status: s.status,
        });
      }
    }

    it('conta ativo + novo e ignora inativo (RN-102)', async () => {
      await seedMix();
      const mudou = await recontarMembrosAtivos(adminDb, CLUBE_ID);
      expect(mudou).toBe(true);

      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(3);
    });

    it('é idempotente sob retry: reprocessar o MESMO evento não muda o agregado', async () => {
      await seedMix();
      await recontarMembrosAtivos(adminDb, CLUBE_ID);

      // retry do trigger (mesmo evento reprocessado)
      expect(await recontarMembrosAtivos(adminDb, CLUBE_ID)).toBe(false);
      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(3); // nunca 6
    });

    it('delete de membro reflete na recontagem', async () => {
      await seedMix();
      await recontarMembrosAtivos(adminDb, CLUBE_ID);

      await membroRef('m-a1').delete();
      await recontarMembrosAtivos(adminDb, CLUBE_ID);
      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(2);
    });

    it('clube inexistente → no-op sem erro', async () => {
      expect(await recontarMembrosAtivos(adminDb, 'clube-fantasma')).toBe(false);
    });
  });

  // ── recalcularStatusMembros (cron) ───────────────────────────────────────

  describe('recalcularStatusMembrosCore (cron diário)', () => {
    it('envelhece novo→ativo e ativo→inativo SEM write no doc + reconta ∑', async () => {
      // "novo" que já passou dos 7 dias e "ativo" parado há 45
      await membroRef('m-envelhece-1').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-e1',
        atletaNome: 'E1',
        papel: 'membro',
        entrouVia: 'codigo',
        entrouEm: diasAtras(10),
        ultimaAtividadeEm: diasAtras(1),
        status: 'novo', // era novo quando escrito; o tempo passou
      });
      await membroRef('m-envelhece-2').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-e2',
        atletaNome: 'E2',
        papel: 'membro',
        entrouVia: 'link',
        entrouEm: diasAtras(120),
        ultimaAtividadeEm: diasAtras(45),
        status: 'ativo', // parado há 45 dias — o cron deve inativar
      });

      const stats = await recalcularStatusMembrosCore(adminDb, AGORA);

      expect((await membroRef('m-envelhece-1').get()).get('status')).toBe('ativo');
      expect((await membroRef('m-envelhece-2').get()).get('status')).toBe('inativo');
      expect(stats.membrosAtualizados).toBe(2);
      expect(stats.clubesVarridos).toBeGreaterThanOrEqual(1);

      const clube = await adminDb.collection('clubes').doc(CLUBE_ID).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(1); // só o E1
    });

    it('2ª varredura imediata é no-op (idempotente)', async () => {
      await membroRef('m-estavel').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-s',
        atletaNome: 'S',
        papel: 'membro',
        entrouVia: 'codigo',
        entrouEm: diasAtras(10),
        ultimaAtividadeEm: diasAtras(1),
        status: 'novo',
      });

      await recalcularStatusMembrosCore(adminDb, AGORA);
      const stats2 = await recalcularStatusMembrosCore(adminDb, AGORA);

      expect(stats2.membrosAtualizados).toBe(0);
      expect(stats2.clubesComAgregadoCorrigido).toBe(0);
    });

    it('doc malformado (sem entrouEm) é ignorado sem quebrar a varredura', async () => {
      await membroRef('m-malformado').set({
        tenantId: TENANT_ID,
        atletaId: 'uid-m',
        atletaNome: 'M',
        papel: 'membro',
        entrouVia: 'codigo',
        // sem entrouEm — não inventa status
      });

      const stats = await recalcularStatusMembrosCore(adminDb, AGORA);
      expect(stats.membrosAtualizados).toBe(0);
      expect((await membroRef('m-malformado').get()).get('status')).toBeUndefined();
    });
  });

  // ── seedMembros ──────────────────────────────────────────────────────────

  describe('seedMembros (Emulator-only)', () => {
    it('cria os 6 membros canônicos com status derivado + ∑ recontado', async () => {
      await seedMembros(adminDb, AGORA);

      const membros = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('membros')
        .get();
      expect(membros.size).toBe(TOTAL_MEMBROS_SEED);

      const porStatus = new Map<string, number>();
      for (const m of membros.docs) {
        const s = m.get('status') as string;
        porStatus.set(s, (porStatus.get(s) ?? 0) + 1);
      }
      expect(porStatus.get('novo')).toBe(1); // Bruno
      expect(porStatus.get('inativo')).toBe(1); // Sérgio
      expect(porStatus.get('ativo')).toBe(4);

      const clube = await adminDb.collection('clubes').doc(CLUBE_CPS_SLUG).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(QTD_MEMBROS_ATIVOS_SEED);
    });

    it('é idempotente: rerun preserva entrouEm e não duplica membros nem infla o ∑', async () => {
      await seedMembros(adminDb, AGORA);

      const antes = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('membros')
        .doc('membro-camila-duarte')
        .get();
      const entrouEmAntes = antes.get('entrouEm');

      await seedMembros(adminDb, AGORA); // rerun

      const membros = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('membros')
        .get();
      expect(membros.size).toBe(TOTAL_MEMBROS_SEED);

      const depois = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('membros')
        .doc('membro-camila-duarte')
        .get();
      expect(depois.get('entrouEm')).toEqual(entrouEmAntes);

      const clube = await adminDb.collection('clubes').doc(CLUBE_CPS_SLUG).get();
      expect(clube.get('qtdMembrosAtivos')).toBe(QTD_MEMBROS_ATIVOS_SEED);
    });
  });
});
