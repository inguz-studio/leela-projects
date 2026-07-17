/**
 * dispatchCampanhasAgendadas.integration.test.ts — LEELA-SCHED-T1 (Onda 3 ·
 * Lote 4 · ADR-015)
 *
 * Integração (Firestore Emulator, Admin SDK — padrão ADR-015: testa o
 * `*Core` direto, o Emulator não sobe pubsub): varredura de campanhas
 * `agendado` vencidas + disparo REUSANDO o pipeline E06.
 *
 * Cobre (aceites do brief O3-L4):
 *   - agendada VENCIDA dispara na janela: agendado→enviado + enviadoEm +
 *     alcance + logs deterministicos (RN-219), SEM corpo (PII);
 *   - agendada NO FUTURO não dispara (fora da janela);
 *   - rascunho/enviado não entram na varredura;
 *   - REPLAY do cron não duplica (logs/alcance/carimbo intactos);
 *   - corrida cron×manual: campanha já enviada pelo caminho manual conta
 *     como jaEnviada e não re-dispara;
 *   - limite RN-133 (4 push na janela): campanha FICA 'agendado'
 *     (bloqueadasLimite) — retry natural; cota não é furada pelo cron;
 *   - tenant suspenso (RN-402): não dispara, fica 'agendado';
 *   - campanha envenenada (id incompatível com a chave do log) não derruba
 *     o lote (erros isolados).
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
import { dispatchCampanhasAgendadasCore } from '../eventos/dispatchCampanhasAgendadas';
import { enviarCampanhaCore } from '../eventos/enviarCampanha';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const AGORA = new Date('2026-07-10T12:00:00Z');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'evento-sched-campanhas';
const INSCRITOS = 6;

const marina = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('dispatchCampanhasAgendadas — cron ADR-015 (SCHED-T1)', () => {
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
    batch.set(adminDb.collection('eventos').doc(EVENTO_ID), {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
      nome: 'Evento Sched', slug: EVENTO_ID, status: 'publicado',
      qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });

    const inscritos = adminDb
      .collection('eventos').doc(EVENTO_ID).collection('inscritos');
    for (let i = 1; i <= INSCRITOS; i++) {
      const id = `insc-${String(i).padStart(4, '0')}`;
      batch.set(inscritos.doc(id), {
        id, tenantId: CASTELO_ID, atletaId: `atleta-${id}`,
        atletaNome: `Atleta ${id}`, kit: 'kit_ouro', chipNumero: null,
        status: 'confirmado', modalidade: '21k', tamanhos: {},
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
      status: 'agendado',
      agendadoPara: Timestamp.fromDate(new Date(AGORA.getTime() - HORA_MS)),
      segmento: { tipo: 'todos_inscritos' },
      alcance: 0,
      criadoEm: now, atualizadoEm: now,
      ...overrides,
    });
  }

  const rodarCron = () => dispatchCampanhasAgendadasCore(adminDb, AGORA);

  // ── Janela: vencida dispara, futura não ─────────────────────────────────

  it('agendada VENCIDA dispara: agendado→enviado + alcance + logs RN-219 sem corpo', async () => {
    await criarCampanha('camp-vencida');

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 1, disparadas: 1, erros: 0 });

    const doc = await campanhasCol().doc('camp-vencida').get();
    expect(doc.get('status')).toBe('enviado');
    expect(doc.get('enviadoEm')).toBeTruthy();
    expect(doc.get('alcance')).toBe(INSCRITOS);

    const logs = await logsCol().get();
    expect(logs.size).toBe(INSCRITOS * 2); // push + email por destinatário

    const log = await logsCol()
      .doc(logComunicacaoDocId('insc-0001', 'camp-vencida', 'push'))
      .get();
    expect(log.exists).toBe(true);
    // PII: o log NUNCA carrega corpo nem nome — só assunto truncado + refs
    expect(log.get('corpo')).toBeUndefined();
    expect(log.get('conteudo')).toBeUndefined();
    expect(log.get('atletaNome')).toBeUndefined();
    expect(log.get('assunto')).toBe('Campanha camp-vencida');
  });

  it('agendada NO FUTURO não dispara (fora da janela)', async () => {
    await criarCampanha('camp-futura', {
      agendadoPara: Timestamp.fromDate(new Date(AGORA.getTime() + 2 * HORA_MS)),
    });

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 0, disparadas: 0 });

    const doc = await campanhasCol().doc('camp-futura').get();
    expect(doc.get('status')).toBe('agendado');
    expect((await logsCol().get()).size).toBe(0);
  });

  it('rascunho e enviado não entram na varredura', async () => {
    await criarCampanha('camp-rascunho', { status: 'rascunho' });
    await criarCampanha('camp-ja-enviada', {
      status: 'enviado',
      enviadoEm: Timestamp.fromDate(new Date(AGORA.getTime() - DIA_MS)),
      alcance: 3,
    });

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 0, disparadas: 0 });
    expect((await logsCol().get()).size).toBe(0);
  });

  // ── Idempotência: replay/redelivery não duplica ─────────────────────────

  it('REPLAY do cron não duplica: logs, alcance e carimbo intactos', async () => {
    await criarCampanha('camp-replay');

    const r1 = await rodarCron();
    expect(r1).toMatchObject({ disparadas: 1 });
    const carimbo = (await campanhasCol().doc('camp-replay').get()).get('enviadoEm');

    const r2 = await rodarCron();
    // Já carimbada ⇒ some da query (status != 'agendado')
    expect(r2).toMatchObject({ encontradas: 0, disparadas: 0 });

    const doc = await campanhasCol().doc('camp-replay').get();
    expect(doc.get('alcance')).toBe(INSCRITOS);
    expect(doc.get('enviadoEm')).toEqual(carimbo);
    expect((await logsCol().get()).size).toBe(INSCRITOS * 2);
  });

  it('corrida cron×manual: enviada manualmente entre a query e o disparo → jaEnviada, sem duplicar', async () => {
    await criarCampanha('camp-corrida');
    // Caminho manual dispara primeiro (mesmo pipeline)
    const manual = await enviarCampanhaCore(
      adminDb,
      { eventoId: EVENTO_ID, campanhaId: 'camp-corrida' },
      marina,
      AGORA
    );
    expect(manual).toMatchObject({ ok: true, jaEnviada: false });

    // Simula o cron que JÁ tinha varrido antes do carimbo: chama o disparo
    // de novo — o envelope serializa e cai em 'ja_enviado'.
    await campanhasCol().doc('camp-corrida').update({ status: 'agendado' });
    // (doc voltou a 'agendado' à força SÓ para entrar na query — o envelope
    //  re-carimba na mesma tx sem refazer fan-out duplicado)
    const r = await rodarCron();
    expect(r.erros).toBe(0);
    expect((await logsCol().get()).size).toBe(INSCRITOS * 2); // nada duplicou
  });

  // ── Limite RN-133 ───────────────────────────────────────────────────────

  it('limite RN-133: 4 push na janela ⇒ campanha fica agendado (bloqueadasLimite)', async () => {
    for (let i = 0; i < 4; i++) {
      await criarCampanha(`push-antiga-${i}`, {
        status: 'enviado',
        enviadoEm: Timestamp.fromDate(new Date(AGORA.getTime() - (i + 1) * DIA_MS)),
        alcance: 2,
      });
    }
    await criarCampanha('camp-bloqueada');

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 1, disparadas: 0, bloqueadasLimite: 1 });

    const doc = await campanhasCol().doc('camp-bloqueada').get();
    expect(doc.get('status')).toBe('agendado'); // retry natural
    expect(doc.get('enviadoEm')).toBeUndefined();
    expect((await logsCol().get()).size).toBe(0);
  });

  // ── RN-402: tenant não-ativo ────────────────────────────────────────────

  it('tenant suspenso não dispara comunicação (fica agendado)', async () => {
    await criarCampanha('camp-suspensa');
    await adminDb.collection('tenants').doc(CASTELO_ID).update({ status: 'suspenso' });

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 1, disparadas: 0, tenantInativo: 1 });

    const doc = await campanhasCol().doc('camp-suspensa').get();
    expect(doc.get('status')).toBe('agendado');
    expect((await logsCol().get()).size).toBe(0);
  });

  // ── Anti-TOCTOU (fix review O3-L4 #1) ───────────────────────────────────

  it('TOCTOU: campanha revertida p/ rascunho entre a query e a tx NÃO envia', async () => {
    // Simula a janela: o guarda roda no snap FRESCO dentro da tx — chamamos
    // o disparo do cron (exigirAgendadoVencido) contra um doc que já não
    // está 'agendado' (equivale ao organizador ter retirado a campanha
    // depois da varredura).
    await criarCampanha('camp-retirada', { status: 'rascunho' });
    const { executarDisparoCampanha } = await import('../eventos/enviarCampanha');

    const r = await executarDisparoCampanha(
      adminDb,
      adminDb.collection('eventos').doc(EVENTO_ID),
      'camp-retirada',
      CASTELO_ID,
      AGORA,
      { exigirAgendadoVencido: true }
    );
    expect(r).toEqual({ bloqueado: 'nao_elegivel' });

    const doc = await campanhasCol().doc('camp-retirada').get();
    expect(doc.get('status')).toBe('rascunho'); // NÃO carimbou
    expect(doc.get('enviadoEm')).toBeUndefined();
    expect((await logsCol().get()).size).toBe(0); // NADA enviado
  });

  it('TOCTOU: campanha ADIADA (agendadoPara empurrado) entre a query e a tx NÃO envia', async () => {
    await criarCampanha('camp-adiada', {
      agendadoPara: Timestamp.fromDate(new Date(AGORA.getTime() + 7 * DIA_MS)),
    });
    const { executarDisparoCampanha } = await import('../eventos/enviarCampanha');

    const r = await executarDisparoCampanha(
      adminDb,
      adminDb.collection('eventos').doc(EVENTO_ID),
      'camp-adiada',
      CASTELO_ID,
      AGORA,
      { exigirAgendadoVencido: true }
    );
    expect(r).toEqual({ bloqueado: 'nao_elegivel' });
    expect((await campanhasCol().doc('camp-adiada').get()).get('status')).toBe('agendado');
    expect((await logsCol().get()).size).toBe(0);
  });

  it('disparo MANUAL (callable) segue sem a guarda: rascunho envia pelo botão', async () => {
    await criarCampanha('camp-manual', { status: 'rascunho' });
    const r = await enviarCampanhaCore(
      adminDb,
      { eventoId: EVENTO_ID, campanhaId: 'camp-manual' },
      marina,
      AGORA
    );
    expect(r).toMatchObject({ ok: true, jaEnviada: false });
  });

  // ── Evento órfão (fix review O3-L4 #5/#6) ───────────────────────────────

  it('campanha sob evento INEXISTENTE não dispara nem carimba (órfã de delete)', async () => {
    const orfa = adminDb
      .collection('eventos').doc('evento-deletado')
      .collection('campanhas').doc('camp-orfa');
    await orfa.set({
      id: 'camp-orfa', tenantId: CASTELO_ID,
      titulo: 'Campanha órfã', conteudo: 'Conteúdo com dez+ caracteres.',
      canal: ['email'], origem: 'manual', status: 'agendado',
      agendadoPara: Timestamp.fromDate(new Date(AGORA.getTime() - HORA_MS)),
      segmento: { tipo: 'todos_inscritos' }, alcance: 0,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 1, disparadas: 0, erros: 1 });
    expect((await orfa.get()).get('status')).toBe('agendado'); // NÃO virou 'enviado' mentiroso
  });

  // ── Isolamento de erro ──────────────────────────────────────────────────

  it('campanha com id incompatível com a chave do log não derruba o lote', async () => {
    await criarCampanha('camp_id_invalido'); // '_' quebra a chave RN-219
    await criarCampanha('camp-valida');

    const r = await rodarCron();
    expect(r).toMatchObject({ encontradas: 2, disparadas: 1, erros: 1 });

    expect((await campanhasCol().doc('camp-valida').get()).get('status')).toBe('enviado');
    expect((await campanhasCol().doc('camp_id_invalido').get()).get('status')).toBe('agendado');
  });
});
