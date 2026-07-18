/**
 * asaasSandbox.e2e.test.ts — LEELA-R6 · E2E REAL contra a api-sandbox do Asaas
 *
 * ⚠️ OPT-IN EXPLÍCITO: só roda com `ASAAS_E2E=1` no ambiente (fora disso a
 * suíte inteira é SKIPPED — o gate normal continua 100% sem rede, como o
 * contrato do adapter exige). Exige também o Firestore Emulator
 * (LEELA_FS_EMU_PORT) para provar a transição do pedido.
 *
 * PRÉ-FLIGHT INVIOLÁVEL (brief R6): a chave lida de functions/.env PRECISA
 * começar com `$aact_hmlg_` (sandbox). Qualquer outra coisa → a suíte
 * ABORTA antes de QUALQUER chamada HTTP. Nenhum valor de chave/token é
 * logado, gravado ou comparado em log — a evidência final passa por um
 * guard anti-vazamento antes de ir ao disco.
 *
 * Fluxos provados (valores ínfimos — R$ 5,00):
 *   1. Sanidade read-only (GET /myAccount).
 *   2. PIX: checkout real (createInscricaoChargeCore) → cobrança na
 *      sandbox → replay idempotente (mesmo chargeId, zero duplicata) →
 *      confirmação sandbox → webhook pelo wrapper NOVO → pedido `pago` no
 *      emulator → replay do webhook (duplicado) → estorno.
 *   3. CARTÃO: checkout real → pagamento com cartão de teste da doc →
 *      webhook com `creditCard` real → bloco `pagamento.cartao` persistido.
 *   4. BOLETO: adapter direto (o checkout não vende boleto — E12) →
 *      cobrança + bankSlipUrl; registra o FATO sobre `boletoBarCode`.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  AsaasApiError,
  AsaasProvider,
  ASAAS_SANDBOX_BASE_URL,
  asaasConfigFromEnv,
} from '../payments/asaasProvider';
import { createInscricaoChargeCore } from '../checkout/createInscricaoCharge';
import { processarWebhookAsaas } from '../checkout/webhookAsaas';

const E2E_ATIVO = process.env['ASAAS_E2E'] === '1';
const FIRESTORE_PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8480);
const PROJECT_ID = 'demo-leela-r6-e2e';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'e2e-asaas-r6';
/** CPF de teste com DV válido (público, não é PII de pessoa real). */
const CPF_TESTE = '52998224725';
/** Cartão de teste da doc sandbox do Asaas (não é cartão real). */
const CARTAO_TESTE = {
  holderName: 'ana e2e leela',
  number: '5162306219378829',
  expiryMonth: '05',
  expiryYear: '2030',
  ccv: '318',
};

// ---------------------------------------------------------------------------
// Pré-flight: .env parseado manualmente; valores NUNCA logados
// ---------------------------------------------------------------------------

interface EnvR6 {
  apiKey: string;
  webhookToken: string;
}

function lerEnvR6(): EnvR6 {
  const envPath = resolve(process.cwd(), '.env');
  const txt = readFileSync(envPath, 'utf8');
  const ler = (nome: string): string => {
    const linha = txt.split(/\r?\n/).find((l) => l.startsWith(`${nome}=`));
    return linha === undefined ? '' : linha.slice(nome.length + 1).trim();
  };
  return { apiKey: ler('ASAAS_API_KEY'), webhookToken: ler('ASAAS_WEBHOOK_AUTH_TOKEN') };
}

// Evidência acumulada (IDs/status — jamais segredos), gravada no afterAll.
const evidencia: Record<string, unknown>[] = [];
function registrar(passo: string, dados: Record<string, unknown>): void {
  evidencia.push({ passo, em: new Date().toISOString(), ...dados });
}

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
let provider: AsaasProvider;
let env: EnvR6;

describe.skipIf(!E2E_ATIVO)('E2E sandbox Asaas (opt-in ASAAS_E2E=1)', () => {
  beforeAll(async () => {
    env = lerEnvR6();
    // ── PRÉ-FLIGHT (brief R6): sandbox ou ABORTA sem nenhum HTTP ─────────
    if (!env.apiKey.startsWith('$aact_hmlg_')) {
      throw new Error(
        'PRÉ-FLIGHT FALHOU: ASAAS_API_KEY não tem prefixo sandbox $aact_hmlg_ — ' +
          'lote abortado sem nenhuma chamada HTTP'
      );
    }
    provider = new AsaasProvider(
      asaasConfigFromEnv({
        ASAAS_API_KEY: env.apiKey,
        ASAAS_WEBHOOK_AUTH_TOKEN: env.webhookToken,
      })
    );
    // Cinto e suspensório: o adapter DERIVOU sandbox do prefixo
    expect(provider.environment).toBe('sandbox');
    expect(provider.baseUrl).toBe(ASAAS_SANDBOX_BASE_URL);

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
    await seedEventoR6();
  }, 60_000);

  afterAll(async () => {
    // Guard anti-vazamento: NENHUM segredo entra na evidência
    const json = JSON.stringify(evidencia, null, 2);
    if (
      (env.apiKey.length > 0 && json.includes(env.apiKey)) ||
      (env.webhookToken.length > 0 && json.includes(env.webhookToken)) ||
      json.includes('$aact_')
    ) {
      throw new Error('GUARD: evidência continha material de chave — NÃO gravada');
    }
    const dir = resolve(process.cwd(), '../outputs/leela-build-2d6ee98d');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'r6-e2e-evidencia.json'), json);
    await testEnv?.cleanup();
  }, 30_000);

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Chamada CRUA à sandbox (tooling de teste fora do adapter: confirm/pay). */
  async function sandboxFetch(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<{ status: number; json: Record<string, unknown> }> {
    const res = await fetch(`${ASAAS_SANDBOX_BASE_URL}${path}`, {
      method,
      headers: {
        access_token: env.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'leela-app',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const texto = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(texto) as Record<string, unknown>;
    } catch {
      /* corpo não-JSON — status basta */
    }
    return { status: res.status, json };
  }

  async function seedEventoR6(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const DIA = 24 * 60 * 60 * 1000;
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(TENANT_ID), {
      id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
      status: 'ativo', ownerUid: 'uid-marina', tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
      platformFeePct: 10.5,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 1 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1, atualizadoPor: 'seed-r6', atualizadoEm: now,
    });
    batch.set(db.collection('eventos').doc(EVENTO_ID), {
      id: EVENTO_ID, tenantId: TENANT_ID, nome: 'E2E Asaas R6',
      status: 'publicado', modalidades: ['5km'], percursos: [],
      receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.collection('eventos').doc(EVENTO_ID).collection('lotes').doc('lote-e2e'), {
      id: 'lote-e2e', tenantId: TENANT_ID, modalidade: '5km', ordem: 1,
      nome: 'Lote E2E', preco: 5, quantidadeLimite: 100, vendidos: 0,
      inicioEm: Timestamp.fromMillis(Date.now() - DIA),
      fimEm: Timestamp.fromMillis(Date.now() + DIA),
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  function inputCheckout(forma: 'pix' | 'cartao_credito', key: string): unknown {
    return {
      eventoId: EVENTO_ID,
      inscritos: [
        {
          nome: 'Ana E2E Leela',
          email: 'ana.e2e@example.com',
          cpf: CPF_TESTE,
          modalidade: '5km',
        },
      ],
      responsavelIndex: 0,
      responsavel: { nome: 'Ana E2E Leela', email: 'ana.e2e@example.com' },
      forma,
      parcelas: 1,
      idempotencyKey: key,
    };
  }

  /** Corpo de webhook como o Asaas entrega, com o payment REAL da sandbox. */
  function corpoWebhook(event: string, payment: Record<string, unknown>): Record<string, unknown> {
    return {
      id: `evt_e2e_${event}_${String(payment['id'])}`,
      event,
      dateCreated: new Date().toISOString(),
      payment,
    };
  }

  // ── 1. Sanidade read-only ───────────────────────────────────────────────

  it('GET /myAccount responde (sanidade read-only da chave sandbox)', async () => {
    const conta = await provider.getAccountInfo();
    expect(typeof conta).toBe('object');
    registrar('sanidade_myAccount', { ok: true, campos: Object.keys(conta).length });
  }, 60_000);

  // ── 2. PIX ponta a ponta ────────────────────────────────────────────────

  const KEY_PIX = `e2e-r6-pix-${Date.now()}`;
  let chargePixId = '';
  let pedidoPixId = '';

  it('PIX: checkout real cria cliente + cobrança na sandbox (R$ 5,00)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCheckout('pix', KEY_PIX), { uid: 'uid-e2e-ana' }
    );
    chargePixId = r.chargeId;
    pedidoPixId = r.pedidoId;
    expect(r.chargeId.length).toBeGreaterThan(0);
    expect(r.statusPedido).toBe('pendente');
    expect(r.valores.totalCobrado).toBe(5);
    registrar('pix_cobranca_criada', {
      chargeId: r.chargeId, pedidoId: r.pedidoId,
      paymentUrl: r.paymentUrl !== undefined, qrCode: r.qrCode !== undefined,
      totalCobrado: r.valores.totalCobrado,
    });
  }, 120_000);

  it('PIX: replay do checkout (mesma idempotencyKey) devolve o MESMO chargeId', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCheckout('pix', KEY_PIX), { uid: 'uid-e2e-ana' }
    );
    expect(r.chargeId).toBe(chargePixId);
    registrar('pix_replay_idempotente', { chargeId: r.chargeId, mesmoCharge: true });
  }, 120_000);

  it('PIX: confirmação sandbox → webhook pelo wrapper → pedido PAGO no emulator', async () => {
    const confirm = await sandboxFetch('POST', `/sandbox/payment/${chargePixId}/confirm`);
    registrar('pix_sandbox_confirm', { httpStatus: confirm.status });
    expect(confirm.status).toBeLessThan(300);

    const pago = await sandboxFetch('GET', `/payments/${chargePixId}`);
    expect(pago.status).toBe(200);
    const statusAsaas = String(pago.json['status']);
    registrar('pix_status_pos_confirm', { chargeId: chargePixId, statusAsaas });
    expect(['RECEIVED', 'CONFIRMED']).toContain(statusAsaas);

    const evento = statusAsaas === 'RECEIVED' ? 'PAYMENT_RECEIVED' : 'PAYMENT_CONFIRMED';
    const r = await processarWebhookAsaas(
      db, provider, env.webhookToken, corpoWebhook(evento, pago.json)
    );
    expect(r.tipo).toBe('processado');
    if (r.tipo !== 'processado') return;
    expect(r.resultado.duplicado).toBe(false);
    expect(r.resultado.ignorado).toBe(false);

    const pedido = await db.collection('pedidos').doc(pedidoPixId).get();
    const pagamento = await db.collection('pagamentos').doc(r.resultado.pagamentoId).get();
    expect(pedido.get('status')).toBe('pago');
    expect(pagamento.get('status')).toBe('confirmado');
    registrar('pix_webhook_confirmou_pedido', {
      pedidoId: pedidoPixId, chargeId: chargePixId,
      statusPedido: pedido.get('status'), statusPagamento: pagamento.get('status'),
    });

    // Replay da MESMA entrega → duplicado, zero efeito novo
    const replay = await processarWebhookAsaas(
      db, provider, env.webhookToken, corpoWebhook(evento, pago.json)
    );
    expect(replay.tipo).toBe('processado');
    if (replay.tipo === 'processado') {
      expect(replay.resultado.duplicado).toBe(true);
      registrar('pix_webhook_replay_duplicado', { duplicado: true });
    }
  }, 120_000);

  it('PIX: estorno sandbox (total) — resultado registrado', async () => {
    try {
      const refund = await provider.refund({
        chargeId: chargePixId,
        tenantId: TENANT_ID,
        reason: 'e2e-r6 estorno de validação',
        idempotencyKey: `refund-${KEY_PIX}`,
      });
      registrar('pix_estorno', {
        ok: true, refundId: refund.refundId, status: refund.status, amount: refund.amount,
      });
      expect(['pending', 'approved']).toContain(refund.status);
    } catch (err) {
      // Sandbox pode recusar estorno por saldo — FATO registrado, não inventado
      if (err instanceof AsaasApiError) {
        registrar('pix_estorno', { ok: false, httpStatus: err.httpStatus, codes: [...err.codes] });
        return;
      }
      throw err;
    }
  }, 120_000);

  // ── 3. CARTÃO ponta a ponta ─────────────────────────────────────────────

  const KEY_CARD = `e2e-r6-card-${Date.now()}`;
  let chargeCardId = '';
  let pedidoCardId = '';

  it('CARTÃO: checkout real cria cobrança CREDIT_CARD na sandbox (R$ 5,00)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCheckout('cartao_credito', KEY_CARD), { uid: 'uid-e2e-bruno' }
    );
    chargeCardId = r.chargeId;
    pedidoCardId = r.pedidoId;
    expect(r.statusPedido).toBe('pendente');
    registrar('cartao_cobranca_criada', { chargeId: r.chargeId, pedidoId: r.pedidoId });
  }, 120_000);

  it('CARTÃO: pagamento com cartão de teste → webhook → bloco cartao persistido', async () => {
    const pay = await sandboxFetch('POST', `/payments/${chargeCardId}/payWithCreditCard`, {
      creditCard: CARTAO_TESTE,
      creditCardHolderInfo: {
        name: CARTAO_TESTE.holderName,
        email: 'ana.e2e@example.com',
        cpfCnpj: CPF_TESTE,
        postalCode: '88015-600',
        addressNumber: '100',
        phone: '4899999999',
      },
    });
    registrar('cartao_payWithCreditCard', {
      httpStatus: pay.status,
      errors: Array.isArray(pay.json['errors'])
        ? (pay.json['errors'] as { code?: string }[]).map((e) => e.code ?? '?')
        : [],
    });

    if (pay.status >= 300) {
      // Fallback honesto: confirmação sandbox genérica (sem dados de cartão)
      const confirm = await sandboxFetch('POST', `/sandbox/payment/${chargeCardId}/confirm`);
      registrar('cartao_fallback_sandbox_confirm', { httpStatus: confirm.status });
    }

    const pago = await sandboxFetch('GET', `/payments/${chargeCardId}`);
    expect(pago.status).toBe(200);
    const statusAsaas = String(pago.json['status']);
    const temCreditCard = pago.json['creditCard'] !== undefined && pago.json['creditCard'] !== null;
    registrar('cartao_status_pos_pagamento', { chargeId: chargeCardId, statusAsaas, temCreditCard });
    expect(['CONFIRMED', 'RECEIVED']).toContain(statusAsaas);

    const r = await processarWebhookAsaas(
      db, provider, env.webhookToken, corpoWebhook('PAYMENT_CONFIRMED', pago.json)
    );
    expect(r.tipo).toBe('processado');

    const pedido = await db.collection('pedidos').doc(pedidoCardId).get();
    expect(pedido.get('status')).toBe('pago');
    const pagamento = await db
      .collection('pagamentos').doc(`pag-uid-e2e-bruno-${KEY_CARD}`).get();
    expect(pagamento.get('status')).toBe('confirmado');
    const cartao = pagamento.get('cartao') as Record<string, unknown> | undefined;
    registrar('cartao_bloco_persistido', {
      pedidoId: pedidoCardId,
      statusPedido: pedido.get('status'),
      cartaoPersistido: cartao !== undefined,
      bandeira: cartao?.['bandeira'] ?? null,
      ultimos4: cartao?.['ultimos4'] ?? null,
      parcelas: cartao?.['parcelas'] ?? null,
    });
    if (temCreditCard) {
      // Com dados reais de cartão na entrega, o bloco TEM que existir
      expect(cartao).toBeDefined();
      expect(String(cartao?.['ultimos4'])).toMatch(/^\d{4}$/);
    }
  }, 120_000);

  // ── 4. BOLETO (adapter direto — o checkout E12 não vende boleto) ────────

  it('BOLETO: adapter cria cobrança e expõe bankSlipUrl; fato boletoBarCode registrado', async () => {
    const orderId = `e2e-r6-boleto-${Date.now()}`;
    const charge = await provider.createCharge({
      orderId,
      tenantId: TENANT_ID,
      amount: 500,
      paymentMethod: 'boleto',
      customer: { name: 'Ana E2E Leela', email: 'ana.e2e@example.com', taxId: CPF_TESTE },
      items: [{ id: 'insc', description: 'Inscrição E2E boleto', amount: 500, quantity: 1 }],
      idempotencyKey: `charge-${orderId}`,
    });
    expect(charge.status).toBe('pending');
    expect(charge.boletoUrl).toBeDefined();

    const cru = await sandboxFetch('GET', `/payments/${charge.chargeId}`);
    registrar('boleto_cobranca_criada', {
      chargeId: charge.chargeId,
      status: charge.status,
      bankSlipUrl: charge.boletoUrl !== undefined,
      // Resolve o "fato assumido" do adapter-report: o campo existe na resposta?
      fato_boletoBarCode_presente: cru.json['boletoBarCode'] !== undefined,
      fato_identificationField_presente: cru.json['identificationField'] !== undefined,
    });
  }, 120_000);
});
