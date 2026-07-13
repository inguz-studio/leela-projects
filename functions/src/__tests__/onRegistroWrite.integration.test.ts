/**
 * onRegistroWrite.integration.test.ts — LEELA-S1307-T1 (E13 adiantado · T2-L2)
 *
 * Integração (Firestore Emulator, Admin SDK — padrão triggers v1): chama o
 * núcleo recomputarParticipacao direto (o Emulator não sobe o runtime de
 * Functions; o trigger é wrapper fino sobre este núcleo).
 *
 * Aceites do brief:
 *   - 3 pilares no dia ⇒ +20%; 5+ dias na semana ⇒ +10%; acumulam;
 *   - REPROCESSAR o mesmo registro (retry at-least-once) ⇒ pontos NÃO mudam;
 *   - ∑ do desafio: qtdParticipantes por recontagem, progressoPct;
 *   - antagonistas: registro fora da janela não conta; registro de outro
 *     desafio não vaza; SEM participação não materializa agregado
 *     (anti-spoof); registro inválido vs. catálogo é ignorado;
 *   - seeds (participantes + registros) idempotentes.
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  recomputarParticipacao,
} from '../jornada/onRegistroWrite';
import { seedRegistros, ATLETA_ALINE_UID, ATLETA_BRUNO_UID } from '../seed/registros.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CLUBE = 'clube-teste';
const TENANT = 'castelo-producoes';
const DESAFIO = 'desafio-consistencia';
const UID = 'uid-atleta-teste';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ts(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

describe.skipIf(!hasEmulator)('onRegistroWrite — agregação de participação (S1307-T1)', () => {
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
    const batch = adminDb.batch();
    batch.set(adminDb.collection('clubes').doc(CLUBE), {
      id: CLUBE, tenantId: TENANT, nome: 'Clube Teste', ownerId: 'uid-owner',
      qtdMembrosAtivos: 0, qtdDesafiosAtivos: 1,
    });
    const desafioRef = adminDb.collection('clubes').doc(CLUBE).collection('desafios').doc(DESAFIO);
    batch.set(desafioRef, {
      id: DESAFIO, tenantId: TENANT, nome: 'Desafio Consistência',
      descricao: 'teste', modelo: 'B', status: 'ativo',
      dataInicio: ts('2026-03-01T00:00:00Z'), dataFim: ts('2026-04-26T23:59:59Z'),
      metaTotalPontos: 100,
      recompensaTipo: 'medalha_digital', visibilidade: 'membros',
      qtdParticipantes: 0, progressoPct: 0,
      criadoEm: ts('2026-02-01T00:00:00Z'), atualizadoEm: ts('2026-02-01T00:00:00Z'),
    });
    // participação EXISTE (gate do entrarNoDesafio/seed — caminho privilegiado)
    batch.set(desafioRef.collection('participantes').doc(UID), {
      atletaId: UID, clubeId: CLUBE, desafioId: DESAFIO,
      entrouEm: ts('2026-03-01T12:00:00Z'),
      pontos: 0, pontosPorPilar: { fisico: 0, mental: 0, espiritual: 0 }, diasAtivos: 0,
    });
    await batch.commit();
  }

  function registroRef(id: string) {
    return adminDb.collection('atletas').doc(UID).collection('registros').doc(id);
  }

  async function addRegistro(
    id: string, acaoRef: string, pilar: string, quantidade: number,
    unidade: string, dataIso: string, desafio = DESAFIO
  ): Promise<void> {
    await registroRef(id).set({
      id, acaoRef, pilar, quantidade, unidade,
      data: ts(dataIso), origem: 'manual',
      clubeId: CLUBE, desafioId: desafio, criadoEm: ts(dataIso),
    });
  }

  function participanteRef() {
    return adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc(DESAFIO)
      .collection('participantes').doc(UID);
  }

  it('bônus RN-115: 3 pilares no dia (+20%) e 5+ dias na semana (+10%) ACUMULAM', async () => {
    // dia 2026-03-02 (segunda): correr 5km(10) + ler 10pg(2) + meditar 10min(5) = 17 ×1.2
    await addRegistro('r1', 'correr', 'fisico', 5, 'km', '2026-03-02T10:00:00Z');
    await addRegistro('r2', 'ler', 'mental', 10, 'paginas', '2026-03-02T21:00:00Z');
    await addRegistro('r3', 'meditar', 'espiritual', 10, 'min', '2026-03-02T22:00:00Z');
    // +4 dias na mesma semana ISO (ter..sex) — 1km/dia = 2 pts
    await addRegistro('r4', 'correr', 'fisico', 1, 'km', '2026-03-03T10:00:00Z');
    await addRegistro('r5', 'correr', 'fisico', 1, 'km', '2026-03-04T10:00:00Z');
    await addRegistro('r6', 'correr', 'fisico', 1, 'km', '2026-03-05T10:00:00Z');
    await addRegistro('r7', 'correr', 'fisico', 1, 'km', '2026-03-06T10:00:00Z');

    const resultado = await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO);
    expect(resultado.agregado).toBe(true);
    expect(resultado.registrosConsiderados).toBe(7);

    const doc = (await participanteRef().get()).data()!;
    // (17×1.2 + 8) × 1.1 = 31.24 → 31.2 (1 casa)
    expect(doc['pontos']).toBeCloseTo(31.2, 5);
    expect(doc['diasAtivos']).toBe(5);
    expect(doc['entrouEm']).toBeDefined(); // preservado (não sobrescrito)
  });

  it('REPROCESSAR (retry at-least-once) não duplica: pontos idênticos', async () => {
    await addRegistro('r1', 'correr', 'fisico', 5, 'km', '2026-03-02T10:00:00Z');

    await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO);
    const antes = (await participanteRef().get()).data()!;

    await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO); // retry
    const depois = (await participanteRef().get()).data()!;

    expect(depois['pontos']).toBe(antes['pontos']);
    expect(depois['diasAtivos']).toBe(antes['diasAtivos']);
    expect(depois['pontosPorPilar']).toEqual(antes['pontosPorPilar']);
  });

  it('∑ do desafio: qtdParticipantes por recontagem + progressoPct (meta 100)', async () => {
    await addRegistro('r1', 'correr', 'fisico', 25, 'km', '2026-03-10T10:00:00Z'); // 50 pts
    await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO);

    const desafio = (await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc(DESAFIO).get()).data()!;
    expect(desafio['qtdParticipantes']).toBe(1); // recontagem real
    expect(desafio['progressoPct']).toBe(50); // 50/100
  });

  it('ANTAGONISTA: registro FORA da janela do desafio não pontua', async () => {
    await addRegistro('r1', 'correr', 'fisico', 5, 'km', '2026-02-28T10:00:00Z'); // véspera
    await addRegistro('r2', 'correr', 'fisico', 5, 'km', '2026-04-27T00:00:01Z'); // depois do fim
    const resultado = await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO);
    expect(resultado.registrosConsiderados).toBe(0);
    expect((await participanteRef().get()).get('pontos')).toBe(0);
  });

  it('ANTAGONISTA: registro de OUTRO desafio não vaza para este', async () => {
    await addRegistro('r1', 'correr', 'fisico', 5, 'km', '2026-03-02T10:00:00Z', 'outro-desafio');
    const resultado = await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO);
    expect(resultado.registrosConsiderados).toBe(0);
  });

  it('ANTAGONISTA: sem participação, registro NÃO materializa agregado (anti-spoof)', async () => {
    const INTRUSO = 'uid-intruso';
    await adminDb.collection('atletas').doc(INTRUSO).collection('registros').doc('rx').set({
      id: 'rx', acaoRef: 'correr', pilar: 'fisico', quantidade: 100, unidade: 'km',
      data: ts('2026-03-02T10:00:00Z'), origem: 'manual',
      clubeId: CLUBE, desafioId: DESAFIO, criadoEm: ts('2026-03-02T10:00:00Z'),
    });
    const resultado = await recomputarParticipacao(adminDb, INTRUSO, CLUBE, DESAFIO);
    expect(resultado.agregado).toBe(false);
    const doc = await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc(DESAFIO)
      .collection('participantes').doc(INTRUSO).get();
    expect(doc.exists).toBe(false);
  });

  it('ANTAGONISTA: registro incoerente com o catálogo é IGNORADO (pilar/unidade forjados)', async () => {
    // pilar forjado ('espiritual' para correr) e unidade errada — RN-114
    await addRegistro('r1', 'correr', 'espiritual', 5, 'km', '2026-03-02T10:00:00Z');
    await addRegistro('r2', 'ler', 'mental', 10, 'min', '2026-03-02T11:00:00Z');
    await addRegistro('r3', 'acao-inventada', 'fisico', 5, 'km', '2026-03-02T12:00:00Z');
    const resultado = await recomputarParticipacao(adminDb, UID, CLUBE, DESAFIO);
    expect(resultado.registrosConsiderados).toBe(0);
    expect((await participanteRef().get()).get('pontos')).toBe(0);
  });

  it('seeds registros+participantes: Aline com bônus duplo; rerun converge', async () => {
    await seedRegistros(adminDb);

    const pAline = (await adminDb.collection('clubes').doc('corrida-perfeita-sul')
      .collection('desafios').doc('preparacao-meia-floripa')
      .collection('participantes').doc(ATLETA_ALINE_UID).get()).data()!;
    // Aline: seg = correr 5km(10) + ler 20pg(4) + meditar 10min(5) = 19 ×1.2
    // = 22.8 | ter caminhar 3km = 3 | qua journaling = 8 | qui gratidão = 4 |
    // sex correr 8km = 16 ⇒ 5 dias na semana ×1.1 ⇒ 53.8 × 1.1 = 59.18 → 59.2
    expect(pAline['pontos']).toBeCloseTo(59.2, 1);
    expect(pAline['diasAtivos']).toBe(5);

    const pBruno = (await adminDb.collection('clubes').doc('corrida-perfeita-sul')
      .collection('desafios').doc('preparacao-meia-floripa')
      .collection('participantes').doc(ATLETA_BRUNO_UID).get()).data()!;
    expect(pBruno['diasAtivos']).toBe(2); // 2 dias simples, sem bônus
    expect(pBruno['pontos']).toBeCloseTo(20, 1); // musculação 10 + meditar 20min 10

    // rerun idempotente
    await seedRegistros(adminDb);
    const pAline2 = (await adminDb.collection('clubes').doc('corrida-perfeita-sul')
      .collection('desafios').doc('preparacao-meia-floripa')
      .collection('participantes').doc(ATLETA_ALINE_UID).get()).data()!;
    expect(pAline2['pontos']).toBe(pAline['pontos']);

    // ∑ do desafio recontado da coleção REAL (2 participantes seed)
    const desafio = (await adminDb.collection('clubes').doc('corrida-perfeita-sul')
      .collection('desafios').doc('preparacao-meia-floripa').get()).data()!;
    expect(desafio['qtdParticipantes']).toBe(2);
  });
});
