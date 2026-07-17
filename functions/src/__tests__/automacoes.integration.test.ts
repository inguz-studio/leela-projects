/**
 * automacoes.integration.test.ts — LEELA-O3-L3B-S402T1 (E06 · gatilhos)
 * (⚠️ EXIGE Firestore 8080 no Emulator — projectId demo-leela.)
 *
 * Gatilhos de automação REUSANDO `executarDisparoCampanha` (DIRECTIVE dos
 * boards — pipeline único endurecido em 23bc077). Invariantes:
 *   A1. novo_inscrito ATIVA dispara: template 'enviado' + logs RN-219 +
 *       ∑ disparos por recontagem; REPLAY não duplica (idempotente).
 *   A2. Inscrito NOVO confirma depois: fan-out curador registra SÓ o log
 *       dele — idempotência por (automação, alvo); disparos cresce.
 *   A3. Automação PAUSADA nunca dispara.
 *   A4. Cota RN-133: 4 push na janela ⇒ bloqueia (template NÃO carimba,
 *       cota não fura — mesma disciplina do scheduler).
 *   A5. Tenant suspenso (RN-402) não dispara.
 *   A6. Cron de relógio: vespera_evento devida DENTRO da tolerância (2
 *       ciclos — decisão 17) dispara; pos_evento no futuro fica fora da
 *       janela; kit_disponivel dispara quando a 1ª janela de entrega abre;
 *       REPLAY do cron = jaEnviadas, nada duplica.
 *   A7. Rules: writer configura; ∑ disparos é intocável (create>0 e update
 *       negados); gatilho fora do enum negado; promoter não escreve;
 *       carimbo `vencidoEm` é exclusivo de Function (RN-136).
 *   A8. Decisão 17 (RN-136): vespera/pos vencidos ALÉM da tolerância NÃO
 *       disparam — automação desativada (ativa=false + vencidoEm), template
 *       intacto; kit_disponivel NÃO vence (estado contínuo); replay no-op.
 *
 * Comando (8GB — SÓ este arquivo):
 *   JAVA_HOME=$HOME/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *     --only firestore,auth --project demo-leela \
 *     "cd functions && npx vitest run src/__tests__/automacoes.integration.test.ts"
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
import * as admin from 'firebase-admin';
import { doc as clientDoc, setDoc, updateDoc } from 'firebase/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  dispatchAutomacoesCore,
  momentoDaAutomacao,
  processarNovoInscritoCore,
} from '../eventos/automacoesTriggers';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'evento-automacoes';
const AGORA = new Date('2026-07-17T12:00:00Z');
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('automações por gatilho — S402-T1 (O3-L3B)', () => {
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
    // 30s: initializeTestEnvironment contra JVM fria do Emulator flakeia no
    // default de 10s desta máquina (observado em runs alternados D17).
  }, 30_000);

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seed();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  const eventoRef = () => db.collection('eventos').doc(EVENTO_ID);

  async function seed(inscritos = 3): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo', slug: CASTELO_ID, status: 'ativo',
      ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef(), {
      id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
      nome: 'Evento Automações', slug: EVENTO_ID, status: 'publicado',
      data: Timestamp.fromDate(new Date(AGORA.getTime() + 10 * DIA_MS)),
      modalidades: ['21k'], usaChip: false,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
    });
    for (let i = 1; i <= inscritos; i++) {
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

  async function criarTemplate(
    id: string,
    overrides: Record<string, unknown> = {}
  ): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await eventoRef().collection('campanhas').doc(id).set({
      id, tenantId: CASTELO_ID,
      titulo: `Automação ${id}`,
      conteudo: 'Conteúdo automatizado com mais de dez caracteres.',
      canal: ['push', 'email'],
      origem: 'automatizada',
      status: 'rascunho',
      segmento: { tipo: 'todos_inscritos' },
      alcance: 0,
      criadoEm: now, atualizadoEm: now,
      ...overrides,
    });
  }

  async function criarAutomacao(
    id: string,
    gatilho: string,
    templateRef: string,
    overrides: Record<string, unknown> = {}
  ): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await eventoRef().collection('automacoes').doc(id).set({
      id, tenantId: CASTELO_ID, gatilho, templateRef,
      canal: ['push', 'email'], ativa: true, disparos: 0,
      criadoEm: now, atualizadoEm: now,
      ...overrides,
    });
  }

  const logs = () => eventoRef().collection('comunicacoes').get();

  // ── A1/A2 · novo_inscrito ───────────────────────────────────────────────

  it('A1: novo_inscrito dispara via pipeline único; replay não duplica; ∑ por recontagem', async () => {
    await criarTemplate('tpl-boasvindas');
    await criarAutomacao('auto-novo', 'novo_inscrito', 'tpl-boasvindas');

    const r1 = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(r1).toMatchObject({ automacoes: 1, disparos: 1, erros: 0 });

    const tpl = await eventoRef().collection('campanhas').doc('tpl-boasvindas').get();
    expect(tpl.get('status')).toBe('enviado'); // carimbo do pipeline único
    expect(tpl.get('alcance')).toBe(3);

    const l1 = await logs();
    expect(l1.size).toBe(6); // 3 inscritos × 2 canais, docId determinístico
    const auto = await eventoRef().collection('automacoes').doc('auto-novo').get();
    expect(auto.get('disparos')).toBe(6);

    // REPLAY (redelivery do trigger) — nada duplica
    const r2 = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(r2.erros).toBe(0);
    expect((await logs()).size).toBe(6);
    expect(
      (await eventoRef().collection('automacoes').doc('auto-novo').get()).get('disparos')
    ).toBe(6);
  });

  it('A2: inscrito novo confirmado depois → fan-out curador registra SÓ o alvo novo', async () => {
    await criarTemplate('tpl-boasvindas');
    await criarAutomacao('auto-novo', 'novo_inscrito', 'tpl-boasvindas');
    await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect((await logs()).size).toBe(6);

    // 4º inscrito confirma (o que o trigger onWrite observaria)
    const now = FieldValue.serverTimestamp();
    await eventoRef().collection('inscritos').doc('insc-0004').set({
      id: 'insc-0004', tenantId: CASTELO_ID, atletaId: 'atleta-4',
      atletaNome: 'Atleta 4', kit: 'kit_ouro', chipNumero: null,
      status: 'confirmado', modalidade: '21k', tamanhos: {},
      criadoEm: now, atualizadoEm: now,
    });

    const r = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(r.disparos).toBe(1); // ja_enviada + cura incremental
    expect((await logs()).size).toBe(8); // +1 inscrito × 2 canais
    const auto = await eventoRef().collection('automacoes').doc('auto-novo').get();
    expect(auto.get('disparos')).toBe(8);
  });

  // ── A3/A4/A5 · pausada, cota, tenant ────────────────────────────────────

  it('A3: automação pausada NUNCA dispara', async () => {
    await criarTemplate('tpl-pausada');
    await criarAutomacao('auto-pausada', 'novo_inscrito', 'tpl-pausada', {
      ativa: false,
    });
    const r = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(r).toMatchObject({ automacoes: 0, disparos: 0 });
    expect((await logs()).size).toBe(0);
    const tpl = await eventoRef().collection('campanhas').doc('tpl-pausada').get();
    expect(tpl.get('status')).toBe('rascunho');
  });

  it('A4: cota RN-133 (4 push na janela) bloqueia o disparo — template não carimba', async () => {
    // 4 campanhas push JÁ enviadas na janela de 7d
    const now = FieldValue.serverTimestamp();
    for (let i = 1; i <= 4; i++) {
      await eventoRef().collection('campanhas').doc(`push-${i}`).set({
        id: `push-${i}`, tenantId: CASTELO_ID, titulo: `Push ${i} enviada`,
        conteudo: 'Conteúdo com mais de dez caracteres.', canal: ['push'],
        origem: 'manual', status: 'enviado',
        enviadoEm: Timestamp.fromDate(new Date(AGORA.getTime() - HORA_MS)),
        segmento: { tipo: 'todos_inscritos' }, alcance: 3,
        criadoEm: now, atualizadoEm: now,
      });
    }
    await criarTemplate('tpl-bloq', { canal: ['push'] });
    await criarAutomacao('auto-bloq', 'novo_inscrito', 'tpl-bloq', {
      canal: ['push'],
    });

    const r = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(r.disparos).toBe(0);
    const tpl = await eventoRef().collection('campanhas').doc('tpl-bloq').get();
    expect(tpl.get('status')).toBe('rascunho'); // não carimbou, não consumiu
  });

  it('A5: tenant suspenso (RN-402) não dispara', async () => {
    await criarTemplate('tpl-susp');
    await criarAutomacao('auto-susp', 'novo_inscrito', 'tpl-susp');
    await db.collection('tenants').doc(CASTELO_ID).update({ status: 'suspenso' });

    const r = await processarNovoInscritoCore(db, EVENTO_ID, AGORA);
    expect(r.disparos).toBe(0);
    expect((await logs()).size).toBe(0);
  });

  // ── A6 · cron de relógio ────────────────────────────────────────────────

  it('A6: vespera devida DENTRO da tolerância dispara; pos futuro fica fora; kit_disponivel segue a 1ª janela; replay não duplica', async () => {
    // Decisão 17: a janela de disparo pontual é (agora−10min, agora].
    // Evento em 24h−4min ⇒ vespera (offset 24h) ficou devida há 4 min —
    // DENTRO da tolerância ⇒ dispara. Kit: janela abriu 08:00 local de hoje
    // (estado contínuo — sem vencimento). Pós fica no futuro.
    const MIN_MS = 60 * 1000;
    await eventoRef().update({
      data: Timestamp.fromDate(
        new Date(AGORA.getTime() + 24 * HORA_MS - 4 * MIN_MS)
      ),
      janelasEntrega: [
        { dia: '2026-07-17', horaInicio: '08:00', horaFim: '18:00', local: 'Arena' },
      ],
    });
    await criarTemplate('tpl-vespera');
    await criarTemplate('tpl-pos');
    await criarTemplate('tpl-kit');
    await criarAutomacao('auto-vespera', 'vespera_evento', 'tpl-vespera');
    await criarAutomacao('auto-pos', 'pos_evento', 'tpl-pos');
    await criarAutomacao('auto-kit', 'kit_disponivel', 'tpl-kit');

    const r1 = await dispatchAutomacoesCore(db, AGORA);
    expect(r1).toMatchObject({
      encontradas: 3, disparadas: 2, foraDaJanela: 1, vencidas: 0, erros: 0,
    });
    expect(
      (await eventoRef().collection('campanhas').doc('tpl-vespera').get()).get('status')
    ).toBe('enviado');
    expect(
      (await eventoRef().collection('campanhas').doc('tpl-pos').get()).get('status')
    ).toBe('rascunho');
    const logsAntes = (await logs()).size;
    expect(logsAntes).toBe(12); // 2 templates × 3 inscritos × 2 canais

    // REPLAY do cron — one-shot pelo carimbo; nada duplica
    const r2 = await dispatchAutomacoesCore(db, AGORA);
    expect(r2).toMatchObject({ disparadas: 0, jaEnviadas: 2, erros: 0 });
    expect((await logs()).size).toBe(logsAntes);

    // Pós-evento fica devido com o relógio adiante: momento = evento+24h =
    // AGORA+48h−4min; em AGORA+48h está 4 min devido (dentro da tolerância).
    const depois = new Date(AGORA.getTime() + 48 * HORA_MS);
    const r3 = await dispatchAutomacoesCore(db, depois);
    expect(r3.disparadas).toBe(1);
    expect(
      (await eventoRef().collection('campanhas').doc('tpl-pos').get()).get('status')
    ).toBe('enviado');
  });

  // ── A8 · decisão 17 (RN-136): relógio pontual vencido não dispara ───────

  it('A8: vespera vencida ALÉM da tolerância NÃO dispara — desativa com vencidoEm; kit não vence; replay no-op', async () => {
    // Evento amanhã (+20h) ⇒ vespera (24h antes) venceu há 4 HORAS — muito
    // além dos 10 min de tolerância. Kit: janela aberta desde 08:00 local
    // (horas atrás) — dispara mesmo assim (estado contínuo, premissa).
    await eventoRef().update({
      data: Timestamp.fromDate(new Date(AGORA.getTime() + 20 * HORA_MS)),
      janelasEntrega: [
        { dia: '2026-07-17', horaInicio: '08:00', horaFim: '18:00', local: 'Arena' },
      ],
    });
    await criarTemplate('tpl-vespera-venc');
    await criarTemplate('tpl-kit-tarde');
    await criarTemplate('tpl-pos-futuro');
    await criarAutomacao('auto-vespera-venc', 'vespera_evento', 'tpl-vespera-venc');
    await criarAutomacao('auto-kit-tarde', 'kit_disponivel', 'tpl-kit-tarde');
    await criarAutomacao('auto-pos-futuro', 'pos_evento', 'tpl-pos-futuro');

    const r1 = await dispatchAutomacoesCore(db, AGORA);
    expect(r1).toMatchObject({
      encontradas: 3, vencidas: 1, disparadas: 1, foraDaJanela: 1, erros: 0,
    });

    // Automação vencida: DESATIVADA com carimbo; template intacto; zero envio
    const auto = await eventoRef()
      .collection('automacoes').doc('auto-vespera-venc').get();
    expect(auto.get('ativa')).toBe(false);
    expect(auto.get('vencidoEm')).toBeTruthy();
    const tpl = await eventoRef()
      .collection('campanhas').doc('tpl-vespera-venc').get();
    expect(tpl.get('status')).toBe('rascunho'); // NUNCA carimbou
    expect(tpl.get('alcance')).toBe(0);

    // Kit (sem vencimento) foi o ÚNICO a disparar
    expect(
      (await eventoRef().collection('campanhas').doc('tpl-kit-tarde').get()).get('status')
    ).toBe('enviado');
    expect((await logs()).size).toBe(6); // só o kit: 3 inscritos × 2 canais

    // REPLAY: a desativada saiu da varredura (ativa=false); nada muda
    const r2 = await dispatchAutomacoesCore(db, AGORA);
    expect(r2).toMatchObject({ encontradas: 2, vencidas: 0, disparadas: 0 });
    expect((await logs()).size).toBe(6);
    expect(
      (await eventoRef().collection('automacoes').doc('auto-vespera-venc').get()).get('vencidoEm')
    ).toEqual(auto.get('vencidoEm')); // carimbo intacto
  });

  it('momentoDaAutomacao (puro): véspera/pós por offset; kit pela 1ª janela; null sem insumo', () => {
    const dataEvento = new Date('2026-08-01T12:00:00Z');
    expect(
      momentoDaAutomacao('vespera_evento', dataEvento, [], 24)?.toISOString()
    ).toBe('2026-07-31T12:00:00.000Z');
    expect(
      momentoDaAutomacao('pos_evento', dataEvento, [], 48)?.toISOString()
    ).toBe('2026-08-03T12:00:00.000Z');
    expect(momentoDaAutomacao('vespera_evento', null, [])).toBeNull();
    expect(momentoDaAutomacao('kit_disponivel', dataEvento, [])).toBeNull();
    const kit = momentoDaAutomacao('kit_disponivel', null, [
      { dia: '2026-07-30', horaInicio: '10:00', horaFim: '18:00', local: 'A' },
      { dia: '2026-07-29', horaInicio: '09:00', horaFim: '18:00', local: 'B' },
    ]);
    // 1ª janela ORDENADA (29/07 09:00 em America/Sao_Paulo = 12:00Z)
    expect(kit?.toISOString()).toBe('2026-07-29T12:00:00.000Z');
  });

  // ── A7 · Rules ──────────────────────────────────────────────────────────

  it('A7: writer configura; ∑ disparos intocável; enum fechado; promoter não escreve', async () => {
    await criarTemplate('tpl-rules');
    const owner = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    const promoter = testEnv
      .authenticatedContext('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID })
      .firestore();
    const path = (id: string) => `eventos/${EVENTO_ID}/automacoes/${id}`;
    const base = {
      tenantId: CASTELO_ID, gatilho: 'novo_inscrito',
      templateRef: 'tpl-rules', canal: ['push'], ativa: true,
    };

    // Writer cria (disparos ausente/0)
    await assertSucceeds(setDoc(clientDoc(owner, path('a1')), { ...base }));
    // Toggle persiste
    await assertSucceeds(updateDoc(clientDoc(owner, path('a1')), {
      tenantId: CASTELO_ID, gatilho: 'novo_inscrito',
      templateRef: 'tpl-rules', canal: ['push'], ativa: false,
    }));
    // ∑ disparos forjado no create — NEGADO
    await assertFails(
      setDoc(clientDoc(owner, path('a2')), { ...base, disparos: 99 })
    );
    // ∑ disparos tocado no update — NEGADO
    await assertFails(
      updateDoc(clientDoc(owner, path('a1')), {
        tenantId: CASTELO_ID, gatilho: 'novo_inscrito',
        templateRef: 'tpl-rules', canal: ['push'], ativa: true, disparos: 5,
      })
    );
    // Gatilho fora do enum — NEGADO
    await assertFails(
      setDoc(clientDoc(owner, path('a3')), { ...base, gatilho: 'custom_hack' })
    );
    // Carimbo `vencidoEm` forjado no create — NEGADO (RN-136, só o cron)
    await assertFails(
      setDoc(clientDoc(owner, path('a6')), {
        ...base,
        vencidoEm: new Date(),
      })
    );
    // Update tocando `vencidoEm` — NEGADO
    await assertFails(
      updateDoc(clientDoc(owner, path('a1')), {
        tenantId: CASTELO_ID, gatilho: 'novo_inscrito',
        templateRef: 'tpl-rules', canal: ['push'], ativa: true,
        vencidoEm: new Date(),
      })
    );
    // Offset em gatilho não-relógio — NEGADO
    await assertFails(
      setDoc(clientDoc(owner, path('a4')), { ...base, offsetHoras: 24 })
    );
    // Promoter — NEGADO
    await assertFails(setDoc(clientDoc(promoter, path('a5')), { ...base }));
  });
});
