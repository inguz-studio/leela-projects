/**
 * rn347Checkout.integration.test.ts — RN-347 · fio do checkout (taxa
 * incorporada vs repassada) PONTA A PONTA (⚠️ EXIGE Firestore Emulator 8080).
 *
 * Invariantes provadas contra o Emulator (as puras vivem em
 * rn347TaxaRepassada.test.ts):
 *   I1. Incorporada: total do comprador = face; receitaConfirmada = face;
 *       estorno devolve a linha face (REGRESSÃO — zero mudança).
 *   I2. Repassada: total = face + taxa (taxa do TERMO, server-side);
 *       receitaConfirmada segue FACE (a taxa nunca é receita do organizador);
 *       estorno devolve valorFinal + taxaRepassada da linha do inscrito.
 *   I3. Webhook/charge idempotentes: replay não dobra; amount forjado (sem a
 *       taxa) → 409; `taxaModo` forjado no payload do cliente é IGNORADO
 *       (o modo vem do DOC do evento).
 *   I4. Cotação NÃO vaza platformFeePct/taxa (scan do shape serializado).
 *   I5. Parcelamento Price congelado sobre o total do comprador.
 *
 * Porta: env `LEELA_FS_EMU_PORT` (default 8080 — convenção do repo).
 * Comando (memória 8GB — SÓ Firestore/Auth via emulators:exec):
 *   npx firebase emulators:exec --only firestore,auth --project demo-leela-s1203 \
 *     "npx vitest run src/__tests__/rn347Checkout.integration.test.ts"
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { roundMoney, type AuthClaims } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { cotarInscricaoCheckoutCore } from '../checkout/cotarInscricaoCheckout';
import { estornarInscricaoCore, ESTORNOS_SUBCOL } from '../checkout/estornarInscricao';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import { buildMockWebhookPayload, MockPaymentProvider } from '../payments/mockProvider';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
// MESMO projectId das suítes S1203 (Admin SDK é singleton por processo).
const PROJECT_ID = 'demo-leela-s1203';
const TENANT_ID = 'castelo-producoes';
const EVENTO_INC = 'rn347-evento-incorporada';
const EVENTO_REP = 'rn347-evento-repassada';
const ANA_UID = 'uid-ana-rn347';
const MARINA: { uid: string; claims: AuthClaims } = {
  uid: 'uid-marina-rn347',
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

// Face 189.90 · fee 10,5% ⇒ taxa 19.94 · total repassada (PIX) 209.84
const FACE = 189.9;
const TAXA = 19.94;
const TOTAL_REP = 209.84;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA.uid, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  // Dois eventos IDÊNTICOS exceto o modo da taxa: o A/B da RN-347.
  for (const [eventoId, taxaModo] of [
    [EVENTO_INC, undefined],
    [EVENTO_REP, 'repassada'],
  ] as const) {
    const eventoRef = db.collection('eventos').doc(eventoId);
    batch.set(eventoRef, {
      id: eventoId, tenantId: TENANT_ID, organizadorId: MARINA.uid,
      nome: `RN-347 ${eventoId}`, data: tsRel(45), local: 'Florianópolis/SC',
      modalidades: ['10k'], slug: eventoId, status: 'publicado', usaChip: true,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
      ...(taxaModo !== undefined ? { taxaModo } : {}),
    });
    batch.set(eventoRef.collection('lotes').doc(`${eventoId}-10k-l2`), {
      id: `${eventoId}-10k-l2`, tenantId: TENANT_ID, modalidade: '10k', ordem: 2,
      nome: 'Lote 2', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 40, criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('cupons').doc('HEROI10'), {
      id: 'HEROI10', tenantId: TENANT_ID, codigo: 'HEROI10', tipo: 'percentual', valor: 10,
      tetoUso: 100, inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0,
      criadoEm: now, atualizadoEm: now,
    });
  }
  await batch.commit();
}

const inscritoAna = {
  nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k',
};
const inscritoBia = {
  nome: 'Bia Lima', email: 'bia@exemplo.com', cpf: '111.444.777-35', modalidade: '10k',
};

const baseInput = (eventoId: string, key: string): CreateInscricaoChargeInput => ({
  eventoId,
  inscritos: [inscritoAna],
  responsavelIndex: 0,
  responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
  aceites: { termos: true, saude: true },
  forma: 'pix', parcelas: 1, idempotencyKey: key,
});

async function receita(eventoId: string): Promise<number> {
  return (await db.doc(`eventos/${eventoId}`).get()).get('receitaConfirmada') as number;
}

/** Confirma o pagamento pelo webhook ASSINADO (a única porta financeira). */
async function confirmar(pedidoId: string, chargeId: string, amount: number, eventId: string) {
  return processarWebhookPagamento(
    db,
    provider,
    buildMockWebhookPayload('charge.confirmed', { chargeId, orderId: pedidoId, amount, eventId })
  );
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: HOST, port: PORT },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `${HOST}:${PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  delete process.env['ASAAS_API_KEY'];
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// =============================================================================
// I4 + I2 — Cotação: valores certos por modo, SEM vazar o termo privado
// =============================================================================
describe('RN-347 · cotação por modo (I2/I4)', () => {
  it('incorporada: totalCobrado = face; taxaServico 0 (regressão I1)', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_INC, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
    });
    expect(r.totalCobrado).toBe(FACE);
    expect(r.taxaServico).toBe(0);
    expect(r.totalAVista).toBe(FACE);
  });

  it('repassada: totalCobrado = face + taxa; taxaServico = VALOR da taxa', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_REP, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
    });
    expect(r.taxaServico).toBe(TAXA);
    expect(r.totalCobrado).toBe(TOTAL_REP);
    expect(r.totalAVista).toBe(TOTAL_REP);
    expect(r.valorFinal).toBe(FACE); // face preservado (organizador)
  });

  it('shape da cotação NUNCA vaza platformFeePct/taxa do termo (scan serializado — I4)', async () => {
    for (const eventoId of [EVENTO_INC, EVENTO_REP]) {
      const r = await cotarInscricaoCheckoutCore(db, {
        eventoId, itens: [{ modalidade: '10k' }], forma: 'cartao_credito', parcelas: 3,
      });
      const json = JSON.stringify(r);
      expect(json).not.toMatch(/platformFeePct/);
      expect(json).not.toMatch(/"taxa"\s*:/); // repasse do organizador
      expect(json).not.toContain('10.5'); // o % do termo em NENHUMA forma
    }
  });

  it('FORJA: taxaModo no payload da cotação é IGNORADO — modo vem do DOC (I3)', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_REP, itens: [{ modalidade: '10k' }], forma: 'pix', parcelas: 1,
      // Cliente hostil tenta rebaixar para 'incorporada' e pagar só o face:
      taxaModo: 'incorporada',
    } as never);
    expect(r.totalCobrado).toBe(TOTAL_REP); // continuou face + taxa
    expect(r.taxaServico).toBe(TAXA);
  });

  it('I5 — repassada + cartão 3x: Price sobre (face + taxa), não sobre o face', async () => {
    const r = await cotarInscricaoCheckoutCore(db, {
      eventoId: EVENTO_REP, itens: [{ modalidade: '10k' }], forma: 'cartao_credito', parcelas: 3,
    });
    const esperado = roundMoney(TOTAL_REP * Math.pow(1.0349, 3));
    expect(r.parcelamento.valorTotal).toBe(esperado);
    expect(r.totalCobrado).toBe(esperado);
    // Sobre o face daria MENOS — provaria a base errada
    expect(esperado).toBeGreaterThan(roundMoney(FACE * Math.pow(1.0349, 3)));
  });
});

// =============================================================================
// I2 + I3 — Charge: valor congelado com a taxa; forja e replay inertes
// =============================================================================
describe('RN-347 · createInscricaoCharge (I2/I3)', () => {
  it('repassada: gatewayAmountCentavos congela face + taxa; docs decompostos', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_REP, 'rn347-rep-0001'), { uid: ANA_UID });
    expect(charge.valores.taxaServico).toBe(TAXA);
    expect(charge.valores.totalCobrado).toBe(TOTAL_REP);
    expect(charge.valores.valorFinal).toBe(FACE);

    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(20984);
    expect(pag.get('taxaRepassada')).toBe(TAXA);
    expect(pag.get('valorFinal')).toBe(FACE); // face (equação A1 intacta)

    const ped = await db.collection('pedidos').doc(charge.pedidoId).get();
    expect(ped.get('valorTotal')).toBe(FACE);
    const itens = ped.get('itens') as { valorFinal: number; taxaRepassada?: number }[];
    expect(itens[0]?.valorFinal).toBe(FACE);
    expect(itens[0]?.taxaRepassada).toBe(TAXA);
  });

  it('incorporada (regressão I1): centavos = face; docs SEM campo novo', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_INC, 'rn347-inc-0001'), { uid: ANA_UID });
    expect(charge.valores.taxaServico).toBe(0);
    expect(charge.valores.totalCobrado).toBe(FACE);
    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(18990);
    expect(pag.get('taxaRepassada')).toBeUndefined();
    const itens = (await db.collection('pedidos').doc(charge.pedidoId).get())
      .get('itens') as Record<string, unknown>[];
    expect(itens[0]).not.toHaveProperty('taxaRepassada');
  });

  it('FORJA no create: taxaModo do payload é ignorado — cobrança sai do DOC (I3)', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider,
      { ...baseInput(EVENTO_REP, 'rn347-forja-0001'), taxaModo: 'incorporada' } as never,
      { uid: ANA_UID });
    expect(charge.valores.totalCobrado).toBe(TOTAL_REP); // não rebaixou
    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(20984);
  });

  it('replay da MESMA chave: mesmo pedido, MESMOS centavos (nunca recomputa — I3)', async () => {
    const primeira = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_REP, 'rn347-replay-0001'), { uid: ANA_UID });
    const replay = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_REP, 'rn347-replay-0001'), { uid: ANA_UID });
    expect(replay.pedidoId).toBe(primeira.pedidoId);
    expect(replay.chargeId).toBe(primeira.chargeId);
    expect(replay.valores.totalCobrado).toBe(TOTAL_REP);
    expect(replay.valores.taxaServico).toBe(TAXA);
  });

  it('I5 — cartão 3x repassada: centavos congelados do total COM juros sobre face+taxa', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider,
      {
        ...baseInput(EVENTO_REP, 'rn347-card3x-001'),
        forma: 'cartao_credito', parcelas: 3,
      },
      { uid: ANA_UID });
    const esperado = roundMoney(TOTAL_REP * Math.pow(1.0349, 3));
    expect(charge.valores.totalCobrado).toBe(esperado);
    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(Math.round(esperado * 100));
  });
});

// =============================================================================
// I1/I2/I3 — Webhook: integridade do amount; receita = FACE; replay não dobra
// =============================================================================
describe('RN-347 · webhook (I3) + receita FACE (I1/I2)', () => {
  it('repassada: webhook com amount SEM a taxa (forjado) → 409; com a taxa → confirma; receita = FACE', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_REP, 'rn347-hook-0001'), { uid: ANA_UID });
    const receitaAntes = await receita(EVENTO_REP);

    // Assinado mas com o valor ERRADO (face sem taxa): integridade nega.
    await expect(
      confirmar(charge.pedidoId, charge.chargeId, 18990, 'evt-rn347-forjado')
    ).rejects.toThrow(/diverge/);
    expect(await receita(EVENTO_REP)).toBe(receitaAntes);

    // Valor certo (face + taxa em centavos): confirma…
    const ok = await confirmar(charge.pedidoId, charge.chargeId, 20984, 'evt-rn347-ok');
    expect(ok.ignorado).toBe(false);
    // …e a receita do ORGANIZADOR sobe o FACE (a taxa não é receita dele).
    expect(await receita(EVENTO_REP)).toBe(roundMoney(receitaAntes + FACE));

    // Replay da MESMA entrega: zero efeito (não dobra — I3).
    const replay = await confirmar(charge.pedidoId, charge.chargeId, 20984, 'evt-rn347-ok');
    expect(replay.duplicado).toBe(true);
    expect(await receita(EVENTO_REP)).toBe(roundMoney(receitaAntes + FACE));
  });
});

// =============================================================================
// I2 — Estorno por inscrito: devolve o PAGO (face + taxa); contabilidade FACE
// =============================================================================
describe('RN-347 · estorno devolve o que o inscrito PAGOU (I2)', () => {
  let pedidoId = '';
  let pagamentoId = '';
  let inscritoIds: string[] = [];
  // Grupo de 2 no evento REPASSADA com cupom 10%:
  // base 379.80 · desconto 37.98 · final 341.82 · taxa 35.89 · total 377.71
  // linhas: valorFinal 170.91/170.91 · taxaRepassada 17.95/17.94 (maior resto)
  const LINHA_FACE = 170.91;

  beforeAll(async () => {
    const charge = await createInscricaoChargeCore(
      db, provider,
      {
        eventoId: EVENTO_REP,
        inscritos: [inscritoAna, inscritoBia],
        responsavelIndex: 0,
        responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
        aceites: { termos: true, saude: true },
        forma: 'pix', parcelas: 1, cupomCodigo: 'HEROI10',
        idempotencyKey: 'rn347-grupo-0001',
      },
      { uid: ANA_UID });
    pedidoId = charge.pedidoId;
    pagamentoId = charge.pagamentoId;
    inscritoIds = charge.inscritoIds;
    expect(charge.valores.totalCobrado).toBe(377.71);
    await confirmar(pedidoId, charge.chargeId, 37771, 'evt-rn347-grupo');
  }, 60_000);

  it('estorno da linha 1: devolve valorFinal + taxaRepassada; receita/estornadoTotal revertem SÓ o face', async () => {
    const receitaAntes = await receita(EVENTO_REP);
    const r = await estornarInscricaoCore(
      db, provider,
      { pedidoId, inscritoId: inscritoIds[0], motivo: 'teste RN-347 linha 1' },
      MARINA);
    expect(r.duplicado).toBe(false);
    expect(r.valorEstornado).toBe(roundMoney(LINHA_FACE + 17.95)); // 188.86 (pago)
    expect(r.pagamentoEstornadoIntegral).toBe(false);

    // Contabilidade do ORGANIZADOR: FACE (a taxa nunca entrou na receita)
    expect(await receita(EVENTO_REP)).toBe(roundMoney(receitaAntes - LINHA_FACE));
    const pag = await db.collection('pagamentos').doc(pagamentoId).get();
    expect(pag.get('estornadoTotal')).toBe(LINHA_FACE);
    expect(pag.get('status')).toBe('confirmado'); // parcial — não flipa

    // Ledger congela os DOIS valores (auditoria da decisão RN-347)
    const ledger = await db.collection('pagamentos').doc(pagamentoId)
      .collection(ESTORNOS_SUBCOL).doc(inscritoIds[0] as string).get();
    expect(ledger.get('valor')).toBe(188.86); // devolvido ao comprador
    expect(ledger.get('valorCentavos')).toBe(18886);
    expect(ledger.get('valorFace')).toBe(LINHA_FACE); // porção do organizador
  });

  it('replay do MESMO estorno: duplicado, zero efeito novo (I3)', async () => {
    const receitaAntes = await receita(EVENTO_REP);
    const r = await estornarInscricaoCore(
      db, provider,
      { pedidoId, inscritoId: inscritoIds[0], motivo: 'replay RN-347' },
      MARINA);
    expect(r.duplicado).toBe(true);
    expect(r.valorEstornado).toBe(188.86);
    expect(await receita(EVENTO_REP)).toBe(receitaAntes);
  });

  it('estorno da linha 2: integral — Σ devolvido == total PAGO; pagamento estornado', async () => {
    const r = await estornarInscricaoCore(
      db, provider,
      { pedidoId, inscritoId: inscritoIds[1], motivo: 'teste RN-347 linha 2' },
      MARINA);
    expect(r.valorEstornado).toBe(roundMoney(LINHA_FACE + 17.94)); // 188.85
    expect(r.pagamentoEstornadoIntegral).toBe(true);
    const pag = await db.collection('pagamentos').doc(pagamentoId).get();
    expect(pag.get('status')).toBe('estornado');
    expect(pag.get('estornadoTotal')).toBe(341.82); // == valorFinal (face)
    // Σ devolvido aos compradores == o que o pedido COBROU (PIX, sem juros)
    expect(roundMoney(188.86 + 188.85)).toBe(377.71);
  });

  it('incorporada (regressão I1): estorno devolve exatamente a linha face; valorFace == valor', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_INC, 'rn347-inc-est-01'), { uid: ANA_UID });
    await confirmar(charge.pedidoId, charge.chargeId, 18990, 'evt-rn347-inc-est');
    const r = await estornarInscricaoCore(
      db, provider,
      { pedidoId: charge.pedidoId, inscritoId: charge.inscritoIds[0], motivo: 'regressão I1' },
      MARINA);
    expect(r.valorEstornado).toBe(FACE);
    const ledger = await db.collection('pagamentos').doc(charge.pagamentoId)
      .collection(ESTORNOS_SUBCOL).doc(charge.inscritoIds[0] as string).get();
    expect(ledger.get('valorFace')).toBe(FACE);
    expect(ledger.get('valor')).toBe(FACE);
  });
});
