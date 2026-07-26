/**
 * pixCarrinho.integration.test.ts — LEELA-PIX-CARRINHO-T1 (item 25 da rodada
 * DEC-0726B, opção (b) ratificada pelo Vitor · RN-157 · trace
 * leela-build-2d6ee98d). ⚠️ EXIGE Firestore no Emulator (projectId
 * demo-leela; porta via LEELA_FS_EMU_PORT — nunca o 8180 do preview).
 *
 * O QUE ESTA SUÍTE PROVA
 *
 * A review antagonista S1209-PIXREV provou (achado A1) que T2 e T3
 * discordavam sobre o que é uma cobrança viva: para o T3, morta é "o gateway
 * confirmou"; para o T2, morta era "o relógio passou". Com o gateway
 * recusando o cancelamento, nascia a segunda cobrança sobre a primeira ainda
 * pagável.
 *
 * O item 25 ratificou a opção (b): a anterior é cancelada NO GATEWAY dentro
 * do fluxo de criação da nova. Aqui se prova que
 *
 *   1. a trava NÃO solta mais pelo relógio sozinho;
 *   2. com o gateway respondendo, a anterior morre ANTES de a nova nascer;
 *   3. com o gateway recusando, a criação é NEGADA (negativa honesta) e a
 *      anterior segue ÚNICA — nunca duas pagáveis;
 *   4. a negativa não é permanente: o gateway voltando, a venda destrava
 *      sozinha, sem fiação nova de tela;
 *   5. dentro do prazo nada mudou (a recusa `pix_pendente_ativo` do T2 segue
 *      inteira, e o gateway nem é tocado);
 *   6. o pré-voo não é um cancelador solto: input inválido, replay e cartão
 *      não matam a cobrança viva do comprador.
 *
 * SUITE-STAB: clear+seed com triggers pausados e canários verificados
 * (helpers/stability.ts) — sem isso o backlog de triggers dos arquivos
 * vizinhos engole o seed no emulator quente.
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 \
 *   npx firebase-tools@13 emulators:exec --config ../firebase.r6.json \
 *     --project demo-leela \
 *     "npx vitest run src/__tests__/pixCarrinho.integration.test.ts"
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
import { MockPaymentProvider } from '../payments/mockProvider';
import { expirarPixPendenteCore } from '../checkout/expirarPixPendente';
import {
  COLECAO_TRAVA_PIX,
  docIdTravaPix,
} from '../checkout/travaCobrancaPix';
import {
  MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO,
  MOTIVO_PIX_PENDENTE_ATIVO,
  type PaymentProvider,
} from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-pixcar';
const EVENTO_ID = 'meia-pixcar';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const MEIA_HORA_MS = 30 * 60 * 1000;
/** CPF VÁLIDO (DV correto) — o checkout valida na fronteira. */
const CPF = '529.982.247-25';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

/** Relógio INJETADO: toda aritmética de prazo é exata sobre ele. */
const relogio = (d: Date) => () => d;

/** Provider que delega tudo ao Mock MENOS o cancelamento (gateway fora). */
function gatewayQueNaoCancela(base: MockPaymentProvider): PaymentProvider {
  return {
    ...base,
    createCharge: base.createCharge.bind(base),
    splitRules: base.splitRules.bind(base),
    refund: base.refund.bind(base),
    handleWebhook: base.handleWebhook.bind(base),
    getPayout: base.getPayout.bind(base),
    cancelCharge: () => Promise.reject(new Error('[t1] gateway fora do ar')),
  };
}

/** Provider que CONTA os cancelamentos — prova de que o gateway não foi tocado. */
function contandoCancelamentos(base: MockPaymentProvider): {
  provider: PaymentProvider;
  chamadas: () => number;
} {
  let n = 0;
  return {
    provider: {
      ...base,
      createCharge: base.createCharge.bind(base),
      splitRules: base.splitRules.bind(base),
      refund: base.refund.bind(base),
      handleWebhook: base.handleWebhook.bind(base),
      getPayout: base.getPayout.bind(base),
      cancelCharge: (p) => {
        n += 1;
        return base.cancelCharge(p);
      },
    },
    chamadas: () => n,
  };
}

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
    idempotencyKey: `pixcar-${chave}`,
    ...over,
  };
}

describe.skipIf(!hasEmulator)('PIX-CARRINHO-T1 — cancelamento-na-criação', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host: 'localhost', port: FS_PORT },
    });
    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${FS_PORT}`;
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
      id: TENANT_ID, nome: 'Castelo PIXCAR', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-pixcar', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
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
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-pixcar',
      nome: 'Meia PIXCAR', data: tsRel(45), local: 'Floripa/SC',
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

  const T0 = () => new Date(Date.now() + 60_000);

  async function criar(
    uid: string,
    chave: string,
    quando: Date,
    prov: PaymentProvider = provider
  ) {
    return createInscricaoChargeCore(
      db, prov, inputPix(chave), { uid, ehAnonimo: true }, relogio(quando)
    );
  }

  /** Pedidos PENDENTES deste comprador (o que "cobrança viva" significa). */
  async function pedidosPendentes(uid: string): Promise<number> {
    const snap = await db
      .collection('pedidos')
      .where('responsavel.atletaId', '==', uid)
      .where('status', '==', 'pendente')
      .get();
    return snap.size;
  }

  // -------------------------------------------------------------------------
  // 1 · o caminho feliz: a anterior morre no gateway ANTES de a nova nascer
  // -------------------------------------------------------------------------

  it('prazo vencido + gateway respondendo ⇒ a anterior é CANCELADA no gateway e só então a nova nasce', async () => {
    const uid = 'uid-t1-feliz';
    const t0 = T0();
    const primeira = await criar(uid, 'feliz-01', t0);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    // Ninguém chamou `expirarPixPendente`: a tela pode nem ter existido (o
    // comprador fechou a aba). O encerramento é feito PELO fluxo de criação.
    const nova = await criar(uid, 'feliz-02', depois);

    expect(nova.pedidoId).not.toBe(primeira.pedidoId);
    expect(nova.statusPedido).toBe('pendente');
    // A ordem é o conserto: gateway primeiro.
    expect(provider.getCharge(primeira.chargeId)?.status).toBe('cancelled');
    const anterior = await db.collection('pedidos').doc(primeira.pedidoId).get();
    expect(anterior.get('status')).toBe('cancelado');
    expect(anterior.get('canceladoMotivo')).toBe('pix_expirado');
    // Uma só cobrança viva, e a sentinela aponta para ELA.
    expect(await pedidosPendentes(uid)).toBe(1);
    const trava = await db
      .collection(COLECAO_TRAVA_PIX)
      .doc(docIdTravaPix(uid, {
        eventoId: EVENTO_ID,
        inscritos: [{ cpf: CPF, modalidade: '10k' }],
      }))
      .get();
    expect(trava.get('pedidoId')).toBe(nova.pedidoId);
  }, 60_000);

  // -------------------------------------------------------------------------
  // 2 · a negativa honesta (o coração do item 25)
  // -------------------------------------------------------------------------

  it('gateway RECUSA cancelar ⇒ a criação é NEGADA com motivo tipado e a anterior segue ÚNICA', async () => {
    const uid = 'uid-t1-recusa';
    const t0 = T0();
    const primeira = await criar(uid, 'recusa-01', t0);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    await expect(
      criar(uid, 'recusa-02', depois, gatewayQueNaoCancela(provider))
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { motivo: MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO, pedidoId: primeira.pedidoId },
    });

    // Nada nasceu: nem pedido, nem pagamento, nem cobrança no gateway.
    expect(await pedidosPendentes(uid)).toBe(1);
    expect(
      (await db.collection('pedidos').doc(primeira.pedidoId).get()).get('status')
    ).toBe('pendente');
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
    const novoPedido = await db
      .collection('pedidos')
      .doc(`ped-${uid}-pixcar-recusa-02`)
      .get();
    expect(novoPedido.exists).toBe(false);
  }, 60_000);

  it('a negativa NÃO é permanente: gateway de volta ⇒ a MESMA tentativa destrava a venda', async () => {
    const uid = 'uid-t1-volta';
    const t0 = T0();
    const primeira = await criar(uid, 'volta-01', t0);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    await expect(
      criar(uid, 'volta-02', depois, gatewayQueNaoCancela(provider))
    ).rejects.toThrow(/não conseguimos encerrá-la/i);

    // Mesmíssima chamada, gateway de pé. Sem tela nova, sem intervenção
    // manual: é isto que impede a opção (b) de virar denial of purchase.
    const nova = await criar(uid, 'volta-02', depois);
    expect(nova.statusPedido).toBe('pendente');
    expect(provider.getCharge(primeira.chargeId)?.status).toBe('cancelled');
    expect(await pedidosPendentes(uid)).toBe(1);
  }, 60_000);

  // -------------------------------------------------------------------------
  // 3 · a trava NÃO solta mais pelo relógio (o achado A1, pelo avesso)
  // -------------------------------------------------------------------------

  it('a trava não solta pelo RELÓGIO: com o gateway fora, nem 10 tentativas abrem a segunda', async () => {
    const uid = 'uid-t1-relogio';
    const t0 = T0();
    const primeira = await criar(uid, 'rel-01', t0);
    const semGateway = gatewayQueNaoCancela(provider);

    // Uma tentativa por minuto DEPOIS do prazo — o cenário do comprador
    // impaciente com o gateway fora do ar. Antes do T1, a primeira delas já
    // abria a segunda cobrança.
    for (let i = 1; i <= 10; i += 1) {
      const quando = new Date(t0.getTime() + MEIA_HORA_MS + i * 60_000);
      await expect(criar(uid, `rel-1${i}`, quando, semGateway)).rejects.toMatchObject({
        code: 'failed-precondition',
      });
    }

    expect(await pedidosPendentes(uid)).toBe(1);
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
  }, 120_000);

  // -------------------------------------------------------------------------
  // 4 · o que NÃO mudou (regressão do T2 da PIXBE)
  // -------------------------------------------------------------------------

  it('DENTRO do prazo a recusa segue sendo `pix_pendente_ativo` — e o gateway não é tocado', async () => {
    const uid = 'uid-t1-noprazo';
    const t0 = T0();
    const primeira = await criar(uid, 'noprazo-01', t0);
    const contador = contandoCancelamentos(provider);

    await expect(
      criar(uid, 'noprazo-02', new Date(t0.getTime() + 5 * 60_000), contador.provider)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { motivo: MOTIVO_PIX_PENDENTE_ATIVO, pedidoId: primeira.pedidoId },
    });

    // Cobrança válida na mão do comprador NÃO é cancelada por trás dele: a
    // saída dentro do prazo é pagar, não recomeçar.
    expect(contador.chamadas()).toBe(0);
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
    expect(await pedidosPendentes(uid)).toBe(1);
  }, 60_000);

  it('REPLAY da mesma chave não dispara o pré-voo — a cobrança não se mata a si mesma', async () => {
    const uid = 'uid-t1-replay';
    const t0 = T0();
    const primeira = await criar(uid, 'replay-01', t0);
    const contador = contandoCancelamentos(provider);

    // Replay DEPOIS do prazo: o pedido existe, então o caminho de criação
    // nem é percorrido. Se o pré-voo rodasse aqui, ele mataria a própria
    // cobrança que o replay deve devolver.
    const replay = await createInscricaoChargeCore(
      db, contador.provider, inputPix('replay-01'),
      { uid, ehAnonimo: true },
      relogio(new Date(t0.getTime() + MEIA_HORA_MS + 1000))
    );
    expect(replay.pedidoId).toBe(primeira.pedidoId);
    expect(replay.chargeId).toBe(primeira.chargeId);
    expect(contador.chamadas()).toBe(0);
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
  }, 60_000);

  it('input INVÁLIDO não mata a cobrança viva: o pré-voo roda depois das validações', async () => {
    const uid = 'uid-t1-invalido';
    const t0 = T0();
    const primeira = await criar(uid, 'inval-01', t0);
    const contador = contandoCancelamentos(provider);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    // Modalidade inexistente ⇒ morre na validação. Se o cancelamento viesse
    // antes, um payload lixo derrubaria a cobrança do comprador de graça.
    await expect(
      createInscricaoChargeCore(
        db, contador.provider,
        inputPix('inval-02', {
          inscritos: [
            { nome: 'Ana', email: 'ana@exemplo.com.br', cpf: CPF, modalidade: 'maratona' },
          ],
        }),
        { uid, ehAnonimo: true }, relogio(depois)
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(contador.chamadas()).toBe(0);
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
  }, 60_000);

  it('CARTÃO sobre PIX vencido não encerra a cobrança PIX — fronteira declarada, não lacuna', async () => {
    const uid = 'uid-t1-cartao';
    const t0 = T0();
    const primeira = await criar(uid, 'cartao-01', t0);
    const contador = contandoCancelamentos(provider);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    // O item 25 fala de "cobrança PIX nova". Trocar de MEIO segue sendo a
    // fronteira escalada desde a PIXBE (escalado #2) — este teste a fixa em
    // vez de deixá-la escondida.
    const cartao = await createInscricaoChargeCore(
      db, contador.provider,
      inputPix('cartao-02', { forma: 'cartao_credito', parcelas: 1 }),
      { uid, ehAnonimo: true }, relogio(depois)
    );
    expect(cartao.statusPedido).toBe('pendente');
    expect(contador.chamadas()).toBe(0);
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
  }, 60_000);

  // -------------------------------------------------------------------------
  // 5 · corrida: criação-nova × cancelamento (exigência do brief)
  // -------------------------------------------------------------------------

  it('CORRIDA criação-nova × expirarPixPendente: nunca sobram duas cobranças vivas', async () => {
    for (const rodada of [1, 2, 3]) {
      const uid = `uid-t1-corrida-${rodada}`;
      const t0 = T0();
      const primeira = await criar(uid, `corr-${rodada}-01`, t0);
      const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

      // A tela materializa a expiração ao MESMO tempo em que o comprador
      // (ou outra aba) pede a cobrança nova. As duas querem cancelar a mesma
      // cobrança no gateway.
      const [expirou, criou] = await Promise.allSettled([
        expirarPixPendenteCore(
          db, provider, { pedidoId: primeira.pedidoId }, { uid }, relogio(depois)
        ),
        criar(uid, `corr-${rodada}-02`, depois),
      ]);

      // O desfecho pode variar (quem chegou primeiro ao gateway), mas o
      // INVARIANTE não: no máximo UMA cobrança PIX viva no fim.
      expect(await pedidosPendentes(uid)).toBeLessThanOrEqual(1);
      expect(
        (await db.collection('pedidos').doc(primeira.pedidoId).get()).get('status')
      ).toBe('cancelado');
      expect(provider.getCharge(primeira.chargeId)?.status).toBe('cancelled');
      // A criação nunca "meio nasce": ou devolveu um pedido, ou nada criou.
      if (criou.status === 'fulfilled') {
        expect(criou.value.statusPedido).toBe('pendente');
      }
      expect(expirou.status === 'fulfilled' || expirou.status === 'rejected').toBe(true);
    }
  }, 120_000);
});
