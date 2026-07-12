/**
 * checkoutS1203.integration.test.ts — LEELA-S1203 (glue da UI de checkout)
 *
 * Prova os DOIS callables novos que a UI de 5 etapas consome, contra o
 * MockPaymentProvider (⚠️ EXIGE Firestore Emulator na 8080):
 *   - cotarInscricaoCheckoutCore  → cotação READ-ONLY (computeSaleState com os
 *     termos privados do tenant) para PIX e cartão parcelado; não escreve nada.
 *   - confirmarPagamentoSandboxCore → dispara o webhook ASSINADO e fecha
 *     pedido→pago / inscrito→confirmado; idempotente por pedido; ownership.
 *
 * Reusa a MESMA infra do checkoutFoundation.integration.test.ts (seed relativo
 * → lote 2 sempre vigente no run).
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createInscricaoChargeCore, type CreateInscricaoChargeInput } from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const ANA_UID = 'uid-ana-atleta';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: 'localhost', port: 8080 },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-marina',
    nome: 'Meia Maratona Floripa 2026', data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'], slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2, nome: 'Lote 2',
    inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 189.9, vendidos: 40,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('cupons').doc('HEROI10'), {
    id: 'HEROI10', tenantId: TENANT_ID, codigo: 'HEROI10', tipo: 'percentual', valor: 10,
    tetoUso: 100, inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0, criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('S1203 · cotarInscricaoCheckout (cotação read-only do Resumo)', () => {
  it('PIX: base 379,80 → −10% → 341,82; opções de parcelamento = só 1x', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ID,
      itens: [{ modalidade: '10k' }, { modalidade: '10k' }],
      forma: 'pix',
      parcelas: 1,
      cupomCodigo: 'heroi10',
    });
    expect(r.valorBase).toBe(379.8);
    expect(r.desconto).toBe(37.98);
    expect(r.valorFinal).toBe(341.82);
    expect(r.totalCobrado).toBe(341.82);
    expect(r.cupomAplicado).toMatchObject({ codigo: 'HEROI10', tipo: 'percentual', valor: 10 });
    expect(r.opcoesParcelamento).toHaveLength(1);
    expect(r.itens).toHaveLength(2);
    expect(r.itens[0]).toMatchObject({ modalidade: '10k', loteNome: 'Lote 2' });
  });

  it('Cartão: sem cupom, 3x com juros do termo; total > à vista', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_ID,
      itens: [{ modalidade: '10k' }],
      forma: 'cartao_credito',
      parcelas: 3,
    });
    expect(r.valorFinal).toBe(189.9);
    expect(r.parcelamento.parcelas).toBe(3);
    expect(r.totalCobrado).toBeGreaterThan(189.9); // juros repassados (RN-311)
    expect(r.opcoesParcelamento.length).toBeGreaterThan(1);
  });

  it('não escreve nada (nenhum pedido criado pela cotação)', async () => {
    const pedidos = await db.collection('pedidos').get();
    expect(pedidos.size).toBe(0);
  });

  it('venda fechada / cupom inexistente → erro acionável (invalid-argument)', async () => {
    await expect(
      cotarInscricaoCheckoutCore(db, {
        eventoId: EVENTO_ID, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
        cupomCodigo: 'NAOEXISTE',
      }),
    ).rejects.toThrow();
  });
});

describe('S1203 · confirmarPagamentoSandbox (fecha charge→webhook→confirmado)', () => {
  const KEY = 'chk-s1203-sandbox-0001';
  const input: CreateInscricaoChargeInput = {
    eventoId: EVENTO_ID,
    inscritos: [{ nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' }],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    forma: 'pix', parcelas: 1, idempotencyKey: KEY,
  };
  let pedidoId = '';

  it('cria a cobrança pendente e confirma via webhook assinado (sandbox)', async () => {
    const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
    pedidoId = charge.pedidoId;
    expect(charge.statusPedido).toBe('pendente');

    const r = await confirmarPagamentoSandboxCore(db, provider, { pedidoId }, { uid: ANA_UID });
    expect(r.statusGateway).toBe('confirmed');
    expect(r.statusPedido).toBe('pago');
    expect(r.duplicado).toBe(false);

    const inscritos = await db
      .collection(`eventos/${EVENTO_ID}/inscritos`)
      .where('pedidoRef', '==', pedidoId)
      .get();
    expect(inscritos.docs.map((d) => d.get('status'))).toEqual(['confirmado']);

    const evento = await db.doc(`eventos/${EVENTO_ID}`).get();
    expect(evento.get('receitaConfirmada')).toBe(189.9);
  });

  it('reenviar "confirmar" é idempotente (duplicado; receita não dobra)', async () => {
    const r = await confirmarPagamentoSandboxCore(db, provider, { pedidoId }, { uid: ANA_UID });
    expect(r.duplicado).toBe(true);
    const evento = await db.doc(`eventos/${EVENTO_ID}`).get();
    expect(evento.get('receitaConfirmada')).toBe(189.9); // NÃO dobrou
  });

  it('caller que não é o responsável → permission-denied', async () => {
    await expect(
      confirmarPagamentoSandboxCore(db, provider, { pedidoId }, { uid: 'uid-intruso' }),
    ).rejects.toThrow(/outro pagador/);
  });
});
