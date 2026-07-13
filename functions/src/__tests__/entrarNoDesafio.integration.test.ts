/**
 * entrarNoDesafio.integration.test.ts — LEELA-S1308-T1 (E13 adiantado · T2-L2)
 *
 * Integração (Firestore Emulator, Admin SDK — padrão callables v1): chama
 * entrarNoDesafioCore direto com caller forjado (o wrapper só extrai o uid
 * do token).
 *
 * Aceites do brief:
 *   - desafio "só membros" + atleta NÃO-membro ⇒ negado (RN-117);
 *   - chamar 2× para o mesmo uid ⇒ 1 doc, qtdParticipantes incrementa UMA vez;
 *   - desafio "público" + qualquer atleta ⇒ entra e consta em participantes.
 * Antagonistas: convite exige convite EXPLÍCITO (membro não basta);
 * desafio encerrado não aceita entrada; membro INATIVO não entra em
 * "membros"; registros pré-join são absorvidos no recompute; payload
 * inválido; unit puro de podeParticipar.
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
import { podeParticipar } from '@leela/core';
import { entrarNoDesafioCore } from '../jornada/entrarNoDesafio';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const AGORA = new Date('2026-03-15T12:00:00Z');
const CLUBE = 'clube-teste';
const TENANT = 'castelo-producoes';
const MEMBRO_UID = 'uid-membro-ativo';
const INATIVO_UID = 'uid-membro-inativo';
const FORASTEIRO_UID = 'uid-forasteiro';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ts(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

function desafioDoc(id: string, visibilidade: string, status = 'ativo') {
  return {
    id, tenantId: TENANT, nome: `Desafio ${id}`, descricao: 't', modelo: 'B',
    status, visibilidade,
    dataInicio: ts('2026-03-01T00:00:00Z'), dataFim: ts('2026-04-26T23:59:59Z'),
    metaTotalPontos: 100, recompensaTipo: 'medalha_digital',
    qtdParticipantes: 0, progressoPct: 0,
    criadoEm: ts('2026-02-01T00:00:00Z'), atualizadoEm: ts('2026-02-01T00:00:00Z'),
  };
}

describe.skipIf(!hasEmulator)('entrarNoDesafio — RN-117 (S1308-T1)', () => {
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
    const clubeRef = adminDb.collection('clubes').doc(CLUBE);
    // membro ATIVO (entrou há 30d, atividade há 2d — RN-102 ⇒ ativo)
    batch.set(clubeRef.collection('membros').doc('membro-ativo-doc'), {
      id: 'membro-ativo-doc', tenantId: TENANT, atletaId: MEMBRO_UID,
      atletaNome: 'Membro Ativo', papel: 'membro', entrouVia: 'codigo',
      entrouEm: ts('2026-02-13T12:00:00Z'),
      ultimaAtividadeEm: ts('2026-03-13T12:00:00Z'),
      status: 'ativo',
    });
    // membro INATIVO (atividade há 60d — RN-102 ⇒ inativo)
    batch.set(clubeRef.collection('membros').doc('membro-inativo-doc'), {
      id: 'membro-inativo-doc', tenantId: TENANT, atletaId: INATIVO_UID,
      atletaNome: 'Membro Inativo', papel: 'membro', entrouVia: 'codigo',
      entrouEm: ts('2025-11-01T12:00:00Z'),
      ultimaAtividadeEm: ts('2026-01-10T12:00:00Z'),
      status: 'inativo',
    });
    batch.set(clubeRef.collection('desafios').doc('d-membros'), desafioDoc('d-membros', 'membros'));
    batch.set(clubeRef.collection('desafios').doc('d-publico'), desafioDoc('d-publico', 'publico'));
    batch.set(clubeRef.collection('desafios').doc('d-convite'), desafioDoc('d-convite', 'convite'));
    batch.set(
      clubeRef.collection('desafios').doc('d-encerrado'),
      desafioDoc('d-encerrado', 'publico', 'encerrado')
    );
    await batch.commit();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function entrar(uid: string, desafioId: string) {
    return entrarNoDesafioCore(
      adminDb, { clubeId: CLUBE, desafioId }, { uid }, AGORA
    );
  }

  it('"só membros": atleta NÃO-membro é NEGADO (RN-117)', async () => {
    await expect(entrar(FORASTEIRO_UID, 'd-membros')).rejects.toMatchObject({
      code: 'permission-denied',
    });
    const doc = await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc('d-membros')
      .collection('participantes').doc(FORASTEIRO_UID).get();
    expect(doc.exists).toBe(false);
  });

  it('"só membros": membro ATIVO entra', async () => {
    const r = await entrar(MEMBRO_UID, 'd-membros');
    expect(r.replay).toBe(false);
    expect(r.qtdParticipantes).toBe(1);
  });

  it('"só membros": membro INATIVO (RN-102) é negado', async () => {
    await expect(entrar(INATIVO_UID, 'd-membros')).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('IDEMPOTENTE: 2× o mesmo uid ⇒ 1 doc, qtdParticipantes incrementa UMA vez', async () => {
    const primeira = await entrar(MEMBRO_UID, 'd-membros');
    const segunda = await entrar(MEMBRO_UID, 'd-membros');

    expect(primeira.replay).toBe(false);
    expect(segunda.replay).toBe(true);
    expect(segunda.qtdParticipantes).toBe(1);

    const participantes = await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc('d-membros')
      .collection('participantes').get();
    expect(participantes.size).toBe(1);

    const desafio = await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc('d-membros').get();
    expect(desafio.get('qtdParticipantes')).toBe(1); // recontagem, não ++
  });

  it('"público": QUALQUER atleta entra e consta em participantes', async () => {
    const r = await entrar(FORASTEIRO_UID, 'd-publico');
    expect(r.replay).toBe(false);
    const doc = await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc('d-publico')
      .collection('participantes').doc(FORASTEIRO_UID).get();
    expect(doc.exists).toBe(true);
    expect(doc.get('pontos')).toBe(0);
    expect(doc.get('entrouEm')).toBeDefined();
  });

  it('"convite": membro SEM convite explícito é negado; com convite entra', async () => {
    await expect(entrar(MEMBRO_UID, 'd-convite')).rejects.toMatchObject({
      code: 'permission-denied',
    });

    await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc('d-convite')
      .collection('convites').doc(FORASTEIRO_UID)
      .set({ convidadoPor: 'uid-owner', em: ts('2026-03-10T12:00:00Z') });

    const r = await entrar(FORASTEIRO_UID, 'd-convite');
    expect(r.replay).toBe(false);
  });

  it('desafio ENCERRADO não aceita entrada (failed-precondition)', async () => {
    await expect(entrar(FORASTEIRO_UID, 'd-encerrado')).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  it('registros gravados ANTES do join são absorvidos no recompute', async () => {
    // registro pré-join (latente — S1307 não agrega sem participação)
    await adminDb.collection('atletas').doc(MEMBRO_UID)
      .collection('registros').doc('r-pre').set({
        id: 'r-pre', acaoRef: 'correr', pilar: 'fisico', quantidade: 10,
        unidade: 'km', data: ts('2026-03-10T10:00:00Z'), origem: 'manual',
        clubeId: CLUBE, desafioId: 'd-membros', criadoEm: ts('2026-03-10T10:00:00Z'),
      });

    await entrar(MEMBRO_UID, 'd-membros');

    const doc = await adminDb.collection('clubes').doc(CLUBE)
      .collection('desafios').doc('d-membros')
      .collection('participantes').doc(MEMBRO_UID).get();
    expect(doc.get('pontos')).toBe(20); // correr 10km = 20 pts
    expect(doc.get('diasAtivos')).toBe(1);
  });

  it('payload inválido / desafio inexistente', async () => {
    await expect(
      entrarNoDesafioCore(adminDb, { clubeId: CLUBE }, { uid: MEMBRO_UID }, AGORA)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(entrar(MEMBRO_UID, 'nao-existe')).rejects.toMatchObject({
      code: 'not-found',
    });
  });
});

describe('podeParticipar — decisão pura (RN-117)', () => {
  const ctx = (membroAtivo: boolean, convidado: boolean) => ({ membroAtivo, convidado });

  it('cobre a matriz status × visibilidade', () => {
    expect(podeParticipar({ status: 'ativo', visibilidade: 'publico' }, ctx(false, false)).ok).toBe(true);
    expect(podeParticipar({ status: 'ativo', visibilidade: 'membros' }, ctx(true, false)).ok).toBe(true);
    expect(podeParticipar({ status: 'ativo', visibilidade: 'membros' }, ctx(false, false))).toEqual(
      { ok: false, motivo: 'exige_membro_do_clube' }
    );
    // convite: ser membro NÃO basta
    expect(podeParticipar({ status: 'ativo', visibilidade: 'convite' }, ctx(true, false))).toEqual(
      { ok: false, motivo: 'exige_convite' }
    );
    expect(podeParticipar({ status: 'ativo', visibilidade: 'convite' }, ctx(false, true)).ok).toBe(true);
    expect(podeParticipar({ status: 'encerrado', visibilidade: 'publico' }, ctx(true, true))).toEqual(
      { ok: false, motivo: 'desafio_nao_ativo' }
    );
    expect(podeParticipar({ status: 'rascunho', visibilidade: 'publico' }, ctx(true, true)).ok).toBe(false);
  });
});
