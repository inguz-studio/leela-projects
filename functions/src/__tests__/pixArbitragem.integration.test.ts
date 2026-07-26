/**
 * pixArbitragem.integration.test.ts — LEELA-S1209-PIXBE (RN-157 · trace
 * leela-build-2d6ee98d). ⚠️ EXIGE Firestore no Emulator (projectId
 * demo-leela; porta via LEELA_FS_EMU_PORT — lane 8480, nunca o 8180 do
 * preview).
 *
 * O que esta suíte prova (os itens que a review antagonista S1209-REV
 * ESCALOU para fora de `apps/landing`):
 *
 *   T1. A resposta da cobrança carrega o `agora` do SERVIDOR junto da
 *       expiração — os dois números saem do mesmo relógio, então a duração
 *       restante deixa de ser palpite sobre o relógio do aparelho.
 *   T2. Abrir uma SEGUNDA cobrança PIX enquanto a primeira está pendente e
 *       válida é recusado pelo SERVIDOR, com erro tipado e à prova de
 *       corrida (duas requisições concorrentes ⇒ uma só vive).
 *   T3. A expiração cancela a cobrança NO GATEWAY primeiro; falha lá ⇒ o
 *       pedido NÃO vira expirado (melhor timer parado que duas cobranças
 *       vivas), e o pagamento retardatário continua morrendo no webhook.
 *
 * SUITE-STAB: clear+seed com triggers pausados e canários verificados
 * (helpers/stability.ts) — sem isso o backlog de triggers dos arquivos
 * vizinhos engole o seed no emulator quente.
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 \
 *   JAVA_HOME=~/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *     --config ../firebase.r6.json --project demo-leela \
 *     "npx vitest run src/__tests__/pixArbitragem.integration.test.ts"
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
import {
  expirarPixPendenteCore,
  MOTIVO_CANCELAMENTO_GATEWAY_FALHOU,
} from '../checkout/expirarPixPendente';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import { MOTIVO_PIX_PENDENTE_ATIVO, type PaymentProvider } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-pixbe';
const EVENTO_ID = 'meia-pixbe';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
const MEIA_HORA_MS = 30 * 60 * 1000;
/** CPFs válidos (DV correto) — o checkout valida na fronteira. */
const CPF = '529.982.247-25';
const CPF_BRUNO = '168.995.350-09';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

/** Relógio INJETADO: toda aritmética de prazo é exata sobre ele. */
const relogio = (d: Date) => () => d;

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

describe.skipIf(!hasEmulator)('S1209-PIXBE — arbitragem server-side do PIX', () => {
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
      id: TENANT_ID, nome: 'Castelo PIXBE', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-pixbe', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
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
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-pixbe',
      nome: 'Meia PIXBE', data: tsRel(45), local: 'Floripa/SC',
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

  // -------------------------------------------------------------------------
  // T1 — relógio do servidor na resposta (achado #6 da review S1209-REV)
  // -------------------------------------------------------------------------

  describe('T1 · o `agora` do servidor viaja com a expiração', () => {
    it('resposta da cobrança PIX traz servidorAgoraMillis do MESMO relógio que carimbou pixExpiraEm', async () => {
      const T0 = new Date(Date.now() + 60_000);
      const r = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t1-01'),
        { uid: 'uid-t1-a', ehAnonimo: true }, relogio(T0)
      );

      expect(r.servidorAgoraMillis).toBe(T0.getTime());
      expect(r.pixExpiraEmMillis).toBe(T0.getTime() + MEIA_HORA_MS);
      // A conta que a tela passa a fazer — sem tocar no relógio do aparelho.
      expect((r.pixExpiraEmMillis ?? 0) - r.servidorAgoraMillis).toBe(MEIA_HORA_MS);
    });

    it('REPLAY (leitor do pedido pendente) recarimba o AGORA e preserva a expiração — a contagem retomada é a real', async () => {
      const T0 = new Date(Date.now() + 60_000);
      const criacao = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t1-02'),
        { uid: 'uid-t1-b', ehAnonimo: true }, relogio(T0)
      );

      const T10 = new Date(T0.getTime() + 10 * 60 * 1000);
      const replay = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t1-02'),
        { uid: 'uid-t1-b', ehAnonimo: true }, relogio(T10)
      );

      // Prazo NUNCA re-estende (RN-157) …
      expect(replay.pixExpiraEmMillis).toBe(criacao.pixExpiraEmMillis);
      // … mas o instante do servidor é o DESTA leitura: faltam 20 min, não 30.
      expect(replay.servidorAgoraMillis).toBe(T10.getTime());
      expect((replay.pixExpiraEmMillis ?? 0) - replay.servidorAgoraMillis).toBe(
        20 * 60 * 1000
      );
    });

    it('cartão também traz servidorAgoraMillis (é o relógio da RESPOSTA, não um atributo do PIX)', async () => {
      const T0 = new Date(Date.now() + 60_000);
      const r = await createInscricaoChargeCore(
        db, provider,
        inputPix('pixbe-t1-03', { forma: 'cartao_credito', parcelas: 2 }),
        { uid: 'uid-t1-c', ehAnonimo: true }, relogio(T0)
      );
      expect(r.pixExpiraEmMillis).toBeUndefined();
      expect(r.servidorAgoraMillis).toBe(T0.getTime());
    });
  });

  // -------------------------------------------------------------------------
  // T2 — trava server-side da segunda cobrança PIX viva (escalado #2)
  // -------------------------------------------------------------------------

  describe('T2 · o servidor recusa a segunda cobrança PIX viva', () => {
    const T0 = () => new Date(Date.now() + 60_000);

    /** Erro esperado da trava, já desembrulhado. */
    function detalhesDaRecusa(err: unknown): Record<string, unknown> {
      const e = err as { code?: string; details?: Record<string, unknown> };
      expect(e.code).toBe('failed-precondition');
      return e.details ?? {};
    }

    it('chave de idempotência NOVA sobre cobrança pendente e no prazo ⇒ failed-precondition tipado, e a segunda NÃO nasce', async () => {
      const t0 = T0();
      const primeira = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-viva-01'),
        { uid: 'uid-t2-a', ehAnonimo: true }, relogio(t0)
      );

      // 5 min depois — a primeira segue pendente e dentro do prazo.
      const t5 = new Date(t0.getTime() + 5 * 60 * 1000);
      let capturado: unknown;
      await expect(
        createInscricaoChargeCore(
          db, provider, inputPix('pixbe-t2-viva-02'),
          { uid: 'uid-t2-a', ehAnonimo: true }, relogio(t5)
        ).catch((err: unknown) => {
          capturado = err;
          throw err;
        })
      ).rejects.toThrow(/cobrança PIX aberta e dentro do prazo/);

      const details = detalhesDaRecusa(capturado);
      expect(details['motivo']).toBe(MOTIVO_PIX_PENDENTE_ATIVO);
      // Aponta a cobrança VIVA (do próprio caller) — a tela volta para ela.
      expect(details['pedidoId']).toBe(primeira.pedidoId);
      expect(details['pixExpiraEmMillis']).toBe(primeira.pixExpiraEmMillis);

      // NADA foi escrito para a segunda tentativa (fail-closed).
      const segundoId = `ped-uid-t2-a-pixbe-t2-viva-02`;
      expect((await db.collection('pedidos').doc(segundoId).get()).exists).toBe(false);
      // E a primeira segue de pé, intocada.
      expect(
        (await db.collection('pedidos').doc(primeira.pedidoId).get()).get('status')
      ).toBe('pendente');
    });

    it('CORRIDA: duas requisições concorrentes com chaves distintas ⇒ exatamente UMA cobrança vive', async () => {
      const t0 = T0();
      const disparar = (chave: string) =>
        createInscricaoChargeCore(
          db, provider, inputPix(chave),
          { uid: 'uid-t2-corrida', ehAnonimo: true }, relogio(t0)
        );

      const resultados = await Promise.allSettled([
        disparar('pixbe-t2-race-0a'),
        disparar('pixbe-t2-race-0b'),
      ]);

      const ok = resultados.filter((r) => r.status === 'fulfilled');
      const falhou = resultados.filter((r) => r.status === 'rejected');
      expect(ok).toHaveLength(1);
      expect(falhou).toHaveLength(1);
      expect(
        ((falhou[0] as PromiseRejectedResult).reason as { code?: string }).code
      ).toBe('failed-precondition');

      // No banco: UM pedido pendente deste comprador neste evento.
      const pedidos = await db
        .collection('pedidos')
        .where('responsavel.atletaId', '==', 'uid-t2-corrida')
        .get();
      expect(pedidos.size).toBe(1);
    });

    it('REPLAY da MESMA chave nunca é bloqueado (retry do comprador segue devolvendo o mesmo pedido)', async () => {
      const t0 = T0();
      const primeira = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-replay-01'),
        { uid: 'uid-t2-b', ehAnonimo: true }, relogio(t0)
      );
      const replay = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-replay-01'),
        { uid: 'uid-t2-b', ehAnonimo: true },
        relogio(new Date(t0.getTime() + 3 * 60 * 1000))
      );
      expect(replay.pedidoId).toBe(primeira.pedidoId);
      expect(replay.chargeId).toBe(primeira.chargeId);
      expect(replay.pixExpiraEmMillis).toBe(primeira.pixExpiraEmMillis);
    });

    // ⚠️ PIX-CARRINHO-T1 (item 25 · opção b) INVERTEU a premissa deste teste.
    // Ele nasceu fixando "depois do prazo a trava solta sozinha, sem precisar
    // de expirarPixPendente antes" — e foi exatamente essa soltura pelo
    // RELÓGIO que a review antagonista provou ser o achado A1 (a anterior
    // seguia PAGÁVEL no gateway). A asserção antiga continua aqui, intacta
    // (a nova cobrança nasce), com as DUAS que faltavam: agora a anterior
    // morre no gateway ANTES, dentro do próprio fluxo de criação.
    it('depois do PRAZO a nova nasce — mas só depois de a anterior ser CANCELADA no gateway (T1)', async () => {
      const t0 = T0();
      const primeira = await createImpl('uid-t2-c', 'pixbe-t2-prazo-01', t0);
      // 31 min pelo relógio do SERVIDOR: a primeira não é mais cobrável.
      const depois = new Date(t0.getTime() + MEIA_HORA_MS + 60_000);
      const nova = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-prazo-02'),
        { uid: 'uid-t2-c', ehAnonimo: true }, relogio(depois)
      );
      expect(nova.statusPedido).toBe('pendente');
      expect(nova.pixExpiraEmMillis).toBe(depois.getTime() + MEIA_HORA_MS);

      // O que o T1 acrescenta: a cobrança anterior não ficou para trás viva.
      expect(provider.getCharge(primeira.chargeId)?.status).toBe('cancelled');
      const anterior = await db.collection('pedidos').doc(primeira.pedidoId).get();
      expect(anterior.get('status')).toBe('cancelado');
      expect(anterior.get('canceladoMotivo')).toBe('pix_expirado');
    });

    it('cobrança CANCELADA não bloqueia a próxima (o caminho de retry da RN-157 continua inteiro)', async () => {
      const t0 = T0();
      const primeira = await createImpl('uid-t2-d', 'pixbe-t2-canc-01', t0);
      await db.collection('pedidos').doc(primeira.pedidoId).update({
        status: 'cancelado', canceladoMotivo: 'pix_expirado',
      });
      await db.collection('pagamentos').doc(primeira.pagamentoId).update({
        status: 'cancelado',
      });

      const nova = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-canc-02'),
        { uid: 'uid-t2-d', ehAnonimo: true },
        relogio(new Date(t0.getTime() + 60_000))
      );
      expect(nova.pedidoId).not.toBe(primeira.pedidoId);
    });

    it('a trava é por (comprador, evento, CARRINHO): outro comprador com o mesmo carrinho passa', async () => {
      const t0 = T0();
      await createImpl('uid-t2-e', 'pixbe-t2-escopo-01', t0);

      // Outro comprador, MESMO evento e MESMO carrinho — nunca é atingido:
      // a trava protege a compra de UMA pessoa, não o evento.
      const outroComprador = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-escopo-02'),
        { uid: 'uid-t2-f', ehAnonimo: true }, relogio(t0)
      );
      expect(outroComprador.statusPedido).toBe('pendente');
    });

    it('CARRINHO DIFERENTE passa: inscrever OUTRA pessoa com o próprio PIX ainda vivo é segunda COMPRA, não cobrança duplicada', async () => {
      const t0 = T0();
      const primeira = await createImpl('uid-t2-h', 'pixbe-t2-carrinho-01', t0);

      const segunda = await createInscricaoChargeCore(
        db, provider,
        inputPix('pixbe-t2-carrinho-02', {
          inscritos: [
            {
              nome: 'Bruno Convidado',
              email: 'bruno@exemplo.com.br',
              cpf: CPF_BRUNO,
              modalidade: '10k',
            },
          ],
          responsavelIndex: 0,
          responsavel: { nome: 'Bruno Convidado', email: 'bruno@exemplo.com.br' },
        }),
        { uid: 'uid-t2-h', ehAnonimo: true },
        relogio(new Date(t0.getTime() + 60_000))
      );
      expect(segunda.pedidoId).not.toBe(primeira.pedidoId);
      expect(segunda.statusPedido).toBe('pendente');
    });

    it('ANTI-ATALHO: trocar a ORDEM dos atletas é o mesmo carrinho ⇒ segue bloqueado', async () => {
      const t0 = T0();
      const dupla = (nomes: readonly [string, string]) => ({
        inscritos: [
          {
            nome: nomes[0] === 'ana' ? 'Ana Pagadora' : 'Bruno Convidado',
            email: `${nomes[0]}@exemplo.com.br`,
            cpf: nomes[0] === 'ana' ? CPF : CPF_BRUNO,
            modalidade: '10k',
          },
          {
            nome: nomes[1] === 'ana' ? 'Ana Pagadora' : 'Bruno Convidado',
            email: `${nomes[1]}@exemplo.com.br`,
            cpf: nomes[1] === 'ana' ? CPF : CPF_BRUNO,
            modalidade: '10k',
          },
        ],
        responsavelIndex: 0,
        responsavel: { nome: 'Ana Pagadora', email: 'ana@exemplo.com.br' },
      });

      await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t2-ordem-01', dupla(['ana', 'bruno'])),
        { uid: 'uid-t2-i', ehAnonimo: true }, relogio(t0)
      );
      await expect(
        createInscricaoChargeCore(
          db, provider, inputPix('pixbe-t2-ordem-02', dupla(['bruno', 'ana'])),
          { uid: 'uid-t2-i', ehAnonimo: true },
          relogio(new Date(t0.getTime() + 60_000))
        )
      ).rejects.toThrow(/cobrança PIX aberta e dentro do prazo/);
    });

    // FRONTEIRA DELIBERADA de T2 (escalada no report, não é lacuna oculta):
    // o que a trava recusa é a segunda cobrança PIX. Cartão sobre PIX vivo
    // segue passando — é outra pergunta de produto (o comprador pode querer
    // trocar de meio) e mudá-la aqui seria política nova sem decisão.
    it('FRONTEIRA: cartão NÃO é bloqueado por um PIX vivo (escopo declarado de T2)', async () => {
      const t0 = T0();
      await createImpl('uid-t2-g', 'pixbe-t2-cartao-01', t0);
      const cartao = await createInscricaoChargeCore(
        db, provider,
        inputPix('pixbe-t2-cartao-02', { forma: 'cartao_credito', parcelas: 1 }),
        { uid: 'uid-t2-g', ehAnonimo: true }, relogio(t0)
      );
      expect(cartao.statusPedido).toBe('pendente');
      expect(cartao.pixExpiraEmMillis).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // T3 — cancelamento GATEWAY-PRIMEIRO na expiração (escalado #3)
  // -------------------------------------------------------------------------

  describe('T3 · a expiração mata a cobrança no gateway ANTES de matar o pedido', () => {
    const T0 = () => new Date(Date.now() + 60_000);
    const depoisDoPrazo = (t0: Date) =>
      new Date(t0.getTime() + MEIA_HORA_MS + 1000);

    it('caminho feliz: cobrança cancelada NO GATEWAY e só então pedido/pagamento viram cancelado', async () => {
      const t0 = T0();
      const r = await createImpl('uid-t3-a', 'pixbe-t3-ok-01', t0);

      const res = await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t3-a' },
        relogio(depoisDoPrazo(t0))
      );
      expect(res).toEqual({
        pedidoId: r.pedidoId, statusPedido: 'cancelado', expirado: true, jaFinal: false,
      });

      // O gateway: a cobrança NÃO é mais pagável.
      expect(provider.getCharge(r.chargeId)?.status).toBe('cancelled');
      // Os docs: cancelados, com a prova de que o gateway foi fechado.
      const pedido = await db.collection('pedidos').doc(r.pedidoId).get();
      expect(pedido.get('status')).toBe('cancelado');
      expect(pedido.get('canceladoMotivo')).toBe('pix_expirado');
      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      expect(pag.get('status')).toBe('cancelado');
      expect(pag.get('gatewayCancelado')).toBe(true);
    });

    it('FALHA no gateway ⇒ o pedido NÃO vira expirado (fail-safe: timer parado > duas cobranças vivas)', async () => {
      const t0 = T0();
      const r = await createImpl('uid-t3-b', 'pixbe-t3-falha-01', t0);

      // Provider que delega tudo ao Mock, MENOS o cancelamento: o gateway
      // está fora do ar / recusou. É a única coisa que muda.
      const gatewayQuebrado: PaymentProvider = {
        ...provider,
        createCharge: provider.createCharge.bind(provider),
        splitRules: provider.splitRules.bind(provider),
        refund: provider.refund.bind(provider),
        handleWebhook: provider.handleWebhook.bind(provider),
        getPayout: provider.getPayout.bind(provider),
        cancelCharge: () => Promise.reject(new Error('[teste] gateway fora do ar')),
      };

      let capturado: unknown;
      await expect(
        expirarPixPendenteCore(
          db, gatewayQuebrado, { pedidoId: r.pedidoId }, { uid: 'uid-t3-b' },
          relogio(depoisDoPrazo(t0))
        ).catch((err: unknown) => {
          capturado = err;
          throw err;
        })
      ).rejects.toThrow(/CONTINUA válida/);

      const e = capturado as { code?: string; details?: Record<string, unknown> };
      // `failed-precondition` é a verdade literal: a cobrança ainda vale. É
      // também o code que a tela já traduz como "contestado" (fix 59f18ed),
      // devolvendo a chave ao comprador em vez de abrir uma segunda.
      expect(e.code).toBe('failed-precondition');
      expect(e.details?.['motivo']).toBe(MOTIVO_CANCELAMENTO_GATEWAY_FALHOU);

      // O pedido segue VIVO — nada de "expirado, nada foi cobrado de você"
      // sobre um código que o banco ainda aceita.
      const pedido = await db.collection('pedidos').doc(r.pedidoId).get();
      expect(pedido.get('status')).toBe('pendente');
      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      expect(pag.get('status')).toBe('pendente');
      expect(pag.get('gatewayCancelado')).toBeUndefined();
      expect(provider.getCharge(r.chargeId)?.status).not.toBe('cancelled');
    });

    it('a MESMA cobrança que falhou pode ser encerrada quando o gateway volta (nada ficou travado)', async () => {
      const t0 = T0();
      const r = await createImpl('uid-t3-c', 'pixbe-t3-retorno-01', t0);
      const quebrado: PaymentProvider = {
        ...provider,
        createCharge: provider.createCharge.bind(provider),
        splitRules: provider.splitRules.bind(provider),
        refund: provider.refund.bind(provider),
        handleWebhook: provider.handleWebhook.bind(provider),
        getPayout: provider.getPayout.bind(provider),
        cancelCharge: () => Promise.reject(new Error('[teste] indisponível')),
      };
      await expect(
        expirarPixPendenteCore(
          db, quebrado, { pedidoId: r.pedidoId }, { uid: 'uid-t3-c' },
          relogio(depoisDoPrazo(t0))
        )
      ).rejects.toThrow(/CONTINUA válida/);

      const ok = await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t3-c' },
        relogio(depoisDoPrazo(t0))
      );
      expect(ok.expirado).toBe(true);
      expect(provider.getCharge(r.chargeId)?.status).toBe('cancelled');
    });

    it('REPLAY do webhook retardatário sobre pedido expirado: ignorado por estado final, sem efeito e sem duplicar', async () => {
      const t0 = T0();
      const r = await createImpl('uid-t3-d', 'pixbe-t3-tardio-01', t0);
      await expirarPixPendenteCore(
        db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t3-d' },
        relogio(depoisDoPrazo(t0))
      );

      const pag = await db.collection('pagamentos').doc(r.pagamentoId).get();
      const amount = pag.get('gatewayAmountCentavos') as number;
      const entrega = {
        chargeId: r.chargeId,
        orderId: r.pedidoId,
        amount,
        eventId: `tardio-${r.pedidoId}`,
      };

      // 1ª entrega do pagamento retardatário
      const tardio = await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.confirmed', entrega)
      );
      expect(tardio.ignorado).toBe(true);
      expect(tardio.motivo).toBe('estado_ja_final');

      // REDELIVERY da MESMA entrega (a máquina de replay existente): mesmo
      // desfecho, zero efeito novo — nada de receita nascendo no retry.
      const replay = await processarWebhookPagamento(
        db, provider, buildMockWebhookPayload('charge.confirmed', entrega)
      );
      expect(replay.ignorado).toBe(true);

      // Entrega NOVA (outro eventId) do mesmo pagamento: idem.
      const outra = await processarWebhookPagamento(
        db, provider,
        buildMockWebhookPayload('charge.confirmed', {
          ...entrega,
          eventId: `tardio-2-${r.pedidoId}`,
        })
      );
      expect(outra.ignorado).toBe(true);

      // Estado do dinheiro intocado pelos três.
      const pedidoDepois = await db.collection('pedidos').doc(r.pedidoId).get();
      expect(pedidoDepois.get('status')).toBe('cancelado');
      const pagDepois = await db.collection('pagamentos').doc(r.pagamentoId).get();
      expect(pagDepois.get('status')).toBe('cancelado');
      const evento = await db.collection('eventos').doc(EVENTO_ID).get();
      expect(evento.get('receitaConfirmada')).toBe(0);
    });

    it('IDEMPOTENTE: expirar 2× devolve jaFinal e NÃO toca o gateway de novo', async () => {
      const t0 = T0();
      const r = await createImpl('uid-t3-e', 'pixbe-t3-idem-01', t0);
      const depois = relogio(depoisDoPrazo(t0));

      let chamadasDeCancelamento = 0;
      const contando: PaymentProvider = {
        ...provider,
        createCharge: provider.createCharge.bind(provider),
        splitRules: provider.splitRules.bind(provider),
        refund: provider.refund.bind(provider),
        handleWebhook: provider.handleWebhook.bind(provider),
        getPayout: provider.getPayout.bind(provider),
        cancelCharge: (p) => {
          chamadasDeCancelamento += 1;
          return provider.cancelCharge(p);
        },
      };

      const um = await expirarPixPendenteCore(
        db, contando, { pedidoId: r.pedidoId }, { uid: 'uid-t3-e' }, depois
      );
      expect(um.expirado).toBe(true);
      const dois = await expirarPixPendenteCore(
        db, contando, { pedidoId: r.pedidoId }, { uid: 'uid-t3-e' }, depois
      );
      expect(dois.jaFinal).toBe(true);
      expect(dois.expirado).toBe(false);
      // A segunda chamada sai no gate de estado, ANTES do gateway.
      expect(chamadasDeCancelamento).toBe(1);
    });

    it('dono-only e antes-da-hora seguem valendo — e nenhum dos dois toca o gateway', async () => {
      const t0 = T0();
      const r = await createImpl('uid-t3-f', 'pixbe-t3-guarda-01', t0);
      let chamadas = 0;
      const contando: PaymentProvider = {
        ...provider,
        createCharge: provider.createCharge.bind(provider),
        splitRules: provider.splitRules.bind(provider),
        refund: provider.refund.bind(provider),
        handleWebhook: provider.handleWebhook.bind(provider),
        getPayout: provider.getPayout.bind(provider),
        cancelCharge: (p) => {
          chamadas += 1;
          return provider.cancelCharge(p);
        },
      };

      await expect(
        expirarPixPendenteCore(
          db, contando, { pedidoId: r.pedidoId }, { uid: 'intruso' },
          relogio(depoisDoPrazo(t0))
        )
      ).rejects.toThrow(/outro pagador/);
      await expect(
        expirarPixPendenteCore(
          db, contando, { pedidoId: r.pedidoId }, { uid: 'uid-t3-f' },
          relogio(new Date(t0.getTime() + MEIA_HORA_MS - 1000))
        )
      ).rejects.toThrow(/ainda não expirou/);

      expect(chamadas).toBe(0);
      expect(
        (await db.collection('pedidos').doc(r.pedidoId).get()).get('status')
      ).toBe('pendente');
      expect(provider.getCharge(r.chargeId)?.status).not.toBe('cancelled');
    });

    it('T2 × T3: depois da expiração CONFIRMADA a trava solta e a cobrança nova nasce', async () => {
      const t0 = T0();
      const primeira = await createImpl('uid-t3-g', 'pixbe-t3-libera-01', t0);
      const depois = depoisDoPrazo(t0);
      await expirarPixPendenteCore(
        db, provider, { pedidoId: primeira.pedidoId }, { uid: 'uid-t3-g' },
        relogio(depois)
      );

      const nova = await createInscricaoChargeCore(
        db, provider, inputPix('pixbe-t3-libera-02'),
        { uid: 'uid-t3-g', ehAnonimo: true }, relogio(depois)
      );
      expect(nova.pedidoId).not.toBe(primeira.pedidoId);
      expect(nova.statusPedido).toBe('pendente');
      expect(nova.chargeId).not.toBe(primeira.chargeId);
    });
  });

  /** Açúcar: cria uma cobrança PIX e devolve o resultado. */
  async function createImpl(uid: string, chave: string, quando: Date) {
    return createInscricaoChargeCore(
      db, provider, inputPix(chave), { uid, ehAnonimo: true }, relogio(quando)
    );
  }
});
