/**
 * estoqueAprovisionamento.integration.test.ts — LEELA-S210-T2/T3 (FABLE-D)
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): aprovisionamento de kit
 * POR SKU (`eventos/{id}/aprovisionamento/{itemId__tamanho}`).
 *
 * Cobre (aceite E03-S210):
 *   - Σ qtdVendida por SKU = inscritos CONFIRMADOS com (item, tamanho)
 *     (RN-224); pendente/cancelado NÃO contam
 *   - IDEMPOTENTE: reprocessar produz os MESMOS docs (full recompute)
 *   - estorno (FABLE-B): flip confirmado→estornado REVERTE o consumo
 *   - máquina de estados estimativa→encomendado→em_estoque (RN-226) com
 *     historico[qtd, data]; atalho/regressão/replay REJEITADOS; em_estoque
 *     declara estoqueFisico e recomputa aEncomendar/alerta
 *   - recompute PRESERVA estado operacional (estado/estoqueFisico/historico)
 *   - guards da callable: papel (RN-401), cross-tenant (RN-400), SKU
 *     inexistente, input inválido
 *   - Rules: escrita de cliente NEGADA (até owner); leitura SÓ owner/staff
 *     do tenant dono (promoter/athlete/cross-tenant/unauth negados)
 *   - Rules itensKit: modeloEstoque fora do enum / tamanhosDisponiveis
 *     não-lista negados; config válida do organizador passa
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
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
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AuthClaims } from '@leela/core';
import {
  encerrarEncomendasItemCore,
  recomputarAprovisionamentoEvento,
  transicaoAprovisionamentoCore,
} from '../eventos/agregarEstoque';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-estoque';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_ID = 'meia-floripa-2026';
const MARINA_UID = 'uid-marina';

const CAMISETA = 'camiseta-tecnica';
const SKU_M = `${CAMISETA}__M`;

/** Organizador do tenant dono (papel de escrita — RN-401). */
const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

function aprovRef(sku: string) {
  return db.doc(`eventos/${EVENTO_ID}/aprovisionamento/${sku}`);
}

function mkInscritoDoc(
  id: string,
  status: string,
  kit: string,
  tamanhos: Record<string, string>
): Record<string, unknown> {
  const now = Timestamp.now();
  return {
    id, tenantId: TENANT_ID, atletaId: `atleta-${id}`, atletaNome: `Atleta ${id}`,
    kit, chipNumero: null, status, modalidade: '10k', tamanhos,
    criadoEm: now, atualizadoEm: now,
  };
}

/**
 * Seed enxuto e determinístico: camiseta tamanhada (P/M/G/GG) + item único +
 * 6 inscritos com (status, tamanho) explícitos.
 * Esperado por SKU (confirmados): P=0 · M=2 · G=1 · GG=0.
 */
async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo Eventos', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', data: Timestamp.fromDate(new Date('2026-04-27T07:00:00-03:00')),
    local: 'Florianópolis/SC', modalidades: ['5k', '10k', '21k'], slug: EVENTO_ID,
    status: 'publicado', usaChip: true, qtdInscritos: 6, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  // Item TAMANHADO (gera SKUs) + item único (NÃO gera SKU)
  batch.set(db.collection('itensKit').doc(CAMISETA), {
    id: CAMISETA, tenantId: TENANT_ID, eventoId: EVENTO_ID,
    nome: 'Camiseta técnica Be Hero', tamanhado: true, origem: 'organizador',
    exibirLogo: false, modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: ['P', 'M', 'G', 'GG'], kits: ['kit_prata', 'kit_basico'],
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.collection('itensKit').doc('sacochila-evento'), {
    id: 'sacochila-evento', tenantId: TENANT_ID, eventoId: EVENTO_ID,
    nome: 'Sacochila do evento', tamanhado: false, origem: 'patrocinador',
    marca: 'Olympikus', exibirLogo: true, modeloEstoque: 'estoque_proprio',
    tamanhosDisponiveis: [], kits: ['kit_ouro', 'kit_prata'],
    criadoEm: now, atualizadoEm: now,
  });
  const inscritos = eventoRef.collection('inscritos');
  batch.set(inscritos.doc('i1'), mkInscritoDoc('i1', 'confirmado', 'kit_prata', { [CAMISETA]: 'M' }));
  batch.set(inscritos.doc('i2'), mkInscritoDoc('i2', 'confirmado', 'kit_prata', { [CAMISETA]: 'M' }));
  batch.set(inscritos.doc('i3'), mkInscritoDoc('i3', 'confirmado', 'kit_basico', { [CAMISETA]: 'G' }));
  // NÃO contam (RN-224 — só confirmado consome):
  batch.set(inscritos.doc('i4'), mkInscritoDoc('i4', 'pendente', 'kit_prata', { [CAMISETA]: 'M' }));
  batch.set(inscritos.doc('i5'), mkInscritoDoc('i5', 'cancelado', 'kit_basico', { [CAMISETA]: 'G' }));
  // Sem item tamanhado no kit → nenhum SKU:
  batch.set(inscritos.doc('i6'), mkInscritoDoc('i6', 'confirmado', 'kit_ouro', {}));
  await batch.commit();
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
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

// ─────────────────────────────────────────────────────────────────────────────
// Σ por SKU (RN-224) — recompute idempotente
// ─────────────────────────────────────────────────────────────────────────────

describe('recomputarAprovisionamentoEvento (Σ RN-224)', () => {
  it('conta SÓ confirmados por (item, tamanho); matriz = tamanhos declarados', async () => {
    const r = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    expect(r).not.toBeNull();
    expect(r?.skus).toBe(4); // P/M/G/GG — item único NÃO gera SKU
    expect(r?.vendidoPorSku).toEqual({
      [`${CAMISETA}__P`]: 0,
      [`${CAMISETA}__M`]: 2, // i1+i2 (i4 pendente fora)
      [`${CAMISETA}__G`]: 1, // i3 (i5 cancelado fora)
      [`${CAMISETA}__GG`]: 0,
    });

    const m = await aprovRef(SKU_M).get();
    expect(m.get('tenantId')).toBe(TENANT_ID);
    expect(m.get('itemId')).toBe(CAMISETA);
    expect(m.get('tamanho')).toBe('M');
    expect(m.get('estado')).toBe('estimativa'); // estado inicial (RN-226)
    expect(m.get('qtdVendida')).toBe(2);
    expect(m.get('estoqueFisico')).toBe(0);
    expect(m.get('aEncomendar')).toBe(2); // max(0, 2 − 0)
    expect(m.get('alerta')).toBeNull(); // sem estoque declarado → sem alerta
    expect(m.get('historico')).toEqual([]);
  });

  it('IDEMPOTENTE: reprocessar produz os MESMOS docs (nada acumula)', async () => {
    const a = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    const antes = (await aprovRef(SKU_M).get()).data();
    const b = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    const depois = (await aprovRef(SKU_M).get()).data();

    expect(b?.vendidoPorSku).toEqual(a?.vendidoPorSku);
    // Campos de dado idênticos (timestamps de manutenção fora da comparação)
    for (const campo of ['estado', 'qtdVendida', 'estoqueFisico', 'aEncomendar', 'alerta', 'historico']) {
      expect(depois?.[campo]).toEqual(antes?.[campo]);
    }
    expect(depois?.['criadoEm']).toEqual(antes?.['criadoEm']); // preservado
  });

  it('estorno (FABLE-B) REVERTE o consumo: confirmado→estornado sai do Σ', async () => {
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    expect((await aprovRef(SKU_M).get()).get('qtdVendida')).toBe(2);

    // Flip como a Function de estorno faz (status + carimbo, Admin SDK)
    await db.doc(`eventos/${EVENTO_ID}/inscritos/i1`).update({
      status: 'estornado',
      estornadoEm: Timestamp.now(),
      pedidoRef: 'ped-qualquer',
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    const r = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    expect(r?.vendidoPorSku[SKU_M]).toBe(1);
    const m = await aprovRef(SKU_M).get();
    expect(m.get('qtdVendida')).toBe(1);
    expect(m.get('aEncomendar')).toBe(1);
  });

  it('SKU existente FORA do catálogo atual segue recontado (∪ docs existentes)', async () => {
    // Doc legado de tamanho removido do catálogo + inscrito confirmado XG
    await db.collection('eventos').doc(EVENTO_ID).collection('inscritos')
      .doc('i7').set(mkInscritoDoc('i7', 'confirmado', 'kit_prata', { [CAMISETA]: 'XG' }));
    await aprovRef(`${CAMISETA}__XG`).set({
      id: `${CAMISETA}__XG`, tenantId: TENANT_ID, itemId: CAMISETA, tamanho: 'XG',
      estado: 'estimativa', qtdVendida: 0, estoqueFisico: 0, aEncomendar: 0,
      alerta: null, historico: [],
      criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now(),
    });

    const r = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    expect(r?.skus).toBe(5);
    expect(r?.vendidoPorSku[`${CAMISETA}__XG`]).toBe(1);
  });

  it('evento inexistente → null (nada a manter)', async () => {
    expect(await recomputarAprovisionamentoEvento(db, 'evento-fantasma')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Máquina de estados (RN-226) — transições, declaração de estoque, alertas
// ─────────────────────────────────────────────────────────────────────────────

describe('transicaoAprovisionamento (RN-226)', () => {
  beforeEach(async () => {
    await recomputarAprovisionamentoEvento(db, EVENTO_ID); // materializa SKUs
  });

  it('caminho canônico: estimativa→encomendado→em_estoque com historico[qtd, data]', async () => {
    const r1 = await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: 10,
    }, organizador);
    expect(r1.estado).toBe('encomendado');
    expect(r1.estoqueFisico).toBe(0); // encomendar NÃO declara estoque
    expect(r1.aEncomendar).toBe(2);
    expect(r1.alerta).toBeNull();

    const r2 = await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'em_estoque', qtd: 3,
    }, organizador);
    expect(r2.estado).toBe('em_estoque');
    expect(r2.estoqueFisico).toBe(3); // em_estoque DECLARA o saldo (qtd recebida)
    expect(r2.aEncomendar).toBe(0); // max(0, 2 − 3)
    expect(r2.alerta).toBe('baixa'); // saldo 1 ≤ limiar default

    const snap = await aprovRef(SKU_M).get();
    const historico = snap.get('historico') as { estado: string; qtd: number; em: unknown }[];
    expect(historico).toHaveLength(2);
    expect(historico[0]).toMatchObject({ estado: 'encomendado', qtd: 10 });
    expect(historico[1]).toMatchObject({ estado: 'em_estoque', qtd: 3 });
    expect(historico[0]?.em).toBeTruthy(); // data registrada (RN-226)
  });

  it('atalho, regressão e replay são REJEITADOS pela matriz canônica', async () => {
    // Atalho estimativa→em_estoque
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'em_estoque', qtd: 3,
      }, organizador)
    ).rejects.toThrow(/RN-226/);

    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: 10,
    }, organizador);
    // Regressão encomendado→estimativa não existe no input... replay do mesmo:
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: 10,
      }, organizador)
    ).rejects.toThrow(/RN-226/);

    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'em_estoque', qtd: 3,
    }, organizador);
    // Terminal: replay de em_estoque NÃO re-declara estoque (idempotência
    // por máquina de estados — reexecutar não duplica efeito)
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'em_estoque', qtd: 999,
      }, organizador)
    ).rejects.toThrow(/terminal/);
    expect((await aprovRef(SKU_M).get()).get('estoqueFisico')).toBe(3);
  });

  it('recompute PRESERVA estado operacional e deriva esgotado com venda nova', async () => {
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: 10,
    }, organizador);
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'em_estoque', qtd: 3,
    }, organizador);

    // Nova venda M (3º confirmado) → recompute (o que o onWrite dispara)
    await db.collection('eventos').doc(EVENTO_ID).collection('inscritos')
      .doc('i8').set(mkInscritoDoc('i8', 'confirmado', 'kit_basico', { [CAMISETA]: 'M' }));
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);

    const m = await aprovRef(SKU_M).get();
    expect(m.get('estado')).toBe('em_estoque'); // preservado
    expect(m.get('estoqueFisico')).toBe(3); // preservado
    expect((m.get('historico') as unknown[])).toHaveLength(2); // preservado
    expect(m.get('qtdVendida')).toBe(3); // recomputado
    expect(m.get('aEncomendar')).toBe(0); // max(0, 3 − 3)
    expect(m.get('alerta')).toBe('esgotado'); // saldo 0 — derivado de dado real
  });

  it('guards: papel (RN-401), cross-tenant (RN-400), SKU inexistente, input inválido', async () => {
    const atleta: EventoCaller = {
      uid: 'uid-atleta',
      claims: { role: 'athlete', tenantId: TENANT_ID } as AuthClaims,
    };
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: 1,
      }, atleta)
    ).rejects.toThrow(/RN-401/);

    const outroTenant: EventoCaller = {
      uid: 'uid-passo-owner',
      claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims,
    };
    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: 1,
      }, outroTenant)
    ).rejects.toThrow(/outro tenant/);

    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: 'inexistente__P', novoEstado: 'encomendado', qtd: 1,
      }, organizador)
    ).rejects.toThrow(/sem aprovisionamento/);

    await expect(
      transicaoAprovisionamentoCore(db, {
        eventoId: EVENTO_ID, sku: SKU_M, novoEstado: 'encomendado', qtd: -1,
      }, organizador)
    ).rejects.toThrow(/qtd/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rules — escrita NUNCA pelo cliente; leitura só gestão do tenant dono
// ─────────────────────────────────────────────────────────────────────────────

describe('Rules de aprovisionamento (S210-T2)', () => {
  beforeEach(async () => {
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);
  });

  const path = () => `eventos/${EVENTO_ID}/aprovisionamento/${SKU_M}`;

  it('owner e staff do tenant dono LEEM', async () => {
    const owner = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    const staff = dbAs('uid-staff', { role: 'tenant_staff', tenantId: TENANT_ID });
    await assertSucceeds(getDoc(doc(owner, path())));
    await assertSucceeds(getDoc(doc(staff, path())));
  });

  it('promoter, athlete-com-claim, outro tenant e unauth NÃO leem', async () => {
    const promoter = dbAs('uid-promoter', { role: 'promoter', tenantId: TENANT_ID });
    const athlete = dbAs('uid-athlete', { role: 'athlete', tenantId: TENANT_ID });
    const outro = dbAs('uid-passo-owner', { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID });
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(promoter, path())));
    await assertFails(getDoc(doc(athlete, path())));
    await assertFails(getDoc(doc(outro, path())));
    await assertFails(getDoc(doc(anon, path())));
  });

  it('NENHUM cliente escreve — nem o owner (∑ e estado são de Function)', async () => {
    const owner = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    await assertFails(updateDoc(doc(owner, path()), { qtdVendida: 0 }));
    await assertFails(updateDoc(doc(owner, path()), { estado: 'em_estoque' }));
    await assertFails(deleteDoc(doc(owner, path())));
    await assertFails(
      setDoc(doc(owner, `eventos/${EVENTO_ID}/aprovisionamento/forjado__M`), {
        id: 'forjado__M', tenantId: TENANT_ID, itemId: 'forjado', tamanho: 'M',
        estado: 'em_estoque', qtdVendida: 0, estoqueFisico: 9999, aEncomendar: 0,
        alerta: null, historico: [],
      })
    );
  });
});

describe('Rules de itensKit — shape RN-225/223 (S210-T1)', () => {
  it('config válida do organizador passa; enum/shape inválidos negados', async () => {
    const owner = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    const ref = doc(owner, `itensKit/${CAMISETA}`);
    await assertSucceeds(
      updateDoc(ref, { modeloEstoque: 'estoque_proprio', tamanhosDisponiveis: ['P', 'M'] })
    );
    await assertFails(updateDoc(ref, { modeloEstoque: 'dropshipping' }));
    await assertFails(updateDoc(ref, { tamanhosDisponiveis: 'P' }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grade por corte (RN-231) + encerrar encomendas (RN-232) — TAMANHOS-GRADE
// ─────────────────────────────────────────────────────────────────────────────

describe('grade por corte (RN-231) — SKUs 2D, retrocompat e estorno', () => {
  const REGATA = 'regata-corte';

  /** Item com grade mista (feminina/masculina/unissex) + inscritos com sufixo. */
  async function seedGrade(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await db.collection('itensKit').doc(REGATA).set({
      id: REGATA, tenantId: TENANT_ID, eventoId: EVENTO_ID,
      nome: 'Regata por corte', tamanhado: true, origem: 'organizador',
      exibirLogo: false, modeloEstoque: 'sob_encomenda',
      tamanhosDisponiveis: ['P', 'M', 'U'], // união — superfície legada
      grade: [
        { corte: 'feminina', tamanhos: ['P', 'M'] },
        { corte: 'masculina', tamanhos: ['M'] },
        { corte: 'unissex', tamanhos: ['U'] },
      ],
      kits: ['kit_prata'], criadoEm: now, atualizadoEm: now,
    });
    const inscritos = db.collection('eventos').doc(EVENTO_ID).collection('inscritos');
    await inscritos.doc('g1').set(mkInscritoDoc('g1', 'confirmado', 'kit_prata', { [REGATA]: 'feminina__M' }));
    await inscritos.doc('g2').set(mkInscritoDoc('g2', 'confirmado', 'kit_prata', { [REGATA]: 'feminina__M' }));
    await inscritos.doc('g3').set(mkInscritoDoc('g3', 'confirmado', 'kit_prata', { [REGATA]: 'masculina__M' }));
    await inscritos.doc('g4').set(mkInscritoDoc('g4', 'confirmado', 'kit_prata', { [REGATA]: 'U' }));
    await inscritos.doc('g5').set(mkInscritoDoc('g5', 'pendente', 'kit_prata', { [REGATA]: 'feminina__P' }));
  }

  it('grade gera SKUs 3-segmentos (unissex mantém 2) e conta pelo SUFIXO', async () => {
    await seedGrade();
    const r = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    // camiseta legada P/M/G/GG (4) + regata feminina P/M + masculina M + unissex U (4)
    expect(r?.skus).toBe(8);
    expect(r?.vendidoPorSku[`${REGATA}__feminina__M`]).toBe(2);
    expect(r?.vendidoPorSku[`${REGATA}__feminina__P`]).toBe(0); // pendente fora
    expect(r?.vendidoPorSku[`${REGATA}__masculina__M`]).toBe(1);
    expect(r?.vendidoPorSku[`${REGATA}__U`]).toBe(1); // linha unissex = chave legada
    // retrocompat: SKUs legados da camiseta intactos (mesmas chaves de sempre)
    expect(r?.vendidoPorSku[SKU_M]).toBe(2);

    const fm = await aprovRef(`${REGATA}__feminina__M`).get();
    expect(fm.get('corte')).toBe('feminina');
    expect(fm.get('itemId')).toBe(REGATA);
    expect(fm.get('tamanho')).toBe('M');
    expect(fm.get('qtdVendida')).toBe(2);
    expect((await aprovRef(`${REGATA}__U`).get()).get('corte')).toBe('unissex');
    // doc legado (camiseta) também ganha corte unissex no recompute
    expect((await aprovRef(SKU_M).get()).get('corte')).toBe('unissex');
  });

  it('estorno REVERTE o consumo 2D (confirmado→estornado no corte certo)', async () => {
    await seedGrade();
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    await db.doc(`eventos/${EVENTO_ID}/inscritos/g1`).update({
      status: 'estornado', estornadoEm: Timestamp.now(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    const r = await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    expect(r?.vendidoPorSku[`${REGATA}__feminina__M`]).toBe(1); // só g2
    expect(r?.vendidoPorSku[`${REGATA}__masculina__M`]).toBe(1); // intacto
    expect((await aprovRef(`${REGATA}__feminina__M`).get()).get('qtdVendida')).toBe(1);
  });

  it('máquina de estados funciona por SKU 3-segmentos (ajuste de estoque 2D)', async () => {
    await seedGrade();
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    const sku = `${REGATA}__feminina__M`;
    await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku, novoEstado: 'encomendado', qtd: 5,
    }, organizador);
    const r = await transicaoAprovisionamentoCore(db, {
      eventoId: EVENTO_ID, sku, novoEstado: 'em_estoque', qtd: 5,
    }, organizador);
    expect(r.estado).toBe('em_estoque');
    expect(r.estoqueFisico).toBe(5);
    expect(r.aEncomendar).toBe(0);
  });
});

describe('encerrarEncomendasItem (RN-232) — foto transacional + idempotência', () => {
  const REGATA = 'regata-corte';

  async function seedGradeComVendas(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    await db.collection('itensKit').doc(REGATA).set({
      id: REGATA, tenantId: TENANT_ID, eventoId: EVENTO_ID,
      nome: 'Regata por corte', tamanhado: true, origem: 'organizador',
      exibirLogo: false, modeloEstoque: 'sob_encomenda',
      tamanhosDisponiveis: ['P', 'M'],
      grade: [
        { corte: 'feminina', tamanhos: ['P', 'M'] },
        { corte: 'masculina', tamanhos: ['M'] },
      ],
      kits: ['kit_prata'], criadoEm: now, atualizadoEm: now,
    });
    const inscritos = db.collection('eventos').doc(EVENTO_ID).collection('inscritos');
    await inscritos.doc('g1').set(mkInscritoDoc('g1', 'confirmado', 'kit_prata', { [REGATA]: 'feminina__M' }));
    await inscritos.doc('g2').set(mkInscritoDoc('g2', 'confirmado', 'kit_prata', { [REGATA]: 'masculina__M' }));
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);
  }

  it('todos os SKUs do item em estimativa → encomendado com a FOTO vendida; outros itens intactos', async () => {
    await seedGradeComVendas();
    const r = await encerrarEncomendasItemCore(db, {
      eventoId: EVENTO_ID, itemId: REGATA,
    }, organizador);
    expect(r.itemId).toBe(REGATA);
    expect(r.encerrados.sort()).toEqual([
      `${REGATA}__feminina__M`,
      `${REGATA}__feminina__P`,
      `${REGATA}__masculina__M`,
    ]);
    expect(r.jaEncerrados).toEqual([]);

    const fm = await aprovRef(`${REGATA}__feminina__M`).get();
    expect(fm.get('estado')).toBe('encomendado');
    const hist = fm.get('historico') as { estado: string; qtd: number }[];
    expect(hist).toHaveLength(1);
    expect(hist[0]).toMatchObject({ estado: 'encomendado', qtd: 1 }); // foto = vendido
    // SKU sem venda encerra com foto 0
    const fp = await aprovRef(`${REGATA}__feminina__P`).get();
    expect((fp.get('historico') as { qtd: number }[])[0]?.qtd).toBe(0);
    // item NÃO alvo (camiseta) segue em estimativa
    expect((await aprovRef(SKU_M).get()).get('estado')).toBe('estimativa');
  });

  it('IDEMPOTENTE: re-invocar pula SKUs já encerrados (nada duplica no historico)', async () => {
    await seedGradeComVendas();
    await encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: REGATA }, organizador);
    const r2 = await encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: REGATA }, organizador);
    expect(r2.encerrados).toEqual([]);
    expect(r2.jaEncerrados).toHaveLength(3);
    const fm = await aprovRef(`${REGATA}__feminina__M`).get();
    expect(fm.get('historico') as unknown[]).toHaveLength(1);
  });

  it('encerrar NÃO trava a venda: compra posterior segue contando (aEncomendar mostra a diferença)', async () => {
    await seedGradeComVendas();
    await encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: REGATA }, organizador);
    // venda NOVA depois do encerramento — permitida (encerrar ≠ fechar vendas)
    await db.collection('eventos').doc(EVENTO_ID).collection('inscritos')
      .doc('g9').set(mkInscritoDoc('g9', 'confirmado', 'kit_prata', { [REGATA]: 'feminina__M' }));
    await recomputarAprovisionamentoEvento(db, EVENTO_ID);
    const fm = await aprovRef(`${REGATA}__feminina__M`).get();
    expect(fm.get('estado')).toBe('encomendado'); // preservado
    expect(fm.get('qtdVendida')).toBe(2); // recomputado — venda NÃO travou
    expect(fm.get('aEncomendar')).toBe(2); // diferença aparece aqui
    expect((fm.get('historico') as { qtd: number }[])[0]?.qtd).toBe(1); // foto imutável
  });

  it('guards: papel (RN-401), cross-tenant (RN-400), item sem SKUs, input inválido', async () => {
    await seedGradeComVendas();
    const atleta: EventoCaller = {
      uid: 'uid-atleta', claims: { role: 'athlete', tenantId: TENANT_ID } as AuthClaims,
    };
    await expect(
      encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: REGATA }, atleta)
    ).rejects.toThrow(/RN-401/);

    const outroTenant: EventoCaller = {
      uid: 'uid-passo-owner', claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims,
    };
    await expect(
      encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: REGATA }, outroTenant)
    ).rejects.toThrow(/outro tenant/);

    await expect(
      encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: 'item-sem-skus' }, organizador)
    ).rejects.toThrow(/sem SKUs/);

    await expect(
      encerrarEncomendasItemCore(db, { eventoId: EVENTO_ID, itemId: 'a__b' }, organizador)
    ).rejects.toThrow(/itemId/);
  });
});

describe('Rules de itensKit — shape da grade (RN-231)', () => {
  it('grade válida do organizador passa; não-lista/vazia/em item não tamanhado negadas', async () => {
    const owner = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    const camiseta = doc(owner, `itensKit/${CAMISETA}`);
    await assertSucceeds(
      updateDoc(camiseta, {
        grade: [{ corte: 'feminina', tamanhos: ['P', 'M'] }],
        tamanhosDisponiveis: ['P', 'M'],
      })
    );
    await assertFails(updateDoc(camiseta, { grade: 'feminina' }));
    await assertFails(updateDoc(camiseta, { grade: [] }));
    // grade em item NÃO tamanhado negada (sacochila)
    const sacochila = doc(owner, 'itensKit/sacochila-evento');
    await assertFails(
      updateDoc(sacochila, { grade: [{ corte: 'unissex', tamanhos: ['U'] }] })
    );
  });
});
