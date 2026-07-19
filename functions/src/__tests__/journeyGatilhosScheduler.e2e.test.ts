/**
 * journeyGatilhosScheduler.e2e.test.ts — LEELA-R4-E2E · J2
 *
 * E2E de EMULATOR do fluxo editorial automatizado com RELÓGIO controlado:
 * scheduler de campanhas agendadas + gatilhos de automação percorridos como
 * jornada, provando que TUDO passa pelo pipeline único de disparo
 * (`executarDisparoCampanha`, DIRECTIVE dos boards) — cota RN-133 e bloqueios
 * compartilhados entre os dois mecanismos.
 *
 * Controle de tempo: injeção de `Date` nos `*Core` (mesmo mecanismo das suítes
 * vigentes — o Emulator não sobe pubsub/cron; `LEELA_CLOCK` é do servidor de
 * preview, não do teste).
 *
 * Jornada (aceites do brief R4-E2E · J2 + decisão 17 · RN-136):
 *   S1. agendada devida DENTRO da tolerância (2 ciclos = 10min) dispara na
 *       janela certa e REEXECUÇÃO do cron não duplica;
 *   S2. agendada vencida ALÉM da tolerância vira estado TERMINAL 'vencido' e
 *       NÃO dispara (zero envio, zero cota);
 *   S3. gatilho de véspera dispara na véspera; kit_disponivel dispara e a 1ª
 *       janela é estado contínuo; pós no futuro fica fora da janela; replay
 *       não duplica;
 *   S4. gatilho de véspera VENCE quando passa (além da tolerância → automação
 *       desativada com vencidoEm); kit NÃO vence (janela aberta);
 *   S5. PIPELINE ÚNICO: 4 push disparados pelo SCHEDULER consomem a cota
 *       RN-133 e BLOQUEIAM o disparo de uma AUTOMAÇÃO push — ledger único.
 *
 * Comando (8GB — SÓ este arquivo, 1 emulator por vez):
 *   JAVA_HOME=$HOME/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *     --only firestore --project demo-leela \
 *     "cd functions && npx vitest run src/__tests__/journeyGatilhosScheduler.e2e.test.ts"
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
import { logComunicacaoDocId } from '@leela/core';
import { dispatchCampanhasAgendadasCore } from '../eventos/dispatchCampanhasAgendadas';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import {
  dispatchAutomacoesCore,
  processarNovoInscritoCore,
} from '../eventos/automacoesTriggers';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const MIN_MS = 60 * 1000;
const HORA_MS = 60 * MIN_MS;
const DIA_MS = 24 * HORA_MS;
const AGORA = new Date('2026-07-17T12:00:00Z');
/** Devida DENTRO da tolerância (2 ciclos = 10min): 4 min de atraso. */
const DEVIDA_DENTRO = new Date(AGORA.getTime() - 4 * MIN_MS);

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'evento-editorial-e2e';
const INSCRITOS = 4;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('J2 · Gatilhos + scheduler com relógio (LEELA-R4-E2E)', () => {
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
  }, 30_000);

  // SUITE-STAB: clear+seed com triggers pausados + canários verificados.
  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await seedVerified(db, testEnv, () => seed(), [
        `tenants/${CASTELO_ID}`,
        `eventos/${EVENTO_ID}`,
        `eventos/${EVENTO_ID}/inscritos/insc-0004`,
      ]);
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  const eventoRef = () => db.collection('eventos').doc(EVENTO_ID);
  const campanhas = () => eventoRef().collection('campanhas');
  const automacoes = () => eventoRef().collection('automacoes');
  const logs = () => eventoRef().collection('comunicacoes').get();

  async function seed(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo', slug: CASTELO_ID, status: 'ativo',
      ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
    });
    // data e janelasEntrega ajustados por teste; base = evento amanhã.
    batch.set(eventoRef(), {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
      nome: 'Evento Editorial', slug: EVENTO_ID, status: 'publicado',
      data: Timestamp.fromDate(new Date(AGORA.getTime() + 10 * DIA_MS)),
      modalidades: ['21k'], usaChip: false,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
    });
    for (let i = 1; i <= INSCRITOS; i++) {
      const id = `insc-${String(i).padStart(4, '0')}`;
      batch.set(eventoRef().collection('inscritos').doc(id), {
        id, tenantId: CASTELO_ID, atletaId: `atleta-${id}`,
        atletaNome: `Atleta ${id}`, kit: 'kit_ouro', chipNumero: null,
        status: 'confirmado', modalidade: '21k', tamanhos: {},
        criadoEm: now, atualizadoEm: now,
      });
    }
    await batch.commit();
  }

  async function criarCampanha(
    id: string, overrides: Record<string, unknown> = {}
  ): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await campanhas().doc(id).set({
      id, tenantId: CASTELO_ID, titulo: `Campanha ${id}`,
      conteudo: 'Conteúdo de teste com mais de dez caracteres.',
      canal: ['push', 'email'], origem: 'manual', status: 'agendado',
      agendadoPara: Timestamp.fromDate(DEVIDA_DENTRO),
      segmento: { tipo: 'todos_inscritos' }, alcance: 0,
      criadoEm: now, atualizadoEm: now, ...overrides,
    });
  }

  async function criarTemplate(
    id: string, overrides: Record<string, unknown> = {}
  ): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await campanhas().doc(id).set({
      id, tenantId: CASTELO_ID, titulo: `Automação ${id}`,
      conteudo: 'Conteúdo automatizado com mais de dez caracteres.',
      canal: ['push', 'email'], origem: 'automatizada', status: 'rascunho',
      segmento: { tipo: 'todos_inscritos' }, alcance: 0,
      criadoEm: now, atualizadoEm: now, ...overrides,
    });
  }

  async function criarAutomacao(
    id: string, gatilho: string, templateRef: string,
    overrides: Record<string, unknown> = {}
  ): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await automacoes().doc(id).set({
      id, tenantId: CASTELO_ID, gatilho, templateRef,
      canal: ['push', 'email'], ativa: true, disparos: 0,
      criadoEm: now, atualizadoEm: now, ...overrides,
    });
  }

  // ── S1 · agendada dispara na janela; replay não duplica ──────────────────

  it('S1: agendada devida dispara na janela certa e re-execução do cron não duplica', async () => {
    await criarCampanha('camp-na-janela');

    const r1 = await dispatchCampanhasAgendadasCore(db, AGORA);
    expect(r1).toMatchObject({ encontradas: 1, disparadas: 1, erros: 0 });

    const doc = await campanhas().doc('camp-na-janela').get();
    expect(doc.get('status')).toBe('enviado');
    expect(doc.get('enviadoEm')).toBeTruthy();
    expect(doc.get('alcance')).toBe(INSCRITOS);
    expect((await logs()).size).toBe(INSCRITOS * 2); // push + email
    // Log determinístico RN-219, sem corpo/PII.
    const log = await eventoRef().collection('comunicacoes')
      .doc(logComunicacaoDocId('insc-0001', 'camp-na-janela', 'push')).get();
    expect(log.exists).toBe(true);
    expect(log.get('corpo')).toBeUndefined();
    const carimbo = doc.get('enviadoEm');

    // Re-execução: já carimbada some da query — nada duplica.
    const r2 = await dispatchCampanhasAgendadasCore(db, AGORA);
    expect(r2).toMatchObject({ encontradas: 0, disparadas: 0 });
    const doc2 = await campanhas().doc('camp-na-janela').get();
    expect(doc2.get('enviadoEm')).toEqual(carimbo);
    expect((await logs()).size).toBe(INSCRITOS * 2);
  });

  // ── S2 · decisão 17: vencida além da tolerância → vencido terminal ───────

  it('S2: agendada vencida além da tolerância vira vencido terminal e NÃO dispara', async () => {
    await criarCampanha('camp-vencida', {
      agendadoPara: Timestamp.fromDate(new Date(AGORA.getTime() - HORA_MS)),
    });

    const r = await dispatchCampanhasAgendadasCore(db, AGORA);
    expect(r).toMatchObject({ encontradas: 1, vencidas: 1, disparadas: 0, erros: 0 });

    const doc = await campanhas().doc('camp-vencida').get();
    expect(doc.get('status')).toBe('vencido');
    expect(doc.get('vencidoEm')).toBeTruthy();
    expect(doc.get('enviadoEm')).toBeUndefined();
    expect(doc.get('alcance')).toBe(0);
    expect((await logs()).size).toBe(0); // nada saiu, nem cota

    // Replay: terminal sai da varredura, carimbo intacto.
    const carimbo = doc.get('vencidoEm');
    const r2 = await dispatchCampanhasAgendadasCore(db, AGORA);
    expect(r2).toMatchObject({ encontradas: 0, vencidas: 0, disparadas: 0 });
    expect(
      (await campanhas().doc('camp-vencida').get()).get('vencidoEm')
    ).toEqual(carimbo);
  });

  // ── S3 · gatilhos com relógio: véspera dispara, kit não vence, pós futuro ─

  it('S3: véspera dispara na véspera; kit dispara (janela aberta); pós fica no futuro; replay não duplica', async () => {
    // Evento em 24h−4min ⇒ véspera (offset 24h) devida há 4 min (dentro da
    // tolerância). Kit: janela abre hoje 08:00 (estado contínuo). Pós futuro.
    await eventoRef().update({
      data: Timestamp.fromDate(new Date(AGORA.getTime() + 24 * HORA_MS - 4 * MIN_MS)),
      janelasEntrega: [
        { dia: '2026-07-17', horaInicio: '08:00', horaFim: '18:00', local: 'Arena' },
      ],
    });
    await criarTemplate('tpl-vespera');
    await criarTemplate('tpl-kit');
    await criarTemplate('tpl-pos');
    await criarAutomacao('auto-vespera', 'vespera_evento', 'tpl-vespera');
    await criarAutomacao('auto-kit', 'kit_disponivel', 'tpl-kit');
    await criarAutomacao('auto-pos', 'pos_evento', 'tpl-pos');

    const r1 = await dispatchAutomacoesCore(db, AGORA);
    expect(r1).toMatchObject({
      encontradas: 3, disparadas: 2, foraDaJanela: 1, vencidas: 0, erros: 0,
    });
    expect((await campanhas().doc('tpl-vespera').get()).get('status')).toBe('enviado');
    expect((await campanhas().doc('tpl-kit').get()).get('status')).toBe('enviado');
    expect((await campanhas().doc('tpl-pos').get()).get('status')).toBe('rascunho');
    const totalLogs = (await logs()).size;
    expect(totalLogs).toBe(2 * INSCRITOS * 2); // 2 templates × N × 2 canais

    // Replay do cron: one-shot pelo carimbo, nada duplica.
    const r2 = await dispatchAutomacoesCore(db, AGORA);
    expect(r2).toMatchObject({ disparadas: 0, jaEnviadas: 2, erros: 0 });
    expect((await logs()).size).toBe(totalLogs);
  });

  // ── S4 · decisão 17 nos gatilhos: véspera vence, kit não ─────────────────

  it('S4: véspera vencida além da tolerância desativa (vence quando passa); kit não vence', async () => {
    // Evento em +20h ⇒ véspera (24h antes) venceu há 4h — muito além dos 10min.
    await eventoRef().update({
      data: Timestamp.fromDate(new Date(AGORA.getTime() + 20 * HORA_MS)),
      janelasEntrega: [
        { dia: '2026-07-17', horaInicio: '08:00', horaFim: '18:00', local: 'Arena' },
      ],
    });
    await criarTemplate('tpl-vespera-venc');
    await criarTemplate('tpl-kit-tarde');
    await criarAutomacao('auto-vespera-venc', 'vespera_evento', 'tpl-vespera-venc');
    await criarAutomacao('auto-kit-tarde', 'kit_disponivel', 'tpl-kit-tarde');

    const r = await dispatchAutomacoesCore(db, AGORA);
    expect(r).toMatchObject({ vencidas: 1, disparadas: 1, erros: 0 });

    // Véspera: desativada com carimbo, template intacto.
    const auto = await automacoes().doc('auto-vespera-venc').get();
    expect(auto.get('ativa')).toBe(false);
    expect(auto.get('vencidoEm')).toBeTruthy();
    expect((await campanhas().doc('tpl-vespera-venc').get()).get('status')).toBe('rascunho');
    // Kit (estado contínuo): dispara, NÃO vence.
    const autoKit = await automacoes().doc('auto-kit-tarde').get();
    expect(autoKit.get('ativa')).toBe(true);
    expect(autoKit.get('vencidoEm')).toBeUndefined();
    expect((await campanhas().doc('tpl-kit-tarde').get()).get('status')).toBe('enviado');
    expect((await logs()).size).toBe(INSCRITOS * 2); // só o kit

    // Replay: a desativada saiu da varredura; carimbo intacto.
    const r2 = await dispatchAutomacoesCore(db, AGORA);
    expect(r2).toMatchObject({ vencidas: 0, disparadas: 0 });
    expect(
      (await automacoes().doc('auto-vespera-venc').get()).get('vencidoEm')
    ).toEqual(auto.get('vencidoEm'));
  });

  // ── S5 · pipeline único: cota RN-133 compartilhada scheduler ↔ automação ──

  it('S5: 4 push disparados pelo SCHEDULER esgotam a cota e BLOQUEIAM a AUTOMAÇÃO push (ledger único)', async () => {
    // 4 campanhas push agendadas devidas na janela → disparam pelo pipeline.
    for (let i = 1; i <= 4; i++) {
      await criarCampanha(`sched-push-${i}`, { canal: ['push'] });
    }
    const rSched = await dispatchCampanhasAgendadasCore(db, AGORA);
    expect(rSched).toMatchObject({ encontradas: 4, disparadas: 4, erros: 0 });
    expect((await logs()).size).toBe(INSCRITOS * 4); // 4 campanhas × N × push

    // Automação push (novo_inscrito) agora bate no teto RN-133 da MESMA janela
    // — prova que o scheduler e a automação compartilham o mesmo ledger de cota.
    await criarTemplate('tpl-auto-push', { canal: ['push'] });
    await criarAutomacao('auto-push', 'novo_inscrito', 'tpl-auto-push', {
      canal: ['push'],
    });
    const rAuto = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(rAuto.disparos).toBe(0); // bloqueada pela cota consumida pelo scheduler
    expect((await campanhas().doc('tpl-auto-push').get()).get('status')).toBe('rascunho');
    expect((await logs()).size).toBe(INSCRITOS * 4); // nada novo saiu
  });
});
