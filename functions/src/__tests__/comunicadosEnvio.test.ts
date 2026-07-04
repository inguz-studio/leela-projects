/**
 * comunicadosEnvio.test.ts — LEELA-S108-T1
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * Function de envio de comunicado SEM subir o Functions emulator.
 *
 * Cobre (aceites do brief/spec):
 *   - RN-133: 4 push já enviados na janela de 7 dias → 5º push BLOQUEADO;
 *   - comunicado só-email NÃO consome cota de push;
 *   - agregado ∑ alcance idempotente (reenvio de doc enviado é no-op);
 *   - alcance de segmento 'todos' = recontagem real de membros não-inativos;
 *   - seedComunicados: 7 canônicos (3 enviados/3 agendados/1 rascunho),
 *     idempotente, sem consumir cota RN-133.
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
  contarPushNaJanela,
  enviarComunicado,
} from '../clubs/onComunicadoEnvio';
import {
  COMUNICADOS_AGENDADOS_SEED,
  COMUNICADOS_ENVIADOS_SEED,
  COMUNICADOS_RASCUNHO_SEED,
  TOTAL_COMUNICADOS_SEED,
  seedComunicados,
} from '../seed/comunicados.seed';
import { CLUBE_CPS_SLUG } from '../seed/clubes.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-07-04T12:00:00Z');

const CLUBE_ID = 'clube-comunicados';
const TENANT_ID = 'castelo-producoes';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('comunicados — Function de envio (S108-T1)', () => {
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
      nome: 'Clube Comunicados',
      visibilidade: 'privada',
      qtdMembrosAtivos: 0,
      qtdDesafiosAtivos: 0,
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function comunicadoRef(id: string) {
    return adminDb
      .collection('clubes')
      .doc(CLUBE_ID)
      .collection('comunicados')
      .doc(id);
  }

  async function criarComunicado(
    id: string,
    overrides: Record<string, unknown> = {}
  ): Promise<void> {
    await comunicadoRef(id).set({
      id,
      tenantId: TENANT_ID,
      titulo: `Comunicado ${id}`,
      conteudo: 'Conteúdo de teste com mais de dez caracteres.',
      canal: ['push'],
      origem: 'manual',
      status: 'rascunho',
      segmento: { tipo: 'todos' },
      alcance: 0,
      ...overrides,
    });
  }

  /** Semeia N push já ENVIADOS dentro da janela (via Admin, como a Function). */
  async function semearPushEnviados(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      await criarComunicado(`push-enviado-${i}`, {
        status: 'enviado',
        enviadoEm: new Date(AGORA.getTime() - (i + 1) * DIA_MS),
        alcance: 100,
      });
    }
  }

  // ── RN-133: limite 4 push/semana ─────────────────────────────────────────

  describe('limite de push (RN-133)', () => {
    it('com 4 push na janela, o 5º push é BLOQUEADO', async () => {
      await semearPushEnviados(4);
      await criarComunicado('quinto-push');

      const r = await enviarComunicado(adminDb, CLUBE_ID, 'quinto-push', AGORA);
      expect(r.enviado).toBe(false);
      expect(r.motivo).toBe('limite_push_semana');
      expect(r.pushNaJanela).toBe(4);

      const doc = await comunicadoRef('quinto-push').get();
      expect(doc.get('status')).toBe('rascunho'); // não carimbou
    });

    it('com 3 push na janela, o 4º envia', async () => {
      await semearPushEnviados(3);
      await criarComunicado('quarto-push');

      const r = await enviarComunicado(adminDb, CLUBE_ID, 'quarto-push', AGORA);
      expect(r).toEqual({ enviado: true, motivo: 'ok' });

      const doc = await comunicadoRef('quarto-push').get();
      expect(doc.get('status')).toBe('enviado');
      expect(doc.get('enviadoEm')).toBeTruthy();
    });

    it('comunicado SÓ EMAIL não sofre o limite (RN-133 é de push)', async () => {
      await semearPushEnviados(4);
      await criarComunicado('email-livre', { canal: ['email'] });

      const r = await enviarComunicado(adminDb, CLUBE_ID, 'email-livre', AGORA);
      expect(r.enviado).toBe(true);
    });

    it('push FORA da janela de 7 dias não conta na cota', async () => {
      // 4 push antigos (8+ dias) + nada na janela
      for (let i = 0; i < 4; i++) {
        await criarComunicado(`push-antigo-${i}`, {
          status: 'enviado',
          enviadoEm: new Date(AGORA.getTime() - (8 + i) * DIA_MS),
          alcance: 100,
        });
      }
      expect(await contarPushNaJanela(adminDb, CLUBE_ID, AGORA)).toBe(0);

      await criarComunicado('push-novo');
      const r = await enviarComunicado(adminDb, CLUBE_ID, 'push-novo', AGORA);
      expect(r.enviado).toBe(true);
    });

    it('email-only enviado na janela não entra na contagem de push', async () => {
      await criarComunicado('email-enviado', {
        canal: ['email'],
        status: 'enviado',
        enviadoEm: new Date(AGORA.getTime() - 1 * DIA_MS),
        alcance: 50,
      });
      expect(await contarPushNaJanela(adminDb, CLUBE_ID, AGORA)).toBe(0);
    });
  });

  // ── Idempotência + alcance ───────────────────────────────────────────────

  describe('idempotência e alcance (∑)', () => {
    it('reenviar comunicado JÁ ENVIADO é no-op (retry-safe)', async () => {
      await criarComunicado('reenvio', {
        segmento: { tipo: 'por_desafio', referencia: 'x', tamanhoEstimado: 48 },
      });
      const r1 = await enviarComunicado(adminDb, CLUBE_ID, 'reenvio', AGORA);
      expect(r1.enviado).toBe(true);

      const antes = (await comunicadoRef('reenvio').get()).data();

      const r2 = await enviarComunicado(adminDb, CLUBE_ID, 'reenvio', AGORA);
      expect(r2).toEqual({ enviado: false, motivo: 'ja_enviado' });

      const depois = (await comunicadoRef('reenvio').get()).data();
      expect(depois).toEqual(antes); // nada mudou — alcance não duplica
    });

    it("segmento 'todos' usa recontagem REAL de membros não-inativos", async () => {
      const membros = adminDb
        .collection('clubes').doc(CLUBE_ID).collection('membros');
      await membros.doc('m1').set({ tenantId: TENANT_ID, status: 'ativo' });
      await membros.doc('m2').set({ tenantId: TENANT_ID, status: 'novo' });
      await membros.doc('m3').set({ tenantId: TENANT_ID, status: 'inativo' });

      await criarComunicado('para-todos');
      await enviarComunicado(adminDb, CLUBE_ID, 'para-todos', AGORA);

      const doc = await comunicadoRef('para-todos').get();
      expect(doc.get('alcance')).toBe(2); // ativo + novo; inativo fora
    });

    it('segmento específico usa a fotografia tamanhoEstimado', async () => {
      await criarComunicado('segmentado', {
        segmento: {
          tipo: 'por_desafio',
          referencia: 'preparacao-meia-floripa',
          tamanhoEstimado: 48,
        },
      });
      await enviarComunicado(adminDb, CLUBE_ID, 'segmentado', AGORA);

      const doc = await comunicadoRef('segmentado').get();
      expect(doc.get('alcance')).toBe(48);
    });

    it('comunicado inexistente → comunicado_invalido', async () => {
      const r = await enviarComunicado(adminDb, CLUBE_ID, 'fantasma', AGORA);
      expect(r.motivo).toBe('comunicado_invalido');
    });
  });

  // ── seedComunicados ──────────────────────────────────────────────────────

  describe('seedComunicados (canônico HANDOFF-05)', () => {
    it('cria 7 comunicados (3 enviados/3 agendados/1 rascunho)', async () => {
      await seedComunicados(adminDb, AGORA);

      const docs = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('comunicados')
        .get();
      expect(docs.size).toBe(TOTAL_COMUNICADOS_SEED);

      const porStatus: Record<string, number> = {};
      for (const d of docs.docs) {
        const s = d.get('status') as string;
        porStatus[s] = (porStatus[s] ?? 0) + 1;
      }
      expect(porStatus).toEqual({
        enviado: COMUNICADOS_ENVIADOS_SEED,
        agendado: COMUNICADOS_AGENDADOS_SEED,
        rascunho: COMUNICADOS_RASCUNHO_SEED,
      });

      // Slug canônico usado pelo editor (S109-T2 modo edit)
      const rascunho = docs.docs.find((d) => d.id === 'dica-ritmo-longa');
      expect(rascunho?.get('status')).toBe('rascunho');
      expect(rascunho?.get('canal')).toEqual(['email']);
    });

    it('seed NÃO consome a cota de push da janela (enviados são antigos)', async () => {
      await seedComunicados(adminDb, AGORA);
      expect(
        await contarPushNaJanela(adminDb, CLUBE_CPS_SLUG, AGORA)
      ).toBe(0);
    });

    it('rerun é idempotente', async () => {
      await seedComunicados(adminDb, AGORA);
      await seedComunicados(adminDb, AGORA);

      const docs = await adminDb
        .collection('clubes')
        .doc(CLUBE_CPS_SLUG)
        .collection('comunicados')
        .get();
      expect(docs.size).toBe(TOTAL_COMUNICADOS_SEED);
    });
  });
});
