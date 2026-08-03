/**
 * asaasTetoCheckout.integration.test.ts — DEC-0727 (item 28) · lane
 * ASAAS-TETO · trace leela-build-2d6ee98d.
 *
 * ⚠️ EXIGE Firestore no Emulator (projectId demo-leela).
 *
 * O que esta suíte prova: o que a callable do checkout FAZ quando o teto de
 * 15s do adapter estoura no meio da criação da cobrança.
 *
 * O risco que o painel registrou, palavra por palavra: *"apertado demais
 * transforma cobrança criada em erro para o comprador"*. Duas metades:
 *
 *   - a metade do COMPRADOR mora na landing (`checkout-asaas-teto.test.tsx`):
 *     "processando pagamento", nem sucesso nem fracasso;
 *   - a metade do SISTEMA é esta. O timeout não pode virar erro SILENCIOSO:
 *     ele sai tipado (`deadline-exceeded` + `MOTIVO_GATEWAY_SEM_RESPOSTA`), e
 *     os docs do pedido ficam gravados e pendentes com `gatewayChargeId`
 *     nulo — é EXATAMENTE esse estado que faz o replay idempotente curar o
 *     desconhecido em vez de abrir uma segunda cobrança.
 *
 * ⛔ Nenhuma rede real: o provider é injetado e nenhuma chave Asaas existe no
 * ambiente (o `delete process.env['ASAAS_API_KEY']` do beforeAll garante).
 *
 * Comando (de `functions/`, SEMPRE após `npm run build`):
 *   npx firebase-tools@13 emulators:exec --project demo-leela \
 *     "npx vitest run src/__tests__/asaasTetoCheckout.integration.test.ts"
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
import { https } from 'firebase-functions/v1';
import {
  createInscricaoChargeCore,
  MOTIVO_GATEWAY_RECUSOU,
  MSG_GATEWAY_RECUSOU,
  MSG_GATEWAY_SEM_RESPOSTA,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { MockPaymentProvider } from '../payments/mockProvider';
import {
  AsaasApiError,
  AsaasTimeoutError,
  ASAAS_TIMEOUT_MS,
} from '../payments/asaasProvider';
import {
  MOTIVO_GATEWAY_SEM_RESPOSTA,
  type ChargeResult,
  type CreateChargeParams,
} from '@leela/core';

const PROJECT_ID = 'demo-leela';
const hasEmulator = Boolean(process.env['FIRESTORE_EMULATOR_HOST']);
const FS_PORT = Number(
  process.env['LEELA_FS_EMU_PORT'] ??
    process.env['FIRESTORE_EMULATOR_HOST']?.split(':').pop() ??
    8080
);

const TENANT_ID = 'castelo-teto';
const EVENTO_ID = 'meia-teto';
const FACE = 200;
const DIA_MS = 24 * 60 * 60 * 1000;
/** CPF válido (DV correto) — o checkout valida na fronteira. */
const CPF = '529.982.247-25';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

/** Relógio INJETADO. */
const relogio = (d: Date) => () => d;

/**
 * Provider que estoura o teto na criação — o gateway que engoliu o POST.
 *
 * SUBCLASSE do Mock, não objeto remontado: todo o resto do contrato
 * (cancelamento, webhook, dedup) segue sendo o do Mock já exercitado pelas
 * outras suítes. O que muda é UMA porta.
 *
 * `criacoes` conta as tentativas — é o número que separa "o replay reencontrou
 * a cobrança" de "o replay criou a segunda".
 */
class ProviderComTeto extends MockPaymentProvider {
  criacoes = 0;
  travado = true;

  override async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    this.criacoes += 1;
    if (this.travado) {
      throw new AsaasTimeoutError('POST', '/payments', ASAAS_TIMEOUT_MS);
    }
    return super.createCharge(params);
  }
}

/** Provider cuja criação recebe VEREDITO do gateway (4xx), não silêncio. */
class ProviderCom400 extends MockPaymentProvider {
  override async createCharge(): Promise<ChargeResult> {
    throw new AsaasApiError(400, ['invalid_action'], ['Cobrança inválida.']);
  }
}

/** Idem, com status/códigos arbitrários (T3 — 429, 5xx, o erro de 02/08). */
class ProviderComApiError extends MockPaymentProvider {
  constructor(
    private readonly status: number,
    private readonly codes: string[],
    private readonly descriptions: string[] = []
  ) {
    super();
  }
  override async createCharge(): Promise<ChargeResult> {
    throw new AsaasApiError(this.status, this.codes, this.descriptions);
  }
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
    idempotencyKey: chave,
    ...over,
  };
}

interface ErroCapturado {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

describe.skipIf(!hasEmulator)('DEC-0727 · teto de 15s na callable do checkout', () => {
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
      id: TENANT_ID, nome: 'Castelo TETO', slug: TENANT_ID, status: 'ativo',
      ownerUid: 'uid-owner-teto', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
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
      id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-owner-teto',
      nome: 'Meia TETO', data: tsRel(45), local: 'Floripa/SC',
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

  async function capturar(fn: () => Promise<unknown>): Promise<ErroCapturado> {
    try {
      await fn();
    } catch (err) {
      return err as ErroCapturado;
    }
    throw new Error('a chamada deveria ter falhado');
  }

  // -------------------------------------------------------------------------
  // O erro que sai da callable
  // -------------------------------------------------------------------------

  it('teto estourado ⇒ erro TIPADO (deadline-exceeded + motivo), nunca INTERNAL', async () => {
    const g = new ProviderComTeto();
    const T0 = new Date();
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db, g, inputPix('teto-0001'),
        { uid: 'uid-teto-a', ehAnonimo: true }, relogio(T0)
      )
    );

    // Sem esta tradução o erro subiria cru e o wrapper do onCall o achataria
    // em 'INTERNAL' — jargão sobre o dinheiro de quem está comprando.
    expect(e.code).toBe('deadline-exceeded');
    expect(e.details?.['motivo']).toBe(MOTIVO_GATEWAY_SEM_RESPOSTA);
    expect(e.message).toBe(MSG_GATEWAY_SEM_RESPOSTA);
    // A frase do dono chega ao cliente mesmo que ele não conheça o motivo.
    expect(e.message).toMatch(/^Processando pagamento/);
  });

  it('o erro carrega o endereço do estado desconhecido: pedido, pagamento e a chave do replay', async () => {
    const g = new ProviderComTeto();
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db, g, inputPix('teto-0002'),
        { uid: 'uid-teto-b', ehAnonimo: true }, relogio(new Date())
      )
    );

    // Quem recebe o erro precisa saber ONDE olhar (suporte, reconciliação) e
    // COM QUE CHAVE repetir — repetir com chave nova é abrir a segunda compra.
    expect(e.details?.['pedidoId']).toBe('ped-uid-teto-b-teto-0002');
    expect(e.details?.['pagamentoId']).toBe('pag-uid-teto-b-teto-0002');
    expect(e.details?.['idempotencyKey']).toBe('teto-0002');
  });

  it('nem a mensagem nem o details carregam segredo do gateway', async () => {
    const g = new ProviderComTeto();
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db, g, inputPix('teto-0003'),
        { uid: 'uid-teto-c', ehAnonimo: true }, relogio(new Date())
      )
    );
    const serializado = `${e.message ?? ''} ${JSON.stringify(e.details ?? {})}`;
    expect(serializado).not.toContain('$aact_');
    expect(serializado).not.toMatch(/access_token/i);
    expect(serializado).not.toMatch(/apiKey/i);
  });

  // -------------------------------------------------------------------------
  // O estado que o replay cura — o invariante do risco do painel
  // -------------------------------------------------------------------------

  it('o timeout NÃO virou erro silencioso: pedido e pagamento existem, pendentes, sem chargeId', async () => {
    const g = new ProviderComTeto();
    await capturar(() =>
      createInscricaoChargeCore(
        db, g, inputPix('teto-0004'),
        { uid: 'uid-teto-d', ehAnonimo: true }, relogio(new Date())
      )
    );

    const pedido = await db.collection('pedidos').doc('ped-uid-teto-d-teto-0004').get();
    const pagamento = await db.collection('pagamentos').doc('pag-uid-teto-d-teto-0004').get();

    // Se os docs NÃO existissem, o estado desconhecido do gateway ficaria sem
    // dono no nosso lado — nada para reconciliar, nada para o replay achar.
    expect(pedido.exists).toBe(true);
    expect(pagamento.exists).toBe(true);
    expect(pedido.get('status')).toBe('pendente');
    expect(pagamento.get('status')).toBe('pendente');
    // `gatewayChargeId` nulo é o marcador de "a cobrança ainda não foi
    // provada nossa" — é ele que faz o replay tentar de novo.
    expect(pagamento.get('gatewayChargeId')).toBeNull();
    // E nada foi declarado pago nem cancelado por causa de uma não-resposta.
    expect(pedido.get('status')).not.toBe('cancelado');
    expect(pagamento.get('status')).not.toBe('confirmado');
  });

  it('REPLAY com a MESMA chave completa o fluxo e NÃO cria segundo pedido', async () => {
    const g = new ProviderComTeto();
    const T0 = new Date();
    await capturar(() =>
      createInscricaoChargeCore(
        db, g, inputPix('teto-0005'),
        { uid: 'uid-teto-e', ehAnonimo: true }, relogio(T0)
      )
    );
    expect(g.criacoes).toBe(1);

    // O gateway volta. A MESMA chave, como a tela faz ("tentar novamente").
    g.travado = false;
    const r = await createInscricaoChargeCore(
      db, g, inputPix('teto-0005'),
      { uid: 'uid-teto-e', ehAnonimo: true }, relogio(new Date(T0.getTime() + 5_000))
    );

    expect(r.pedidoId).toBe('ped-uid-teto-e-teto-0005');
    expect(r.chargeId.length).toBeGreaterThan(0);
    expect(g.criacoes).toBe(2);

    // UM pedido, um pagamento — o desconhecido virou conhecido sem duplicar.
    const pedidos = await db
      .collection('pedidos')
      .where('responsavel.atletaId', '==', 'uid-teto-e')
      .get();
    expect(pedidos.size).toBe(1);
    const pagamento = await db.collection('pagamentos').doc(r.pagamentoId).get();
    expect(pagamento.get('gatewayChargeId')).toBe(r.chargeId);
    expect(pagamento.get('status')).toBe('pendente');
  });

  it('o valor do replay vem do doc, não é recomputado (o teto não abre janela de preço)', async () => {
    const g = new ProviderComTeto();
    const T0 = new Date();
    await capturar(() =>
      createInscricaoChargeCore(
        db, g, inputPix('teto-0006'),
        { uid: 'uid-teto-f', ehAnonimo: true }, relogio(T0)
      )
    );
    const antes = await db.collection('pagamentos').doc('pag-uid-teto-f-teto-0006').get();
    const centavosGravados = antes.get('gatewayAmountCentavos') as number;

    // O lote "vira" entre a tentativa que estourou e o retry.
    await db.doc(`eventos/${EVENTO_ID}/lotes/l1`).update({ preco: FACE * 3 });

    g.travado = false;
    const r = await createInscricaoChargeCore(
      db, g, inputPix('teto-0006'),
      { uid: 'uid-teto-f', ehAnonimo: true }, relogio(new Date(T0.getTime() + 5_000))
    );

    // Recomputar aqui cobraria valor diferente do pedido gravado — anomalia de
    // dinheiro que o teto de 15s tornou muito mais fácil de alcançar.
    const depois = await db.collection('pagamentos').doc(r.pagamentoId).get();
    expect(depois.get('gatewayAmountCentavos')).toBe(centavosGravados);
    expect(g.getCharge(r.chargeId)?.amount).toBe(centavosGravados);
  });

  // -------------------------------------------------------------------------
  // A tradução do TIMEOUT é estreita — mas nenhum erro sai mais cru (T3)
  // -------------------------------------------------------------------------

  /**
   * ⚠️ Este teste NASCEU pinando o defeito. Na versão anterior ele exigia que
   * um erro não-timeout "continuasse subindo cru", e foi exatamente isso que
   * o comprador viu em 02/08: o `AsaasApiError` do
   * `invalid_externalReference` subiu cru, o wrapper do onCall o achatou e a
   * tela do dinheiro imprimiu a palavra `internal`.
   *
   * O que a intenção original acertou e segue valendo: um 400 é VEREDITO, e
   * traduzi-lo para "processando pagamento" esconderia uma recusa real atrás
   * de uma espera que nunca termina. Por isso a asserção que sobrevive é a
   * SEPARAÇÃO — código e motivo distintos do caminho do timeout —, não a
   * ausência de tradução.
   */
  it('recusa do gateway sai TIPADA e humana, nunca "internal"', async () => {
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db, new ProviderCom400(), inputPix('teto-0007'),
        { uid: 'uid-teto-g', ehAnonimo: true }, relogio(new Date())
      )
    );

    expect(e).toBeInstanceOf(https.HttpsError);
    expect(e.code).toBe('failed-precondition');
    expect(e.code).not.toBe('internal');
    expect(e.message).toContain('Não conseguimos abrir a cobrança');
    // O código do provedor viaja para quem for atender o chamado.
    expect(e.message).toContain('invalid_action');
    expect(e.details?.['gatewayCodigos']).toBe('invalid_action');
    expect(e.details?.['gatewayStatus']).toBe(400);
    // A separação do caminho do timeout, que é o acerto do teste original.
    expect(e.code).not.toBe('deadline-exceeded');
    expect(e.details?.['motivo']).toBe(MOTIVO_GATEWAY_RECUSOU);
    expect(e.details?.['motivo']).not.toBe(MOTIVO_GATEWAY_SEM_RESPOSTA);
    // E o contrato de retry seguro continua explícito no erro.
    expect(e.details?.['idempotencyKey']).toBe('teto-0007');
    // Os docs seguem pendentes com a cobrança nula — o replay cura.
    const pagamento = await db.collection('pagamentos').doc('pag-uid-teto-g-teto-0007').get();
    expect(pagamento.get('status')).toBe('pendente');
    expect(pagamento.get('gatewayChargeId')).toBeNull();
  });

  it('429 e 5xx do gateway ganham códigos próprios (o cliente sabe o que fazer)', async () => {
    const e429 = await capturar(() =>
      createInscricaoChargeCore(
        db, new ProviderComApiError(429, ['rate_limit']), inputPix('teto-0009'),
        { uid: 'uid-teto-i', ehAnonimo: true }, relogio(new Date())
      )
    );
    expect(e429.code).toBe('resource-exhausted');
    expect(e429.details?.['motivo']).toBe(MOTIVO_GATEWAY_RECUSOU);

    const e500 = await capturar(() =>
      createInscricaoChargeCore(
        db, new ProviderComApiError(500, []), inputPix('teto-0010'),
        { uid: 'uid-teto-j', ehAnonimo: true }, relogio(new Date())
      )
    );
    expect(e500.code).toBe('unavailable');
    // Sem código no corpo, a frase sai limpa — nada de parênteses vazio.
    expect(e500.message).toBe(MSG_GATEWAY_RECUSOU);
  });

  /**
   * ⛔ REENCENAÇÃO do defeito de produção (INV-PIXINTERNAL). Este é o erro
   * exato, com o corpo verbatim do Asaas, que imprimiu `internal` na tela.
   * Com o T1 ele não acontece mais; com o T3 ele deixaria de ser opaco mesmo
   * se voltasse.
   */
  it('o erro de 02/08, verbatim, não volta a imprimir "internal"', async () => {
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db,
        new ProviderComApiError(400, ['invalid_externalReference'], [
          'Property [externalReference] of class [{1}] with value [...] ' +
            'exceeds the maximum size of [100]',
        ]),
        inputPix('teto-0011'),
        { uid: 'uid-teto-k', ehAnonimo: true }, relogio(new Date())
      )
    );

    expect(e.code).not.toBe('internal');
    expect(e.message).not.toBe('internal');
    expect(e.details?.['gatewayCodigos']).toBe('invalid_externalReference');
    // O VALOR recusado carrega o uid — ele fica no log do servidor, nunca na
    // mensagem que atravessa a fronteira.
    expect(e.message).not.toContain('exceeds the maximum size');
  });

  it('erro que não é do adapter continua subindo cru (a tradução não engorda)', async () => {
    class ProviderQueEstoura extends MockPaymentProvider {
      override async createCharge(): Promise<ChargeResult> {
        throw new TypeError('bug nosso, não do gateway');
      }
    }
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db, new ProviderQueEstoura(), inputPix('teto-0012'),
        { uid: 'uid-teto-l', ehAnonimo: true }, relogio(new Date())
      )
    );
    expect(e).toBeInstanceOf(TypeError);
    expect(e.details?.['motivo']).toBeUndefined();
  });

  it('cartão passa pelo MESMO caminho tipado (a decisão vale nos dois meios)', async () => {
    const g = new ProviderComTeto();
    const e = await capturar(() =>
      createInscricaoChargeCore(
        db, g,
        inputPix('teto-0008', { forma: 'cartao_credito', parcelas: 2 }),
        { uid: 'uid-teto-h', ehAnonimo: true }, relogio(new Date())
      )
    );

    expect(e.code).toBe('deadline-exceeded');
    expect(e.details?.['motivo']).toBe(MOTIVO_GATEWAY_SEM_RESPOSTA);
    const pagamento = await db.collection('pagamentos').doc('pag-uid-teto-h-teto-0008').get();
    expect(pagamento.get('status')).toBe('pendente');
    expect(pagamento.get('gatewayChargeId')).toBeNull();
  });
});
