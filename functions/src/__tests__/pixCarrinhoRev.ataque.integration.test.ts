/**
 * pixCarrinhoRev.ataque.integration.test.ts — REVIEW ANTAGONISTA da lane
 * PIX-CARRINHO (trace leela-build-2d6ee98d · lane PIXCARRINHO-REV). ⚠️ EXIGE
 * Firestore no Emulator (projectId demo-leela; porta via LEELA_FS_EMU_PORT —
 * nunca o 8180 do preview).
 *
 * A lane PIX-CARRINHO entregou três coisas de dinheiro e pediu ataque em dez
 * vetores. Esta suíte é o ataque: cada bloco abaixo tenta QUEBRAR uma garantia
 * declarada no report, e o que sobrevive fica fixado como teste.
 *
 *   AT-R1 · o alvo nº 1 — a negativa do T1 pode virar PERMANENTE? O domínio
 *           não tem escape próprio: com o gateway recusando SEMPRE, nem 12
 *           tentativas destravam. Todo o escape depende de o adapter saber
 *           distinguir "recusei" de "já estava morta" — a matriz de contrato
 *           que prova isso vive em asaasProvider.test.ts (A1-REV).
 *   AT-R2 · a janela do pré-voo: a anterior sendo PAGA no meio do caminho.
 *   AT-R3 · abuso da abertura (RN-158): renovar carrinho re-cotando, e abrir
 *           carrinho em nome de outrem.
 *   AT-R4 · o tamanho REAL do fail-open sem cotação.
 *   AT-R5 · concorrência N>2 na abertura — e na REABERTURA, que é onde o
 *           carimbo da fase 2 poderia contar duas vezes o mesmo abandono.
 *   AT-R6 · o teto de 200/rodada do cron sob backlog real.
 *   AT-R7 · a interação NOVA entre a trava (por carrinho) e o prazo (por
 *           evento) — dois carrinhos distintos do mesmo evento.
 *
 * SUITE-STAB: clear+seed com triggers pausados e canários verificados
 * (helpers/stability.ts).
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   npx firebase-tools@13 emulators:exec --project demo-leela \
 *     "npx vitest run src/__tests__/pixCarrinhoRev.ataque.integration.test.ts"
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
import { cotarInscricaoCheckoutComCarrinho } from '../checkout/cotarInscricaoCheckout';
import {
  COLECAO_CARRINHOS,
  SUBCOLECAO_CICLOS,
  docIdCarrinho,
} from '../checkout/carrinhoCheckout';
import {
  CARRINHOS_LOTE_MAX,
  expirarCarrinhosAbandonadosCore,
} from '../checkout/expirarCarrinhosAbandonados';
import { COLECAO_TRAVA_PIX, docIdTravaPix } from '../checkout/travaCobrancaPix';
import { MockPaymentProvider } from '../payments/mockProvider';
import {
  CARRINHO_PRAZO_SEGUNDOS,
  MOTIVO_CARRINHO_EXPIRADO,
  MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO,
  PIX_EXPIRACAO_SEGUNDOS,
  STATUS_CARRINHO_EXPIRADO,
  type PaymentProvider,
} from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-pixcarrev';
const EVENTO_ID = 'meia-pixcarrev';
const EVENTO_B = 'trail-pixcarrev';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const PRAZO_MS = CARRINHO_PRAZO_SEGUNDOS * 1000;
const PIX_MS = PIX_EXPIRACAO_SEGUNDOS * 1000;
const CPF = '529.982.247-25';
const CPF_2 = '111.444.777-35';
const NOME = 'Ana Pagadora';
const EMAIL = 'ana@exemplo.com.br';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const relogio = (d: Date) => () => d;

function inputPix(
  chave: string,
  over: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [{ nome: NOME, email: EMAIL, cpf: CPF, modalidade: '10k' }],
    responsavelIndex: 0,
    responsavel: { nome: NOME, email: EMAIL },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: `rev-${chave}`,
    ...over,
  };
}

const inputCotacao = (eventoId = EVENTO_ID) => ({
  eventoId,
  itens: [{ modalidade: '10k' }],
  forma: 'pix' as const,
  parcelas: 1,
});

/**
 * Gateway com recusa PERMANENTE — o caso que o report deixou em aberto. Não é
 * "fora do ar" (transitório): é a mesma resposta, sempre, porque a cobrança
 * de lá JÁ está morta e o Asaas responde 4xx a quem tenta removê-la de novo.
 */
function gatewayRecusaSempre(base: MockPaymentProvider): PaymentProvider {
  return {
    ...base,
    createCharge: base.createCharge.bind(base),
    splitRules: base.splitRules.bind(base),
    refund: base.refund.bind(base),
    handleWebhook: base.handleWebhook.bind(base),
    getPayout: base.getPayout.bind(base),
    cancelCharge: () =>
      Promise.reject(
        new Error('[asaas] HTTP 400 (invalid_action): A cobrança já foi removida.')
      ),
  };
}

/**
 * Gateway que RECONCILIA — o comportamento do adapter depois do fix A1-REV:
 * o DELETE não vinga, mas a leitura confirma que a cobrança está morta, e o
 * adapter devolve `jaCancelada` em vez de levantar.
 */
function gatewayReconcilia(base: MockPaymentProvider): PaymentProvider {
  return {
    ...base,
    createCharge: base.createCharge.bind(base),
    splitRules: base.splitRules.bind(base),
    refund: base.refund.bind(base),
    handleWebhook: base.handleWebhook.bind(base),
    getPayout: base.getPayout.bind(base),
    cancelCharge: (p) =>
      Promise.resolve({
        chargeId: p.chargeId,
        status: 'cancelled' as const,
        jaCancelada: true,
        processedAt: Timestamp.now(),
      }),
  };
}

describe.skipIf(!hasEmulator)('PIXCARRINHO-REV — ataque antagonista à lane PIX-CARRINHO', () => {
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
    `eventos/${EVENTO_B}`,
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
      id: TENANT_ID, nome: 'Castelo Rev', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-rev', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
    });
    batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
      platformFeePct: 10,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
    });
    for (const eventoId of [EVENTO_ID, EVENTO_B]) {
      const eventoRef = db.collection('eventos').doc(eventoId);
      batch.set(eventoRef, {
        id: eventoId, tenantId: TENANT_ID, organizadorId: 'uid-owner-rev',
        nome: `Evento ${eventoId}`, data: tsRel(45), local: 'Floripa/SC',
        modalidades: ['10k'], slug: eventoId, status: 'publicado',
        usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
        criadoEm: now, atualizadoEm: now,
      });
      batch.set(eventoRef.collection('lotes').doc('l1'), {
        id: 'l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
        nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
        quantidadeLimite: 500, preco: FACE, vendidos: 0,
        criadoEm: now, atualizadoEm: now,
      });
    }
    await batch.commit();
  }

  const T0 = () => new Date(Date.now() + 60_000);

  const carrinhoRef = (uid: string, eventoId = EVENTO_ID) =>
    db.collection(COLECAO_CARRINHOS).doc(docIdCarrinho(uid, eventoId));

  const cotar = (uid: string, quando: Date, eventoId = EVENTO_ID) =>
    cotarInscricaoCheckoutComCarrinho(db, uid, inputCotacao(eventoId), relogio(quando));

  const criar = (
    uid: string,
    chave: string,
    quando: Date,
    prov: PaymentProvider = provider,
    over: Partial<CreateInscricaoChargeInput> = {}
  ) =>
    createInscricaoChargeCore(
      db, prov, inputPix(chave, over), { uid, ehAnonimo: true }, relogio(quando)
    );

  async function pedidosPendentes(uid: string): Promise<number> {
    const snap = await db
      .collection('pedidos')
      .where('responsavel.atletaId', '==', uid)
      .where('status', '==', 'pendente')
      .get();
    return snap.size;
  }

  // ==========================================================================
  // AT-R1 · O ALVO Nº 1 — a negativa do T1 pode virar PERMANENTE?
  // ==========================================================================

  it('AT-R1 · ⛔ gateway com recusa PERMANENTE ⇒ nem 12 tentativas destravam: o DOMÍNIO não tem escape próprio', async () => {
    const t0 = T0();
    const uid = 'uid-r1-perm';
    const primeira = await criar(uid, 'r1-01', t0);
    const depois = new Date(t0.getTime() + PIX_MS + 1000);
    const travado = gatewayRecusaSempre(provider);

    // 12 tentativas (a lane provou 10 e chamou de "temporário"): com uma
    // recusa que não muda, TODAS negam com o mesmo motivo tipado. Isto é o
    // que transforma "tente de novo em alguns instantes" em mentira quando a
    // resposta do gateway é permanente — e é por isso que a distinção entre
    // "recusei" e "já morreu" tem de morar no adapter (matriz A1-REV).
    for (let i = 0; i < 12; i += 1) {
      await expect(
        criar(uid, `r1-loop-${i}`, depois, travado)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { motivo: MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO },
      });
    }

    // O estado NÃO se moveu em nenhuma das 12: uma cobrança, um pedido.
    expect(await pedidosPendentes(uid)).toBe(1);
    const trava = await db
      .collection(COLECAO_TRAVA_PIX)
      .doc(docIdTravaPix(uid, { eventoId: EVENTO_ID, inscritos: [{ cpf: CPF, modalidade: '10k' }] }))
      .get();
    expect(trava.get('pedidoId')).toBe(primeira.pedidoId);
  }, 120_000);

  it('AT-R1b · gateway que RECONCILIA (adapter pós-A1-REV) ⇒ a PRIMEIRA tentativa já destrava', async () => {
    const t0 = T0();
    const uid = 'uid-r1-rec';
    const primeira = await criar(uid, 'r1b-01', t0);
    const depois = new Date(t0.getTime() + PIX_MS + 1000);

    // O DELETE do Asaas não vingou, mas a LEITURA confirmou a morte: o
    // adapter devolve `jaCancelada` e o pré-voo trata como encerramento.
    const nova = await criar(uid, 'r1b-02', depois, gatewayReconcilia(provider));
    expect(nova.pedidoId).not.toBe(primeira.pedidoId);
    expect(await pedidosPendentes(uid)).toBe(1);
    const anterior = await db.collection('pedidos').doc(primeira.pedidoId).get();
    expect(anterior.get('status')).toBe('cancelado');
    expect(anterior.get('canceladoMotivo')).toBe('pix_expirado');
  }, 60_000);

  it('AT-R1c · a negativa permanente NÃO vaza para OUTRO carrinho: mudar o carrinho compra normalmente', async () => {
    const t0 = T0();
    const uid = 'uid-r1-outro';
    await criar(uid, 'r1c-01', t0);
    const depois = new Date(t0.getTime() + PIX_MS + 1000);
    const travado = gatewayRecusaSempre(provider);

    await expect(criar(uid, 'r1c-02', depois, travado)).rejects.toMatchObject({
      code: 'failed-precondition',
    });

    // Carrinho DIFERENTE (outro atleta) = outra sentinela = outra compra. A
    // trava é por carrinho, e o deadlock também — o comprador não fica sem
    // plataforma, fica sem AQUELE carrinho.
    const outro = await criar(uid, 'r1c-03', depois, travado, {
      inscritos: [
        { nome: NOME, email: EMAIL, cpf: CPF, modalidade: '10k' },
        { nome: 'Bia', email: 'bia@exemplo.com.br', cpf: CPF_2, modalidade: '10k' },
      ],
    });
    expect(outro.statusPedido).toBe('pendente');
  }, 60_000);

  // ==========================================================================
  // AT-R2 · a janela do pré-voo (fora da transação)
  // ==========================================================================

  it('AT-R2 · a anterior é PAGA entre o pré-voo e o commit ⇒ o pedido pago NUNCA é cancelado', async () => {
    const t0 = T0();
    const uid = 'uid-r2';
    const primeira = await criar(uid, 'r2-01', t0);
    const depois = new Date(t0.getTime() + PIX_MS + 1000);

    // O webhook confirma no instante EXATO em que o gateway está sendo
    // chamado: o provider é o gancho para simular a corrida sem inventar
    // caminho novo.
    const pagouNoMeio: PaymentProvider = {
      ...provider,
      createCharge: provider.createCharge.bind(provider),
      splitRules: provider.splitRules.bind(provider),
      refund: provider.refund.bind(provider),
      handleWebhook: provider.handleWebhook.bind(provider),
      getPayout: provider.getPayout.bind(provider),
      cancelCharge: async (p) => {
        await db.collection('pagamentos').doc(primeira.pagamentoId).update({
          status: 'confirmado',
        });
        return provider.cancelCharge(p);
      },
    };

    await criar(uid, 'r2-02', depois, pagouNoMeio);

    // O dinheiro manda: a releitura in-tx do `expirarPixPendente` não flipa um
    // pagamento confirmado, e o pedido pago segue de pé.
    const pagamento = await db.collection('pagamentos').doc(primeira.pagamentoId).get();
    expect(pagamento.get('status')).toBe('confirmado');
    expect(pagamento.get('canceladoMotivo')).toBeUndefined();
    const pedido = await db.collection('pedidos').doc(primeira.pedidoId).get();
    expect(pedido.get('canceladoMotivo')).not.toBe('pix_expirado');
  }, 60_000);

  // ==========================================================================
  // AT-R3 · abuso da abertura (RN-158)
  // ==========================================================================

  it('AT-R3 · 20 recotações ao longo dos 15 min NÃO movem o prazo um milissegundo', async () => {
    const uid = 'uid-r3';
    const t0 = T0();
    const primeiro = await cotar(uid, t0);
    expect(primeiro.valorFinal).toBeGreaterThan(0);
    const expiraOriginal = (await carrinhoRef(uid).get()).get('expiraEmMillis') as number;

    for (let i = 1; i <= 20; i += 1) {
      await cotar(uid, new Date(t0.getTime() + i * 40_000));
    }
    const depois = await carrinhoRef(uid).get();
    expect(depois.get('expiraEmMillis')).toBe(expiraOriginal);
    expect(depois.get('ciclo')).toBe(1);
    expect(depois.get('abertoEmMillis')).toBe(t0.getTime());
  }, 120_000);

  it('AT-R3b · o carrinho abre SEMPRE na chave do caller — cotar não abre carrinho de terceiro', async () => {
    const t0 = T0();
    await cotar('uid-vitima', t0);
    const expiraVitima = (await carrinhoRef('uid-vitima').get()).get(
      'expiraEmMillis'
    ) as number;

    // O atacante cota o MESMO evento. O uid vem do `context.auth`, nunca do
    // payload — o carrinho dele é outro doc e o da vítima não se move.
    await cotar('uid-atacante', new Date(t0.getTime() + PRAZO_MS + 1000));
    const vitima = await carrinhoRef('uid-vitima').get();
    expect(vitima.get('expiraEmMillis')).toBe(expiraVitima);
    expect(vitima.get('ciclo')).toBe(1);
    expect((await carrinhoRef('uid-atacante').get()).exists).toBe(true);
  }, 60_000);

  // ==========================================================================
  // AT-R4 · o tamanho real do fail-open
  // ==========================================================================

  it('AT-R4 · sem cotação a compra passa, MAS uma cotação de OUTRO evento não vale como carrinho deste', async () => {
    const t0 = T0();
    const uid = 'uid-r4';
    // Cotou o evento B; o carrinho nasce lá, não aqui.
    await cotar(uid, t0, EVENTO_B);
    expect((await carrinhoRef(uid, EVENTO_B).get()).exists).toBe(true);
    expect((await carrinhoRef(uid, EVENTO_ID).get()).exists).toBe(false);

    // Comprar no evento A muito depois do prazo do B: passa, porque não há
    // carrinho de A (fail-open declarado). O prazo do B não alcança A.
    const bemDepois = new Date(t0.getTime() + 10 * PRAZO_MS);
    const r = await criar(uid, 'r4-01', bemDepois);
    expect(r.statusPedido).toBe('pendente');
    // E não se inventou carrinho para o pedido que nasceu sem ele.
    expect((await carrinhoRef(uid, EVENTO_ID).get()).exists).toBe(false);
  }, 60_000);

  // ==========================================================================
  // AT-R5 · concorrência N>2 (abertura e REABERTURA)
  // ==========================================================================

  it('AT-R5 · 8 cotações SIMULTÂNEAS abrem UM carrinho só, no ciclo 1', async () => {
    const uid = 'uid-r5';
    const t0 = T0();
    await Promise.all(Array.from({ length: 8 }, () => cotar(uid, t0)));

    const doc = await carrinhoRef(uid).get();
    expect(doc.get('ciclo')).toBe(1);
    expect(doc.get('expiraEmMillis')).toBe(t0.getTime() + PRAZO_MS);
    const ciclos = await carrinhoRef(uid).collection(SUBCOLECAO_CICLOS).get();
    expect(ciclos.size).toBe(0);
  }, 120_000);

  it('AT-R5b · 8 REABERTURAS simultâneas do carrinho vencido ⇒ 1 ciclo novo e 1 registro só (a fase 2 não conta duas vezes)', async () => {
    const uid = 'uid-r5b';
    const t0 = T0();
    await cotar(uid, t0);
    const depois = new Date(t0.getTime() + PRAZO_MS + 1000);

    await Promise.all(Array.from({ length: 8 }, () => cotar(uid, depois)));

    const doc = await carrinhoRef(uid).get();
    expect(doc.get('ciclo')).toBe(2);
    expect(doc.get('status')).toBe('aberto');
    const ciclos = await carrinhoRef(uid).collection(SUBCOLECAO_CICLOS).get();
    // Um abandono aconteceu (o ciclo 1) e ele vale UM registro, não oito.
    expect(ciclos.size).toBe(1);
    expect(ciclos.docs[0]?.id).toBe('1');
    expect(ciclos.docs[0]?.get('status')).toBe(STATUS_CARRINHO_EXPIRADO);
    expect(ciclos.docs[0]?.get('origem')).toBe('reabertura');
  }, 120_000);

  it('AT-R5c · cron e reabertura na MESMA janela não duplicam o registro do ciclo', async () => {
    const uid = 'uid-r5c';
    const t0 = T0();
    await cotar(uid, t0);
    const depois = new Date(t0.getTime() + PRAZO_MS + 1000);

    await Promise.all([
      expirarCarrinhosAbandonadosCore(db, depois),
      cotar(uid, depois),
    ]);

    const ciclos = await carrinhoRef(uid).collection(SUBCOLECAO_CICLOS).get();
    expect(ciclos.size).toBe(1);
    expect(ciclos.docs[0]?.id).toBe('1');
  }, 120_000);

  // ==========================================================================
  // AT-R6 · o teto de 200/rodada sob backlog real
  // ==========================================================================

  it('AT-R6 · backlog de 205 carrinhos vencidos: a rodada carimba 200 e a seguinte drena o resto', async () => {
    const t0 = T0();
    const venceuEm = t0.getTime() - 60_000;
    const total = CARRINHOS_LOTE_MAX + 5;

    // Semeia direto (o caminho de cotação faria 205 transações e não é o que
    // este ataque mede).
    for (let lote = 0; lote < total; lote += 100) {
      const batch = db.batch();
      for (let i = lote; i < Math.min(lote + 100, total); i += 1) {
        batch.set(db.collection(COLECAO_CARRINHOS).doc(`uid-bulk-${i}__${EVENTO_ID}`), {
          ciclo: 1,
          status: 'aberto',
          abertoEmMillis: venceuEm - PRAZO_MS,
          expiraEmMillis: venceuEm,
          eventoId: EVENTO_ID,
          tenantId: TENANT_ID,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    const r1 = await expirarCarrinhosAbandonadosCore(db, t0);
    expect(r1.encontrados).toBe(CARRINHOS_LOTE_MAX);
    expect(r1.expirados).toBe(CARRINHOS_LOTE_MAX);
    expect(r1.erros).toBe(0);

    // A rodada seguinte (5 minutos depois) drena o resto — o backlog não é
    // perdido, só ADIADO, e o atraso fica gravado em cada registro.
    const t1 = new Date(t0.getTime() + 5 * 60_000);
    const r2 = await expirarCarrinhosAbandonadosCore(db, t1);
    expect(r2.encontrados).toBe(5);
    expect(r2.expirados).toBe(5);

    const r3 = await expirarCarrinhosAbandonadosCore(db, new Date(t1.getTime() + 5 * 60_000));
    expect(r3.encontrados).toBe(0);

    // O retardatário carrega os DOIS instantes: o atraso é mensurável, e é o
    // que a fase 2 precisa para saber se o número que agrega está fresco.
    const retardatario = await db
      .collection(COLECAO_CARRINHOS)
      .doc(`uid-bulk-${total - 1}__${EVENTO_ID}`)
      .collection(SUBCOLECAO_CICLOS)
      .doc('1')
      .get();
    expect(retardatario.exists).toBe(true);
    expect(retardatario.get('expiraEmMillis')).toBe(venceuEm);
    expect(retardatario.get('expiradoEmMillis') as number).toBeGreaterThan(venceuEm);
    expect(retardatario.get('origem')).toBe('cron');
  }, 180_000);

  // ==========================================================================
  // AT-R7 · trava (por carrinho) × prazo (por evento) — a interação nova
  // ==========================================================================

  it('AT-R7 · o prazo é do EVENTO: trocar o carrinho não ganha 15 minutos novos', async () => {
    const uid = 'uid-r7';
    const t0 = T0();
    await cotar(uid, t0);

    // Aos 15:01, com o carrinho vencido, comprar um carrinho DIFERENTE
    // (outro atleta) continua NEGADO — a chave do prazo é (comprador,
    // evento), e trocar o conteúdo não é um carrinho novo para a RN-158.
    const depois = new Date(t0.getTime() + PRAZO_MS + 1000);
    await expect(
      criar(uid, 'r7-01', depois, provider, {
        inscritos: [
          { nome: NOME, email: EMAIL, cpf: CPF, modalidade: '10k' },
          { nome: 'Bia', email: 'bia@exemplo.com.br', cpf: CPF_2, modalidade: '10k' },
        ],
      })
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { motivo: MOTIVO_CARRINHO_EXPIRADO },
    });
    expect(await pedidosPendentes(uid)).toBe(0);
  }, 60_000);

  it('AT-R7b · o estado terminal do carrinho não vaza para pedido/pagamento (leitores distintos)', async () => {
    const uid = 'uid-r7b';
    const t0 = T0();
    await cotar(uid, t0);
    const pedido = await criar(uid, 'r7b-01', new Date(t0.getTime() + 60_000));
    await expirarCarrinhosAbandonadosCore(db, new Date(t0.getTime() + PRAZO_MS + 1000));

    // O carrinho concluiu; o cron não o toca e nenhum doc de dinheiro passa a
    // carregar o vocabulário do carrinho.
    expect((await carrinhoRef(uid).get()).get('status')).toBe('concluido');
    const p = await db.collection('pedidos').doc(pedido.pedidoId).get();
    expect(p.get('status')).toBe('pendente');
    expect(p.get('canceladoMotivo')).toBeUndefined();
    const pg = await db.collection('pagamentos').doc(pedido.pagamentoId).get();
    expect(pg.get('status')).toBe('pendente');
    expect(pg.get('status')).not.toBe(STATUS_CARRINHO_EXPIRADO);
  }, 60_000);
});
