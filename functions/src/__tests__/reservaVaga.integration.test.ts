/**
 * reservaVaga.integration.test.ts — LEELA-S323 (RN-543 · RN-544 · RN-546 ·
 * RN-300 · RN-182 · trace leela-redesign-v2-20260810, lane ESTOURO-BUILD).
 * ⚠️ EXIGE Firestore no Emulator (projectId demo-leela; porta via
 * LEELA_FS_EMU_PORT — lane 8490).
 *
 * A PROVA-MESTRA (P1) é o achado central medido em 10/08, virado do avesso:
 * hoje um pagamento pendente NÃO segura vaga, então duas cobranças em voo
 * pela mesma última vaga passam as duas e as duas pagam. Depois desta
 * frente, a segunda é recusada — e a ordem do dono ("não podemos ter
 * excedentes de ingressos jamais") vira aritmética.
 *
 *   P1. Vaga única: primeira cobrança nasce, segunda é RECUSADA com motivo
 *       tipado e sem criar doc nenhum. E em CORRIDA (as duas disparadas
 *       juntas), exatamente uma sobrevive — zero excedente.
 *   P2. A reserva morre e a vaga volta: expirado o PIX, o segundo comprador
 *       passa, e nenhum carimbo de encerramento nasceu no meio.
 *   P3. Confirmação CONVERTE: reservas desce, vendidos sobe, e a soma nunca
 *       conta a mesma pessoa duas vezes.
 *   P4. As quatro portas liberam exatamente uma vez (varredura, webhook
 *       failed, webhook confirmed, onCall) — reenviar a outra porta depois
 *       não decrementa de novo.
 *   P5. Multi-inscrito: 3 linhas no mesmo lote sobem `reservas` em 3 e o
 *       gate conta as 3 contra o limite.
 *   P6. RN-300 intocada: lote encerrado por DATA com reserva viva não volta
 *       a vender quando a reserva morre; e reserva nunca carimba
 *       encerramento.
 *   P7. RN-546 (teto de 15 min do cartão): passado o teto, a recontagem tira
 *       o pedido da conta — a vaga volta e o pedido continua VIVO.
 *   P8. RN-182 intocada: nenhum valor de venda, taxa ou repasse muda.
 *   P9. A recontagem cura drift nos dois sentidos e PULA quando o teto
 *       estoura (absoluto parcial seria mentira).
 *
 * Comando (de `functions/`):
 *   LEELA_FS_EMU_PORT=8490 LEELA_AUTH_EMU_PORT=9599 \
 *   npx firebase-tools@13 emulators:exec --config ../firebase.estouro.json \
 *     --project demo-leela \
 *     "npx vitest run src/__tests__/reservaVaga.integration.test.ts"
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
import { recontarReservasCore } from '../checkout/reservaLote';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import { virarLote } from '../eventos/virarLote';
import {
  MOTIVO_LOTE_ESGOTADO,
  MOTIVO_VAGAS_EM_PAGAMENTO,
  RESERVA_CARTAO_TETO_SEGUNDOS,
} from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-reserva';
const EVENTO_ID = 'meia-reserva';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const MEIA_HORA_MS = 30 * 60 * 1000;
/** CPFs válidos (DV correto) — o checkout valida na fronteira. */
const CPF_A = '529.982.247-25';
const CPF_B = '168.995.350-09';
const CPF_C = '111.444.777-35';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const relogio = (d: Date) => () => d;
const depoisDoPrazo = (t0: Date) => new Date(t0.getTime() + MEIA_HORA_MS + 1000);

function inscrito(nome: string, cpf: string) {
  return {
    nome,
    email: `${nome.toLowerCase().replace(/\s/g, '')}@exemplo.com.br`,
    cpf,
    modalidade: '10k',
  };
}

function input(
  chave: string,
  over: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [inscrito('Ana Pagadora', CPF_A)],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br' },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: chave,
    ...over,
  };
}

describe.skipIf(!hasEmulator)('S323 — a reserva do pedido pendente', () => {
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

  /** Limite do lote semeado — sobrescrito por teste via `semear`. */
  let limiteDoLote = 1;
  /** Fim da janela do lote em dias relativos — P6 usa passado. */
  let fimEmDias = 30;

  beforeEach(async () => {
    limiteDoLote = 1;
    fimEmDias = 30;
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
      id: TENANT_ID, nome: 'Castelo Reserva', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-reserva', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
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
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-reserva',
      nome: 'Meia Reserva', data: tsRel(45), local: 'Floripa/SC',
      modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado',
      usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('l1'), {
      id: 'l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
      nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(fimEmDias),
      // Sem `reservas` de propósito no seed: é a leitura Postel do doc
      // anterior à RN-543, e ela tem de valer no caminho de produção.
      quantidadeLimite: limiteDoLote, preco: FACE, vendidos: 0,
      criadoEm: now, atualizadoEm: now,
    });
    await batch.commit();
  }

  /** Re-semeia o lote com outro limite/janela (chamar dentro do teste). */
  async function relote(over: {
    quantidadeLimite?: number;
    vendidos?: number;
    fimEmDias?: number;
  }): Promise<void> {
    const agora = new Date();
    await db.doc(`eventos/${EVENTO_ID}/lotes/l1`).update({
      ...(over.quantidadeLimite !== undefined
        ? { quantidadeLimite: over.quantidadeLimite }
        : {}),
      ...(over.vendidos !== undefined ? { vendidos: over.vendidos } : {}),
      ...(over.fimEmDias !== undefined
        ? {
            fimEm: Timestamp.fromDate(
              new Date(agora.getTime() + over.fimEmDias * DIA_MS)
            ),
          }
        : {}),
    });
  }

  async function lerLote() {
    const snap = await db.doc(`eventos/${EVENTO_ID}/lotes/l1`).get();
    return {
      vendidos: (snap.get('vendidos') as number | undefined) ?? 0,
      reservas: (snap.get('reservas') as number | undefined) ?? 0,
      encerradoEm: snap.get('encerradoEm') as unknown,
      encerradoMotivo: snap.get('encerradoMotivo') as unknown,
    };
  }

  function cobrar(uid: string, chave: string, t0: Date, over = {}) {
    return createInscricaoChargeCore(
      db, provider, input(chave, over), { uid, ehAnonimo: true }, relogio(t0)
    );
  }

  function detalhes(err: unknown): Record<string, unknown> {
    return (err as { details?: Record<string, unknown> }).details ?? {};
  }

  // -------------------------------------------------------------------------
  // P1 — A PROVA-MESTRA: a última vaga é de uma pessoa só
  // -------------------------------------------------------------------------

  describe('P1 · ⚔ a última vaga não sai duas vezes', () => {
    it('pendente SEGURA a vaga: o segundo comprador é recusado, com motivo tipado e sem criar doc nenhum', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const primeira = await cobrar('uid-p1-ana', 'reserva-p1-01', t0);

      // A vaga saiu do estoque no ato da COBRANÇA, não do pagamento.
      expect((await lerLote()).reservas).toBe(1);

      const antesPedidos = (await db.collection('pedidos').get()).size;
      const antesPagamentos = (await db.collection('pagamentos').get()).size;
      const antesInscritos = (
        await db.collection('eventos').doc(EVENTO_ID).collection('inscritos').get()
      ).size;

      let capturado: unknown;
      await expect(
        createInscricaoChargeCore(
          db, provider,
          input('reserva-p1-02', { inscritos: [inscrito('Bruno Segundo', CPF_B)] }),
          { uid: 'uid-p1-bruno', ehAnonimo: true },
          relogio(new Date(t0.getTime() + 60_000))
        ).catch((err: unknown) => {
          capturado = err;
          throw err;
        })
      ).rejects.toMatchObject({ code: 'failed-precondition' });

      // A recusa diz "em pagamento", não "esgotado" — instruções opostas.
      expect(detalhes(capturado)['motivo']).toBe(MOTIVO_VAGAS_EM_PAGAMENTO);
      expect(detalhes(capturado)['loteId']).toBe('l1');

      // FAIL-CLOSED: nenhum doc nasceu para a tentativa recusada.
      expect((await db.collection('pedidos').get()).size).toBe(antesPedidos);
      expect((await db.collection('pagamentos').get()).size).toBe(antesPagamentos);
      expect(
        (await db.collection('eventos').doc(EVENTO_ID).collection('inscritos').get())
          .size
      ).toBe(antesInscritos);

      // E o contador não se mexeu com a recusa.
      const lote = await lerLote();
      expect(lote.reservas).toBe(1);
      expect(lote.vendidos).toBe(0);
      // INDISPONÍVEL ≠ ENCERRADO: nenhum carimbo nasceu de reserva (RN-300).
      expect(lote.encerradoEm).toBeUndefined();
      expect(primeira.pedidoId).toBeTruthy();
    });

    it('EM CORRIDA, duas cobranças simultâneas pela mesma vaga: exatamente uma sobrevive — zero excedente', async () => {
      const t0 = new Date(Date.now() + 60_000);

      // As duas disparadas juntas, sem espera entre elas: é a corrida que o
      // ESTOURO-1 descreve, e o doc do lote é o ponto de serialização.
      const resultados = await Promise.allSettled([
        cobrar('uid-p1c-ana', 'reserva-p1c-a', t0),
        createInscricaoChargeCore(
          db, provider,
          input('reserva-p1c-b', { inscritos: [inscrito('Bruno Segundo', CPF_B)] }),
          { uid: 'uid-p1c-bruno', ehAnonimo: true }, relogio(t0)
        ),
      ]);

      const ok = resultados.filter((r) => r.status === 'fulfilled');
      const recusadas = resultados.filter((r) => r.status === 'rejected');
      expect(ok).toHaveLength(1);
      expect(recusadas).toHaveLength(1);

      const lote = await lerLote();
      // O NÚMERO QUE O DONO PEDIU: reservas + vendidos nunca passa do limite.
      expect(lote.reservas + lote.vendidos).toBe(1);
      expect(lote.reservas + lote.vendidos).toBeLessThanOrEqual(1);
      // Uma cobrança só existe.
      expect((await db.collection('pagamentos').get()).size).toBe(1);
      expect((await db.collection('pedidos').get()).size).toBe(1);
    });

    it('falta de vaga que NENHUMA reserva explica responde `lote_esgotado`', async () => {
      // Limite 2, uma venda confirmada, e alguém tentando levar 2 linhas:
      // não cabe nem com `reservas` em zero. O motivo tem de ser o
      // definitivo, senão a tela prometeria uma espera que não resolve.
      //
      // NOTA de fronteira, medida aqui: lote com `vendidos >= limite` nem
      // chega a este gate — `loteAtivo` já o considera encerrado (RN-300) e
      // o `computeSaleState` recusa antes, com a mensagem de venda fechada.
      // Esta recusa é a da FAIXA entre "ainda tem lote ativo" e "não cabe o
      // que você pediu".
      await relote({ quantidadeLimite: 2, vendidos: 1 });
      const t0 = new Date(Date.now() + 60_000);

      let capturado: unknown;
      await expect(
        createInscricaoChargeCore(
          db, provider,
          input('reserva-p1e-01', {
            inscritos: [
              inscrito('Ana Pagadora', CPF_A),
              inscrito('Bruno Segundo', CPF_B),
            ],
          }),
          { uid: 'uid-p1e', ehAnonimo: true }, relogio(t0)
        ).catch((err: unknown) => {
          capturado = err;
          throw err;
        })
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(detalhes(capturado)['motivo']).toBe(MOTIVO_LOTE_ESGOTADO);
      // Fail-closed: nada nasceu.
      expect((await db.collection('pedidos').get()).size).toBe(0);
      expect((await lerLote()).reservas).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // P2 — a reserva morre e a vaga volta
  // -------------------------------------------------------------------------

  describe('P2 · a vaga volta quando o pendente morre', () => {
    it('expirado o PIX, o segundo comprador passa — e nenhum carimbo nasceu no meio', async () => {
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p2-ana', 'reserva-p2-01', t0);
      expect((await lerLote()).reservas).toBe(1);

      const depois = depoisDoPrazo(t0);
      const rodada = await varrerPixVencidosCore(db, provider, depois);
      expect(rodada.expirados).toBe(1);

      const apos = await lerLote();
      expect(apos.reservas).toBe(0);
      expect(apos.vendidos).toBe(0);
      expect(apos.encerradoEm).toBeUndefined();

      // O MESMO segundo comprador que seria recusado agora passa.
      const segunda = await createInscricaoChargeCore(
        db, provider,
        input('reserva-p2-02', { inscritos: [inscrito('Bruno Segundo', CPF_B)] }),
        { uid: 'uid-p2-bruno', ehAnonimo: true }, relogio(depois)
      );
      expect(segunda.pedidoId).toBeTruthy();
      // Preço do lote vigente, sem regressão: nada foi carimbado no meio.
      const pagSegunda = await db
        .collection('pagamentos').doc(segunda.pagamentoId).get();
      expect(pagSegunda.get('valorFinal')).toBe(FACE);
      expect((await lerLote()).reservas).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // P3 — a confirmação CONVERTE
  // -------------------------------------------------------------------------

  describe('P3 · confirmação converte reserva em venda', () => {
    it('reservas desce, vendidos sobe, e a soma nunca conta a mesma pessoa duas vezes', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p3', 'reserva-p3-01', t0);
      expect((await lerLote()).reservas).toBe(1);

      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.confirmed', {
          chargeId: r.chargeId,
          orderId: r.pedidoId,
          amount: pag.get('gatewayAmountCentavos') as number,
          eventId: `conf-${r.pedidoId}`,
        })
      );

      // A reserva morreu na MESMA tx da confirmação.
      expect((await lerLote()).reservas).toBe(0);

      // `vendidos` sobe pela máquina de sempre (recompute do virarLote).
      await virarLote(db, EVENTO_ID, new Date());
      const lote = await lerLote();
      expect(lote.vendidos).toBe(1);
      expect(lote.reservas).toBe(0);
      // O invariante que a conversão preserva: a pessoa foi contada UMA vez.
      expect(lote.vendidos + lote.reservas).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // P4 — liberação exactly-once pelas portas
  // -------------------------------------------------------------------------

  describe('P4 · a reserva é liberada exatamente uma vez', () => {
    it('varredura e depois webhook OVERDUE: decrementa UMA vez, nunca duas', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p4-a', 'reserva-p4-01', t0);
      expect((await lerLote()).reservas).toBe(1);

      await varrerPixVencidosCore(db, provider, depoisDoPrazo(t0), 200, {
        recontar: false,
      });
      expect((await lerLote()).reservas).toBe(0);

      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.failed', {
          chargeId: r.chargeId,
          orderId: r.pedidoId,
          amount: pag.get('gatewayAmountCentavos') as number,
          eventId: `over-${r.pedidoId}`,
        })
      );
      // A segunda porta no-opa (jaFinal) — o contador NÃO vai a -1.
      expect((await lerLote()).reservas).toBe(0);
    });

    it('webhook OVERDUE e depois onCall: decrementa UMA vez, na ordem inversa', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p4-b', 'reserva-p4-02', t0);

      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.failed', {
          chargeId: r.chargeId,
          orderId: r.pedidoId,
          amount: pag.get('gatewayAmountCentavos') as number,
          eventId: `over2-${r.pedidoId}`,
        })
      );
      expect((await lerLote()).reservas).toBe(0);

      const manual = await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-p4-b' },
        relogio(depoisDoPrazo(t0))
      );
      expect(manual.jaFinal).toBe(true);
      expect((await lerLote()).reservas).toBe(0);
    });

    it('confirmação e depois entrega repetida: converte UMA vez', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p4-c', 'reserva-p4-03', t0);
      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      const entrega = {
        chargeId: r.chargeId,
        orderId: r.pedidoId,
        amount: pag.get('gatewayAmountCentavos') as number,
        eventId: `conf2-${r.pedidoId}`,
      };

      await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.confirmed', entrega)
      );
      expect((await lerLote()).reservas).toBe(0);

      // Redelivery da MESMA entrega: o ledger barra e nada se move.
      const replay = await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.confirmed', entrega)
      );
      expect(replay.duplicado).toBe(true);
      expect((await lerLote()).reservas).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // P5 — multi-inscrito
  // -------------------------------------------------------------------------

  describe('P5 · multi-inscrito conta cada linha', () => {
    it('3 linhas no mesmo lote sobem reservas em 3 — e o gate contou as 3', async () => {
      await relote({ quantidadeLimite: 3 });
      const t0 = new Date(Date.now() + 60_000);

      const r = await createInscricaoChargeCore(
        db, provider,
        input('reserva-p5-01', {
          inscritos: [
            inscrito('Ana Pagadora', CPF_A),
            inscrito('Bruno Segundo', CPF_B),
            inscrito('Carla Terceira', CPF_C),
          ],
        }),
        { uid: 'uid-p5', ehAnonimo: true }, relogio(t0)
      );
      expect(r.pedidoId).toBeTruthy();
      expect((await lerLote()).reservas).toBe(3);

      // A 4ª vaga não existe: o gate somou as 3 linhas contra o limite.
      await expect(
        createInscricaoChargeCore(
          db, provider,
          input('reserva-p5-02', { inscritos: [inscrito('Ana Pagadora', CPF_A)] }),
          { uid: 'uid-p5-outro', ehAnonimo: true },
          relogio(new Date(t0.getTime() + 60_000))
        )
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });
  });

  // -------------------------------------------------------------------------
  // P6 — RN-300 intocada
  // -------------------------------------------------------------------------

  describe('P6 · a reserva não mexe na virada (RN-300)', () => {
    it('lote encerrado por DATA com reserva viva não volta a vender quando a reserva morre', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p6', 'reserva-p6-01', t0);
      expect((await lerLote()).reservas).toBe(1);

      // A janela do lote fecha ENQUANTO a reserva está viva.
      await relote({ fimEmDias: -1 });
      await virarLote(db, EVENTO_ID, new Date());
      const carimbado = await lerLote();
      expect(carimbado.encerradoMotivo).toBe('data');

      // A reserva morre. A vaga "volta" — para um lote de venda fechada.
      const depois = depoisDoPrazo(t0);
      await varrerPixVencidosCore(db, provider, depois);
      expect((await lerLote()).reservas).toBe(0);

      // E nada reabre: a venda segue fechada (RN-300).
      await expect(
        createInscricaoChargeCore(
          db, provider,
          input('reserva-p6-02', { inscritos: [inscrito('Bruno Segundo', CPF_B)] }),
          { uid: 'uid-p6-b', ehAnonimo: true }, relogio(depois)
        )
      ).rejects.toThrow();
    });

    it('reserva sozinha NUNCA carimba encerramento, nem com o lote lotado de reservas', async () => {
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p6b', 'reserva-p6b-01', t0); // limite 1, reservas 1

      await virarLote(db, EVENTO_ID, new Date());
      const lote = await lerLote();
      expect(lote.reservas).toBe(1);
      expect(lote.vendidos).toBe(0);
      // Indisponível para compra, mas NÃO encerrado.
      expect(lote.encerradoEm).toBeUndefined();
      expect(lote.encerradoMotivo).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // P7 — RN-546: o teto de 15 minutos do cartão
  // -------------------------------------------------------------------------

  describe('P7 · o pendente de cartão solta a vaga em 15 minutos', () => {
    it('o teto é de 15 minutos — o número que o dono decidiu em 11/08', () => {
      expect(RESERVA_CARTAO_TETO_SEGUNDOS).toBe(15 * 60);
    });

    it('dentro dos 15 min a vaga segue reservada; passado o teto ela volta e o pedido continua VIVO', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p7', 'reserva-p7-01', t0, {
        forma: 'cartao_credito',
        parcelas: 1,
      });
      expect((await lerLote()).reservas).toBe(1);

      // 14 minutos: ainda dentro do teto.
      await recontarReservasCore(db, new Date(t0.getTime() + 14 * 60 * 1000));
      expect((await lerLote()).reservas).toBe(1);

      // 15 minutos e 1 segundo: a vaga volta.
      const recontagem = await recontarReservasCore(
        db, new Date(t0.getTime() + 15 * 60 * 1000 + 1000)
      );
      expect(recontagem.executada).toBe(true);
      expect(recontagem.cartoesAlemDoTeto).toBe(1);
      expect(recontagem.corrigidos).toBe(1);
      expect((await lerLote()).reservas).toBe(0);

      // ⚔ O PEDIDO CONTINUA VIVO: nada foi cancelado no gateway. Cancelar
      // cobrança de cartão em processamento é mexer em dinheiro em voo.
      const ped = await db.collection('pedidos').doc(r.pedidoId).get();
      expect(ped.get('status')).toBe('pendente');
      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      expect(pag.get('status')).toBe('pendente');
      expect(provider.getCharge(r.chargeId)?.status).not.toBe('cancelled');
    });

    it('confirmação ATRASADA depois do teto entra do mesmo jeito — pago nunca é recusado (RN-498)', async () => {
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p7-b', 'reserva-p7-02', t0, {
        forma: 'cartao_credito',
        parcelas: 1,
      });
      await recontarReservasCore(db, new Date(t0.getTime() + 20 * 60 * 1000));
      expect((await lerLote()).reservas).toBe(0);

      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      const efeito = await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.confirmed', {
          chargeId: r.chargeId,
          orderId: r.pedidoId,
          amount: pag.get('gatewayAmountCentavos') as number,
          eventId: `tarde-${r.pedidoId}`,
        })
      );
      expect(efeito.ignorado).toBe(false);
      const pedido = await db.collection('pedidos').doc(r.pedidoId).get();
      expect(pedido.get('status')).toBe('pago');
      // Reserva já estava em 0 — a conversão não a leva a negativo.
      expect((await lerLote()).reservas).toBe(0);
    });

    it('PIX pendente NÃO é afetado pelo teto do cartão — ele tem a porta dele', async () => {
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p7-c', 'reserva-p7-03', t0);
      // 20 minutos: passou do teto do cartão, mas o PIX vale 30.
      await recontarReservasCore(db, new Date(t0.getTime() + 20 * 60 * 1000));
      expect((await lerLote()).reservas).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // P8 — RN-182 intocada
  // -------------------------------------------------------------------------

  describe('P8 · nenhuma linha desta frente toca dinheiro (RN-182)', () => {
    it('valor, taxa e repasse do pedido reservado são idênticos aos de antes da reserva', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      const r = await cobrar('uid-p8', 'reserva-p8-01', t0);

      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      expect(pag.get('valorBase')).toBe(FACE);
      expect(pag.get('valorFinal')).toBe(FACE);
      expect(pag.get('desconto')).toBe(0);
      // TAXAFLEX: 10% do termo comercial, congelado no ato — intocado.
      expect((pag.get('taxaCongelada') as { valor: number }).valor).toBe(20);

      const ped = await db.collection('pedidos').doc(r.pedidoId).get();
      expect(ped.get('valorTotal')).toBe(FACE);
      // Nenhum campo de reserva vazou para o doc de dinheiro.
      expect(ped.get('reservas')).toBeUndefined();
      expect(pag.get('reservas')).toBeUndefined();

      // E a confirmação concilia o repasse pela mesma fórmula (face − taxa).
      await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.confirmed', {
          chargeId: r.chargeId,
          orderId: r.pedidoId,
          amount: pag.get('gatewayAmountCentavos') as number,
          eventId: `p8-${r.pedidoId}`,
        })
      );
      const pagPago = await db.collection('pagamentos').doc(r.pagamentoId).get();
      const conc = pagPago.get('conciliacao') as { repasseOrganizador: number };
      expect(conc.repasseOrganizador).toBe(180);
    });
  });

  // -------------------------------------------------------------------------
  // P9 — a recontagem cura drift
  // -------------------------------------------------------------------------

  describe('P9 · a recontagem absoluta é a rede contra drift', () => {
    it('contador preso ALTO sem pedido pendente nenhum é zerado', async () => {
      // O pior caso: reserva fantasma segurando a última vaga para sempre.
      await db.doc(`eventos/${EVENTO_ID}/lotes/l1`).update({ reservas: 1 });
      const r = await recontarReservasCore(db, new Date());
      expect(r.executada).toBe(true);
      expect(r.corrigidos).toBe(1);
      expect((await lerLote()).reservas).toBe(0);
    });

    it('contador preso BAIXO com pedido pendente vivo é corrigido para cima', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p9', 'reserva-p9-01', t0);
      // Simula o decremento a mais (correção manual, crash, restore).
      await db.doc(`eventos/${EVENTO_ID}/lotes/l1`).update({ reservas: 0 });

      const r = await recontarReservasCore(db, new Date(t0.getTime() + 60_000));
      expect(r.corrigidos).toBe(1);
      expect((await lerLote()).reservas).toBe(1);
    });

    it('contador correto não é reescrito — recontagem não gera write à toa', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p9-b', 'reserva-p9-02', t0);

      const r = await recontarReservasCore(db, new Date(t0.getTime() + 60_000));
      expect(r.corrigidos).toBe(0);
      expect((await lerLote()).reservas).toBe(1);
    });

    it('acima do teto de pendentes ela PULA — absoluto parcial seria mentira', async () => {
      await relote({ quantidadeLimite: 5 });
      const t0 = new Date(Date.now() + 60_000);
      await cobrar('uid-p9-c', 'reserva-p9-03', t0);
      await db.doc(`eventos/${EVENTO_ID}/lotes/l1`).update({ reservas: 9 });

      const r = await recontarReservasCore(db, new Date(t0.getTime() + 60_000), {
        pendentes: 0,
      });
      expect(r.executada).toBe(false);
      expect(r.motivoPulo).toBe('pendentes_acima_do_teto');
      // NÃO escreveu — o número errado continua, e o log é que pede socorro.
      expect((await lerLote()).reservas).toBe(9);
    });
  });
});
