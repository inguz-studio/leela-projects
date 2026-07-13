/**
 * encerrarEventos.integration.test.ts — LEELA-E09s-L2-T6
 *
 * Cron de encerramento automático (core chamado direto, padrão ADR-007)
 * contra o Emulator. Prova os aceites falsificáveis do brief:
 *   - publicado/ao_vivo com data ANTERIOR a agora ⇒ 'encerrado' + carimbo;
 *   - evento FUTURO ⇒ intocado; dia DA PROVA ⇒ intocado; rascunho ⇒
 *     intocado; sem data válida ⇒ intocado (fail-safe);
 *   - RERUN no mesmo dia ⇒ idempotente: nenhuma transição dupla,
 *     `encerradoEm` não regravado, zero write;
 *   - o recompute de saldo (T1) observa o novo status ⇒ retido→0 do
 *     evento encerrado (RN-350) — disparado pelo PRÓPRIO cron;
 *   - ATAQUE anti-fraude: organizador tenta setar status='encerrado' via
 *     client SDK (liberaria o próprio retido) ⇒ Rules NEGAM
 *     (statusIntocado — ADR-005 review #18).
 *
 * Pré-requisito: Firestore Emulator na 8080 (via emulators:exec).
 */
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { encerrarEventosCore, deveEncerrar } from '../eventos/encerrarEventos';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const DIA_MS = 24 * 60 * 60 * 1000;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

async function seedEvento(
  id: string,
  status: string,
  dataEvento: Date | null,
  financeiro = false
): Promise<void> {
  await db.collection('eventos').doc(id).set({
    id, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: `Evento ${id}`, status,
    ...(dataEvento !== null ? { data: Timestamp.fromDate(dataEvento) } : {}),
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  if (financeiro) {
    await db.doc(`eventos/${id}/financeiro/current`).set({
      tenantId: CASTELO_ID, receitaBruta: 12000, taxaPct: 10.5,
      taxaValor: 2000, receitaLiquida: 10000,
      inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} },
      atualizadoEm: new Date(),
    });
  }
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
  db = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await db.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set({
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'uid-platform-admin', atualizadoEm: new Date(),
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('deveEncerrar — corte por dia civil (FUSO_EVENTO)', () => {
  it('ontem encerra; hoje (dia da prova) e amanhã NÃO', () => {
    const agora = new Date();
    expect(deveEncerrar(new Date(agora.getTime() - DIA_MS), agora)).toBe(true);
    expect(deveEncerrar(agora, agora)).toBe(false);
    expect(deveEncerrar(new Date(agora.getTime() + DIA_MS), agora)).toBe(false);
  });
});

describe('encerrarEventosCore — aceite T6 (RN-350 · decisão #6)', () => {
  it('publicado/ao_vivo com data passada ⇒ encerrado + carimbo; futuro/rascunho/sem-data ⇒ intocados', async () => {
    const agora = new Date();
    const ontem = new Date(agora.getTime() - DIA_MS);
    const semanaQueVem = new Date(agora.getTime() + 7 * DIA_MS);
    await seedEvento('ev-passado-pub', 'publicado', ontem);
    await seedEvento('ev-passado-vivo', 'ao_vivo', ontem);
    await seedEvento('ev-futuro', 'publicado', semanaQueVem);
    await seedEvento('ev-rascunho', 'rascunho', ontem);
    await seedEvento('ev-sem-data', 'publicado', null);

    const resultado = await encerrarEventosCore(db, agora);

    expect(resultado.encerrados.map((e) => e.eventoId).sort()).toEqual([
      'ev-passado-pub', 'ev-passado-vivo',
    ]);
    expect((await db.doc('eventos/ev-passado-pub').get()).get('status')).toBe('encerrado');
    expect((await db.doc('eventos/ev-passado-pub').get()).get('encerradoEm')).toBeTruthy();
    expect((await db.doc('eventos/ev-passado-vivo').get()).get('status')).toBe('encerrado');
    expect((await db.doc('eventos/ev-futuro').get()).get('status')).toBe('publicado');
    expect((await db.doc('eventos/ev-rascunho').get()).get('status')).toBe('rascunho');
    expect((await db.doc('eventos/ev-sem-data').get()).get('status')).toBe('publicado');
  });

  it('RERUN no mesmo dia ⇒ idempotente: zero transição nova, carimbo intocado', async () => {
    const agora = new Date();
    await seedEvento('ev-rerun', 'publicado', new Date(agora.getTime() - DIA_MS));

    const primeira = await encerrarEventosCore(db, agora);
    expect(primeira.encerrados).toHaveLength(1);
    const carimbo1 = (await db.doc('eventos/ev-rerun').get()).get('encerradoEm');

    const segunda = await encerrarEventosCore(db, agora);
    expect(segunda.encerrados).toHaveLength(0); // nenhuma transição dupla
    expect(segunda.tenantsRecomputados).toHaveLength(0);
    const carimbo2 = (await db.doc('eventos/ev-rerun').get()).get('encerradoEm');
    expect(carimbo2).toEqual(carimbo1); // carimbo NUNCA regravado
  });

  it('recompute do saldo (T1) observa o novo status: retido 1500 → 0, disponivel → 10000 (RN-350)', async () => {
    const agora = new Date();
    await seedEvento('ev-liquida', 'publicado', new Date(agora.getTime() - DIA_MS), true);

    // Antes do cron: evento aberto ⇒ retido 15% de 10000
    const { recomputarSaldoRepasse } = await import('../finance/updateSaldoRepasse');
    const antes = await recomputarSaldoRepasse(db, CASTELO_ID, agora);
    expect(antes.retido).toBe(1500);
    expect(antes.disponivel).toBe(8500);

    const resultado = await encerrarEventosCore(db, agora);
    expect(resultado.tenantsRecomputados).toEqual([CASTELO_ID]);

    // O PRÓPRIO cron recomputou — saldo/current já reflete retido→0
    const saldo = (await db.doc(`tenants/${CASTELO_ID}/saldo/current`).get()).data()!;
    expect(saldo['retido']).toBe(0);
    expect(saldo['disponivel']).toBe(10000);
  });

  it('ATAQUE anti-fraude — organizador seta status=encerrado via client p/ liberar o retido ⇒ Rules NEGAM', async () => {
    const agora = new Date();
    await seedEvento('ev-fraude', 'publicado', new Date(agora.getTime() + 30 * DIA_MS), true);

    const ownerDb = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    await assertFails(
      updateDoc(doc(ownerDb, 'eventos/ev-fraude'), { status: 'encerrado' })
    );
    // e o evento segue aberto — retenção preservada
    expect((await db.doc('eventos/ev-fraude').get()).get('status')).toBe('publicado');
  });
});
