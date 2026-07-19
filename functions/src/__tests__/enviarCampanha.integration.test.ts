/**
 * enviarCampanha.integration.test.ts — LEELA-S401-T4 (E06-L2-T2)
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * disparo idempotente de campanha + limite push RN-133 + fan-out MOCK no
 * LOG de comunicação (FABLE-G · RN-219).
 *
 * Cobre (aceites do brief + postura antagonista do lote):
 *   - disparo de segmento de 48 → status 'enviado', enviadoEm carimbado,
 *     alcance==48 (fotografia p/ segmento específico); logs 48×2 canais com
 *     docId determinístico `{ref}_{campanhaId}_{canal}`, SEM corpo;
 *   - todos_inscritos → alcance = recontagem REAL (count in-tx);
 *   - ENVIO DUPLO → no-op idempotente: nenhum log duplicado, alcance
 *     intacto, cota não consumida de novo;
 *   - 5º push na janela → { bloqueado:'limite_push' }, NÃO carimba, ZERO
 *     logs; email-only NÃO consome cota (RN-131);
 *   - segmento vazio (0 destinatários) → { bloqueado:'segmento_vazio' },
 *     não dispara;
 *   - cross-tenant → permission-denied; campanha de outro evento →
 *     not-found; athlete → permission-denied;
 *   - agregado comunicacoesResumo recomputa com porTipo.campanha (a aba
 *     Comunicação E06-L3 lê daqui).
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
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logComunicacaoDocId, type AuthClaims } from '@leela/core';
import { enviarCampanhaCore } from '../eventos/enviarCampanha';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import { recomputarResumoComunicacoes } from '../eventos/agregarComunicacoes';
import { contarPushNaJanelaColecao } from '../shared/comunicacaoEnvio';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-07-10T12:00:00Z');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'evento-envio-campanha';
const EVENTO_B_ID = 'evento-b-sem-campanha';

const KIT_SEGMENTADOS = 48; // canônico HANDOFF-05: "kit pronto" → 48

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('enviarCampanha — idempotente + RN-133 + log RN-219 (S401-T4)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
      },
    });

    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    adminDb = admin.firestore();
  });

  // SUITE-STAB: clear+seed com triggers pausados + canários verificados.
  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await seedVerified(adminDb, testEnv, () => seedFixtures(), [
        `tenants/${CASTELO_ID}`,
        `eventos/${EVENTO_ID}`,
        `eventos/${EVENTO_B_ID}`,
        `eventos/${EVENTO_ID}/inscritos/insc-prata-5`,
      ]);
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  /**
   * Fixture: 48 kit_ouro ATIVOS (44 confirmados + 4 pendentes) + 2 kit_ouro
   * cancelados (fora do segmento) + 5 kit_prata confirmados.
   * Ativos totais = 53.
   */
  async function seedFixtures(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = adminDb.batch();

    batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    // Tenant do INVASOR ativo — o teste cross-tenant deve chegar até a
    // guarda RN-400 (evento de outro tenant), não morrer em RN-402.
    batch.set(adminDb.collection('tenants').doc('passo-certo'), {
      id: 'passo-certo', nome: 'Passo Certo Eventos', slug: 'passo-certo',
      status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor',
      criadoEm: now, atualizadoEm: now,
    });
    for (const id of [EVENTO_ID, EVENTO_B_ID]) {
      batch.set(adminDb.collection('eventos').doc(id), {
        id, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
        nome: `Evento ${id}`, slug: id, status: 'publicado',
        qtdInscritos: 0, receitaConfirmada: 0,
        criadoEm: now, atualizadoEm: now,
      });
    }

    const inscritos = adminDb
      .collection('eventos').doc(EVENTO_ID).collection('inscritos');
    for (let i = 1; i <= KIT_SEGMENTADOS + 2; i++) {
      const id = `insc-${String(i).padStart(4, '0')}`;
      const status =
        i > KIT_SEGMENTADOS ? 'cancelado' : i % 12 === 0 ? 'pendente' : 'confirmado';
      batch.set(inscritos.doc(id), {
        id, tenantId: CASTELO_ID, atletaId: `atleta-${id}`,
        atletaNome: `Atleta ${id}`, kit: 'kit_ouro', chipNumero: null,
        status, modalidade: '21k', tamanhos: {},
        criadoEm: now, atualizadoEm: now,
      });
    }
    for (let i = 1; i <= 5; i++) {
      const id = `insc-prata-${i}`;
      batch.set(inscritos.doc(id), {
        id, tenantId: CASTELO_ID, atletaId: `atleta-${id}`,
        atletaNome: `Atleta ${id}`, kit: 'kit_prata', chipNumero: null,
        status: 'confirmado', modalidade: '10k', tamanhos: {},
        criadoEm: now, atualizadoEm: now,
      });
    }

    await batch.commit();
  }

  function campanhasCol() {
    return adminDb
      .collection('eventos').doc(EVENTO_ID).collection('campanhas');
  }

  function logsCol() {
    return adminDb
      .collection('eventos').doc(EVENTO_ID).collection('comunicacoes');
  }

  async function criarCampanha(
    id: string,
    overrides: Record<string, unknown> = {}
  ): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await campanhasCol().doc(id).set({
      id, tenantId: CASTELO_ID,
      titulo: `Campanha ${id}`,
      conteudo: 'Conteúdo de teste com mais de dez caracteres.',
      canal: ['push', 'email'],
      origem: 'manual',
      status: 'rascunho',
      segmento: {
        tipo: 'por_kit', referencia: 'kit_ouro',
        tamanhoEstimado: KIT_SEGMENTADOS,
      },
      alcance: 0,
      criadoEm: now, atualizadoEm: now,
      ...overrides,
    });
  }

  /** Semeia N campanhas push já ENVIADAS dentro da janela RN-133. */
  async function semearPushEnviadas(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      await criarCampanha(`push-antiga-${i}`, {
        status: 'enviado',
        enviadoEm: Timestamp.fromDate(
          new Date(AGORA.getTime() - (i + 1) * DIA_MS)
        ),
        alcance: 10,
      });
    }
  }

  const enviar = (campanhaId: string, caller = marina, eventoId = EVENTO_ID) =>
    enviarCampanhaCore(adminDb, { eventoId, campanhaId }, caller, AGORA);

  // ── Disparo feliz (aceite: 48 → alcance 48, logs por destinatário×canal) ─

  it('dispara p/ segmento de 48: carimba enviado+enviadoEm, alcance=48, log 48×2 SEM corpo', async () => {
    await criarCampanha('camp-kit');

    const r = await enviar('camp-kit');
    expect(r).toMatchObject({ ok: true, alcance: KIT_SEGMENTADOS, jaEnviada: false });

    const doc = await campanhasCol().doc('camp-kit').get();
    expect(doc.get('status')).toBe('enviado');
    expect(doc.get('enviadoEm')).toBeTruthy();
    expect(doc.get('alcance')).toBe(KIT_SEGMENTADOS);

    const logs = await logsCol().get();
    expect(logs.size).toBe(KIT_SEGMENTADOS * 2); // push + email por destinatário

    // docId determinístico RN-219: {inscritoRef}_{campanhaRef}_{canal}
    const docId = logComunicacaoDocId('insc-0001', 'camp-kit', 'push');
    expect(docId).toBe('insc-0001_camp-kit_push');
    const log = await logsCol().doc(docId).get();
    expect(log.exists).toBe(true);
    expect(log.get('status')).toBe('enfileirado');
    expect(log.get('tipo')).toBe('campanha');
    expect(log.get('campanhaRef')).toBe('camp-kit');
    expect(log.get('assunto')).toBe('Campanha camp-kit');
    // PII: log NUNCA carrega corpo (invariante FABLE-G preservada)
    for (const campo of ['corpo', 'conteudo', 'html', 'body']) {
      expect(log.get(campo)).toBeUndefined();
    }

    // Cancelados ficam FORA do fan-out
    const cancelado = await logsCol()
      .doc(logComunicacaoDocId('insc-0049', 'camp-kit', 'push')).get();
    expect(cancelado.exists).toBe(false);
  });

  it('todos_inscritos: alcance = recontagem REAL de ativos (não fotografia)', async () => {
    await criarCampanha('camp-todos', {
      canal: ['email'],
      segmento: { tipo: 'todos_inscritos', tamanhoEstimado: 999 },
    });

    const r = await enviar('camp-todos');
    // 48 kit_ouro ativos + 5 prata confirmados = 53 (fotografia 999 ignorada)
    expect(r).toMatchObject({ ok: true, alcance: 53 });

    const logs = await logsCol().get();
    expect(logs.size).toBe(53); // email-only: 1 canal
  });

  // ── ATAQUE: envio duplo (idempotência RN-219) ────────────────────────────

  it('ENVIO DUPLO → no-op: nenhum log duplicado, alcance intacto, cota intacta', async () => {
    await criarCampanha('camp-kit');

    const r1 = await enviar('camp-kit');
    expect(r1).toMatchObject({ ok: true, jaEnviada: false });
    const cotaAposPrimeiro = await contarPushNaJanelaColecao(
      campanhasCol(), AGORA
    );

    const r2 = await enviar('camp-kit');
    expect(r2).toMatchObject({
      ok: true, alcance: KIT_SEGMENTADOS, jaEnviada: true,
    });

    const logs = await logsCol().get();
    expect(logs.size).toBe(KIT_SEGMENTADOS * 2); // NENHUM duplicado

    const doc = await campanhasCol().doc('camp-kit').get();
    expect(doc.get('alcance')).toBe(KIT_SEGMENTADOS); // não inflou

    // Cota RN-133: reenvio não consome de novo (mesma 1 campanha na janela)
    expect(await contarPushNaJanelaColecao(campanhasCol(), AGORA)).toBe(
      cotaAposPrimeiro
    );
  });

  // ── RN-133: limite de push ───────────────────────────────────────────────

  it('5º push na janela → {bloqueado:limite_push}, NÃO carimba, ZERO logs', async () => {
    await semearPushEnviadas(4);
    await criarCampanha('camp-bloqueada');

    const r = await enviar('camp-bloqueada');
    expect(r).toEqual({ bloqueado: 'limite_push', pushNaJanela: 4 });

    const doc = await campanhasCol().doc('camp-bloqueada').get();
    expect(doc.get('status')).toBe('rascunho');
    expect(doc.get('enviadoEm')).toBeUndefined();
    expect(doc.get('alcance')).toBe(0);

    const logs = await logsCol().get();
    expect(logs.size).toBe(0); // bloqueio não gera nenhum registro
  });

  it('email-only NÃO consome cota (RN-131): envia mesmo com 4 push na janela', async () => {
    await semearPushEnviadas(4);
    await criarCampanha('camp-email', { canal: ['email'] });

    const r = await enviar('camp-email');
    expect(r).toMatchObject({ ok: true, alcance: KIT_SEGMENTADOS });
  });

  // ── ATAQUE: segmento vazio ───────────────────────────────────────────────

  it('segmento com 0 destinatários → {bloqueado:segmento_vazio}, não dispara', async () => {
    await criarCampanha('camp-vazia', {
      segmento: { tipo: 'por_modalidade', referencia: '42k' },
    });

    const r = await enviar('camp-vazia');
    expect(r).toEqual({ bloqueado: 'segmento_vazio' });

    const doc = await campanhasCol().doc('camp-vazia').get();
    expect(doc.get('status')).toBe('rascunho');
    expect((await logsCol().get()).size).toBe(0);
  });

  // ── ATAQUE: autorização / escopo ─────────────────────────────────────────

  it('cross-tenant → permission-denied; athlete → permission-denied', async () => {
    await criarCampanha('camp-kit');

    const invasor = {
      uid: 'uid-passo-owner',
      claims: { role: 'tenant_owner', tenantId: 'passo-certo' } as AuthClaims,
    };
    await expect(enviar('camp-kit', invasor)).rejects.toMatchObject({
      code: 'permission-denied',
    });

    const atleta = {
      uid: 'uid-atleta', claims: { role: 'athlete' } as AuthClaims,
    };
    await expect(enviar('camp-kit', atleta)).rejects.toMatchObject({
      code: 'permission-denied',
    });

    // Nada foi carimbado nem logado pelos ataques
    const doc = await campanhasCol().doc('camp-kit').get();
    expect(doc.get('status')).toBe('rascunho');
    expect((await logsCol().get()).size).toBe(0);
  });

  it('campanha de OUTRO evento (path não casa) → not-found', async () => {
    await criarCampanha('camp-kit'); // vive no EVENTO_ID, não no B
    await expect(
      enviar('camp-kit', marina, EVENTO_B_ID)
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('campanhaId com "_" (quebraria a chave RN-219) → failed-precondition ANTES de carimbar', async () => {
    await criarCampanha('camp_underscore');
    await expect(enviar('camp_underscore')).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    const doc = await campanhasCol().doc('camp_underscore').get();
    expect(doc.get('status')).toBe('rascunho');
  });

  // ── Agregado ∑ (fonte da aba Comunicação E06-L3) ─────────────────────────

  it('comunicacoesResumo recomputa com porTipo.campanha = fan-out', async () => {
    await criarCampanha('camp-kit');
    await enviar('camp-kit');

    const resumo = await recomputarResumoComunicacoes(adminDb, EVENTO_ID);
    expect(resumo).not.toBeNull();
    expect(resumo?.total).toBe(KIT_SEGMENTADOS * 2);
    expect(resumo?.porTipo.campanha).toBe(KIT_SEGMENTADOS * 2);
    expect(resumo?.porStatus.enfileirado).toBe(KIT_SEGMENTADOS * 2);
    expect(resumo?.porCanal.push).toBe(KIT_SEGMENTADOS);
    expect(resumo?.porCanal.email).toBe(KIT_SEGMENTADOS);
  });
});
