/**
 * overviewDashboard.test.ts — LEELA-S600-T2
 *
 * Integração (Firestore Emulator, Admin SDK direto — padrão triggers v1):
 * núcleo da Function de agregado do dashboard SEM subir o Functions emulator.
 *
 * Cobre o aceite do brief E02-L1:
 *   - com ∑qtdInscritos = 1.284 e ∑receitaConfirmada = 142.280 no Firestore,
 *     o agregado retorna esses totais + vagasRestantes = 47;
 *   - evento com ocupação ≥ limiar → eventoEmRisco = Meia Maratona Floripa;
 *   - reprocessar o gatilho NÃO duplica (recomputação por substituição total);
 *   - escopo: eventos/clubes de OUTRO profissional não vazam;
 *   - getOverviewCore: usa doc fresco, recomputa quando stale/ausente;
 *   - resolução de capacidade: campo do evento OU Σ kits.capacidade.
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
import { Timestamp } from 'firebase-admin/firestore';
import {
  DASHBOARD_STALE_MS,
  recomputeProfessionalDashboard,
} from '../overview/aggregateProfessionalDashboard';
import { getOverviewCore } from '../overview/getOverview';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const AGORA = new Date('2026-04-19T12:00:00Z');
const DIA_MS = 24 * 60 * 60 * 1000;

const TENANT_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const OUTRO_TENANT = 'passo-certo';
const OUTRO_UID = 'uid-passo-owner';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ts(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function diasAtras(n: number): Timestamp {
  return ts(new Date(AGORA.getTime() - n * DIA_MS));
}

describe.skipIf(!hasEmulator)('overview — agregado do dashboard (S600-T2)', () => {
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

  // ── Fixtures: aceite canônico 1.284 / 142.280 / 47 ───────────────────────
  // Marina: meia (453/500 · publicado) + serra (519 · sem capacidade) +
  //         retiro (312 · rascunho, prova a 34 dias — sem alerta de prazo).
  // Outro profissional: evento + clube que NÃO podem vazar.
  async function seedFixtures(): Promise<void> {
    const batch = adminDb.batch();

    batch.set(adminDb.collection('eventos').doc('meia-floripa-2026'), {
      id: 'meia-floripa-2026',
      tenantId: TENANT_ID,
      organizadorId: MARINA_UID,
      nome: 'Meia Maratona Floripa',
      data: ts(new Date('2026-04-27T09:00:00Z')),
      local: 'Florianópolis/SC',
      modalidades: ['5k', '10k', '21k'],
      slug: 'meia-floripa-2026',
      status: 'publicado',
      usaChip: true,
      qtdInscritos: 453,
      receitaConfirmada: 85617,
      capacidade: 500,
      criadoEm: diasAtras(90),
      atualizadoEm: diasAtras(0),
    });

    batch.set(adminDb.collection('eventos').doc('desafio-serra-do-mar'), {
      id: 'desafio-serra-do-mar',
      tenantId: TENANT_ID,
      organizadorId: MARINA_UID,
      nome: 'Desafio Serra do Mar',
      data: ts(new Date('2026-05-11T09:00:00Z')),
      local: 'Cunha/SP',
      modalidades: ['60km', '90km'],
      slug: 'desafio-serra-do-mar',
      status: 'publicado',
      usaChip: false,
      qtdInscritos: 519,
      receitaConfirmada: 40000,
      // sem `capacidade` e sem kits → capacidade desconhecida
      criadoEm: diasAtras(60),
      atualizadoEm: diasAtras(1),
    });

    batch.set(adminDb.collection('eventos').doc('retiro-bem-estar'), {
      id: 'retiro-bem-estar',
      tenantId: TENANT_ID,
      organizadorId: MARINA_UID,
      nome: 'Retiro Bem-Estar',
      data: ts(new Date('2026-05-23T09:00:00Z')), // 34 dias — fora do prazo de 14
      local: 'Campos do Jordão/SP',
      modalidades: ['3 dias'],
      slug: 'retiro-bem-estar',
      status: 'rascunho',
      usaChip: false,
      qtdInscritos: 312,
      receitaConfirmada: 16663,
      capacidade: 400,
      criadoEm: diasAtras(30),
      atualizadoEm: diasAtras(2),
    });

    // Clubes da Marina (∑ E05)
    batch.set(adminDb.collection('clubes').doc('corrida-perfeita-sul'), {
      id: 'corrida-perfeita-sul',
      tenantId: TENANT_ID,
      nome: 'Corrida Perfeita Sul',
      slug: 'corrida-perfeita-sul',
      visibilidade: 'privada',
      ownerId: MARINA_UID,
      qtdMembrosAtivos: 128,
      qtdDesafiosAtivos: 3,
    });

    // Ruído de outro profissional — NÃO pode vazar no dashboard da Marina
    batch.set(adminDb.collection('eventos').doc('evento-alheio'), {
      id: 'evento-alheio',
      tenantId: OUTRO_TENANT,
      organizadorId: OUTRO_UID,
      nome: 'Evento Alheio',
      slug: 'evento-alheio',
      status: 'publicado',
      qtdInscritos: 9999,
      receitaConfirmada: 999999,
      capacidade: 10000,
      atualizadoEm: diasAtras(0),
    });
    batch.set(adminDb.collection('clubes').doc('clube-alheio'), {
      id: 'clube-alheio',
      tenantId: OUTRO_TENANT,
      nome: 'Clube Alheio',
      slug: 'clube-alheio',
      visibilidade: 'privada',
      ownerId: OUTRO_UID,
      qtdMembrosAtivos: 777,
      qtdDesafiosAtivos: 9,
    });

    await batch.commit();
  }

  function dashboardRef() {
    return adminDb
      .collection('profissionais')
      .doc(MARINA_UID)
      .collection('dashboard')
      .doc('current');
  }

  // ── Aceites principais ────────────────────────────────────────────────────

  it('aceite: grava current com 1.284 / 142.280 / vagasRestantes 47 + risco na Meia', async () => {
    const current = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);

    expect(current.inscricoesTotais).toBe(1284);
    expect(current.receitaConfirmada).toBe(142280);
    expect(current.vagasRestantes).toBe(47);
    expect(current.eventoEmRisco).toEqual({
      nome: 'Meia Maratona Floripa',
      slug: 'meia-floripa-2026',
    });
    expect(current.taxaConversaoPct).toBeNull();
    expect(current.membrosAtivosTotais).toBe(128);
    expect(current.desafiosAtivosTotais).toBe(3);

    const snap = await dashboardRef().get();
    expect(snap.exists).toBe(true);
    expect(snap.get('inscricoesTotais')).toBe(1284);
    expect(snap.get('vagasRestantes')).toBe(47);
    expect(snap.get('computadoEm')).toBe(AGORA.getTime());
  });

  it('aceite: reprocessar o gatilho não duplica (idempotência por substituição)', async () => {
    const primeira = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);
    const segunda = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);

    // Mesmo instante → conteúdo idêntico byte a byte (nada de increment)
    expect(segunda).toEqual(primeira);

    const snap = await dashboardRef().get();
    expect(snap.get('inscricoesTotais')).toBe(1284); // não virou 2.568
    expect(snap.get('receitaConfirmada')).toBe(142280);
    expect(snap.get('membrosAtivosTotais')).toBe(128);
  });

  it('escopo: eventos/clubes de outro profissional não vazam', async () => {
    const current = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);
    expect(current.inscricoesTotais).toBe(1284); // sem os 9.999 alheios
    expect(current.membrosAtivosTotais).toBe(128); // sem os 777 alheios

    const alheio = await recomputeProfessionalDashboard(adminDb, OUTRO_UID, AGORA);
    expect(alheio.inscricoesTotais).toBe(9999);
    expect(alheio.membrosAtivosTotais).toBe(777);
  });

  it('estado vazio honesto: profissional sem eventos/clubes → zeros e nulls', async () => {
    const current = await recomputeProfessionalDashboard(adminDb, 'uid-novato', AGORA);
    expect(current.inscricoesTotais).toBe(0);
    expect(current.receitaConfirmada).toBe(0);
    expect(current.vagasRestantes).toBe(0);
    expect(current.eventoEmRisco).toBeNull();
    expect(current.inscricoesTrendPct).toBeNull();
    expect(current.alerts).toEqual([]);
  });

  // ── Capacidade: Σ kits quando o evento não declara ───────────────────────

  it('resolve capacidade via Σ kits.capacidade quando o evento não tem o campo', async () => {
    const serraRef = adminDb.collection('eventos').doc('desafio-serra-do-mar');
    await serraRef.collection('kits').doc('kit-60').set({
      tenantId: TENANT_ID, nome: 'Kit 60km', preco: 195, capacidade: 300, modalidades: ['60km'],
    });
    await serraRef.collection('kits').doc('kit-90').set({
      tenantId: TENANT_ID, nome: 'Kit 90km', preco: 245, capacidade: 300, modalidades: ['90km'],
    });

    const current = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);
    // serra: 600 − 519 = 81 vagas; meia segue com 47 → 128 totais
    expect(current.vagasRestantes).toBe(128);
    // serra agora tem 86,5% (< 90%) — risco continua sendo a Meia (90,6%)
    expect(current.eventoEmRisco?.slug).toBe('meia-floripa-2026');
  });

  // ── Trends por janela de criadoEm ────────────────────────────────────────

  it('trend de inscrições: janela 7d atual vs. 7d anterior', async () => {
    const inscritos = adminDb
      .collection('eventos')
      .doc('meia-floripa-2026')
      .collection('inscritos');

    const base = {
      tenantId: TENANT_ID,
      atletaId: 'uid-a',
      atletaNome: 'Atleta',
      kit: 'kit_basico',
      chipNumero: null,
      status: 'confirmado',
      modalidade: '10k',
    };
    // 2 na janela atual (3 dias atrás), 1 na anterior (10 dias atrás)
    await inscritos.doc('i1').set({ ...base, criadoEm: diasAtras(3) });
    await inscritos.doc('i2').set({ ...base, criadoEm: diasAtras(3) });
    await inscritos.doc('i3').set({ ...base, criadoEm: diasAtras(10) });

    const current = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);
    expect(current.inscricoesTrendPct).toBe(100); // (2−1)/1
    expect(current.receitaTrendPct).toBeNull(); // sem série financeira na Onda 1
  });

  // ── Alertas server-side ──────────────────────────────────────────────────

  it('alertas: ocupação ≥ 90% (warn) + pendentes > 24h (info); recentes primeiro', async () => {
    const inscritos = adminDb
      .collection('eventos')
      .doc('meia-floripa-2026')
      .collection('inscritos');
    const base = {
      tenantId: TENANT_ID,
      atletaId: 'uid-p',
      atletaNome: 'Pendente',
      kit: 'sem_kit',
      chipNumero: null,
      status: 'pendente',
      modalidade: '5k',
    };
    // 3 pendentes > 24h + 1 pendente recente (fora do corte)
    await inscritos.doc('p1').set({ ...base, criadoEm: diasAtras(2) });
    await inscritos.doc('p2').set({ ...base, criadoEm: diasAtras(2) });
    await inscritos.doc('p3').set({ ...base, criadoEm: diasAtras(3) });
    await inscritos.doc('p4').set({
      ...base,
      criadoEm: ts(new Date(AGORA.getTime() - 60 * 60 * 1000)), // 1h — não conta
    });

    const current = await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);

    const ocupacao = current.alerts.find((a) => a.id === 'ocupacao-meia-floripa-2026');
    expect(ocupacao?.severidade).toBe('warn');
    expect(ocupacao?.titulo).toContain('90% das vagas preenchidas');

    const pendentes = current.alerts.find((a) => a.id === 'pendentes-24h');
    expect(pendentes?.severidade).toBe('info');
    expect(pendentes?.titulo).toContain('3 inscrições pendentes');
  });

  // ── getOverviewCore: fresco / stale / ausente ────────────────────────────

  it('getOverviewCore: doc ausente → recomputa on-demand e retorna', async () => {
    expect((await dashboardRef().get()).exists).toBe(false);

    const result = await getOverviewCore(adminDb, MARINA_UID, AGORA);
    expect(result.inscricoesTotais).toBe(1284);
    expect(result.vagasRestantes).toBe(47);
    expect(result.atualizadoEm).toBe(AGORA.getTime());
    expect((await dashboardRef().get()).exists).toBe(true);
  });

  it('getOverviewCore: doc fresco é servido SEM recomputação', async () => {
    await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);

    // Estado de origem muda, mas o doc segue fresco (dentro do TTL)
    await adminDb
      .collection('eventos')
      .doc('meia-floripa-2026')
      .update({ qtdInscritos: 460 });

    const logo = new Date(AGORA.getTime() + DASHBOARD_STALE_MS - 1000);
    const result = await getOverviewCore(adminDb, MARINA_UID, logo);
    expect(result.inscricoesTotais).toBe(1284); // snapshot fresco, sem re-scan
    expect(result.atualizadoEm).toBe(AGORA.getTime());
  });

  it('getOverviewCore: doc stale → recomputa e devolve estado novo', async () => {
    await recomputeProfessionalDashboard(adminDb, MARINA_UID, AGORA);
    await adminDb
      .collection('eventos')
      .doc('meia-floripa-2026')
      .update({ qtdInscritos: 460 });

    const depois = new Date(AGORA.getTime() + DASHBOARD_STALE_MS + 1000);
    const result = await getOverviewCore(adminDb, MARINA_UID, depois);
    expect(result.inscricoesTotais).toBe(1291); // 1284 − 453 + 460
    expect(result.atualizadoEm).toBe(depois.getTime());
  });
});
