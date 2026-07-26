/**
 * carrinhoPrazo.integration.test.ts — LEELA-PIX-CARRINHO-T2/T3 (**RN-158**,
 * item 26 da rodada DEC-0726B · trace leela-build-2d6ee98d). ⚠️ EXIGE
 * Firestore no Emulator (projectId demo-leela; porta via LEELA_FS_EMU_PORT —
 * nunca o 8180 do preview).
 *
 * O QUE ESTA SUÍTE PROVA
 *
 * T2 · o prazo do carrinho existe de verdade:
 *   - a primeira cotação ABRE o carrinho com 15 minutos, e cotar de novo NÃO
 *     estende (senão mexer no cupom daria carrinho eterno);
 *   - concluir aos 14:59 funciona; aos 15:01 é NEGADO com motivo tipado;
 *   - o cron carimba o estado terminal, é idempotente e não encosta em
 *     carrinho vivo nem em carrinho concluído;
 *   - os dois relógios COMPÕEM em sequência: quem concluiu no prazo tem os 30
 *     minutos INTEIROS de PIX (RN-157), e o carrinho concluído não barra o
 *     retry legítimo depois que o PIX vence.
 *
 * T3 · o carimbo da fase 2 nasce:
 *   - registro durável por ciclo com estado + instantes + evento + tenant;
 *   - sem PII;
 *   - sobrevive à reabertura do carrinho (que sobrescreve o doc pai).
 *
 * SUITE-STAB: clear+seed com triggers pausados e canários verificados
 * (helpers/stability.ts).
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 \
 *   npx firebase-tools@13 emulators:exec --config ../firebase.r6.json \
 *     --project demo-leela \
 *     "npx vitest run src/__tests__/carrinhoPrazo.integration.test.ts"
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
import { COLECAO_CARRINHOS, docIdCarrinho } from '../checkout/carrinhoCheckout';
import { expirarCarrinhosAbandonadosCore } from '../checkout/expirarCarrinhosAbandonados';
import { expirarPixPendenteCore } from '../checkout/expirarPixPendente';
import { MockPaymentProvider } from '../payments/mockProvider';
import { COLECAO_TRAVA_PIX } from '../checkout/travaCobrancaPix';
import {
  CARRINHO_PRAZO_SEGUNDOS,
  MOTIVO_CARRINHO_EXPIRADO,
  PIX_EXPIRACAO_SEGUNDOS,
  STATUS_CARRINHO_EXPIRADO,
} from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-carrinho';
const EVENTO_ID = 'meia-carrinho';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const PRAZO_MS = CARRINHO_PRAZO_SEGUNDOS * 1000;
const CPF = '529.982.247-25';
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
    idempotencyKey: `carrinho-${chave}`,
    ...over,
  };
}

const inputCotacao = {
  eventoId: EVENTO_ID,
  itens: [{ modalidade: '10k' }],
  forma: 'pix' as const,
  parcelas: 1,
};

describe.skipIf(!hasEmulator)('PIX-CARRINHO-T2/T3 — prazo do carrinho (RN-158)', () => {
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
      id: TENANT_ID, nome: 'Castelo Carrinho', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-carrinho', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
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
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-carrinho',
      nome: 'Meia Carrinho', data: tsRel(45), local: 'Floripa/SC',
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

  const carrinhoRef = (uid: string) =>
    db.collection(COLECAO_CARRINHOS).doc(docIdCarrinho(uid, EVENTO_ID));

  async function cotar(uid: string, quando: Date) {
    return cotarInscricaoCheckoutComCarrinho(db, uid, inputCotacao, relogio(quando));
  }

  // -------------------------------------------------------------------------
  // T2 · abertura
  // -------------------------------------------------------------------------

  it('a PRIMEIRA cotação abre o carrinho com 15 minutos — e cotar de novo NÃO estende o prazo', async () => {
    const uid = 'uid-abre';
    const t0 = T0();
    await cotar(uid, t0);

    const snap1 = await carrinhoRef(uid).get();
    expect(snap1.exists).toBe(true);
    expect(snap1.get('status')).toBe('aberto');
    expect(snap1.get('ciclo')).toBe(1);
    expect(snap1.get('abertoEmMillis')).toBe(t0.getTime());
    expect(snap1.get('expiraEmMillis')).toBe(t0.getTime() + PRAZO_MS);
    expect(snap1.get('eventoId')).toBe(EVENTO_ID);
    expect(snap1.get('tenantId')).toBe(TENANT_ID);

    // 14 minutos depois o comprador mexe no cupom/kit e a tela recota. Se
    // isso reabrisse o prazo, o timer de 15 minutos não existiria.
    await cotar(uid, new Date(t0.getTime() + 14 * 60_000));
    const snap2 = await carrinhoRef(uid).get();
    expect(snap2.get('expiraEmMillis')).toBe(t0.getTime() + PRAZO_MS);
    expect(snap2.get('abertoEmMillis')).toBe(t0.getTime());
    expect(snap2.get('ciclo')).toBe(1);
  }, 60_000);

  // -------------------------------------------------------------------------
  // T2 · o gate de conclusão (as duas fronteiras)
  // -------------------------------------------------------------------------

  it('concluir aos 14min59 NÃO expira — o pedido nasce e o carrinho vira `concluido`', async () => {
    const uid = 'uid-1459';
    const t0 = T0();
    await cotar(uid, t0);

    const quase = new Date(t0.getTime() + PRAZO_MS - 1000);
    const r = await createInscricaoChargeCore(
      db, provider, inputPix('1459'), { uid, ehAnonimo: true }, relogio(quase)
    );
    expect(r.statusPedido).toBe('pendente');

    const snap = await carrinhoRef(uid).get();
    expect(snap.get('status')).toBe('concluido');
    expect(snap.get('pedidoId')).toBe(r.pedidoId);
    expect(snap.get('concluidoEmMillis')).toBe(quase.getTime());

    // A COMPOSIÇÃO dos dois relógios: concluiu a 1 segundo do fim do
    // carrinho e mesmo assim tem os 30 minutos INTEIROS de PIX. Um relógio
    // não encurta o outro.
    expect(r.pixExpiraEmMillis).toBe(quase.getTime() + PIX_EXPIRACAO_SEGUNDOS * 1000);
  }, 60_000);

  it('concluir DEPOIS dos 15 min é NEGADO com motivo tipado — e nada é criado', async () => {
    const uid = 'uid-1501';
    const t0 = T0();
    await cotar(uid, t0);

    const tarde = new Date(t0.getTime() + PRAZO_MS + 1000);
    await expect(
      createInscricaoChargeCore(
        db, provider, inputPix('1501'), { uid, ehAnonimo: true }, relogio(tarde)
      )
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { motivo: MOTIVO_CARRINHO_EXPIRADO },
    });

    const pedidos = await db
      .collection('pedidos')
      .where('responsavel.atletaId', '==', uid)
      .get();
    expect(pedidos.size).toBe(0);
    // E nenhuma cobrança foi aberta no gateway: a negativa é ANTES do dinheiro.
    const trava = await db.collection(COLECAO_TRAVA_PIX).get();
    expect(trava.size).toBe(0);
  }, 60_000);

  it('na fronteira EXATA (expiraEmMillis) o carrinho já venceu — o prazo é [abertura, expira)', async () => {
    const uid = 'uid-fronteira';
    const t0 = T0();
    await cotar(uid, t0);
    await expect(
      createInscricaoChargeCore(
        db, provider, inputPix('front'), { uid, ehAnonimo: true },
        relogio(new Date(t0.getTime() + PRAZO_MS))
      )
    ).rejects.toMatchObject({ details: { motivo: MOTIVO_CARRINHO_EXPIRADO } });
  }, 60_000);

  it('SEM carrinho (chamada direta, sem cotar) a compra passa — fronteira DECLARADA, não lacuna escondida', async () => {
    const uid = 'uid-sem-carrinho';
    const r = await createInscricaoChargeCore(
      db, provider, inputPix('sem'), { uid, ehAnonimo: true }, relogio(T0())
    );
    expect(r.statusPedido).toBe('pendente');
    expect((await carrinhoRef(uid).get()).exists).toBe(false);
  }, 60_000);

  it('carrinho CONCLUÍDO não barra o retry legítimo da RN-157 (PIX venceu ⇒ cobrança nova)', async () => {
    const uid = 'uid-retry';
    const t0 = T0();
    await cotar(uid, t0);
    const primeira = await createInscricaoChargeCore(
      db, provider, inputPix('retry-01'), { uid, ehAnonimo: true }, relogio(t0)
    );

    // 31 minutos: o PIX venceu. A tela materializa a expiração e o comprador
    // pede outro código. O relógio do CARRINHO (que já concluiu há muito
    // tempo) não pode ser o que barra isso — quem governa aqui é a RN-157.
    const depois = new Date(t0.getTime() + PIX_EXPIRACAO_SEGUNDOS * 1000 + 60_000);
    await expirarPixPendenteCore(
      db, provider, { pedidoId: primeira.pedidoId }, { uid }, relogio(depois)
    );
    const segunda = await createInscricaoChargeCore(
      db, provider, inputPix('retry-02'), { uid, ehAnonimo: true }, relogio(depois)
    );
    expect(segunda.pedidoId).not.toBe(primeira.pedidoId);
    expect((await carrinhoRef(uid).get()).get('pedidoId')).toBe(segunda.pedidoId);
  }, 60_000);

  // -------------------------------------------------------------------------
  // T2 · o cron (ADR-015)
  // -------------------------------------------------------------------------

  it('o cron carimba o carrinho vencido como `expirado_sem_concluir` — e é IDEMPOTENTE', async () => {
    const uid = 'uid-cron';
    const t0 = T0();
    await cotar(uid, t0);
    const varredura = new Date(t0.getTime() + PRAZO_MS + 60_000);

    const r1 = await expirarCarrinhosAbandonadosCore(db, varredura);
    expect(r1.encontrados).toBe(1);
    expect(r1.expirados).toBe(1);
    expect(r1.erros).toBe(0);

    const snap = await carrinhoRef(uid).get();
    expect(snap.get('status')).toBe(STATUS_CARRINHO_EXPIRADO);
    expect(snap.get('expiradoEmMillis')).toBe(varredura.getTime());

    // Rerodar a mesma rodada não encontra mais nada (a query filtra por
    // 'aberto') e não infla contagem nenhuma.
    const r2 = await expirarCarrinhosAbandonadosCore(db, varredura);
    expect(r2.encontrados).toBe(0);
    expect(r2.expirados).toBe(0);
    expect((await carrinhoRef(uid).get()).get('expiradoEmMillis')).toBe(
      varredura.getTime()
    );
  }, 60_000);

  it('o cron NÃO encosta em carrinho vivo nem em carrinho concluído', async () => {
    const t0 = T0();
    await cotar('uid-vivo', t0);
    await cotar('uid-concluiu', t0);
    await createInscricaoChargeCore(
      db, provider, inputPix('cron-conc'), { uid: 'uid-concluiu', ehAnonimo: true },
      relogio(t0)
    );

    // Varredura 5 minutos depois: nenhum dos dois é elegível.
    const r = await expirarCarrinhosAbandonadosCore(db, new Date(t0.getTime() + 5 * 60_000));
    expect(r.encontrados).toBe(0);
    expect((await carrinhoRef('uid-vivo').get()).get('status')).toBe('aberto');
    expect((await carrinhoRef('uid-concluiu').get()).get('status')).toBe('concluido');
  }, 60_000);

  it('cron ATRASADO não abre janela: o veredito é do relógio da CONCLUSÃO, não do carimbo', async () => {
    const uid = 'uid-atraso';
    const t0 = T0();
    await cotar(uid, t0);

    // O cron não rodou (rodada morta). O carrinho segue 'aberto' no banco,
    // mas passou do prazo — e a conclusão é negada assim mesmo.
    expect((await carrinhoRef(uid).get()).get('status')).toBe('aberto');
    await expect(
      createInscricaoChargeCore(
        db, provider, inputPix('atraso'), { uid, ehAnonimo: true },
        relogio(new Date(t0.getTime() + PRAZO_MS + 60_000))
      )
    ).rejects.toMatchObject({ details: { motivo: MOTIVO_CARRINHO_EXPIRADO } });

    // Quando o cron enfim roda (2 ciclos atrasado), o carimbo registra o
    // instante REAL da varredura — separado do vencimento. A distância entre
    // os dois É o atraso, e fica mensurável em vez de suposto.
    const atrasado = new Date(t0.getTime() + PRAZO_MS + 10 * 60_000);
    await expirarCarrinhosAbandonadosCore(db, atrasado);
    const snap = await carrinhoRef(uid).get();
    expect(snap.get('expiraEmMillis')).toBe(t0.getTime() + PRAZO_MS);
    expect(snap.get('expiradoEmMillis')).toBe(atrasado.getTime());
  }, 60_000);

  // -------------------------------------------------------------------------
  // T2 · reabertura — expirar carrinho nunca é punição
  // -------------------------------------------------------------------------

  it('cotar depois do vencimento abre um CICLO NOVO com prazo novo — e a compra segue', async () => {
    const uid = 'uid-reabre';
    const t0 = T0();
    await cotar(uid, t0);

    // O comprador some e volta 40 minutos depois.
    const volta = new Date(t0.getTime() + 40 * 60_000);
    await cotar(uid, volta);

    const pai = await carrinhoRef(uid).get();
    expect(pai.get('ciclo')).toBe(2);
    expect(pai.get('status')).toBe('aberto');
    expect(pai.get('abertoEmMillis')).toBe(volta.getTime());
    expect(pai.get('expiraEmMillis')).toBe(volta.getTime() + PRAZO_MS);

    const r = await createInscricaoChargeCore(
      db, provider, inputPix('reabre'), { uid, ehAnonimo: true }, relogio(volta)
    );
    expect(r.statusPedido).toBe('pendente');
  }, 60_000);

  it('carrinho abandonado não deixa NADA preso: nenhuma sentinela de PIX nasce sem conclusão', async () => {
    const uid = 'uid-nada-preso';
    const t0 = T0();
    await cotar(uid, t0);
    await expirarCarrinhosAbandonadosCore(db, new Date(t0.getTime() + PRAZO_MS + 60_000));

    // A sentinela do PIX (`cobrancasPixAtivas`) só nasce na CONCLUSÃO — por
    // construção, um carrinho que morreu antes disso não tem o que liberar.
    expect((await db.collection(COLECAO_TRAVA_PIX).get()).size).toBe(0);
    expect(
      (await db.collection('pedidos').where('responsavel.atletaId', '==', uid).get()).size
    ).toBe(0);

    // E o comprador recomeça do zero sem obstáculo (cotação nova = ciclo 2).
    const volta = new Date(t0.getTime() + PRAZO_MS + 120_000);
    await cotar(uid, volta);
    const r = await createInscricaoChargeCore(
      db, provider, inputPix('nada-preso'), { uid, ehAnonimo: true }, relogio(volta)
    );
    expect(r.statusPedido).toBe('pendente');
  }, 60_000);
});
