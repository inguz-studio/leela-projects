/**
 * varrerPixVencidos.integration.test.ts — LEELA-S322 (RN-545 · RN-157 ·
 * RN-544 porta 1 · trace leela-redesign-v2-20260810, lane ESTOURO-BUILD).
 * ⚠️ EXIGE Firestore no Emulator (projectId demo-leela; porta via
 * LEELA_FS_EMU_PORT — lane 8490, nunca o 8180 do preview nem o 8480 da PIXBE).
 *
 * O que esta suíte prova:
 *
 *   T1. A varredura expira o PIX vencido: cancela NO GATEWAY antes dos docs,
 *       flipa pedido+pagamento para 'cancelado'/'pix_expirado' com
 *       `gatewayCancelado: true`, e os inscritos PERMANECEM 'pendente'.
 *   T2. Recusa do gateway = pedido VIVO. O item conta em `recusadosGateway`,
 *       nada é flipado, e a rodada seguinte fecha sozinha.
 *   T3. Pagamento DENTRO do prazo não é tocado — a query nem o vê.
 *   T4. IDEMPOTÊNCIA DAS TRÊS PORTAS (o núcleo da S322-T4): varredura,
 *       webhook OVERDUE e onCall do comprador, par a par nas duas ordens.
 *       Uma transição só; `gatewayCancelado` correto em cada porta.
 *   T5. CORRIDA REAL: o webhook confirma ENTRE a fase de gateway e a
 *       transação — a releitura in-tx vê estado final e no-opa. Dinheiro
 *       manda.
 *   T6. A varredura é BOUNDED: mais vencidos que o teto ⇒ processa até o
 *       teto e o resto drena na rodada seguinte.
 *   T7. ⚔ A porta pública NÃO afrouxou: uid alheio segue levando
 *       `permission-denied`, e o chamador de sistema é a única outra forma.
 *
 * SUITE-STAB: clear+seed com triggers pausados e canários verificados
 * (helpers/stability.ts).
 *
 * Comando (de `functions/`):
 *   LEELA_FS_EMU_PORT=8490 LEELA_AUTH_EMU_PORT=9599 \
 *   npx firebase-tools@13 emulators:exec --config ../firebase.estouro.json \
 *     --project demo-leela \
 *     "npx vitest run src/__tests__/varrerPixVencidos.integration.test.ts"
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import {
  buildMockWebhookPayload,
  MockPaymentProvider,
} from '../payments/mockProvider';
import { expirarPixPendenteCore } from '../checkout/expirarPixPendente';
import { varrerPixVencidosCore } from '../checkout/varrerPixVencidos';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import {
  MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
  canceladoPorPrazoPix,
  type PaymentProvider,
} from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-estouro';
const EVENTO_ID = 'meia-estouro';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const MEIA_HORA_MS = 30 * 60 * 1000;
const CPF = '529.982.247-25';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

/** Relógio INJETADO: toda aritmética de prazo é exata sobre ele. */
const relogio = (d: Date) => () => d;
/** O instante em que a cobrança criada em `t0` já venceu (+1s de folga). */
const depoisDoPrazo = (t0: Date) => new Date(t0.getTime() + MEIA_HORA_MS + 1000);

function inputPix(
  chave: string,
  over: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br', cpf: CPF, modalidade: '10k' },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: chave,
    ...over,
  };
}

/** Provider com `cancelCharge` substituído — o resto é o mock de verdade. */
function providerCom(
  cancelCharge: PaymentProvider['cancelCharge']
): PaymentProvider {
  return {
    ...provider,
    createCharge: provider.createCharge.bind(provider),
    splitRules: provider.splitRules.bind(provider),
    refund: provider.refund.bind(provider),
    handleWebhook: provider.handleWebhook.bind(provider),
    getPayout: provider.getPayout.bind(provider),
    cancelCharge,
  };
}

describe.skipIf(!hasEmulator)('S322 — a varredura do PIX vencido', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host: '127.0.0.1', port: FS_PORT },
    });
    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FS_PORT}`;
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    db = admin.firestore();
    delete process.env['ASAAS_API_KEY'];
  }, 30_000);

  const SEED_CANARIES = [
    `tenants/${TENANT_ID}`,
    `tenants/${TENANT_ID}/commercialTerms/current`,
    `eventos/${EVENTO_ID}`,
    `eventos/${EVENTO_ID}/lotes/l1`,
  ];

  beforeEach(async () => {
    await withTriggersPaused(async () => {
      await clearFirestoreDrained(testEnv);
      await seedVerified(db, testEnv, seed, SEED_CANARIES);
    });
  }, 30_000);

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seed(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const agora = new Date();
    const tsRel = (d: number): Timestamp =>
      Timestamp.fromDate(new Date(agora.getTime() + d * DIA_MS));
    const batch = db.batch();
    batch.set(db.collection('tenants').doc(TENANT_ID), {
      id: TENANT_ID, nome: 'Castelo Estouro', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-estouro', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
      platformFeePct: 10,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
    });
    const eventoRef = db.collection('eventos').doc(EVENTO_ID);
    batch.set(eventoRef, {
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-estouro',
      nome: 'Meia Estouro', data: tsRel(45), local: 'Floripa/SC',
      modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('l1'), {
      id: 'l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
      nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  /** Cria uma cobrança PIX pendente do `uid`, no instante `t0`. */
  async function cobrancaPix(uid: string, chave: string, t0: Date) {
    return createInscricaoChargeCore(
      db, provider, inputPix(chave), { uid, ehAnonimo: true }, relogio(t0)
    );
  }

  async function lerPar(pedidoId: string, pagamentoId: string) {
    const [ped, pag] = await Promise.all([
      db.collection('pedidos').doc(pedidoId).get(),
      db.collection('pagamentos').doc(pagamentoId).get(),
    ]);
    return { ped, pag };
  }

  // -------------------------------------------------------------------------
  // T1 — o caminho feliz da varredura
  // -------------------------------------------------------------------------

  describe('T1 · o PIX vencido morre sozinho, e na ordem certa', () => {
    it('cancela no gateway ANTES dos docs; pedido e pagamento viram cancelado/pix_expirado; inscritos seguem pendente', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t1', 'estouro-t1-01', t0);

      const rodada = await varrerPixVencidosCore(db, provider, depoisDoPrazo(t0));
      expect(rodada.encontrados).toBe(1);
      expect(rodada.expirados).toBe(1);
      expect(rodada.recusadosGateway).toBe(0);
      expect(rodada.erros).toBe(0);

      // A cobrança morreu LÁ FORA — e o carimbo prova que morreu antes.
      expect(provider.getCharge(r.chargeId)?.status).toBe('cancelled');

      const { ped, pag } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(ped.get('status')).toBe('cancelado');
      expect(ped.get('canceladoMotivo')).toBe(MOTIVO_CANCELAMENTO_PIX_EXPIRADO);
      expect(pag.get('status')).toBe('cancelado');
      expect(pag.get('gatewayCancelado')).toBe(true);
      // O CONTRATO que a tela consome, exercitado pelo predicado do core.
      expect(canceladoPorPrazoPix(ped.data() ?? {})).toBe(true);
      expect(canceladoPorPrazoPix(pag.data() ?? {})).toBe(true);

      // Inscrito NÃO vira cancelado — mesmo tratamento do caminho 'falhou'
      // (nova tentativa é NOVA cotação + novo pedido).
      const inscritos = await db
        .collection('eventos').doc(EVENTO_ID).collection('inscritos').get();
      expect(inscritos.size).toBe(1);
      expect(inscritos.docs[0]?.get('status')).toBe('pendente');
    });

    it('rodada seguinte sobre o mesmo doc não encontra nada — a query só vê pendente', async () => {
      const t0 = new Date(Date.now() + 60_000);
      await cobrancaPix('uid-t1-b', 'estouro-t1-02', t0);
      const depois = depoisDoPrazo(t0);

      const primeira = await varrerPixVencidosCore(db, provider, depois);
      expect(primeira.expirados).toBe(1);

      const segunda = await varrerPixVencidosCore(db, provider, depois);
      expect(segunda.encontrados).toBe(0);
      expect(segunda.expirados).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // T2 — fail-safe herdado: recusa do gateway deixa o pedido VIVO
  // -------------------------------------------------------------------------

  describe('T2 · o gateway recusa e nada é flipado', () => {
    it('recusa conta em recusadosGateway, o pedido segue pendente, e a rodada seguinte fecha', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t2', 'estouro-t2-01', t0);
      const depois = depoisDoPrazo(t0);

      const quebrado = providerCom(() =>
        Promise.reject(new Error('[teste] gateway indisponível'))
      );
      const ruim = await varrerPixVencidosCore(db, quebrado, depois);
      expect(ruim.encontrados).toBe(1);
      expect(ruim.recusadosGateway).toBe(1);
      expect(ruim.expirados).toBe(0);
      // A recusa NÃO é erro nosso: o contador de erros fica limpo.
      expect(ruim.erros).toBe(0);

      const vivo = await lerPar(r.pedidoId, r.pagamentoId);
      expect(vivo.ped.get('status')).toBe('pendente');
      expect(vivo.pag.get('status')).toBe('pendente');
      expect(provider.getCharge(r.chargeId)?.status).not.toBe('cancelled');

      // Sem retry manual e sem estado novo: a rodada seguinte fecha sozinha.
      const boa = await varrerPixVencidosCore(db, provider, depois);
      expect(boa.expirados).toBe(1);
      const morto = await lerPar(r.pedidoId, r.pagamentoId);
      expect(morto.ped.get('status')).toBe('cancelado');
    });
  });

  // -------------------------------------------------------------------------
  // T3 — dentro do prazo é intocável
  // -------------------------------------------------------------------------

  describe('T3 · pagamento no prazo não é tocado', () => {
    it('a query não o vê, e nada muda no par de docs', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t3', 'estouro-t3-01', t0);

      // 10 minutos depois: faltam 20 para vencer.
      const rodada = await varrerPixVencidosCore(
        db, provider, new Date(t0.getTime() + 10 * 60 * 1000)
      );
      expect(rodada.encontrados).toBe(0);

      const { ped, pag } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(ped.get('status')).toBe('pendente');
      expect(pag.get('status')).toBe('pendente');
      expect(provider.getCharge(r.chargeId)?.status).not.toBe('cancelled');
    });
  });

  // -------------------------------------------------------------------------
  // T4 — S322-T4: as três portas, par a par, nas duas ordens
  // -------------------------------------------------------------------------

  describe('T4 · três portas para o mesmo estado, uma transição só', () => {
    async function entregaDe(pagamentoId: string, chargeId: string, pedidoId: string) {
      const pag = await db.collection('pagamentos').doc(pagamentoId).get();
      return {
        chargeId,
        orderId: pedidoId,
        amount: pag.get('gatewayAmountCentavos') as number,
        eventId: `overdue-${pedidoId}`,
      };
    }

    it('varredura ANTES do onCall: o comprador chega depois e recebe resposta idempotente', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t4-a', 'estouro-t4-01', t0);
      const depois = depoisDoPrazo(t0);

      const rodada = await varrerPixVencidosCore(db, provider, depois);
      expect(rodada.expirados).toBe(1);

      const manual = await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t4-a' }, relogio(depois)
      );
      expect(manual.jaFinal).toBe(true);
      expect(manual.expirado).toBe(false);
      expect(manual.statusPedido).toBe('cancelado');
    });

    it('onCall ANTES da varredura: a rodada nem encontra o doc', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t4-b', 'estouro-t4-02', t0);
      const depois = depoisDoPrazo(t0);

      const manual = await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t4-b' }, relogio(depois)
      );
      expect(manual.expirado).toBe(true);

      const rodada = await varrerPixVencidosCore(db, provider, depois);
      expect(rodada.encontrados).toBe(0);

      const { pag } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(pag.get('gatewayCancelado')).toBe(true);
    });

    it('varredura ANTES do webhook OVERDUE: a entrega tardia no-opa (estado_ja_final)', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t4-c', 'estouro-t4-03', t0);
      const depois = depoisDoPrazo(t0);

      await varrerPixVencidosCore(db, provider, depois);

      const entrega = await entregaDe(r.pagamentoId, r.chargeId, r.pedidoId);
      const overdue = await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.failed', entrega)
      );
      expect(overdue.ignorado).toBe(true);
      expect(overdue.motivo).toBe('estado_ja_final');

      // O desfecho da PLATAFORMA vence: continua 'cancelado' por prazo, não
      // regride para 'falhou' — os dois motivos terminais seguem distintos.
      const { ped, pag } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(ped.get('status')).toBe('cancelado');
      expect(pag.get('status')).toBe('cancelado');
      expect(canceladoPorPrazoPix(ped.data() ?? {})).toBe(true);
    });

    it('webhook OVERDUE ANTES da varredura: pedido vira falhou, SEM gatewayCancelado, e a rodada não o vê', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t4-d', 'estouro-t4-04', t0);
      const depois = depoisDoPrazo(t0);

      const entrega = await entregaDe(r.pagamentoId, r.chargeId, r.pedidoId);
      const overdue = await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.failed', entrega)
      );
      expect(overdue.ignorado).toBe(false);

      const rodada = await varrerPixVencidosCore(db, provider, depois);
      expect(rodada.encontrados).toBe(0);

      const { ped, pag } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(ped.get('status')).toBe('falhou');
      expect(pag.get('status')).toBe('falhou');
      // ASSIMETRIA PRESERVADA: o webhook não cancela nada no gateway (a
      // cobrança já morreu lá — é o gateway avisando), então o carimbo de
      // cancelamento no gateway NÃO nasce nesta porta.
      expect(pag.get('gatewayCancelado')).toBeUndefined();
      expect(canceladoPorPrazoPix(ped.data() ?? {})).toBe(false);
    });

    it('onCall ANTES do webhook OVERDUE: mesma convergência, uma transição só', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t4-e', 'estouro-t4-05', t0);
      const depois = depoisDoPrazo(t0);

      await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t4-e' }, relogio(depois)
      );
      const entrega = await entregaDe(r.pagamentoId, r.chargeId, r.pedidoId);
      const overdue = await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.failed', entrega)
      );
      expect(overdue.ignorado).toBe(true);
      expect(overdue.motivo).toBe('estado_ja_final');
    });
  });

  // -------------------------------------------------------------------------
  // T5 — a corrida de verdade: o webhook confirma no meio da expiração
  // -------------------------------------------------------------------------

  describe('T5 · o webhook confirma ENTRE o gateway e a transação', () => {
    it('a releitura in-tx vê estado final e no-opa — dinheiro manda', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t5', 'estouro-t5-01', t0);
      const depois = depoisDoPrazo(t0);

      // A corrida ENCENADA no ponto exato: o `cancelCharge` devolve ok e, no
      // mesmo gesto, o webhook confirma o pagamento. Quando a fase 3 relê, o
      // pagamento JÁ é 'confirmado'. É a janela que a guarda existe para
      // fechar, e ela só é alcançável assim (no caminho normal a cobrança
      // paga nem seria cancelável).
      const entrega = {
        chargeId: r.chargeId,
        orderId: r.pedidoId,
        amount: (await db.collection('pagamentos').doc(r.pagamentoId).get())
          .get('gatewayAmountCentavos') as number,
        eventId: `corrida-${r.pedidoId}`,
      };
      const comCorrida = providerCom(async (params) => {
        const res = await provider.cancelCharge(params);
        await processarWebhookPagamento(
          db, provider, buildMockWebhookPayload('charge.confirmed', entrega)
        );
        return res;
      });

      const rodada = await varrerPixVencidosCore(db, comCorrida, depois);
      expect(rodada.encontrados).toBe(1);
      expect(rodada.expirados).toBe(0);
      expect(rodada.naoElegiveis).toBe(1);
      expect(rodada.erros).toBe(0);

      const { ped, pag } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(pag.get('status')).toBe('confirmado');
      expect(ped.get('status')).toBe('pago');
      expect(ped.get('canceladoMotivo')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // T6 — a varredura é bounded
  // -------------------------------------------------------------------------

  describe('T6 · teto por rodada', () => {
    it('mais vencidos que o teto ⇒ processa até o teto; o resto drena na rodada seguinte', async () => {
      const t0 = new Date(Date.now() + 60_000);
      // Compradores DISTINTOS: a trava de segunda cobrança PIX viva é por
      // (comprador, carrinho) e recusaria três pedidos do mesmo uid.
      for (const uid of ['uid-t6-a', 'uid-t6-b', 'uid-t6-c']) {
        await cobrancaPix(uid, `estouro-t6-${uid}`, t0);
      }
      const depois = depoisDoPrazo(t0);

      const primeira = await varrerPixVencidosCore(db, provider, depois, 2);
      expect(primeira.encontrados).toBe(2);
      expect(primeira.expirados).toBe(2);

      const segunda = await varrerPixVencidosCore(db, provider, depois, 2);
      expect(segunda.encontrados).toBe(1);
      expect(segunda.expirados).toBe(1);

      const terceira = await varrerPixVencidosCore(db, provider, depois, 2);
      expect(terceira.encontrados).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // T7 — ⚔ a porta pública não afrouxou (S322-T1)
  // -------------------------------------------------------------------------

  describe('T7 · ⚔ o chamador de sistema não abriu a porta pública', () => {
    it('uid ALHEIO sobre pedido de outro segue levando permission-denied', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t7-dono', 'estouro-t7-01', t0);
      const depois = depoisDoPrazo(t0);

      await expect(
        expirarPixPendenteCore(
          db, provider, { pedidoId: r.pedidoId },
          { uid: 'uid-t7-invasor' }, relogio(depois)
        )
      ).rejects.toMatchObject({ code: 'permission-denied' });

      // E o pedido do dono continua intacto depois do ataque.
      const { ped } = await lerPar(r.pedidoId, r.pagamentoId);
      expect(ped.get('status')).toBe('pendente');
    });

    it('a checagem de dono é a ÚNICA coisa que o sistema pula — o relógio continua mandando', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrancaPix('uid-t7-b', 'estouro-t7-02', t0);

      // Sistema chamando ANTES da hora: negado igual ao comprador.
      await expect(
        expirarPixPendenteCore(
          db, provider, { pedidoId: r.pedidoId }, { sistema: true },
          relogio(new Date(t0.getTime() + 60_000))
        )
      ).rejects.toThrow(/ainda não expirou/);

      // Depois da hora: passa, sem uid nenhum.
      const ok = await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { sistema: true },
        relogio(depoisDoPrazo(t0))
      );
      expect(ok.expirado).toBe(true);
    });
  });
});
