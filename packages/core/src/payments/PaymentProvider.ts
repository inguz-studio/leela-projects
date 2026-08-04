// =============================================================================
// packages/core/src/payments/PaymentProvider.ts
//
// Interface plugável de gateway de pagamento (ADR-006).
// Nenhum SDK de gateway concreto aqui — adapters em functions/src/payments/.
//
// Suporta obrigatoriamente: assinatura recorrente + split (RN-104, ADR-006).
// =============================================================================

// Timestamp definido localmente para evitar dependência circular com ../index.
// Estruturalmente idêntico a Timestamp em index.ts e a firebase/firestore.Timestamp.
interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

// ---------------------------------------------------------------------------
// Enums de status
// ---------------------------------------------------------------------------

/** Métodos de pagamento suportados */
export type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

/** Ciclo de vida de uma cobrança */
export type ChargeStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/** Status de um estorno */
export type RefundStatus = 'pending' | 'approved' | 'rejected';

/** Status de repasse ao produtor */
export type PayoutStatus = 'pending' | 'scheduled' | 'paid' | 'failed';

// ---------------------------------------------------------------------------
// Parâmetros e resultados
// ---------------------------------------------------------------------------

/** Dados do pagador/cliente */
export interface CustomerData {
  name: string;
  email: string;
  /** CPF ou CNPJ (exigido por alguns gateways) */
  taxId?: string;
  phone?: string;
}

/** Item individual dentro de uma cobrança */
export interface ChargeItem {
  id: string;
  description: string;
  /** Valor em centavos */
  amount: number;
  quantity: number;
}

/** Parâmetros para criação de cobrança */
export interface CreateChargeParams {
  /** ID do pedido no domínio Leela (ADR-011) */
  orderId: string;
  tenantId: string;
  /** Valor total em centavos */
  amount: number;
  paymentMethod: PaymentMethod;
  /** Parcelas — somente cartão de crédito */
  installments?: number;
  customer: CustomerData;
  items: ChargeItem[];
  /**
   * Chave de idempotência obrigatória.
   * Reprocessar o mesmo `idempotencyKey` deve retornar o mesmo resultado
   * sem criar cobrança duplicada (RN-333).
   */
  idempotencyKey: string;
  /**
   * Validade da cobrança PIX em segundos (CK2-T5 · RN-157) — SÓ
   * `paymentMethod: 'pix'`. O adapter propaga ao gateway no que ele
   * suportar e SEMPRE devolve `expiresAt` no ChargeResult (contrato — a
   * autoridade do timer é a plataforma via `pagamento.pixExpiraEm`;
   * enforcement fino no gateway varia por adapter e fica documentado nele).
   */
  pixExpiraEmSegundos?: number;
}

/** Resultado da criação de cobrança */
export interface ChargeResult {
  chargeId: string;
  status: ChargeStatus;
  /** URL de checkout (PIX/boleto) */
  paymentUrl?: string;
  /** Payload QR Code PIX */
  qrCode?: string;
  /** URL do boleto */
  boletoUrl?: string;
  /** Linha digitável do boleto */
  boletoBarCode?: string;
  expiresAt?: Timestamp;
}

/**
 * Beneficiário de um split de pagamento.
 *
 * União discriminada: `amount` (centavos fixos) OU `percentage` (%),
 * nunca os dois — o compilador rejeita a combinação (achado B4, review E00).
 */
export type SplitRecipient =
  | {
      /** ID do destinatário no gateway */
      recipientId: string;
      /** Valor em centavos alocado a este destinatário */
      amount: number;
      percentage?: never;
    }
  | {
      /** ID do destinatário no gateway */
      recipientId: string;
      /** Percentual do total (0–100) alocado a este destinatário */
      percentage: number;
      amount?: never;
    };

/** Recipient com valor resolvido em centavos (saída de split calculado) */
export interface ResolvedSplitRecipient {
  recipientId: string;
  /** Valor final em centavos */
  amount: number;
}

/** Parâmetros para configuração de split */
export interface SplitRulesParams {
  chargeId: string;
  tenantId: string;
  /** Taxa da plataforma em % (RN-330) */
  platformFeePct: number;
  recipients: SplitRecipient[];
}

/** Resultado do split configurado */
export interface SplitRulesResult {
  ruleId: string;
  chargeId: string;
  recipients: ResolvedSplitRecipient[];
  appliedAt: Timestamp;
}

/**
 * Parâmetros do CANCELAMENTO de uma cobrança ainda não paga
 * (LEELA-S1209-PIXBE-T3 · RN-157).
 *
 * Cancelar ≠ estornar: aqui NENHUM dinheiro trocou de mãos — o que se pede
 * ao gateway é que a cobrança deixe de ser PAGÁVEL. É a operação que faltava
 * para a expiração do PIX ser real: sem ela a plataforma marcava o pedido
 * como expirado enquanto o código seguia vivo no banco do comprador.
 */
export interface CancelChargeParams {
  chargeId: string;
  tenantId: string;
  /** Motivo (auditoria/descrição no gateway). */
  reason: string;
  /**
   * Chave de idempotência — reprocessar o mesmo cancelamento não pode
   * produzir efeito novo nem erro espúrio (RN-333).
   */
  idempotencyKey: string;
}

/** Resultado do cancelamento */
export interface CancelChargeResult {
  chargeId: string;
  /** Estado da cobrança APÓS a operação (esperado: 'cancelled'). */
  status: ChargeStatus;
  /**
   * true = a cobrança JÁ estava cancelada antes desta chamada (no-op
   * idempotente). false = ESTA chamada a cancelou.
   */
  jaCancelada: boolean;
  processedAt: Timestamp;
}

/** Parâmetros para solicitação de estorno */
export interface RefundParams {
  chargeId: string;
  tenantId: string;
  /** Valor em centavos; estorno total se omitido */
  amount?: number;
  reason: string;
  /**
   * Chave de idempotência — reprocessar o mesmo webhook de estorno
   * não duplica o estorno (RN-333).
   */
  idempotencyKey: string;
}

/** Resultado do estorno */
export interface RefundResult {
  refundId: string;
  chargeId: string;
  status: RefundStatus;
  /** Valor efetivamente estornado em centavos */
  amount: number;
  processedAt: Timestamp;
}

/**
 * Bloco de ESTORNO extraído de uma entrega de webhook (RN-372 · decisão 46
 * do dono: "estorno só é feito utilizando via API do ASAAS, a solicitação é
 * feita e pode cair; dependemos desse retorno do webhook deles").
 *
 * Presente SÓ quando o gateway informa qual estorno a entrega confirma —
 * `PAYMENT_REFUNDED` com `payment.refunds[]` no Asaas, `refundId`/`refundAmount`
 * no mock. Ausente = a entrega não identifica o estorno, e o domínio decide
 * pelo carimbo vivo do ledger (nunca por adivinhação de valor).
 */
export interface WebhookRefundInfo {
  /** Id do estorno no gateway — casa com o `refundId` carimbado no ledger. */
  refundId: string;
  /** Valor ESTORNADO em centavos (não confundir com o valor da cobrança). */
  amountCentavos: number;
  status: RefundStatus;
}

/**
 * Payload bruto recebido do gateway via webhook.
 * Assinatura DEVE ser verificada antes de processar (invariante de segurança).
 */
export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  /** Assinatura HMAC ou equivalente do gateway */
  signature: string;
  deliveredAt: string;
}

/** Resultado normalizado do processamento do webhook */
export interface WebhookResult {
  chargeId: string;
  status: ChargeStatus;
  /** Valor confirmado em centavos */
  amount: number;
  processedAt: Timestamp;
  /**
   * Estorno que ESTA entrega confirma (RN-372). Opcional: ausente em toda
   * entrega que não é de estorno e em gateway que não informa o refund —
   * campo novo não muda byte nenhum do fluxo de confirmação de pagamento.
   */
  refund?: WebhookRefundInfo;
}

/** Parâmetros para consulta de repasses */
export interface GetPayoutParams {
  tenantId: string;
  /** Sem filtro = consulta saldo disponível */
  period?: {
    start: Timestamp;
    end: Timestamp;
  };
}

/** Resultado da consulta de repasse */
export interface PayoutResult {
  payoutId: string;
  tenantId: string;
  /** Valor em centavos */
  amount: number;
  status: PayoutStatus;
  scheduledAt: Timestamp;
  /** Preenchido quando status = 'paid' */
  paidAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Interface contrato
// ---------------------------------------------------------------------------

/**
 * PaymentProvider — contrato plugável de gateway de pagamento (ADR-006).
 *
 * Implementações concretas (Stripe, PagarMe, Asaas…) ficam em
 * `functions/src/payments/{provider}Adapter.ts` e são injetadas por DI.
 * Clientes nunca instanciam o gateway diretamente.
 *
 * Invariantes:
 *   - `createCharge` é idempotente via `idempotencyKey`.
 *   - `handleWebhook` verifica assinatura antes de qualquer escrita.
 *   - `handleWebhook` é idempotente — reprocessar não duplica estado.
 *   - `cancelCharge` é idempotente e FALHA ALTO: adapter que não consegue
 *     cancelar LANÇA (nunca devolve sucesso otimista) — quem chama decide
 *     fail-safe em cima do erro, e um "ok" mentiroso deixaria cobrança viva
 *     com pedido morto (RN-157 · S1209-PIXBE-T3).
 *   - Suporte a assinatura + split obrigatório (RN-104).
 */
export interface PaymentProvider {
  /**
   * Este provider SIMULA dinheiro? (PIXREAL-FIX T3 · incidente de 04/08)
   *
   * Quem sabe se a cobrança é real é quem a criou — não a tela, e não uma
   * `NEXT_PUBLIC_*` do build da landing. O incidente foi exatamente uma fonte
   * dupla: o backend construiu o `AsaasProvider` de PRODUÇÃO e emitiu um PIX
   * pagável enquanto a tela, sem sinal nenhum de ambiente, exibia por cima
   * dele "Ambiente de simulação: nenhum PIX real é cobrado" e um botão de
   * confirmar. O marcador viaja daqui até o resultado da cobrança
   * (`gatewayReal`), e a tela obedece ao servidor.
   *
   * POLARIDADE (fail-safe, Schneier — o modo de falha decide o design):
   * opcional e afirmativo só no SIMULADOR. Ausente significa REAL, então
   * qualquer implementação nova, dublê de teste ou adapter futuro que
   * esqueça o campo faz a tela tratar o dinheiro como verdadeiro — some a
   * interface de simulação e ninguém é convidado a "simular" uma cobrança
   * que o banco aceita. O erro por omissão é o erro seguro.
   */
  readonly simulado?: boolean;
  createCharge(params: CreateChargeParams): Promise<ChargeResult>;
  /**
   * Cancela cobrança AINDA NÃO PAGA no gateway (RN-157). Cobrança já paga
   * não é cancelável — o adapter LANÇA, e é isso que impede o timer de
   * matar um pedido cujo dinheiro entrou.
   */
  cancelCharge(params: CancelChargeParams): Promise<CancelChargeResult>;
  splitRules(params: SplitRulesParams): Promise<SplitRulesResult>;
  refund(params: RefundParams): Promise<RefundResult>;
  handleWebhook(payload: WebhookPayload): Promise<WebhookResult>;
  getPayout(params: GetPayoutParams): Promise<PayoutResult>;
}
