// =============================================================================
// functions/src/checkout/webhookPagamento.ts
//
// Webhook de pagamento — a ÚNICA porta de mudança de estado financeiro do
// checkout (LEELA-E12 · fundação). O sandbox (MockPaymentProvider) dispara o
// payload assinado (buildMockWebhookPayload/signMockWebhook) que fecha o
// fluxo sem gateway real; o Asaas real entrará pela MESMA porta (ADR-006).
//
// SEGURANÇA (Schneier — 5-step, aplicado):
//   1. Assinatura HMAC verificada ANTES de qualquer leitura/escrita de
//      estado (delegada ao provider — invariante do contrato ADR-006).
//   2. Integridade cruzada: chargeId do payload DEVE bater com o
//      `gatewayChargeId` persistido e o amount (centavos) DEVE bater com o
//      `gatewayAmountCentavos` congelado na criação — webhook assinado mas
//      com valor divergente é rejeitado (nunca confiar no valor recebido).
//   3. Máquina de estados de transição ÚNICA: só `pendente` muda de estado.
//      Estado final (confirmado/falhou) NÃO retrocede nem re-aplica efeito.
//
// IDEMPOTÊNCIA (dinheiro — prova em 3 camadas, Kleppmann):
//   a. Ledger por ENTREGA: `pagamentos/{id}/webhookEventos/{eventId}` criado
//      na MESMA transação dos efeitos — replay do mesmo eventId lê o ledger
//      e retorna sem escrever (exactly-once por evento).
//   b. Guarda de estado: eventId DIFERENTE confirmando cobrança já
//      confirmada não re-agrega receita (transição única pendente→final).
//   c. `receitaConfirmada` via read-modify-write DENTRO da transação com
//      `roundMoney` (nunca FieldValue.increment em float — drift de FP em
//      dinheiro), serializada pelo isolamento da transação.
//
// AGREGAÇÃO: o flip dos inscritos dispara `onInscritoWrite`
// (agregarFinanceiro) que recomputa `eventos/{id}/financeiro/current` a
// partir de `receitaConfirmada` — full recompute idempotente (reusado, não
// reimplementado). `cupom.usos` (∑ de Function do checkout — E04) incrementa
// aqui, na confirmação (venda real), sob as mesmas guardas a+b.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_AFILIADOS,
  SUBCOLECAO_CONVERSOES_AFILIADO,
  computeComissaoConversao,
  dentroDaJanelaAtribuicao,
  isComissaoAfiliadoValida,
  roundMoney,
  type ComissaoAfiliado,
  type PaymentProvider,
  type WebhookPayload,
  type WebhookResult,
} from '@leela/core';
import { hasAsaasKey, selectPaymentProvider } from '../payments/selectProvider';
import { dispararContaSemFriccaoPosConfirmacao } from './contaSemFriccao';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Resultado do processamento (consumido por testes e pelo wrapper HTTP). */
export interface ResultadoWebhookPagamento {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  /** Status normalizado devolvido pelo gateway. */
  statusGateway: WebhookResult['status'];
  /** true = MESMO eventId já processado (ledger) — nenhuma escrita. */
  duplicado: boolean;
  /** true = entrega registrada, mas SEM efeito financeiro (ver motivo). */
  ignorado: boolean;
  motivo?: string;
}

/** Erro de webhook com status HTTP mapeado (mensagem pública, sem internals). */
export class WebhookRejeitadoError extends Error {
  readonly httpStatus: number;

  constructor(httpStatus: number, message: string) {
    super(message);
    this.name = 'WebhookRejeitadoError';
    this.httpStatus = httpStatus;
  }
}

/** Nome da subcoleção-ledger de entregas de webhook (deny-by-default). */
export const WEBHOOK_EVENTOS_SUBCOL = 'webhookEventos';

/**
 * Efeitos EXTRAS que a camada de gateway extraiu da entrega e o core
 * persiste na MESMA transação da confirmação (LEELA-R6 · checklist §4).
 * O fluxo mock não os usa — ausência = comportamento vigente byte a byte.
 */
export interface EfeitosExtrasWebhook {
  /**
   * Marca a origem da entrega quando ela vem de um gateway REAL (hoje só
   * 'asaas'). Controla o warn de "cartão confirmado sem dados de cartão" —
   * o fluxo mock nunca envia extras e segue SEM log novo (fix review
   * antagonista R6 #4).
   */
  origem?: 'asaas';
  /**
   * Bloco de cartão da confirmação (`payment.creditCard` do Asaas —
   * bandeira + últimos 4; o PAN/token nunca chega aqui). `valorParcela` e
   * `valorTotalComJuros` do CartaoPagamento são derivados do VALOR
   * CONGELADO do doc (`gatewayAmountCentavos`) e das parcelas do pedido —
   * nunca do payload do gateway (integridade: o gateway não dita valores).
   */
  cartao?: { bandeira: string; ultimos4: string; parcelas?: number };
}

// ---------------------------------------------------------------------------
// Validação de shape do payload (antes de tocar o provider)
// ---------------------------------------------------------------------------

function validarShapePayload(raw: unknown): WebhookPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new WebhookRejeitadoError(400, 'Payload de webhook inválido.');
  }
  const p = raw as Record<string, unknown>;
  if (
    typeof p['event'] !== 'string' ||
    p['event'].length === 0 ||
    p['data'] === null ||
    typeof p['data'] !== 'object' ||
    Array.isArray(p['data']) ||
    typeof p['signature'] !== 'string' ||
    typeof p['deliveredAt'] !== 'string'
  ) {
    throw new WebhookRejeitadoError(400, 'Payload de webhook inválido.');
  }
  return {
    event: p['event'],
    data: p['data'] as Record<string, unknown>,
    signature: p['signature'],
    deliveredAt: p['deliveredAt'],
  };
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; onRequest é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Processa um webhook de pagamento de ponta a ponta. Ver invariantes no
 * cabeçalho do arquivo. Reprocessar a MESMA entrega não duplica NENHUM
 * efeito (ledger); entrega nova sobre estado final não re-aplica efeito
 * (guarda de transição única).
 */
export async function processarWebhookPagamento(
  db: Db,
  provider: PaymentProvider,
  rawPayload: unknown,
  extras: EfeitosExtrasWebhook = {}
): Promise<ResultadoWebhookPagamento> {
  const payload = validarShapePayload(rawPayload);

  // 1. Verificação de assinatura + normalização — DELEGADA ao provider
  //    (invariante ADR-006: verifica ANTES de qualquer escrita). Payload
  //    rejeitado nunca alcança o Firestore.
  let resultado: WebhookResult;
  try {
    resultado = await provider.handleWebhook(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('assinatura')) {
      throw new WebhookRejeitadoError(401, 'Assinatura de webhook inválida.');
    }
    throw new WebhookRejeitadoError(400, 'Webhook rejeitado pelo provider.');
  }

  // 2. Localização O(1) do pedido — `orderId` no payload (design ADR-011:
  //    "o webhook localiza o pedido por id sem conhecer o evento").
  const orderId = payload.data['orderId'];
  if (typeof orderId !== 'string' || orderId.length === 0) {
    throw new WebhookRejeitadoError(400, 'Webhook sem orderId no data.');
  }

  // Idempotência por ENTREGA — MESMA derivação de eventId do provider mock
  // (eventId explícito, senão determinístico por event+chargeId).
  const eventId =
    typeof payload.data['eventId'] === 'string' && payload.data['eventId'].length > 0
      ? payload.data['eventId']
      : `${payload.event}:${resultado.chargeId}`;

  const pedidoRef = db.collection('pedidos').doc(orderId);

  return db.runTransaction(async (tx) => {
    // ── FASE DE LEITURA (toda leitura antes de qualquer escrita) ──────────
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists) {
      throw new WebhookRejeitadoError(404, `Pedido do webhook não existe.`);
    }
    const pagamentoId = pedidoSnap.get('pagamentoRef') as string | null;
    if (!pagamentoId) {
      // Out-of-order: webhook chegou antes da cobrança existir — retriable
      throw new WebhookRejeitadoError(409, 'Pedido ainda sem cobrança criada.');
    }
    const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
    const pagamentoSnap = await tx.get(pagamentoRef);
    if (!pagamentoSnap.exists) {
      throw new WebhookRejeitadoError(409, 'Cobrança do pedido não encontrada.');
    }

    // 3. Integridade cruzada: chargeId e VALOR devem bater com o persistido
    const chargeIdPersistido = pagamentoSnap.get('gatewayChargeId') as string | null;
    if (chargeIdPersistido !== resultado.chargeId) {
      throw new WebhookRejeitadoError(
        409,
        'chargeId do webhook diverge da cobrança do pedido.'
      );
    }
    const amountPersistido = pagamentoSnap.get('gatewayAmountCentavos') as number;
    if (resultado.amount !== amountPersistido) {
      // Dinheiro divergente NUNCA passa — assinatura válida não basta
      throw new WebhookRejeitadoError(
        409,
        'Valor do webhook diverge do valor da cobrança.'
      );
    }

    const base: Omit<ResultadoWebhookPagamento, 'duplicado' | 'ignorado'> = {
      pedidoId: orderId,
      pagamentoId,
      chargeId: resultado.chargeId,
      statusGateway: resultado.status,
    };

    // a. Ledger por entrega — replay do MESMO eventId: zero escrita
    const ledgerRef = pagamentoRef.collection(WEBHOOK_EVENTOS_SUBCOL).doc(eventId);
    const ledgerSnap = await tx.get(ledgerRef);
    if (ledgerSnap.exists) {
      return { ...base, duplicado: true, ignorado: true, motivo: 'entrega_ja_processada' };
    }

    const statusPagamento = pagamentoSnap.get('status') as string;
    const agora = FieldValue.serverTimestamp();

    const gravarLedger = (efeito: string): void => {
      tx.create(ledgerRef, {
        event: payload.event,
        chargeId: resultado.chargeId,
        statusGateway: resultado.status,
        amountCentavos: resultado.amount,
        deliveredAt: payload.deliveredAt,
        efeito,
        processadoEm: agora,
      });
    };

    // b. Guarda de transição única: só 'pendente' muda de estado. Estado
    //    final não re-aplica efeito (receita nunca duplica) nem retrocede.
    if (statusPagamento !== 'pendente') {
      gravarLedger('ignorado_estado_final');
      return { ...base, duplicado: false, ignorado: true, motivo: 'estado_ja_final' };
    }

    // Estorno é máquina própria POR INSCRITO (RN-341/S904) — fora da
    // fundação E12. Registra a entrega e não aplica efeito.
    if (resultado.status === 'refunded') {
      gravarLedger('ignorado_estorno_fora_de_escopo');
      return { ...base, duplicado: false, ignorado: true, motivo: 'estorno_s904' };
    }

    if (resultado.status === 'failed') {
      gravarLedger('falhou');
      tx.update(pagamentoRef, { status: 'falhou', atualizadoEm: agora });
      tx.update(pedidoRef, { status: 'falhou', atualizadoEm: agora });
      // Inscritos permanecem 'pendente' (nova tentativa de pagamento é
      // fluxo futuro); receita intocada.
      return { ...base, duplicado: false, ignorado: false };
    }

    if (resultado.status !== 'confirmed') {
      // Gateway devolveu status fora do fluxo do checkout (ex.: 'pending')
      gravarLedger(`ignorado_status_${resultado.status}`);
      return { ...base, duplicado: false, ignorado: true, motivo: 'status_sem_efeito' };
    }

    // ── CONFIRMAÇÃO — leituras restantes ANTES das escritas ───────────────
    const eventoId = pagamentoSnap.get('eventoId') as string;
    const eventoRef = db.collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) {
      throw new WebhookRejeitadoError(409, 'Evento do pedido não existe.');
    }

    const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[]) ?? [];
    const inscritosSnaps = await Promise.all(
      inscritoRefs.map((id) => tx.get(eventoRef.collection('inscritos').doc(id)))
    );

    const cupom = pagamentoSnap.get('cupom') as { codigo?: string } | undefined;
    const cupomRef =
      cupom && typeof cupom.codigo === 'string' && cupom.codigo.length > 0
        ? eventoRef.collection('cupons').doc(cupom.codigo)
        : null;
    const cupomSnap = cupomRef ? await tx.get(cupomRef) : null;

    // Atribuição de AFILIADO (R9-E · RN-313/314) — leituras na FASE DE
    // LEITURA: o carimbo `pagamento.afiliado` foi estampado na criação do
    // pedido (createInscricaoCharge, afiliado ATIVO na época); aqui a
    // conversão REGISTRA na mesma tx da confirmação (exactly-once sob as
    // guardas a+b — ledger + transição única), com a janela AUTORITATIVA
    // re-checada no instante convertido (`dentroDaJanelaAtribuicao`, E05).
    // Afiliado sumiu/fora da janela ⇒ SÓ a atribuição cai (dinheiro segue).
    const afiliadoBloco = pagamentoSnap.get('afiliado') as
      | { afiliadoId?: string; clicadoEmMillis?: number }
      | undefined;
    const afiliadoId =
      afiliadoBloco !== undefined &&
      typeof afiliadoBloco.afiliadoId === 'string' &&
      afiliadoBloco.afiliadoId.length > 0
        ? afiliadoBloco.afiliadoId
        : null;
    let registrarConversaoAfiliado: {
      afiliadoRef: admin.firestore.DocumentReference;
      conversaoRef: admin.firestore.DocumentReference;
      conversoesAtual: number;
      valorAtribuidoAtual: number;
      /** Comissão FASE 2 (COMF2): config VIGENTE lida na mesma tx + ∑ atual. */
      comissaoConfig: ComissaoAfiliado | null;
      comissaoAcumuladaAtual: number;
      clicadoEmMillis: number;
      qtdInscricoes: number;
    } | null = null;
    if (afiliadoId !== null) {
      const afiliadoRef = eventoRef.collection(COLECAO_AFILIADOS).doc(afiliadoId);
      const conversaoRef = afiliadoRef
        .collection(SUBCOLECAO_CONVERSOES_AFILIADO)
        .doc(orderId);
      const [afiliadoSnap, conversaoSnap] = await Promise.all([
        tx.get(afiliadoRef),
        tx.get(conversaoRef),
      ]);
      const clicadoEmMillis =
        typeof afiliadoBloco?.clicadoEmMillis === 'number'
          ? afiliadoBloco.clicadoEmMillis
          : 0;
      const janelaDias =
        typeof afiliadoSnap.get('janelaAtribuicaoDias') === 'number'
          ? (afiliadoSnap.get('janelaAtribuicaoDias') as number)
          : 0;
      const convertidoEm = new Date();
      if (
        afiliadoSnap.exists &&
        !conversaoSnap.exists && // dedup defensivo (chave = pedidoId)
        clicadoEmMillis > 0 &&
        dentroDaJanelaAtribuicao(
          new Date(clicadoEmMillis),
          convertidoEm,
          janelaDias
        )
      ) {
        // Config de comissão VIGENTE no instante da confirmação (FASE 2):
        // shape validado — doc torto vira "sem comissão" (marketing/dinheiro
        // acessório NUNCA quebra a confirmação da venda).
        const comissaoRaw = afiliadoSnap.get('comissao');
        registrarConversaoAfiliado = {
          afiliadoRef,
          conversaoRef,
          conversoesAtual:
            typeof afiliadoSnap.get('conversoes') === 'number'
              ? (afiliadoSnap.get('conversoes') as number)
              : 0,
          valorAtribuidoAtual:
            typeof afiliadoSnap.get('valorAtribuido') === 'number'
              ? (afiliadoSnap.get('valorAtribuido') as number)
              : 0,
          comissaoConfig: isComissaoAfiliadoValida(comissaoRaw)
            ? comissaoRaw
            : null,
          comissaoAcumuladaAtual:
            typeof afiliadoSnap.get('comissaoAcumulada') === 'number'
              ? (afiliadoSnap.get('comissaoAcumulada') as number)
              : 0,
          clicadoEmMillis,
          qtdInscricoes: inscritoRefs.length,
        };
      } else if (afiliadoId !== null) {
        logger.info('webhook_afiliado_atribuicao_descartada', {
          pagamentoId,
          afiliadoId,
          motivo: !afiliadoSnap.exists
            ? 'afiliado_inexistente'
            : conversaoSnap.exists
              ? 'conversao_ja_registrada'
              : 'fora_da_janela',
        });
      }
    }

    // Bloco `pagamento.cartao` (LEELA-R6 · checklist §4): confirmação de
    // CARTÃO com dados do gateway → persiste bandeira/últimos4 + derivados
    // do VALOR CONGELADO do doc (nunca do payload): totalCobrado =
    // gatewayAmountCentavos/100; valorParcela na MESMA fórmula do resultado
    // do checkout (round(total/n)) — satisfaz o invariante de parse
    // `parcelas × valorParcela ≈ valorTotalComJuros`.
    const formaPagamento = pagamentoSnap.get('forma') as string;
    // Higiene dos campos de EXIBIÇÃO vindos do payload (fix review R6 #3):
    // ultimos4 precisa ser exatamente 4 dígitos (invariante do parse do
    // domínio) e bandeira vira texto curto sem controle — fora disso o
    // bloco é tratado como "sem dados" (nunca persistir lixo em doc de
    // dinheiro; dinheiro/valores NÃO dependem destes campos).
    const bandeiraLimpa = extras.cartao?.bandeira
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 40);
    const cartaoValido =
      extras.cartao !== undefined &&
      /^\d{4}$/.test(extras.cartao.ultimos4) &&
      bandeiraLimpa !== undefined &&
      bandeiraLimpa.length > 0;
    let blocoCartao: Record<string, unknown> | undefined;
    if (formaPagamento === 'cartao_credito' && extras.cartao !== undefined && cartaoValido) {
      const parcelasPedido = pedidoSnap.get('parcelas') as number | undefined;
      const parcelas =
        typeof parcelasPedido === 'number' && Number.isInteger(parcelasPedido) && parcelasPedido >= 1
          ? parcelasPedido
          : (extras.cartao.parcelas ?? 1);
      const totalCobrado = roundMoney(amountPersistido / 100);
      blocoCartao = {
        bandeira: bandeiraLimpa,
        ultimos4: extras.cartao.ultimos4,
        parcelas,
        // round(total/n) half-up: erro máx. de 0,005 POR parcela ⇒ sempre
        // dentro da tolerância do parse (parcelas × meio centavo) — provado
        // em teste com total não divisível (fix review R6 #2).
        valorParcela: Math.round((totalCobrado / parcelas) * 100) / 100,
        valorTotalComJuros: totalCobrado,
      };
    } else if (formaPagamento === 'cartao_credito' && extras.origem !== undefined) {
      // Gateway REAL confirmou cartão SEM dados de cartão utilizáveis — a
      // confirmação financeira NÃO é bloqueada (a verdade do dinheiro é o
      // gateway), mas a lacuna fica registrada (parse-coerência do slide-in
      // exige o bloco; fato a monitorar — R6). Fluxo mock nunca chega aqui
      // (sem `origem` — fix review R6 #4, comportamento vigente intocado).
      logger.warn('webhook_cartao_sem_dados', { pagamentoId, chargeId: resultado.chargeId });
    }

    // TAXAFLEX (RN-179/182): a CONCILIAÇÃO nasce na MESMA tx da confirmação,
    // COPIANDO a linha congelada no ato da compra (`taxaCongelada` — nunca
    // re-resolve a tabela: mudar tabela/termo entre a compra e a confirmação
    // não reprecifica). repasseOrganizador é MODE-AWARE (RN-182), com o modo
    // derivado do DOC congelado (`taxaRepassada` presente ⇒ 'repassada' na
    // venda), nunca re-lendo o evento: repassada ⇒ repasse = FACE (a taxa
    // foi paga por fora); incorporada ⇒ repasse = FACE − taxa. Doc SEM
    // carimbo (pré-TAXAFLEX) ⇒ sem conciliação (comportamento vigente).
    const tcRaw = pagamentoSnap.get('taxaCongelada') as
      | { valor?: unknown; percentual?: unknown; fixoCentavos?: unknown }
      | undefined;
    let blocoConciliacao: Record<string, unknown> | undefined;
    if (
      tcRaw !== undefined &&
      typeof tcRaw.valor === 'number' &&
      Number.isFinite(tcRaw.valor) &&
      tcRaw.valor >= 0 &&
      typeof tcRaw.percentual === 'number' &&
      Number.isFinite(tcRaw.percentual)
    ) {
      const valorFinalDoc = pagamentoSnap.get('valorFinal') as number;
      const taxaRepassadaDoc = pagamentoSnap.get('taxaRepassada') as
        | number
        | undefined;
      const ehRepassada =
        typeof taxaRepassadaDoc === 'number' && taxaRepassadaDoc > 0;
      const fixoCentavos =
        typeof tcRaw.fixoCentavos === 'number' &&
        Number.isInteger(tcRaw.fixoCentavos) &&
        tcRaw.fixoCentavos >= 0
          ? tcRaw.fixoCentavos
          : 0;
      blocoConciliacao = {
        idTransacao: resultado.chargeId,
        // Enum canônico D2 (gateway único) — o sandbox/mock representa o
        // MESMO rail; o doc de conciliação carrega o enum do domínio.
        gateway: 'asaas',
        taxaPct: tcRaw.percentual,
        taxaFixa: roundMoney(fixoCentavos / 100),
        taxaValor: tcRaw.valor,
        repasseOrganizador: ehRepassada
          ? valorFinalDoc
          : roundMoney(valorFinalDoc - tcRaw.valor),
      };
    }

    // ── ESCRITAS (efeito financeiro — exactly-once sob a+b+c) ─────────────
    gravarLedger('confirmado');

    tx.update(pagamentoRef, {
      status: 'confirmado',
      pagoEm: agora,
      atualizadoEm: agora,
      ...(blocoCartao !== undefined ? { cartao: blocoCartao } : {}),
      ...(blocoConciliacao !== undefined
        ? { conciliacao: blocoConciliacao }
        : {}),
    });
    tx.update(pedidoRef, { status: 'pago', atualizadoEm: agora });

    for (const snap of inscritosSnaps) {
      if (!snap.exists) {
        // Vínculo corrompido: pedido aponta inscrito inexistente — abortar
        // TUDO (fail-fast em dinheiro; a transação desfaz o que enfileirou).
        throw new WebhookRejeitadoError(409, 'Inscrito do pedido não existe.');
      }
      // Flip APENAS pendente→confirmado (cancelado antes do pagamento não
      // ressuscita — RN-204/RN-341)
      if (snap.get('status') === 'pendente') {
        tx.update(snap.ref, { status: 'confirmado', atualizadoEm: agora });
      }
    }

    // c. Receita: read-modify-write + roundMoney na MESMA transação —
    //    cent-exato, serializado, exactly-once (nunca increment de float)
    const valorFinal = pagamentoSnap.get('valorFinal') as number;
    const receitaAtual =
      typeof eventoSnap.get('receitaConfirmada') === 'number'
        ? (eventoSnap.get('receitaConfirmada') as number)
        : 0;
    tx.update(eventoRef, {
      receitaConfirmada: roundMoney(receitaAtual + valorFinal),
      atualizadoEm: agora,
    });

    // Cupom: `usos` é ∑ do checkout (E04) — consome 1 uso POR PEDIDO
    // confirmado, sob as mesmas guardas de idempotência.
    if (cupomRef && cupomSnap?.exists) {
      const usosAtual =
        typeof cupomSnap.get('usos') === 'number'
          ? (cupomSnap.get('usos') as number)
          : 0;
      tx.update(cupomRef, { usos: usosAtual + 1, atualizadoEm: agora });
    }

    // Conversão de AFILIADO (R9-E · RN-314 + COMF2 fase 2): 1 doc por PEDIDO
    // confirmado (chave = pedidoId — replay colide) + ∑ read-modify-write na
    // MESMA tx (mesma disciplina cent-exata da receitaConfirmada — nunca
    // increment de float). `conversoes` conta INSCRIÇÕES (base do gate
    // RN-315: minimoInscricoes compara inscrições, não pedidos). Shape SEM
    // PII de comprador.
    //
    // COMISSÃO (FASE 2 · item 23): a config VIGENTE do afiliado é CONGELADA
    // no doc da conversão (`comissaoConfig`) junto do valor computado
    // (`comissao`, cent-exato via computeComissaoConversao) — mudar a config
    // depois NÃO altera o que já acumulou (anti forja de percentual
    // pós-venda) e o ESTORNO decrementa pela config congelada (Finding 1b).
    // ∑ comissaoAcumulada acumula na MESMA tx — idempotente sob as mesmas
    // guardas (ledger + create da conversão colide no replay).
    if (registrarConversaoAfiliado !== null) {
      const r = registrarConversaoAfiliado;
      const valorConversao = pagamentoSnap.get('valorFinal') as number;
      const comissaoConversao = computeComissaoConversao(
        r.comissaoConfig,
        valorConversao,
        r.qtdInscricoes
      );
      tx.create(r.conversaoRef, {
        id: orderId,
        pedidoRef: orderId,
        valor: valorConversao,
        qtdInscricoes: r.qtdInscricoes,
        comissao: comissaoConversao,
        comissaoConfig: r.comissaoConfig,
        clicadoEm: admin.firestore.Timestamp.fromMillis(r.clicadoEmMillis),
        convertidoEm: agora,
        criadoEm: agora,
      });
      tx.update(r.afiliadoRef, {
        conversoes: r.conversoesAtual + r.qtdInscricoes,
        valorAtribuido: roundMoney(r.valorAtribuidoAtual + valorConversao),
        comissaoAcumulada: roundMoney(
          r.comissaoAcumuladaAtual + comissaoConversao
        ),
        atualizadoEm: agora,
      });
    }

    return { ...base, duplicado: false, ignorado: false };
  });
}

// ---------------------------------------------------------------------------
// Endpoint HTTP (v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * `pagamentoWebhook` — endpoint que o gateway (sandbox hoje, Asaas depois)
 * chama. A autenticação É a assinatura HMAC do payload (verificada pelo
 * provider antes de qualquer efeito); erros respondem mensagens públicas
 * genéricas — detalhes só no log estruturado (sem PII).
 */
export const pagamentoWebhook = https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método não suportado.' });
    return;
  }

  // Fix review antagonista R6 #1 (fail-closed): com chave Asaas presente,
  // ESTA porta fecha — o gateway real entrega SÓ pelo `asaasWebhook`
  // (header em tempo constante + orderId DERIVADO do externalReference).
  // Mantê-la aberta seria uma 2ª superfície token-in-body onde o remetente
  // controla orderId/eventId diretamente. Sem chave (mock), segue como era.
  if (hasAsaasKey(process.env)) {
    res.status(410).json({
      ok: false,
      error: 'Porta de webhook desativada — o gateway usa o endpoint próprio.',
    });
    return;
  }

  let provider: PaymentProvider;
  try {
    provider = selectPaymentProvider();
  } catch (err) {
    // Chave real configurada sem adapter (fail-safe do selector) —
    // indisponível de propósito, nunca degrada para sandbox.
    logger.error('webhook_provider_indisponivel', {
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(503).json({ ok: false, error: 'Provider indisponível.' });
    return;
  }

  try {
    const resultado = await processarWebhookPagamento(
      admin.firestore(),
      provider,
      req.body
    );
    // CK2-T3 (RN-155): conta sem fricção pós-confirmação (best-effort —
    // roda ANTES da resposta; Functions encerra após o res.json).
    await dispararContaSemFriccaoPosConfirmacao(admin.firestore(), resultado);
    logger.info('webhook_pagamento_processado', {
      pedidoId: resultado.pedidoId,
      chargeId: resultado.chargeId,
      statusGateway: resultado.statusGateway,
      duplicado: resultado.duplicado,
      ignorado: resultado.ignorado,
    });
    res.status(200).json({
      ok: true,
      duplicado: resultado.duplicado,
      ignorado: resultado.ignorado,
    });
  } catch (err) {
    if (err instanceof WebhookRejeitadoError) {
      logger.warn('webhook_pagamento_rejeitado', {
        httpStatus: err.httpStatus,
        motivo: err.message,
      });
      res.status(err.httpStatus).json({ ok: false, error: err.message });
      return;
    }
    logger.error('webhook_pagamento_falha', {
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ ok: false, error: 'Falha interna.' });
  }
});
