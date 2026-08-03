/**
 * webhookAsaas.integration.test.ts — LEELA-R6 (ativação sandbox do Asaas)
 *
 * Integração (⚠️ EXIGE Firestore Emulator — porta via
 * LEELA_FS_EMU_PORT, default 8080): camada HTTP do webhook Asaas
 * entrando pela porta ÚNICA (`processarWebhookPagamento`).
 *
 * Cobre (gate R6):
 *   - entrega autêntica (token correto) confirma pedido/pagamento/inscrito
 *     e agrega receita — orderId derivado do externalReference
 *   - replay da MESMA entrega (mesmo evt id) → duplicado, zero efeito
 *   - token ERRADO (mesmo comprimento) → 401 e NENHUMA escrita
 *   - valor adulterado (payment.value ≠ congelado) → 409 e nenhuma escrita
 *   - confirmação de CARTÃO persiste `pagamento.cartao` derivado do valor
 *     CONGELADO (parsePagamento aprova o doc — invariante do slide-in)
 *   - cobrança sem externalReference nosso → ACK sem efeito (fila do Asaas
 *     não é envenenada por cobrança alheia)
 *   - PAYMENT_* autêntico sem efeito mapeado → registrado sem efeito
 *   - shape inválido → 400; header ausente → 401
 *
 * ZERO rede real: o AsaasProvider recebe fetchFn que LANÇA — o caminho de
 * webhook não faz HTTP nenhum (provado se nada lançar).
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { parsePagamento } from '@leela/core';
import {
  AsaasProvider,
  EXTERNAL_REF_MAX_LEN,
  buildExternalReference,
} from '../payments/asaasProvider';
import {
  montarPayloadAsaas,
  processarWebhookAsaas,
} from '../checkout/webhookAsaas';
import {
  pagamentoWebhook,
  WebhookRejeitadoError,
  WEBHOOK_EVENTOS_SUBCOL,
} from '../checkout/webhookPagamento';

const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const PROJECT_ID = 'demo-leela-r6-webhook';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';

/** Chave/token SINTÉTICOS (formato válido; valor inventado). */
const CHAVE_SANDBOX = `$aact_hmlg_${'w'.repeat(120)}`;
const TOKEN = 'token-webhook-integracao-r6-40-chars-ok!';
const TOKEN_ERRADO = 'token-webhook-integracao-r6-40-chars-no!';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const provider = new AsaasProvider({
  apiKey: CHAVE_SANDBOX,
  webhookAuthToken: TOKEN,
  fetchFn: () => {
    throw new Error('rede real é PROIBIDA no caminho de webhook');
  },
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: 'localhost', port: FIRESTORE_PORT },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${FIRESTORE_PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// ---------------------------------------------------------------------------
// Seed de um pedido pendente com cobrança emitida (estado pós-createCharge)
// ---------------------------------------------------------------------------

interface SeedOpts {
  pedidoId: string;
  chargeId: string;
  forma: 'pix' | 'cartao_credito';
  valorFinal: number;
  parcelas?: number;
}

async function seedPedidoPendente(opts: SeedOpts): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const pagamentoId = `pag-${opts.pedidoId}`;
  const inscritoId = `${opts.pedidoId}-i1`;
  const batch = db.batch();

  batch.set(
    db.collection('eventos').doc(EVENTO_ID),
    {
      id: EVENTO_ID,
      tenantId: TENANT_ID,
      nome: 'Meia de Floripa 2026',
      status: 'publicado',
      receitaConfirmada: 0,
      criadoEm: now,
      atualizadoEm: now,
    },
    { merge: true }
  );
  batch.set(
    db.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(inscritoId),
    {
      id: inscritoId,
      tenantId: TENANT_ID,
      atletaId: `uid-${opts.pedidoId}`,
      atletaNome: 'Ana Atleta',
      kit: 'sem_kit',
      kitId: null,
      chipNumero: null,
      status: 'pendente',
      modalidade: '21km',
      pedidoRef: opts.pedidoId,
      ehResponsavel: true,
      tamanhos: {},
      criadoEm: now,
      atualizadoEm: now,
    }
  );
  const pedido: Record<string, unknown> = {
    id: opts.pedidoId,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    responsavel: { atletaId: `uid-${opts.pedidoId}`, nome: 'Ana Atleta', email: 'ana@example.com' },
    inscritoRefs: [inscritoId],
    pagamentoRef: pagamentoId,
    valorTotal: opts.valorFinal,
    status: 'pendente',
    formaPagamento: opts.forma,
    criadoEm: now,
    atualizadoEm: now,
  };
  if (opts.forma === 'cartao_credito') pedido['parcelas'] = opts.parcelas ?? 1;
  batch.set(db.collection('pedidos').doc(opts.pedidoId), pedido);
  batch.set(db.collection('pagamentos').doc(pagamentoId), {
    id: pagamentoId,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    pedidoRef: opts.pedidoId,
    status: 'pendente',
    forma: opts.forma,
    valorBase: opts.valorFinal,
    desconto: 0,
    valorFinal: opts.valorFinal,
    gatewayChargeId: opts.chargeId,
    gatewayAmountCentavos: Math.round(opts.valorFinal * 100),
    criadoEm: now,
    atualizadoEm: now,
  });
  await batch.commit();
}

/** Corpo do POST como o Asaas envia (docs/sobre-os-webhooks). */
function corpoAsaas(over: {
  eventId?: string;
  event?: string;
  payment?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: over.eventId ?? 'evt_r6_0001',
    event: over.event ?? 'PAYMENT_RECEIVED',
    dateCreated: '2026-07-18 10:00:00',
    payment: {
      id: 'pay_r6_pix_1',
      status: 'RECEIVED',
      value: 5,
      billingType: 'PIX',
      externalReference: 'ped-r6-pix::charge-ped-r6-pix',
      ...over.payment,
    },
  };
}

// ---------------------------------------------------------------------------
// Suíte
// ---------------------------------------------------------------------------

describe('webhookAsaas — porta única com entrega real do Asaas', () => {
  it('PIX: entrega autêntica confirma pedido/pagamento/inscrito e agrega receita', async () => {
    await seedPedidoPendente({
      pedidoId: 'ped-r6-pix',
      chargeId: 'pay_r6_pix_1',
      forma: 'pix',
      valorFinal: 5,
    });

    const r = await processarWebhookAsaas(db, provider, TOKEN, corpoAsaas({}));
    expect(r.tipo).toBe('processado');
    if (r.tipo !== 'processado') return;
    expect(r.resultado.duplicado).toBe(false);
    expect(r.resultado.ignorado).toBe(false);
    expect(r.resultado.pedidoId).toBe('ped-r6-pix');
    expect(r.resultado.statusGateway).toBe('confirmed');

    const pedido = await db.collection('pedidos').doc('ped-r6-pix').get();
    const pagamento = await db.collection('pagamentos').doc('pag-ped-r6-pix').get();
    const inscrito = await db
      .collection('eventos').doc(EVENTO_ID)
      .collection('inscritos').doc('ped-r6-pix-i1').get();
    const evento = await db.collection('eventos').doc(EVENTO_ID).get();
    expect(pedido.get('status')).toBe('pago');
    expect(pagamento.get('status')).toBe('confirmado');
    expect(inscrito.get('status')).toBe('confirmado');
    expect(evento.get('receitaConfirmada')).toBe(5);
    // PIX não persiste bloco cartao
    expect(pagamento.get('cartao')).toBeUndefined();

    // Ledger por ENTREGA gravado com o id `evt_...` do Asaas
    const ledger = await db
      .collection('pagamentos').doc('pag-ped-r6-pix')
      .collection(WEBHOOK_EVENTOS_SUBCOL).doc('evt_r6_0001').get();
    expect(ledger.exists).toBe(true);
    expect(ledger.get('efeito')).toBe('confirmado');
  });

  it('replay da MESMA entrega (mesmo evt id) → duplicado, receita NÃO dobra', async () => {
    const r = await processarWebhookAsaas(db, provider, TOKEN, corpoAsaas({}));
    expect(r.tipo).toBe('processado');
    if (r.tipo !== 'processado') return;
    expect(r.resultado.duplicado).toBe(true);
    const evento = await db.collection('eventos').doc(EVENTO_ID).get();
    expect(evento.get('receitaConfirmada')).toBe(5);
  });

  it('token ERRADO do mesmo comprimento → 401 e NENHUMA escrita', async () => {
    await seedPedidoPendente({
      pedidoId: 'ped-r6-forge',
      chargeId: 'pay_r6_forge_1',
      forma: 'pix',
      valorFinal: 5,
    });
    const corpo = corpoAsaas({
      eventId: 'evt_r6_forge',
      payment: {
        id: 'pay_r6_forge_1',
        externalReference: 'ped-r6-forge::charge-ped-r6-forge',
      },
    });

    await expect(
      processarWebhookAsaas(db, provider, TOKEN_ERRADO, corpo)
    ).rejects.toMatchObject({ httpStatus: 401 });

    const pedido = await db.collection('pedidos').doc('ped-r6-forge').get();
    expect(pedido.get('status')).toBe('pendente');
    const ledger = await db
      .collection('pagamentos').doc('pag-ped-r6-forge')
      .collection(WEBHOOK_EVENTOS_SUBCOL).get();
    expect(ledger.size).toBe(0);
  });

  it('valor ADULTERADO (≠ congelado no doc) com token válido → 409, nenhuma escrita', async () => {
    const corpo = corpoAsaas({
      eventId: 'evt_r6_tamper',
      payment: {
        id: 'pay_r6_forge_1',
        value: 1,
        externalReference: 'ped-r6-forge::charge-ped-r6-forge',
      },
    });
    await expect(
      processarWebhookAsaas(db, provider, TOKEN, corpo)
    ).rejects.toMatchObject({ httpStatus: 409 });
    const pedido = await db.collection('pedidos').doc('ped-r6-forge').get();
    expect(pedido.get('status')).toBe('pendente');
  });

  it('CARTÃO: confirmação persiste bloco cartao derivado do valor CONGELADO (parse aprova)', async () => {
    await seedPedidoPendente({
      pedidoId: 'ped-r6-card',
      chargeId: 'pay_r6_card_1',
      forma: 'cartao_credito',
      valorFinal: 15,
      parcelas: 3,
    });
    const corpo = corpoAsaas({
      eventId: 'evt_r6_card',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_r6_card_1',
        status: 'CONFIRMED',
        value: 15,
        billingType: 'CREDIT_CARD',
        externalReference: 'ped-r6-card::charge-ped-r6-card',
        installmentCount: 3,
        creditCard: {
          creditCardBrand: 'MASTERCARD',
          creditCardNumber: '8829',
          creditCardToken: 'tok_NUNCA_persistido',
        },
      },
    });

    const r = await processarWebhookAsaas(db, provider, TOKEN, corpo);
    expect(r.tipo).toBe('processado');

    const pagamento = await db.collection('pagamentos').doc('pag-ped-r6-card').get();
    expect(pagamento.get('status')).toBe('confirmado');
    expect(pagamento.get('cartao')).toEqual({
      bandeira: 'MASTERCARD',
      ultimos4: '8829',
      parcelas: 3,
      valorParcela: 5,
      valorTotalComJuros: 15,
    });
    // O token do cartão NUNCA é persistido em lugar nenhum do doc
    expect(JSON.stringify(pagamento.data())).not.toContain('tok_NUNCA_persistido');
    // Coerência de domínio: o doc confirmado de cartão passa no parse
    expect(() => parsePagamento(pagamento.id, pagamento.data() ?? {})).not.toThrow();
  });

  it('CARTÃO não divisível (R$10 em 3x): valorParcela 3,33 fica DENTRO da tolerância do parse (fix review #2)', async () => {
    await seedPedidoPendente({
      pedidoId: 'ped-r6-card-nd',
      chargeId: 'pay_r6_card_nd',
      forma: 'cartao_credito',
      valorFinal: 10,
      parcelas: 3,
    });
    const corpo = corpoAsaas({
      eventId: 'evt_r6_card_nd',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_r6_card_nd',
        status: 'CONFIRMED',
        value: 10,
        billingType: 'CREDIT_CARD',
        externalReference: 'ped-r6-card-nd::charge-ped-r6-card-nd',
        installmentCount: 3,
        creditCard: { creditCardBrand: 'VISA', creditCardNumber: '4821' },
      },
    });

    const r = await processarWebhookAsaas(db, provider, TOKEN, corpo);
    expect(r.tipo).toBe('processado');
    const pagamento = await db.collection('pagamentos').doc('pag-ped-r6-card-nd').get();
    expect(pagamento.get('cartao')).toEqual({
      bandeira: 'VISA',
      ultimos4: '4821',
      parcelas: 3,
      valorParcela: 3.33, // 3 × 3,33 = 9,99 — desvio 0,01 ≤ 3 × meio centavo
      valorTotalComJuros: 10,
    });
    expect(() => parsePagamento(pagamento.id, pagamento.data() ?? {})).not.toThrow();
  });

  it('CARTÃO com ultimos4 FORJADO (não-dígitos): confirma o dinheiro, NÃO persiste lixo (fix review #3)', async () => {
    await seedPedidoPendente({
      pedidoId: 'ped-r6-card-forja',
      chargeId: 'pay_r6_card_forja',
      forma: 'cartao_credito',
      valorFinal: 5,
      parcelas: 1,
    });
    const corpo = corpoAsaas({
      eventId: 'evt_r6_card_forja',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_r6_card_forja',
        status: 'CONFIRMED',
        value: 5,
        billingType: 'CREDIT_CARD',
        externalReference: 'ped-r6-card-forja::charge-ped-r6-card-forja',
        creditCard: { creditCardBrand: 'X', creditCardNumber: '<script>' },
      },
    });

    const r = await processarWebhookAsaas(db, provider, TOKEN, corpo);
    expect(r.tipo).toBe('processado');
    const pagamento = await db.collection('pagamentos').doc('pag-ped-r6-card-forja').get();
    expect(pagamento.get('status')).toBe('confirmado'); // a verdade do dinheiro
    expect(pagamento.get('cartao')).toBeUndefined(); // lixo nunca persiste
  });

  it('pagamentoWebhook (porta mock) responde 410 com chave Asaas presente (fix review #1)', async () => {
    const anterior = process.env['ASAAS_API_KEY'];
    process.env['ASAAS_API_KEY'] = CHAVE_SANDBOX;
    try {
      let statusRespondido = 0;
      let corpoRespondido: unknown;
      const res = {
        status(code: number) {
          statusRespondido = code;
          return this;
        },
        json(body: unknown) {
          corpoRespondido = body;
        },
      };
      await (pagamentoWebhook as unknown as (req: unknown, res: unknown) => Promise<void>)(
        { method: 'POST', body: {} },
        res
      );
      expect(statusRespondido).toBe(410);
      expect(corpoRespondido).toMatchObject({ ok: false });
    } finally {
      if (anterior === undefined) delete process.env['ASAAS_API_KEY'];
      else process.env['ASAAS_API_KEY'] = anterior;
    }
  });

  it('cobrança SEM externalReference nosso → ACK sem efeito (cobrança alheia)', async () => {
    const corpo = corpoAsaas({
      eventId: 'evt_r6_alien',
      payment: { id: 'pay_alien_1', externalReference: undefined },
    });
    delete (corpo['payment'] as Record<string, unknown>)['externalReference'];

    const r = await processarWebhookAsaas(db, provider, TOKEN, corpo);
    expect(r.tipo).toBe('ignorado_sem_pedido');
  });

  it('externalReference nosso mas pedido INEXISTENTE → 404 (retriable no Asaas)', async () => {
    const corpo = corpoAsaas({
      eventId: 'evt_r6_ghost',
      payment: {
        id: 'pay_ghost_1',
        externalReference: 'ped-r6-fantasma::charge-x',
      },
    });
    await expect(
      processarWebhookAsaas(db, provider, TOKEN, corpo)
    ).rejects.toMatchObject({ httpStatus: 404 });
  });

  it('PAYMENT_* autêntico sem efeito mapeado → registrado SEM efeito financeiro', async () => {
    await seedPedidoPendente({
      pedidoId: 'ped-r6-benigno',
      chargeId: 'pay_r6_benigno_1',
      forma: 'pix',
      valorFinal: 5,
    });
    const corpo = corpoAsaas({
      eventId: 'evt_r6_benigno',
      event: 'PAYMENT_UPDATED',
      payment: {
        id: 'pay_r6_benigno_1',
        status: 'PENDING',
        externalReference: 'ped-r6-benigno::charge-ped-r6-benigno',
      },
    });

    const r = await processarWebhookAsaas(db, provider, TOKEN, corpo);
    expect(r.tipo).toBe('processado');
    if (r.tipo !== 'processado') return;
    expect(r.resultado.ignorado).toBe(true);
    const pedido = await db.collection('pedidos').doc('ped-r6-benigno').get();
    expect(pedido.get('status')).toBe('pendente');
  });

  // ⛔ T1 · PIXFIX-EXTREF — o caminho do webhook com o formato NOVO
  // (`orderId::digest16`) e com um pedidoId de tamanho REAL (73 chars). Se o
  // digest tivesse entrado no PREFIXO, o webhook deixaria de achar o pedido e
  // toda compra ficaria pendente para sempre — o defeito seria pior que o
  // original, e só apareceria depois de o comprador pagar.
  it('formato NOVO com pedidoId real (73) resolve o pedido e confirma', async () => {
    const uid = 'wNXRTvMM3vc7Boyi91vRgx3DBQy2'; // 28, como o Firebase Auth emite
    const pedidoId = `ped-${uid}-chk-963e27d7-2ea7-453d-aeb3-b49faacf319f`; // 73
    expect(pedidoId).toHaveLength(73);

    const ref = buildExternalReference(pedidoId, `charge-${pedidoId}`);
    expect(ref).toHaveLength(91);
    expect(ref.length).toBeLessThanOrEqual(EXTERNAL_REF_MAX_LEN);

    await seedPedidoPendente({
      pedidoId,
      chargeId: 'pay_r6_extref_1',
      forma: 'pix',
      valorFinal: 7,
    });

    const r = await processarWebhookAsaas(
      db,
      provider,
      TOKEN,
      corpoAsaas({
        eventId: 'evt_r6_extref',
        payment: {
          id: 'pay_r6_extref_1',
          value: 7,
          externalReference: ref,
        },
      })
    );

    expect(r.tipo).toBe('processado');
    if (r.tipo !== 'processado') return;
    expect(r.resultado.pedidoId).toBe(pedidoId); // orderId VERBATIM
    expect(r.resultado.ignorado).toBe(false);
    const pedido = await db.collection('pedidos').doc(pedidoId).get();
    expect(pedido.get('status')).toBe('pago');
  });

  it('shape inválido → 400; header ausente → 401 (assinatura vazia)', async () => {
    expect(() => montarPayloadAsaas(TOKEN, 'não-é-objeto')).toThrow(WebhookRejeitadoError);
    expect(() => montarPayloadAsaas(TOKEN, { payment: {} })).toThrow(/event/);

    await expect(
      processarWebhookAsaas(db, provider, undefined, corpoAsaas({ eventId: 'evt_r6_semtoken' }))
    ).rejects.toMatchObject({ httpStatus: 401 });
  });
});
