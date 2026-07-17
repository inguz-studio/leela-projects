/**
 * coletaDiaria.integration.test.ts — LEELA-S821-T1b (E11 · Onda 2 T2-L1)
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão ADR-015):
 * chama coletarSnapshotsDiariosCore SEM o scheduler (o Emulator não sobe
 * pubsub; o cron nunca dispara sozinho no CI).
 *
 * Aceites do brief:
 *   - Core rodado DUAS vezes p/ o mesmo dia ⇒ doc idêntico (idempotente);
 *   - rodar o dia seguinte NÃO altera o doc do dia anterior (histórico);
 *   - snapshot de Marina BATE com dashboard/current no instante da coleta
 *     (GMV/inscritos/membros iguais — cópia, zero recálculo);
 *   - flag BigQuery ligada ⇒ exportador chamado 1×/profissional (spy);
 *     desligada ⇒ 0 chamadas;
 *   - dashboard ausente/stale ⇒ recomputa via recomputeProfessionalDashboard
 *     antes de snapshotar;
 *   - seed: 5 dias determinísticos, série termina nos canônicos HANDOFF-05.
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { AnalyticsSnapshot } from '@leela/core';
import {
  BQ_EXPORT_FLAG,
  coletarSnapshotsDiariosCore,
} from '../analytics/coletaDiaria';
import { seedAnalyticsSnapshots } from '../seed/analyticsSnapshots.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const AGORA = new Date('2026-07-04T06:05:00Z'); // 03:05 America/Sao_Paulo
const DIA = '2026-07-04';
const DIA_SEGUINTE = '2026-07-05';

const MARINA_UID = 'uid-marina-castelo';
const FELIPE_UID = 'uid-felipe-martins';
const TENANT_MARINA = 'castelo-producoes';
const TENANT_FELIPE = 'corrida-perfeita';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('coletaDiaria — rollup de snapshots (S821-T1b)', () => {
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
    delete process.env[BQ_EXPORT_FLAG];
    await seedOrigens();
  });

  afterAll(async () => {
    delete process.env[BQ_EXPORT_FLAG];
    await testEnv?.cleanup();
  });

  /** Agregados ∑ de origem (E03/E05) — Marina e Felipe (isolamento). */
  async function seedOrigens(): Promise<void> {
    const batch = adminDb.batch();
    // Marina: 1 evento publicado (1.000 inscritos · R$ 100.000 · cap 1.100)
    batch.set(adminDb.collection('eventos').doc('meia-floripa-2026'), {
      id: 'meia-floripa-2026',
      tenantId: TENANT_MARINA,
      organizadorId: MARINA_UID,
      nome: 'Meia Maratona Floripa',
      slug: 'meia-floripa-2026',
      status: 'publicado',
      data: Timestamp.fromDate(new Date('2026-09-27T12:00:00Z')),
      qtdInscritos: 1000,
      receitaConfirmada: 100000,
      capacidade: 1100,
      atualizadoEm: Timestamp.fromDate(AGORA),
    });
    // Marina: 1 clube (80 membros ativos · 2 desafios ativos)
    batch.set(adminDb.collection('clubes').doc('clube-marina'), {
      id: 'clube-marina',
      tenantId: TENANT_MARINA,
      ownerId: MARINA_UID,
      nome: 'Clube da Marina',
      qtdMembrosAtivos: 80,
      qtdDesafiosAtivos: 2,
    });
    // Felipe (outro profissional): números DIFERENTES — isolamento
    batch.set(adminDb.collection('eventos').doc('trilha-serra-2026'), {
      id: 'trilha-serra-2026',
      tenantId: TENANT_FELIPE,
      organizadorId: FELIPE_UID,
      nome: 'Trilha da Serra',
      slug: 'trilha-serra-2026',
      status: 'publicado',
      data: Timestamp.fromDate(new Date('2026-10-10T12:00:00Z')),
      qtdInscritos: 55,
      receitaConfirmada: 4300,
      capacidade: 100,
      atualizadoEm: Timestamp.fromDate(AGORA),
    });
    await batch.commit();
  }

  function snapRef(profId: string, dia: string) {
    return adminDb
      .collection('profissionais').doc(profId)
      .collection('analyticsSnapshots').doc(dia);
  }

  it('rodado DUAS vezes produz doc idêntico (idempotente por substituição total)', async () => {
    await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);
    const primeira = (await snapRef(MARINA_UID, DIA).get()).data();

    await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);
    const segunda = (await snapRef(MARINA_UID, DIA).get()).data();

    expect(primeira).toBeDefined();
    expect(segunda).toEqual(primeira);
  });

  it('rodar o DIA SEGUINTE não altera o doc do dia anterior (passado imutável)', async () => {
    await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);
    const antes = (await snapRef(MARINA_UID, DIA).get()).data();

    // estado muda entre os dias (novas inscrições) — o dia velho NÃO reflete
    await adminDb.collection('eventos').doc('meia-floripa-2026').update({
      qtdInscritos: 1050,
      receitaConfirmada: 105000,
    });
    const agoraD2 = new Date('2026-07-05T06:05:00Z');
    await coletarSnapshotsDiariosCore(adminDb, DIA_SEGUINTE, agoraD2);

    const depois = (await snapRef(MARINA_UID, DIA).get()).data();
    expect(depois).toEqual(antes); // byte a byte — inclusive capturadoEm

    const d2 = (await snapRef(MARINA_UID, DIA_SEGUINTE).get()).data() as AnalyticsSnapshot;
    expect(d2.inscricoesTotais).toBe(1050); // o dia novo reflete o estado novo
  });

  it('snapshot BATE com dashboard/current no instante da coleta (cópia fiel, sem alerts)', async () => {
    await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);

    const dash = (await adminDb
      .collection('profissionais').doc(MARINA_UID)
      .collection('dashboard').doc('current').get()).data();
    const snap = (await snapRef(MARINA_UID, DIA).get()).data() as AnalyticsSnapshot;

    expect(dash).toBeDefined();
    // GMV / inscritos / membros IGUAIS ao agregado — zero recálculo
    expect(snap.receitaConfirmada).toBe(dash!['receitaConfirmada']);
    expect(snap.inscricoesTotais).toBe(dash!['inscricoesTotais']);
    expect(snap.membrosAtivosTotais).toBe(dash!['membrosAtivosTotais']);
    expect(snap.desafiosAtivosTotais).toBe(dash!['desafiosAtivosTotais']);
    expect(snap.vagasRestantes).toBe(dash!['vagasRestantes']);
    // valores concretos dos ∑ de origem (recompute path)
    expect(snap.receitaConfirmada).toBe(100000);
    expect(snap.inscricoesTotais).toBe(1000);
    expect(snap.membrosAtivosTotais).toBe(80);
    // alerts NÃO vaza para o histórico
    expect('alerts' in snap).toBe(false);
    expect('computadoEm' in snap).toBe(false);
    expect(snap.data).toBe(DIA);
    expect(snap.profId).toBe(MARINA_UID);
  });

  it('usa dashboard/current FRESCO sem recomputar (fonte = agregado que já existe)', async () => {
    // dashboard fresco com números deliberadamente ≠ dos ∑ de origem:
    // se o Core recomputasse, os números NÃO bateriam com este doc
    await adminDb
      .collection('profissionais').doc(MARINA_UID)
      .collection('dashboard').doc('current').set({
        inscricoesTotais: 777,
        inscricoesTrendPct: null,
        receitaConfirmada: 77700,
        receitaTrendPct: null,
        vagasRestantes: 7,
        eventoEmRisco: null,
        taxaConversaoPct: null,
        conversaoSparkline: [],
        membrosAtivosTotais: 70,
        desafiosAtivosTotais: 1,
        alerts: [{ tipo: 'pendencias', qtd: 3 }],
        computadoEm: AGORA.getTime() - 60_000, // 1 min — fresco (< 5 min)
      });

    const resultado = await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);
    // 1 recompute = o do FELIPE (sem dashboard); o de MARINA (fresco) NÃO
    // recomputa — provado pelos números abaixo (77700 ≠ 100000 dos ∑ de
    // origem: se tivesse recomputado, o snapshot bateria com os ∑).
    expect(resultado.recomputados).toBe(1);

    const snap = (await snapRef(MARINA_UID, DIA).get()).data() as AnalyticsSnapshot;
    expect(snap.receitaConfirmada).toBe(77700); // copiou o agregado, não recalculou
    expect(snap.inscricoesTotais).toBe(777);
    expect('alerts' in snap).toBe(false); // alerts do dashboard descartado
  });

  it('dashboard STALE é recomputado antes de snapshotar', async () => {
    await adminDb
      .collection('profissionais').doc(MARINA_UID)
      .collection('dashboard').doc('current').set({
        inscricoesTotais: 1,
        inscricoesTrendPct: null,
        receitaConfirmada: 1,
        receitaTrendPct: null,
        vagasRestantes: 0,
        eventoEmRisco: null,
        taxaConversaoPct: null,
        conversaoSparkline: [],
        membrosAtivosTotais: 0,
        desafiosAtivosTotais: 0,
        alerts: [],
        computadoEm: AGORA.getTime() - 60 * 60 * 1000, // 1h — stale (> 5 min)
      });

    const resultado = await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);
    expect(resultado.recomputados).toBeGreaterThanOrEqual(1);

    const snap = (await snapRef(MARINA_UID, DIA).get()).data() as AnalyticsSnapshot;
    expect(snap.receitaConfirmada).toBe(100000); // recomputado dos ∑ de origem
    expect(snap.inscricoesTotais).toBe(1000);
  });

  it('isolamento: cada profissional recebe o PRÓPRIO snapshot', async () => {
    await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA);

    const marina = (await snapRef(MARINA_UID, DIA).get()).data() as AnalyticsSnapshot;
    const felipe = (await snapRef(FELIPE_UID, DIA).get()).data() as AnalyticsSnapshot;

    expect(marina.receitaConfirmada).toBe(100000);
    expect(felipe.receitaConfirmada).toBe(4300);
    expect(felipe.inscricoesTotais).toBe(55);
    expect(felipe.profId).toBe(FELIPE_UID);
  });

  it('flag BigQuery LIGADA ⇒ exportador 1×/profissional; DESLIGADA ⇒ 0 (spy)', async () => {
    const spy = vi.fn<(s: AnalyticsSnapshot) => Promise<void>>(async () => {});

    // desligada (default)
    const off = await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA, spy);
    expect(spy).toHaveBeenCalledTimes(0);
    expect(off.exportados).toBe(0);

    // ligada
    process.env[BQ_EXPORT_FLAG] = 'true';
    const on = await coletarSnapshotsDiariosCore(adminDb, DIA, AGORA, spy);
    expect(spy).toHaveBeenCalledTimes(on.profissionais); // 1× por profissional
    expect(on.exportados).toBe(on.profissionais);
    expect(on.profissionais).toBe(2); // marina + felipe
    delete process.env[BQ_EXPORT_FLAG];
  });

  it('seed: 5 dias determinísticos terminando nos canônicos HANDOFF-05; rerun idêntico', async () => {
    await seedAnalyticsSnapshots(adminDb);
    const col = adminDb
      .collection('profissionais').doc(MARINA_UID)
      .collection('analyticsSnapshots');

    const antes = await col.get();
    expect(antes.size).toBe(5);

    const ultimo = (await col.doc('2026-07-12').get()).data() as AnalyticsSnapshot;
    expect(ultimo.inscricoesTotais).toBe(1284);
    expect(ultimo.receitaConfirmada).toBe(142280);
    expect(ultimo.membrosAtivosTotais).toBe(120);
    expect(ultimo.desafiosAtivosTotais).toBe(3);
    expect(ultimo.vagasRestantes).toBe(47);

    // rerun byte-idêntico (capturadoEm derivado do dia — determinístico)
    const dump = antes.docs.map((d) => [d.id, d.data()]);
    await seedAnalyticsSnapshots(adminDb);
    const depois = await col.get();
    expect(depois.docs.map((d) => [d.id, d.data()])).toEqual(dump);
  });
});
