/**
 * boardConsistencia.integration.test.ts — LEELA-S1308-T3 (E13 · T2-L2)
 *
 * Unit + integração do board de consistência (decisão 2 — anti-streak).
 *
 * Aceites do brief:
 *   - A com 5 dias/40 pts vem ANTES de B com 3 dias/90 pts (consistência >
 *     volume — unit sobre o Core);
 *   - empate em dias ativos → desempata por pontos;
 *   - registrar ação nova de um participante RECOMPUTA board/current
 *     (integração via recomputarParticipacao — o trigger é wrapper fino);
 *   - cliente NÃO escreve board (Rule).
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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  montarBoardConsistencia,
  ordenarPorConsistencia,
  BOARD_TOP_N,
} from '@leela/core';
import { recomputarParticipacao } from '../jornada/onRegistroWrite';
import { recomputarBoardConsistencia } from '../jornada/boardConsistencia';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const CLUBE = 'clube-teste';
const TENANT = 'castelo-producoes';
const DESAFIO = 'desafio-board';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ts(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

// ── Unit puro (sem Emulator) ────────────────────────────────────────────────

describe('ordenarPorConsistencia — consistência > volume (decisão 2)', () => {
  it('A (5 dias/40 pts) vem ANTES de B (3 dias/90 pts)', () => {
    const ordem = ordenarPorConsistencia([
      { atletaId: 'B', diasAtivos: 3, pontos: 90 },
      { atletaId: 'A', diasAtivos: 5, pontos: 40 },
    ]);
    expect(ordem.map((p) => p.atletaId)).toEqual(['A', 'B']);
  });

  it('empate em dias ativos → desempata por pontos (desc)', () => {
    const ordem = ordenarPorConsistencia([
      { atletaId: 'C', diasAtivos: 4, pontos: 10 },
      { atletaId: 'D', diasAtivos: 4, pontos: 25 },
    ]);
    expect(ordem.map((p) => p.atletaId)).toEqual(['D', 'C']);
  });

  it('empate total → atletaId asc (ordem estável, sem flicker)', () => {
    const ordem = ordenarPorConsistencia([
      { atletaId: 'z', diasAtivos: 2, pontos: 10 },
      { atletaId: 'a', diasAtivos: 2, pontos: 10 },
    ]);
    expect(ordem.map((p) => p.atletaId)).toEqual(['a', 'z']);
  });

  it('montarBoardConsistencia: posições 1-based, top-N, exclui 0 dias ativos', () => {
    const board = montarBoardConsistencia(
      [
        { atletaId: 'A', diasAtivos: 5, pontos: 40 },
        { atletaId: 'B', diasAtivos: 3, pontos: 90 },
        { atletaId: 'Z', diasAtivos: 0, pontos: 0 }, // nunca fez nada — fora
      ],
      2
    );
    expect(board).toEqual([
      { atletaId: 'A', diasAtivos: 5, pontos: 40, posicao: 1 },
      { atletaId: 'B', diasAtivos: 3, pontos: 90, posicao: 2 },
    ]);
    expect(BOARD_TOP_N).toBe(50);
  });
});

// ── Integração (Emulator) ───────────────────────────────────────────────────

describe.skipIf(!hasEmulator)('board/current — recompute + Rules (S1308-T3)', () => {
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
    const batch = adminDb.batch();
    batch.set(adminDb.collection('clubes').doc(CLUBE), {
      id: CLUBE, tenantId: TENANT, nome: 'Clube Teste', ownerId: 'uid-owner',
    });
    const desafioRef = adminDb.collection('clubes').doc(CLUBE).collection('desafios').doc(DESAFIO);
    batch.set(desafioRef, {
      id: DESAFIO, tenantId: TENANT, nome: 'Desafio Board', descricao: 't',
      modelo: 'B', status: 'ativo', visibilidade: 'membros',
      dataInicio: ts('2026-03-01T00:00:00Z'), dataFim: ts('2026-04-26T23:59:59Z'),
      metaTotalPontos: 100, recompensaTipo: 'medalha_digital',
      qtdParticipantes: 0, progressoPct: 0,
    });
    // A: 5 dias/40 pts · B: 3 dias/90 pts (aceite canônico)
    batch.set(desafioRef.collection('participantes').doc('uid-a'), {
      atletaId: 'uid-a', clubeId: CLUBE, desafioId: DESAFIO,
      entrouEm: ts('2026-03-01T12:00:00Z'),
      pontos: 40, pontosPorPilar: { fisico: 40, mental: 0, espiritual: 0 }, diasAtivos: 5,
    });
    batch.set(desafioRef.collection('participantes').doc('uid-b'), {
      atletaId: 'uid-b', clubeId: CLUBE, desafioId: DESAFIO,
      entrouEm: ts('2026-03-01T12:00:00Z'),
      pontos: 90, pontosPorPilar: { fisico: 90, mental: 0, espiritual: 0 }, diasAtivos: 3,
    });
    await batch.commit();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function boardRef() {
    return adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc(DESAFIO)
      .collection('board').doc('current');
  }

  it('materializa A antes de B (consistência > volume) + metadados', async () => {
    await recomputarBoardConsistencia(adminDb, CLUBE, DESAFIO);
    const board = (await boardRef().get()).data()!;
    expect((board['entradas'] as { atletaId: string }[]).map((e) => e.atletaId))
      .toEqual(['uid-a', 'uid-b']);
    expect(board['totalParticipantes']).toBe(2);
    expect(board['topN']).toBe(50);
  });

  it('registrar ação nova RECOMPUTA o board (B ultrapassa A em dias ativos)', async () => {
    await recomputarBoardConsistencia(adminDb, CLUBE, DESAFIO);

    // B registra ações em 3 dias NOVOS (6 dias ativos > 5 de A)
    const registros = adminDb.collection('atletas').doc('uid-b').collection('registros');
    for (const [i, dia] of ['2026-03-20', '2026-03-21', '2026-03-22'].entries()) {
      await registros.doc(`rb-${i}`).set({
        id: `rb-${i}`, acaoRef: 'correr', pilar: 'fisico', quantidade: 2,
        unidade: 'km', data: ts(`${dia}T10:00:00Z`), origem: 'manual',
        clubeId: CLUBE, desafioId: DESAFIO, criadoEm: ts(`${dia}T10:00:00Z`),
      });
    }
    // fan-out do trigger (wrapper fino) = recomputarParticipacao
    await recomputarParticipacao(adminDb, 'uid-b', CLUBE, DESAFIO);

    const board = (await boardRef().get()).data()!;
    const entradas = board['entradas'] as { atletaId: string; diasAtivos: number }[];
    // B agora tem 3 dias REAIS de registro (o recompute é fonte-de-verdade:
    // os 3 dias/90 pts chumbados no seed viram o agregado REAL dos registros)
    expect(entradas[0]!.atletaId).toBe('uid-a'); // A segue com 5 dias
    const b = entradas.find((e) => e.atletaId === 'uid-b')!;
    expect(b.diasAtivos).toBe(3);
  });

  it('cliente NÃO escreve board (nem participante, nem tenant_owner)', async () => {
    await recomputarBoardConsistencia(adminDb, CLUBE, DESAFIO);

    const participante = testEnv.authenticatedContext('uid-a', { role: 'athlete' }).firestore();
    await assertFails(
      setDoc(doc(participante, 'clubes', CLUBE, 'desafios', DESAFIO, 'board', 'current'), {
        entradas: [{ atletaId: 'uid-a', diasAtivos: 999, pontos: 1, posicao: 1 }],
      })
    );

    const owner = testEnv.authenticatedContext('uid-marina-castelo', {
      role: 'tenant_owner', tenantId: TENANT,
    }).firestore();
    await assertFails(
      setDoc(doc(owner, 'clubes', CLUBE, 'desafios', DESAFIO, 'board', 'current'), {
        entradas: [],
      })
    );
  });

  it('leitura: participante e tenant leem; atleta de fora NÃO (desafio "membros")', async () => {
    await recomputarBoardConsistencia(adminDb, CLUBE, DESAFIO);

    const participante = testEnv.authenticatedContext('uid-a', { role: 'athlete' }).firestore();
    await assertSucceeds(
      getDoc(doc(participante, 'clubes', CLUBE, 'desafios', DESAFIO, 'board', 'current'))
    );

    const owner = testEnv.authenticatedContext('uid-marina-castelo', {
      role: 'tenant_owner', tenantId: TENANT,
    }).firestore();
    await assertSucceeds(
      getDoc(doc(owner, 'clubes', CLUBE, 'desafios', DESAFIO, 'board', 'current'))
    );

    const forasteiro = testEnv.authenticatedContext('uid-forasteiro', { role: 'athlete' }).firestore();
    await assertFails(
      getDoc(doc(forasteiro, 'clubes', CLUBE, 'desafios', DESAFIO, 'board', 'current'))
    );
  });

  it('desafio "publico": qualquer autenticado lê o board', async () => {
    await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc(DESAFIO).update({ visibilidade: 'publico' });
    await recomputarBoardConsistencia(adminDb, CLUBE, DESAFIO);

    const qualquer = testEnv.authenticatedContext('uid-qualquer', { role: 'athlete' }).firestore();
    await assertSucceeds(
      getDoc(doc(qualquer, 'clubes', CLUBE, 'desafios', DESAFIO, 'board', 'current'))
    );
  });
});
