/**
 * registrosRules.integration.test.ts — LEELA-S1307-T1 (E13 adiantado · T2-L2)
 *
 * Security Rules de `atletas/{uid}/registros` e
 * `clubes/{c}/desafios/{d}/participantes` no Firestore Emulator.
 *
 * Aceites do brief:
 *   - escrita de registro SÓ do dono (outro uid → negado);
 *   - shape espelhado do core: quantidade ≤ 0 / NaN / Infinity negados
 *     (sem math.isInfinite — v*0.0==0.0), origem/pilar fora do enum
 *     negados, par clubeId+desafioId ambos-ou-nenhum, campo `pontos`
 *     bloqueado (∑ é da Function);
 *   - cliente NÃO escreve participantes (nem o próprio atleta);
 *   - leitura de participantes conforme visibilidade (baseline: tenant do
 *     clube + o próprio participante; detalhes de 'publico' no S1308).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CLUBE = 'clube-teste';
const TENANT = 'castelo-producoes';
const DESAFIO = 'desafio-consistencia';
const ALINE = 'uid-aline-barros';
const BRUNO = 'uid-bruno-aguiar';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function registroValido(over: Record<string, unknown> = {}) {
  return {
    acaoRef: 'correr',
    pilar: 'fisico',
    quantidade: 5,
    unidade: 'km',
    data: new Date('2026-03-02T10:00:00Z'),
    origem: 'manual',
    clubeId: CLUBE,
    desafioId: DESAFIO,
    ...over,
  };
}

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
  const ts = (iso: string) => Timestamp.fromDate(new Date(iso));
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(TENANT), {
    id: TENANT, nome: 'Castelo', slug: TENANT, status: 'ativo',
    ownerUid: 'uid-marina-castelo', tipo: 'produtor',
  });
  batch.set(adminDb.collection('clubes').doc(CLUBE), {
    id: CLUBE, tenantId: TENANT, nome: 'Clube Teste', ownerId: 'uid-marina-castelo',
  });
  const desafioRef = adminDb.collection('clubes').doc(CLUBE).collection('desafios').doc(DESAFIO);
  batch.set(desafioRef, {
    id: DESAFIO, tenantId: TENANT, nome: 'Desafio', modelo: 'B', status: 'ativo',
    dataInicio: ts('2026-03-01T00:00:00Z'), dataFim: ts('2026-04-26T23:59:59Z'),
    recompensaTipo: 'medalha_digital', visibilidade: 'membros',
    qtdParticipantes: 1, progressoPct: 0,
  });
  batch.set(desafioRef.collection('participantes').doc(ALINE), {
    atletaId: ALINE, clubeId: CLUBE, desafioId: DESAFIO,
    entrouEm: ts('2026-03-01T12:00:00Z'),
    pontos: 10, pontosPorPilar: { fisico: 10, mental: 0, espiritual: 0 }, diasAtivos: 1,
  });
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

function atleta(uid: string) {
  return ctxAs(uid, { role: 'athlete' }).firestore();
}

describe('registros — escrita só do dono, shape do core', () => {
  it('atleta CRIA registro próprio válido (com e sem vínculo de desafio)', async () => {
    const db = atleta(ALINE);
    await assertSucceeds(
      setDoc(doc(db, 'atletas', ALINE, 'registros', 'r1'), registroValido())
    );
    await assertSucceeds(
      setDoc(doc(db, 'atletas', ALINE, 'registros', 'r2'), (() => {
        const { clubeId: _c, desafioId: _d, ...semVinculo } = registroValido();
        return semVinculo;
      })())
    );
  });

  it('atleta NÃO escreve registro de OUTRO uid', async () => {
    const db = atleta(BRUNO);
    await assertFails(
      setDoc(doc(db, 'atletas', ALINE, 'registros', 'rx'), registroValido())
    );
  });

  it('quantidade 0 / negativa / NaN / Infinity → negado (fail-closed)', async () => {
    const db = atleta(ALINE);
    for (const quantidade of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assertFails(
        setDoc(doc(db, 'atletas', ALINE, 'registros', 'rq'), registroValido({ quantidade }))
      );
    }
  });

  it('pilar/origem fora do enum → negado', async () => {
    const db = atleta(ALINE);
    await assertFails(
      setDoc(doc(db, 'atletas', ALINE, 'registros', 'rp'), registroValido({ pilar: 'social' }))
    );
    await assertFails(
      setDoc(doc(db, 'atletas', ALINE, 'registros', 'ro'), registroValido({ origem: 'strava' }))
    );
  });

  it('clubeId SEM desafioId (par ADR-009 quebrado) → negado', async () => {
    const db = atleta(ALINE);
    const { desafioId: _d, ...soClube } = registroValido();
    await assertFails(setDoc(doc(db, 'atletas', ALINE, 'registros', 'rc'), soClube));
  });

  it('campo `pontos` no registro → negado (∑ é da Function — RN-115)', async () => {
    const db = atleta(ALINE);
    await assertFails(
      setDoc(doc(db, 'atletas', ALINE, 'registros', 'rpts'), registroValido({ pontos: 9999 }))
    );
  });

  it('leitura: dono lê os próprios; outro atleta NÃO lê', async () => {
    await adminDb.collection('atletas').doc(ALINE).collection('registros').doc('r1')
      .set({ ...registroValido(), data: Timestamp.fromDate(new Date('2026-03-02T10:00:00Z')) });
    await assertSucceeds(getDoc(doc(atleta(ALINE), 'atletas', ALINE, 'registros', 'r1')));
    await assertFails(getDoc(doc(atleta(BRUNO), 'atletas', ALINE, 'registros', 'r1')));
  });
});

describe('participantes — escrita de cliente SEMPRE negada', () => {
  it('o PRÓPRIO atleta não escreve a própria participação (pontuação forjada)', async () => {
    const db = atleta(ALINE);
    await assertFails(
      setDoc(doc(db, 'clubes', CLUBE, 'desafios', DESAFIO, 'participantes', ALINE), {
        atletaId: ALINE, clubeId: CLUBE, desafioId: DESAFIO,
        pontos: 99999, pontosPorPilar: { fisico: 99999, mental: 0, espiritual: 0 },
        diasAtivos: 365,
      })
    );
  });

  it('tenant_owner do clube também NÃO escreve participantes via client SDK', async () => {
    const db = ctxAs('uid-marina-castelo', { role: 'tenant_owner', tenantId: TENANT }).firestore();
    await assertFails(
      setDoc(doc(db, 'clubes', CLUBE, 'desafios', DESAFIO, 'participantes', ALINE), {
        pontos: 0,
      })
    );
  });

  it('leitura: tenant do clube lê; o participante lê a própria; atleta de fora NÃO lê (desafio "membros")', async () => {
    const tenantDb = ctxAs('uid-marina-castelo', { role: 'tenant_owner', tenantId: TENANT }).firestore();
    await assertSucceeds(
      getDoc(doc(tenantDb, 'clubes', CLUBE, 'desafios', DESAFIO, 'participantes', ALINE))
    );
    await assertSucceeds(
      getDoc(doc(atleta(ALINE), 'clubes', CLUBE, 'desafios', DESAFIO, 'participantes', ALINE))
    );
    // Bruno não participa e o desafio é 'membros' → não lê a participação da Aline
    await assertFails(
      getDoc(doc(atleta(BRUNO), 'clubes', CLUBE, 'desafios', DESAFIO, 'participantes', ALINE))
    );
  });

  it('participante LÊ a participação dos DEMAIS (board social do desafio)', async () => {
    // Aline participa ⇒ lê o doc do Bruno quando ele existir
    await adminDb.collection('clubes').doc(CLUBE).collection('desafios').doc(DESAFIO)
      .collection('participantes').doc(BRUNO).set({
        atletaId: BRUNO, clubeId: CLUBE, desafioId: DESAFIO,
        pontos: 5, pontosPorPilar: { fisico: 5, mental: 0, espiritual: 0 }, diasAtivos: 1,
      });
    await assertSucceeds(
      getDoc(doc(atleta(ALINE), 'clubes', CLUBE, 'desafios', DESAFIO, 'participantes', BRUNO))
    );
  });
});
