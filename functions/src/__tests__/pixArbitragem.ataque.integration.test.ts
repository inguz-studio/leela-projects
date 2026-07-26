/**
 * pixArbitragem.ataque.integration.test.ts — review ANTAGONISTA S1209-PIXREV
 * (trace leela-build-2d6ee98d). ⚠️ EXIGE Firestore no Emulator (demo-leela;
 * porta via LEELA_FS_EMU_PORT — lane 8480).
 *
 * Esta suíte NÃO repete a prova do produtor: ela ATACA as duas decisões que
 * ele mesmo pediu para atacar e os vetores do brief da review.
 *
 *   AT-1  A sentinela sob corrida REAL (N=8, várias rodadas) — 2 requisições
 *         é amostra pequena demais para sustentar garantia de dinheiro.
 *   AT-2  Falso-bloqueio: carrinhos DIFERENTES do mesmo comprador, disparados
 *         ao mesmo tempo, não podem se atropelar na mesma sentinela.
 *   AT-3  EMPILHAMENTO: quantas cobranças vivas um comprador consegue abrir
 *         de propósito com o escopo (comprador, evento, CARRINHO)?
 *   AT-4  Sentinela órfã / denial of purchase: a trava solta em TODOS os
 *         desfechos (pago, falhou, cancelado, cancelamento-no-gateway-falhou)?
 *   AT-5  ⛔ O FURO: quando o cancelamento no gateway FALHA e o prazo vence,
 *         a trava solta e nasce uma SEGUNDA cobrança enquanto a primeira
 *         continua PAGÁVEL no gateway. Duas cobranças vivas — exatamente o
 *         defeito que T2 existe para impedir.
 *   AT-6  Recarimbo do replay: nenhum relógio novo pode ESTICAR a validade.
 *   AT-7  Sentinela torta: fail-open declarado, e forjá-la de fora é negado.
 *   AT-8  Duas chamadas CONCORRENTES de expirarPixPendente.
 *   AT-9  Pagamento retardatário: o dinheiro fica OBSERVÁVEL (ledger com o
 *         valor), não engolido em silêncio.
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 \
 *   npx firebase-tools@13 emulators:exec --config ../firebase.r6.json \
 *     --project demo-leela \
 *     "npx vitest run src/__tests__/pixArbitragem.ataque.integration.test.ts"
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
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import {
  COLECAO_TRAVA_PIX,
  docIdTravaPix,
  impressaoDoCarrinho,
} from '../checkout/travaCobrancaPix';
import { MOTIVO_PIX_PENDENTE_ATIVO, type PaymentProvider } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-pixrev';
const EVENTO_ID = 'meia-pixrev';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const MEIA_HORA_MS = 30 * 60 * 1000;

/** CPFs VÁLIDOS (DV correto) — o checkout valida na fronteira. */
const CPFS = [
  '529.982.247-25',
  '168.995.350-09',
  '111.444.777-35',
  '200.300.400-94',
  '390.533.447-05',
  '153.509.460-56',
] as const;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

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
    cancelCharge: () => Promise.reject(new Error('[ataque] gateway fora do ar')),
  };
}

function inputPix(
  chave: string,
  over: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      {
        nome: 'Ana Pagadora',
        email: 'ana@exemplo.com.br',
        cpf: CPFS[0],
        modalidade: '10k',
      },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    // Prefixo: a RN-333 exige 8–64 chars A-Za-z0-9_-; os rótulos curtos dos
    // ataques abaixo ficam legíveis sem esbarrar no piso.
    idempotencyKey: `pixrev-${chave}`,
    ...over,
  };
}

/** Carrinho de UM inscrito, escolhido pelo índice do CPF — carrinhos distintos. */
function inputCarrinho(
  chave: string,
  idxCpf: number
): CreateInscricaoChargeInput {
  return inputPix(chave, {
    inscritos: [
      {
        nome: `Atleta ${idxCpf}`,
        email: `atleta${idxCpf}@exemplo.com.br`,
        cpf: CPFS[idxCpf] ?? CPFS[0],
        modalidade: '10k',
      },
    ],
    responsavelIndex: 0,
    responsavel: { nome: `Atleta ${idxCpf}`, email: `atleta${idxCpf}@exemplo.com.br` },
  });
}

describe.skipIf(!hasEmulator)('S1209-PIXREV — ataque à arbitragem server-side do PIX', () => {
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
      id: TENANT_ID, nome: 'Castelo PIXREV', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-pixrev', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
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
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-pixrev',
      nome: 'Meia PIXREV', data: tsRel(45), local: 'Floripa/SC',
      modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('l1'), {
      id: 'l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
      nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 500, preco: FACE, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  const T0 = () => new Date(Date.now() + 60_000);

  async function criar(uid: string, chave: string, quando: Date) {
    return createInscricaoChargeCore(
      db, provider, inputPix(chave), { uid, ehAnonimo: true }, relogio(quando)
    );
  }

  /** Entrega de webhook do gateway para ESTA cobrança (mesma forma do repo). */
  async function entregaDe(r: {
    chargeId: string;
    pedidoId: string;
    pagamentoId: string;
  }): Promise<Record<string, unknown>> {
    const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
    return {
      chargeId: r.chargeId,
      orderId: r.pedidoId,
      amount: pag.get('gatewayAmountCentavos') as number,
      eventId: `ataque-${r.pedidoId}`,
    };
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

  // ==========================================================================
  // AT-1 · a sentinela sob corrida REAL (o produtor provou com N=2)
  // ==========================================================================

  describe('AT-1 · corrida com N > 2 na MESMA chave de sentinela', () => {
    // 8 requisições simultâneas, cada uma com chave de idempotência PRÓPRIA
    // (então não há pedido em comum para o Firestore serializar — só a
    // sentinela). Se o get+create não for atômico de verdade, mais de uma
    // passa. Repetido em rodadas: corrida que "às vezes" segura não segura.
    for (const rodada of [1, 2, 3]) {
      it(`rodada ${rodada}: 8 concorrentes ⇒ EXATAMENTE 1 cobrança viva`, async () => {
        const t0 = T0();
        const uid = `uid-at1-r${rodada}`;
        const resultados = await Promise.allSettled(
          Array.from({ length: 8 }, (_, i) =>
            createInscricaoChargeCore(
              db, provider, inputPix(`at1-r${rodada}-${i}`),
              { uid, ehAnonimo: true }, relogio(t0)
            )
          )
        );

        const ok = resultados.filter((r) => r.status === 'fulfilled');
        const nao = resultados.filter((r) => r.status === 'rejected');
        expect(ok).toHaveLength(1);
        expect(nao).toHaveLength(7);
        // Toda recusa é a recusa TIPADA da trava — não um erro de contenção
        // do Firestore travestido de sucesso da regra.
        for (const r of nao) {
          const e = (r as PromiseRejectedResult).reason as {
            code?: string;
            details?: Record<string, unknown>;
          };
          expect(e.code).toBe('failed-precondition');
          expect(e.details?.['motivo']).toBe(MOTIVO_PIX_PENDENTE_ATIVO);
        }
        // E o banco confirma: UMA cobrança viva, não oito.
        expect(await pedidosPendentes(uid)).toBe(1);
        // A sentinela aponta para a única sobrevivente.
        const vencedora = (ok[0] as PromiseFulfilledResult<{ pedidoId: string }>)
          .value.pedidoId;
        const trava = await db
          .collection(COLECAO_TRAVA_PIX)
          .doc(docIdTravaPix(uid, {
            eventoId: EVENTO_ID,
            inscritos: [{ cpf: CPFS[0], modalidade: '10k' }],
          }))
          .get();
        expect(trava.exists).toBe(true);
        expect(trava.get('pedidoId')).toBe(vencedora);
      }, 60_000);
    }
  });

  // ==========================================================================
  // AT-2 · falso-bloqueio (o outro lado da corrida)
  // ==========================================================================

  it('AT-2 · carrinhos DIFERENTES do mesmo comprador, simultâneos ⇒ nenhum se atropela', async () => {
    const t0 = T0();
    const uid = 'uid-at2';
    const resultados = await Promise.allSettled(
      [1, 2, 3, 4].map((i) =>
        createInscricaoChargeCore(
          db, provider, inputCarrinho(`at2-${i}`, i),
          { uid, ehAnonimo: true }, relogio(t0)
        )
      )
    );
    // A trava é por CARRINHO: quatro carrinhos distintos são quatro compras
    // distintas. Bloquear aqui seria a trava cobrando o preço errado.
    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await pedidosPendentes(uid)).toBe(4);
  }, 60_000);

  // ==========================================================================
  // AT-3 · o EMPILHAMENTO que o escopo (comprador, evento, carrinho) permite
  // ==========================================================================

  it('AT-3 · FRONTEIRA MEDIDA: o escopo por carrinho NÃO limita cobranças vivas por comprador', async () => {
    const t0 = T0();
    const uid = 'uid-at3';
    // Cada carrinho difere por UM CPF — todos válidos, todos aceitos pelo
    // checkout. A trava nunca é acionada, porque nenhum é "a mesma compra".
    for (let i = 0; i < 5; i += 1) {
      const r = await createInscricaoChargeCore(
        db, provider, inputCarrinho(`at3-${i}`, i),
        { uid, ehAnonimo: true }, relogio(new Date(t0.getTime() + i * 1000))
      );
      expect(r.statusPedido).toBe('pendente');
    }
    // CINCO cobranças PIX vivas e pagáveis, do MESMO comprador, no MESMO
    // evento, ao mesmo tempo. Isto é a FRONTEIRA DECLARADA do escopo, não um
    // bug da implementação — mas fixa por teste que T2 não é, e não deve ser
    // vendida como, limite de cobranças abertas por comprador.
    expect(await pedidosPendentes(uid)).toBe(5);
  }, 60_000);

  // ==========================================================================
  // AT-4 · sentinela órfã ⇒ denial of purchase (todos os desfechos)
  // ==========================================================================

  describe('AT-4 · a trava solta em TODOS os desfechos (nunca trava o comprador para sempre)', () => {
    it('desfecho PAGO: comprar o mesmo carrinho de novo continua possível', async () => {
      const t0 = T0();
      const primeira = await criar('uid-at4-pago', 'at4-pago-01', t0);
      await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.confirmed', await entregaDe(primeira))
      );
      expect(
        (await db.collection('pedidos').doc(primeira.pedidoId).get()).get('status')
      ).not.toBe('pendente');

      const nova = await criar(
        'uid-at4-pago', 'at4-pago-02', new Date(t0.getTime() + 60_000)
      );
      expect(nova.pedidoId).not.toBe(primeira.pedidoId);
      expect(nova.statusPedido).toBe('pendente');
    });

    it('desfecho FALHOU: a trava não segura o retry', async () => {
      const t0 = T0();
      const primeira = await criar('uid-at4-falhou', 'at4-falhou-01', t0);
      await db.collection('pedidos').doc(primeira.pedidoId).update({ status: 'falhou' });
      await db.collection('pagamentos').doc(primeira.pagamentoId).update({ status: 'falhou' });

      const nova = await criar(
        'uid-at4-falhou', 'at4-falhou-02', new Date(t0.getTime() + 60_000)
      );
      expect(nova.statusPedido).toBe('pendente');
    });

    it('desfecho CANCELADO pelo timer: a trava solta (caminho normal da RN-157)', async () => {
      const t0 = T0();
      const primeira = await criar('uid-at4-canc', 'at4-canc-01', t0);
      const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);
      await expirarPixPendenteCore(
        db, provider, { pedidoId: primeira.pedidoId },
        { uid: 'uid-at4-canc' }, relogio(depois)
      );
      const nova = await criar('uid-at4-canc', 'at4-canc-02', depois);
      expect(nova.statusPedido).toBe('pendente');
      expect(provider.getCharge(primeira.chargeId)?.status).toBe('cancelled');
    });

    it('desfecho CANCELAMENTO-NO-GATEWAY-FALHOU, AINDA no prazo: a trava SEGURA (correto)', async () => {
      const t0 = T0();
      const primeira = await criar('uid-at4-gw', 'at4-gw-01', t0);
      // Timer do comprador adiantado: pede a expiração ANTES da hora — nem
      // chega ao gateway. Dentro do prazo, a segunda cobrança é recusada.
      await expect(
        expirarPixPendenteCore(
          db, gatewayQueNaoCancela(provider), { pedidoId: primeira.pedidoId },
          { uid: 'uid-at4-gw' }, relogio(new Date(t0.getTime() + 60_000))
        )
      ).rejects.toThrow(/ainda não expirou/);

      await expect(
        criar('uid-at4-gw', 'at4-gw-02', new Date(t0.getTime() + 120_000))
      ).rejects.toThrow(/cobrança PIX aberta e dentro do prazo/);
      // "ainda pagável" no Mock = NÃO cancelada (o adapter nasce 'confirmed'
      // por atalho documentado; a autoridade sobre pagamento é o webhook).
      expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
    });
  });

  // ==========================================================================
  // AT-5 · ⛔ O FURO: T3 falha no gateway + prazo vence ⇒ T2 solta
  // ==========================================================================

  it('AT-5 · ⛔ cancelamento no gateway FALHOU + prazo vencido ⇒ NASCE a segunda cobrança com a primeira AINDA PAGÁVEL', async () => {
    const t0 = T0();
    const uid = 'uid-at5';
    const primeira = await criar(uid, 'at5-01', t0);
    const depoisDoPrazo = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    // 1) O timer zera e a plataforma tenta matar a cobrança. O gateway
    //    recusa/está fora ⇒ FAIL-SAFE do T3: o pedido segue VIVO, e a
    //    cobrança segue PAGÁVEL no gateway. Até aqui, correto.
    await expect(
      expirarPixPendenteCore(
        db, gatewayQueNaoCancela(provider), { pedidoId: primeira.pedidoId },
        { uid }, relogio(depoisDoPrazo)
      )
    ).rejects.toThrow(/CONTINUA válida/);
    expect(
      (await db.collection('pedidos').doc(primeira.pedidoId).get()).get('status')
    ).toBe('pendente');
    // Não cancelada no gateway = ainda pagável pelo banco do comprador.
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');

    // 2) O comprador pede outra cobrança do MESMO carrinho. A trava lê a
    //    sentinela, vê `pixExpiraEm` no passado e SOLTA — porque "vivo" para
    //    ela é só "prazo no futuro", enquanto para o T3 "morto" é "o gateway
    //    confirmou". As duas lanes discordam sobre o que é uma cobrança viva.
    const segunda = await criar(uid, 'at5-02', depoisDoPrazo);
    expect(segunda.pedidoId).not.toBe(primeira.pedidoId);

    // 3) O resultado é o defeito que T2 existe para impedir: DUAS cobranças
    //    PAGÁVEIS no gateway, do mesmo comprador, para o mesmo carrinho.
    //    Pagar as duas cobra duas vezes.
    expect(provider.getCharge(primeira.chargeId)?.status).not.toBe('cancelled');
    expect(provider.getCharge(segunda.chargeId)?.status).not.toBe('cancelled');
    expect(await pedidosPendentes(uid)).toBe(2);
  }, 60_000);

  // ==========================================================================
  // AT-6 · recarimbo do replay não pode ESTICAR a validade
  // ==========================================================================

  describe('AT-6 · o `agora` novo do replay NUNCA estica `pixExpiraEm`', () => {
    it('replay a 1 segundo do fim devolve a expiração ORIGINAL', async () => {
      const t0 = T0();
      const criacao = await criar('uid-at6-a', 'at6-a-01', t0);
      const quaseFim = new Date(t0.getTime() + MEIA_HORA_MS - 1000);
      const replay = await createInscricaoChargeCore(
        db, provider, inputPix('at6-a-01'),
        { uid: 'uid-at6-a', ehAnonimo: true }, relogio(quaseFim)
      );
      expect(replay.pixExpiraEmMillis).toBe(criacao.pixExpiraEmMillis);
      expect((replay.pixExpiraEmMillis ?? 0) - replay.servidorAgoraMillis).toBe(1000);
    });

    it('replay DEPOIS do prazo devolve restante NEGATIVO — a tela vê o fim, não um prazo novo', async () => {
      const t0 = T0();
      const criacao = await criar('uid-at6-b', 'at6-b-01', t0);
      const depois = new Date(t0.getTime() + MEIA_HORA_MS + 5 * 60_000);
      const replay = await createInscricaoChargeCore(
        db, provider, inputPix('at6-b-01'),
        { uid: 'uid-at6-b', ehAnonimo: true }, relogio(depois)
      );
      expect(replay.pixExpiraEmMillis).toBe(criacao.pixExpiraEmMillis);
      expect((replay.pixExpiraEmMillis ?? 0) - replay.servidorAgoraMillis).toBe(
        -5 * 60_000
      );
      // E o doc no banco também não foi recarimbado.
      const pag = await db.collection('pagamentos').doc(criacao.pagamentoId).get();
      expect((pag.get('pixExpiraEm') as Timestamp).toMillis()).toBe(
        criacao.pixExpiraEmMillis
      );
    });

    it('replay com relógio ANDANDO PARA TRÁS não inventa prazo maior nem quebra', async () => {
      const t0 = T0();
      const criacao = await criar('uid-at6-c', 'at6-c-01', t0);
      const antes = new Date(t0.getTime() - 10 * 60_000);
      const replay = await createInscricaoChargeCore(
        db, provider, inputPix('at6-c-01'),
        { uid: 'uid-at6-c', ehAnonimo: true }, relogio(antes)
      );
      expect(replay.pixExpiraEmMillis).toBe(criacao.pixExpiraEmMillis);
      // 40 min "restantes" é o reflexo honesto de um relógio de servidor
      // andando para trás — o campo é o `agora` DELE, não uma promessa.
      expect((replay.pixExpiraEmMillis ?? 0) - replay.servidorAgoraMillis).toBe(
        MEIA_HORA_MS + 10 * 60_000
      );
    });
  });

  // ==========================================================================
  // AT-7 · sentinela torta e sentinela forjada
  // ==========================================================================

  describe('AT-7 · a sentinela como superfície de ataque', () => {
    const carrinhoBase = {
      eventoId: EVENTO_ID,
      inscritos: [{ cpf: CPFS[0], modalidade: '10k' }],
    };

    it('sentinela TORTA (sem pedidoId string) não bloqueia a venda — fail-open declarado', async () => {
      const uid = 'uid-at7-torta';
      await db
        .collection(COLECAO_TRAVA_PIX)
        .doc(docIdTravaPix(uid, carrinhoBase))
        .set({ pedidoId: 42, pagamentoId: null, eventoId: EVENTO_ID });

      const r = await criar(uid, 'at7-torta-01', T0());
      expect(r.statusPedido).toBe('pendente');
    });

    it('sentinela APONTANDO PARA PEDIDO DE OUTRO COMPRADOR não é reusável como arma', async () => {
      // Um pedido pendente e no prazo do comprador A.
      const t0 = T0();
      const doA = await criar('uid-at7-a', 'at7-a-01', t0);
      // A chave da sentinela CONTÉM o uid — não existe caminho por dado em
      // que a cobrança de A apareça sob a chave de B. Aqui só se confirma
      // que B compra normalmente com A vivo (o inverso da negação de venda).
      const doB = await criar('uid-at7-b', 'at7-b-01', t0);
      expect(doB.statusPedido).toBe('pendente');
      expect(doB.pedidoId).not.toBe(doA.pedidoId);
    });

    it('a impressão do carrinho NÃO carrega PII em claro (nem CPF, nem e-mail, nem nome)', () => {
      const hash = impressaoDoCarrinho({
        eventoId: EVENTO_ID,
        inscritos: [{ cpf: CPFS[0], modalidade: '10k' }],
      });
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
      expect(hash).not.toContain('52998224725');
      const docId = docIdTravaPix('uid-x', carrinhoBase);
      expect(docId).toBe(`uid-x__${EVENTO_ID}__${hash}`);
      expect(docId).not.toContain('529');
    });

    it('o doc da sentinela NÃO guarda PII (só ponteiros e prazo)', async () => {
      const uid = 'uid-at7-pii';
      await criar(uid, 'at7-pii-01', T0());
      const snap = await db
        .collection(COLECAO_TRAVA_PIX)
        .doc(docIdTravaPix(uid, carrinhoBase))
        .get();
      expect(snap.exists).toBe(true);
      const bruto = JSON.stringify(snap.data());
      expect(bruto).not.toContain('529');
      expect(bruto).not.toContain('ana@exemplo.com.br');
      expect(bruto).not.toContain('Ana Pagadora');
      expect(Object.keys(snap.data() ?? {}).sort()).toEqual([
        'atualizadoEm', 'eventoId', 'pagamentoId', 'pedidoId', 'pixExpiraEmMillis',
      ]);
    });

    it('cliente autenticado NÃO lê nem escreve a sentinela (deny-by-default das Rules)', async () => {
      const uid = 'uid-at7-rules';
      await criar(uid, 'at7-rules-01', T0());
      const docPath = `${COLECAO_TRAVA_PIX}/${docIdTravaPix(uid, carrinhoBase)}`;

      const ctx = testEnv.authenticatedContext(uid);
      const clientDoc = ctx.firestore().doc(docPath);
      // Ler daria a um sondador o mapa das cobranças abertas.
      await expect(clientDoc.get()).rejects.toThrow();
      // Escrever permitiria derrubar a própria trava e abrir a 2ª cobrança.
      await expect(clientDoc.set({ pedidoId: 'forjado' })).rejects.toThrow();
      await expect(clientDoc.delete()).rejects.toThrow();
    });
  });

  // ==========================================================================
  // AT-8 · duas expirações CONCORRENTES (item 6 do "fica para a review")
  // ==========================================================================

  it('AT-8 · duas chamadas CONCORRENTES de expirarPixPendente ⇒ pedido cancelado UMA vez, sem dano', async () => {
    const t0 = T0();
    const uid = 'uid-at8';
    const r = await criar(uid, 'at8-01', t0);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    const res = await Promise.allSettled([
      expirarPixPendenteCore(db, provider, { pedidoId: r.pedidoId }, { uid }, relogio(depois)),
      expirarPixPendenteCore(db, provider, { pedidoId: r.pedidoId }, { uid }, relogio(depois)),
      expirarPixPendenteCore(db, provider, { pedidoId: r.pedidoId }, { uid }, relogio(depois)),
    ]);

    // Direção segura: nenhuma pode terminar com o pedido vivo e a cobrança
    // morta, nem com o pedido morto e a cobrança viva.
    const pedido = await db.collection('pedidos').doc(r.pedidoId).get();
    expect(pedido.get('status')).toBe('cancelado');
    expect(pedido.get('canceladoMotivo')).toBe('pix_expirado');
    expect(provider.getCharge(r.chargeId)?.status).toBe('cancelled');
    // No máximo UMA aplicou a transição; as demais são idempotentes ou
    // recusam em `failed-precondition` (nunca um code novo e não tratado).
    const aplicaram = res.filter(
      (x) => x.status === 'fulfilled' && (x.value as { expirado: boolean }).expirado
    );
    expect(aplicaram.length).toBeLessThanOrEqual(1);
    // O QUE ESTE LOOP FIXA: a direção é segura, mas as recusas concorrentes
    // NÃO são necessariamente o erro TIPADO da lane — sob contenção o
    // Firestore sobe o próprio erro (ABORTED/INVALID_ARGUMENT) cru até o
    // chamador. A tela trata "erro não-precondição" como fim da cobrança
    // (S1209-REV), o que aqui é verdade; mas o code não é contrato.
    const recusas = res
      .filter((x): x is PromiseRejectedResult => x.status === 'rejected')
      .map((x) => ({
        code: (x.reason as { code?: unknown }).code,
        msg: String((x.reason as Error).message ?? x.reason).slice(0, 120),
      }));
    // eslint-disable-next-line no-console
    if (recusas.length > 0) console.log('AT-8 recusas:', JSON.stringify(recusas));
    // E a trava soltou: a próxima cobrança do mesmo carrinho nasce.
    const nova = await criar(uid, 'at8-02', depois);
    expect(nova.statusPedido).toBe('pendente');
  }, 60_000);

  // ==========================================================================
  // AT-9 · o dinheiro retardatário é OBSERVÁVEL (não engolido em silêncio)
  // ==========================================================================

  it('AT-9 · pagamento que entra DEPOIS do cancelamento deixa registro DURÁVEL com o valor', async () => {
    const t0 = T0();
    const uid = 'uid-at9';
    const r = await criar(uid, 'at9-01', t0);
    const depois = new Date(t0.getTime() + MEIA_HORA_MS + 1000);
    await expirarPixPendenteCore(
      db, provider, { pedidoId: r.pedidoId }, { uid }, relogio(depois)
    );

    // O dinheiro em voo chega ao webhook DEPOIS do cancelamento.
    const res = await processarWebhookPagamento(
      db, provider,
      buildMockWebhookPayload('charge.confirmed', await entregaDe(r))
    );
    expect(res.ignorado).toBe(true);
    expect(res.motivo).toBe('estado_ja_final');

    // O pedido não ressuscita e a receita não se move sozinha.
    const evento = await db.collection('eventos').doc(EVENTO_ID).get();
    expect(evento.get('receitaConfirmada')).toBe(0);

    // ⚠️ O QUE ESTE TESTE FIXA: o dinheiro NÃO é silencioso — existe um doc
    // durável, por entrega, com o VALOR e o efeito. É o insumo mínimo de
    // reconciliação. O que NÃO existe (e está escalado) é alerta/fila: quem
    // não for procurar por esta subcoleção não fica sabendo.
    const ledger = await db
      .collection('pagamentos').doc(r.pagamentoId)
      .collection('webhookEventos').get();
    expect(ledger.size).toBe(1);
    const entrega = ledger.docs[0];
    expect(entrega?.get('efeito')).toBe('ignorado_estado_final');
    expect(entrega?.get('amountCentavos')).toBeGreaterThan(0);
    expect(entrega?.get('chargeId')).toBe(r.chargeId);
  }, 60_000);
});
