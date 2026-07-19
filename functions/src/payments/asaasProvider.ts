// =============================================================================
// functions/src/payments/asaasProvider.ts
//
// AsaasProvider — adapter REAL do gateway Asaas atrás da interface
// PaymentProvider (ADR-006). Fonte de mapeamento:
// leela-specs/discovery/asaas-api-reference.md (coleta 2026-07-11).
//
// ⛔ NÃO ATIVADO. O checkout continua no MockPaymentProvider via
// selectProvider.ts (fail-safe ADR-006 intacto). A ativação do Asaas é um
// passo DELIBERADO e separado (ver ASAAS-ADAPTER-REPORT.md). Este arquivo
// não lê process.env sozinho e não é importado pelo fluxo do checkout.
//
// TODO(ADR-013): quando a orquestração por registry for aprovada, registrar
//   `ASAAS_PROVIDER_ID → createAsaasProvider(asaasConfigFromEnv(env))` no
//   resolveProvider — a resolução default PERMANECE Mock até lá.
//
// SEGURANÇA (Schneier — o modo de falha decide o design):
//   - Webhook: o Asaas NÃO assina com HMAC; envia o header
//     `asaas-access-token` com o authToken cadastrado no webhook. A camada
//     HTTP coloca esse valor em `WebhookPayload.signature` e este adapter
//     compara em TEMPO CONSTANTE (sha256 + timingSafeEqual) com o token
//     esperado ANTES de qualquer parse/efeito. Não-autêntico → rejeita.
//   - Ambiente é derivado do PREFIXO da chave ($aact_hmlg_ = sandbox);
//     conflito entre prefixo e config explícita = erro de construção.
//   - Chave de PRODUÇÃO exige `permitirProducao: true` explícito —
//     construir o adapter apontado para produção nunca acontece por acaso.
//   - Mensagens de erro NUNCA carregam a apiKey nem headers.
//
// IDEMPOTÊNCIA (Kleppmann):
//   - createCharge: o Asaas não tem idempotency-key HTTP. O adapter grava a
//     chave no `externalReference` (`orderId::idempotencyKey`) e faz lookup
//     `GET /payments?externalReference=` ANTES de criar — replay devolve a
//     cobrança existente sem POST. (Janela de corrida entre lookup e create
//     existe; o dedup durável por pedido vive no domínio — ADR-011.)
//   - refund/webhook: dedup em memória por instância (espelha o mock); o
//     ledger durável por entrega é do domínio (webhookEventos, ADR-011).
//
// DINHEIRO: a interface trabalha em CENTAVOS (int); o Asaas em REAIS
// (decimal). Conversão só na borda: /100 ao enviar, ×100 + round ao ler.
// =============================================================================

import { createHash, timingSafeEqual } from 'crypto';
import type {
  PaymentProvider,
  CreateChargeParams,
  ChargeResult,
  ChargeStatus,
  SplitRulesParams,
  SplitRulesResult,
  RefundParams,
  RefundResult,
  WebhookPayload,
  WebhookResult,
  GetPayoutParams,
  PayoutResult,
} from '@leela/core';
import { ASAAS_API_KEY_ENV } from './selectProvider';

// ---------------------------------------------------------------------------
// Ambiente e constantes
// ---------------------------------------------------------------------------

export type AsaasEnvironment = 'sandbox' | 'production';

export const ASAAS_SANDBOX_BASE_URL = 'https://api-sandbox.asaas.com/v3';
export const ASAAS_PRODUCTION_BASE_URL = 'https://api.asaas.com/v3';

/** Prefixo documentado da chave sandbox (docs/autenticação-1). */
export const ASAAS_SANDBOX_KEY_PREFIX = '$aact_hmlg_';
/** Toda chave Asaas começa com `$aact_`; produção é `$aact_` não-hmlg. */
const ASAAS_KEY_PREFIX = '$aact_';

/** Id de roteamento do adapter no futuro registry (ADR-013 — proposta). */
export const ASAAS_PROVIDER_ID = 'asaas';

/** Env var do authToken do webhook (par da ASAAS_API_KEY na ativação). */
export const ASAAS_WEBHOOK_TOKEN_ENV = 'ASAAS_WEBHOOK_AUTH_TOKEN';

// ---------------------------------------------------------------------------
// Erros de domínio (nunca vazam chave/headers)
// ---------------------------------------------------------------------------

/** Base de todos os erros do adapter Asaas. */
export class AsaasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Configuração inválida (construção do adapter). */
export class AsaasConfigError extends AsaasError {}

/** Parâmetros de chamada inválidos — detectado ANTES de qualquer HTTP. */
export class AsaasValidationError extends AsaasError {}

/** Resposta 4xx/5xx do Asaas, traduzida sem vazar internals. */
export class AsaasApiError extends AsaasError {
  readonly httpStatus: number;
  /** Códigos de erro do corpo Asaas (`errors[].code`), quando presentes. */
  readonly codes: readonly string[];
  /** Segundos até o reset do rate limit (header RateLimit-Reset em 429). */
  readonly rateLimitResetSeconds?: number;

  constructor(
    httpStatus: number,
    codes: readonly string[],
    descriptions: readonly string[],
    rateLimitResetSeconds?: number
  ) {
    const detalhe =
      descriptions.length > 0
        ? descriptions.join('; ').slice(0, 300)
        : 'sem detalhe no corpo';
    super(`[asaas] HTTP ${httpStatus} (${codes.join(',') || 'sem código'}): ${detalhe}`);
    this.httpStatus = httpStatus;
    this.codes = codes;
    if (rateLimitResetSeconds !== undefined) {
      this.rateLimitResetSeconds = rateLimitResetSeconds;
    }
  }
}

/** Resposta 2xx com shape/status/evento fora do contrato mapeado. */
export class AsaasMappingError extends AsaasError {}

/**
 * Operação da interface sem endpoint mapeado/decidido no Asaas — falha
 * ALTA e explícita (nunca simular sucesso em código de dinheiro).
 */
export class AsaasOperacaoNaoSuportadaError extends AsaasError {}

/**
 * Webhook não-autêntico. A mensagem contém "assinatura" de propósito:
 * webhookPagamento.ts mapeia `msg.includes('assinatura')` → HTTP 401.
 */
export class AsaasWebhookAssinaturaError extends AsaasError {
  constructor() {
    super('[asaas] Webhook com assinatura/token inválido — rejeitado');
  }
}

// ---------------------------------------------------------------------------
// Transporte injetável (os testes NUNCA tocam a rede)
// ---------------------------------------------------------------------------

/** Subset estrutural de Response suficiente para o adapter. */
export interface FetchLikeResponse {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** Subset estrutural de fetch — o global satisfaz; os testes injetam fake. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  }
) => Promise<FetchLikeResponse>;

function defaultFetch(): FetchLike {
  const f = (globalThis as { fetch?: FetchLike }).fetch;
  if (typeof f !== 'function') {
    throw new AsaasConfigError(
      '[asaas] fetch global indisponível — injete config.fetchFn'
    );
  }
  return f;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export interface AsaasProviderConfig {
  /** Chave da conta Asaas (`$aact_hmlg_...` sandbox, `$aact_...` produção). */
  apiKey: string;
  /**
   * authToken cadastrado no webhook Asaas (32–255 chars, sem espaços, ≠
   * apiKey). Chega em cada entrega no header `asaas-access-token` e é
   * comparado em tempo constante (docs/sobre-os-webhooks).
   */
  webhookAuthToken: string;
  /**
   * Ambiente explícito. Opcional — derivado do prefixo da chave. Se
   * informado E conflitar com o prefixo, a construção FALHA (Schneier:
   * chave de um ambiente com URL de outro é 401 garantido; melhor morrer
   * na construção do que em runtime de dinheiro).
   */
  environment?: AsaasEnvironment;
  /**
   * Trava fail-closed: ambiente 'production' exige `permitirProducao:
   * true` explícito. Hoje a ÚNICA chave existente é de produção — este
   * flag impede que um script/teste construa um adapter apontado para
   * produção por acidente.
   */
  permitirProducao?: boolean;
  /** User-Agent obrigatório pelo Asaas (docs/autenticação-1). */
  userAgent?: string;
  /** Dias até o vencimento (`dueDate`) da cobrança. Default 1. */
  dueDateDays?: number;
  /** Relógio injetável (dueDate/timestamps determinísticos nos testes). */
  now?: () => Date;
  /** Transporte injetável — os testes passam um fake; NUNCA rede real. */
  fetchFn?: FetchLike;
}

/**
 * Deriva o ambiente do prefixo da chave (docs/autenticação-1):
 * `$aact_hmlg_` → sandbox; demais `$aact_...` → production.
 * Conflito com `explicito` ou prefixo desconhecido → AsaasConfigError.
 * @pure
 */
export function deriveAsaasEnvironment(
  apiKey: string,
  explicito?: AsaasEnvironment
): AsaasEnvironment {
  const derivado: AsaasEnvironment | undefined = apiKey.startsWith(
    ASAAS_SANDBOX_KEY_PREFIX
  )
    ? 'sandbox'
    : apiKey.startsWith(ASAAS_KEY_PREFIX)
      ? 'production'
      : undefined;

  if (derivado === undefined) {
    if (explicito !== undefined) return explicito;
    throw new AsaasConfigError(
      '[asaas] Chave sem prefixo $aact_ reconhecível e sem environment ' +
        'explícito — impossível derivar o ambiente com segurança'
    );
  }
  if (explicito !== undefined && explicito !== derivado) {
    throw new AsaasConfigError(
      `[asaas] Conflito de ambiente: prefixo da chave indica '${derivado}' ` +
        `mas a config pede '${explicito}' — recuse a ambiguidade`
    );
  }
  return derivado;
}

/**
 * Monta a config a partir de um env (SÓ para a ativação deliberada — nada
 * neste módulo chama isto com process.env). Exige ASAAS_API_KEY e
 * ASAAS_WEBHOOK_AUTH_TOKEN presentes. @pure
 */
export function asaasConfigFromEnv(
  env: Record<string, string | undefined>
): AsaasProviderConfig {
  const apiKey = env[ASAAS_API_KEY_ENV]?.trim();
  const webhookAuthToken = env[ASAAS_WEBHOOK_TOKEN_ENV]?.trim();
  if (!apiKey) {
    throw new AsaasConfigError(
      `[asaas] ${ASAAS_API_KEY_ENV} ausente — a ativação exige a chave`
    );
  }
  if (!webhookAuthToken) {
    throw new AsaasConfigError(
      `[asaas] ${ASAAS_WEBHOOK_TOKEN_ENV} ausente — webhook sem token de ` +
        'autenticação é inaceitável (Schneier: rejeitar não-autêntico)'
    );
  }
  return { apiKey, webhookAuthToken };
}

// ---------------------------------------------------------------------------
// Dinheiro: centavos (interface) ↔ reais (Asaas) — só na borda
// ---------------------------------------------------------------------------

/** Centavos (int ≥ 0) → reais (decimal JS, serializa exato p/ 2 casas). @pure */
export function reaisFromCentavos(centavos: number): number {
  if (!Number.isInteger(centavos) || centavos < 0) {
    throw new AsaasValidationError(
      `[asaas] Valor em centavos inválido: ${centavos}`
    );
  }
  return centavos / 100;
}

/** Reais (decimal do Asaas) → centavos (int), com arredondamento. @pure */
export function centavosFromReais(reais: number): number {
  if (typeof reais !== 'number' || !Number.isFinite(reais)) {
    throw new AsaasMappingError(`[asaas] Valor em reais inválido: ${reais}`);
  }
  return Math.round(reais * 100);
}

// ---------------------------------------------------------------------------
// externalReference: idempotência + reconciliação num campo só
// ---------------------------------------------------------------------------

const EXTERNAL_REF_SEP = '::';

/**
 * `externalReference = orderId::idempotencyKey`. O sufixo dá idempotência
 * por chave (lookup exato antes do POST); o prefixo carrega o orderId
 * (ADR-011) para reconciliação/webhook. @pure
 */
export function buildExternalReference(
  orderId: string,
  idempotencyKey: string
): string {
  if (orderId.includes(EXTERNAL_REF_SEP)) {
    throw new AsaasValidationError(
      `[asaas] orderId não pode conter '${EXTERNAL_REF_SEP}': ${orderId}`
    );
  }
  return `${orderId}${EXTERNAL_REF_SEP}${idempotencyKey}`;
}

/** Inverso de buildExternalReference (separa no PRIMEIRO `::`). @pure */
export function parseExternalReference(
  ref: string
): { orderId: string; idempotencyKey: string } | undefined {
  const idx = ref.indexOf(EXTERNAL_REF_SEP);
  if (idx <= 0) return undefined;
  return {
    orderId: ref.slice(0, idx),
    idempotencyKey: ref.slice(idx + EXTERNAL_REF_SEP.length),
  };
}

// ---------------------------------------------------------------------------
// Mapas de status/evento (asaas-api-reference.md — nada além do coletado)
// ---------------------------------------------------------------------------

/** status do objeto payment → nosso ChargeStatus. */
const PAYMENT_STATUS_TO_CHARGE: Record<string, ChargeStatus> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed', // pago, saldo não liberado
  RECEIVED: 'confirmed', // liquidado — o enum colapsa os dois
  OVERDUE: 'failed',
  REFUNDED: 'refunded',
  DELETED: 'cancelled',
  RESTORED: 'pending',
  CREDIT_CARD_CAPTURE_REFUSED: 'failed',
  REPROVED_BY_RISK_ANALYSIS: 'failed',
  // Inferido do par *_REPROVED_BY_RISK_ANALYSIS (não verificado na coleta;
  // mapeia para o status sem-efeito do checkout):
  AWAITING_RISK_ANALYSIS: 'pending',
};

/**
 * Eventos de webhook com efeito mapeado. Qualquer OUTRO evento `PAYMENT_*`
 * autêntico vira 'pending' (= sem efeito no checkout, ACK 200) — errar um
 * evento benigno com 4xx alimentaria as 15 falhas que pausam a fila do
 * Asaas (docs/sobre-os-webhooks). Evento não-PAYMENT_* é erro (endpoint
 * de cobranças não é o lugar dele).
 */
const WEBHOOK_EVENT_TO_CHARGE: Record<string, ChargeStatus> = {
  PAYMENT_CONFIRMED: 'confirmed',
  PAYMENT_RECEIVED: 'confirmed',
  PAYMENT_OVERDUE: 'failed',
  PAYMENT_REFUNDED: 'refunded',
  PAYMENT_DELETED: 'cancelled',
  PAYMENT_RESTORED: 'pending',
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'failed',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'failed',
};

/** status de item do array refunds → nosso RefundStatus. */
const REFUND_STATUS_MAP: Record<string, RefundResult['status']> = {
  PENDING: 'pending',
  DONE: 'approved',
  CANCELLED: 'rejected',
};

// ---------------------------------------------------------------------------
// Timestamp estrutural (idêntico ao padrão do mockProvider — sem Firebase)
// ---------------------------------------------------------------------------

interface StructuralTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

function timestampDe(date: Date): StructuralTimestamp {
  const millis = date.getTime();
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
    toDate: () => new Date(millis),
    toMillis: () => millis,
  };
}

// ---------------------------------------------------------------------------
// Leitura defensiva de JSON externo (dinheiro: nunca cast cego)
// ---------------------------------------------------------------------------

function asRecord(v: unknown, contexto: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new AsaasMappingError(`[asaas] ${contexto}: objeto esperado`);
  }
  return v as Record<string, unknown>;
}

function reqString(
  obj: Record<string, unknown>,
  campo: string,
  contexto: string
): string {
  const v = obj[campo];
  if (typeof v !== 'string' || v.length === 0) {
    throw new AsaasMappingError(
      `[asaas] ${contexto}: campo '${campo}' ausente ou inválido`
    );
  }
  return v;
}

function optString(
  obj: Record<string, unknown>,
  campo: string
): string | undefined {
  const v = obj[campo];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function reqNumber(
  obj: Record<string, unknown>,
  campo: string,
  contexto: string
): number {
  const v = obj[campo];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new AsaasMappingError(
      `[asaas] ${contexto}: campo '${campo}' ausente ou não-numérico`
    );
  }
  return v;
}

// ---------------------------------------------------------------------------
// Detalhes do webhook (o que a camada de ativação persiste — bloco cartao)
// ---------------------------------------------------------------------------

/**
 * Bloco de cartão extraído do webhook de confirmação (payment.creditCard).
 * `valorParcela`/`valorTotalComJuros` do CartaoPagamento do domínio vêm do
 * CHECKOUT (Price), não do gateway — a camada de ativação completa o bloco.
 * O creditCardToken NUNCA é exposto aqui (minimização — só persistir o
 * necessário para o slide-in: bandeira + últimos 4).
 */
export interface AsaasWebhookCartao {
  bandeira: string;
  ultimos4: string;
  /** Presente quando o payment informa installmentCount. */
  parcelas?: number;
}

/** Resultado detalhado do parse (superset do WebhookResult da interface). */
export interface AsaasWebhookDetails {
  /** Id da ENTREGA (`evt_...`); derivado de event+chargeId se ausente. */
  eventId: string;
  event: string;
  chargeId: string;
  status: ChargeStatus;
  /** Valor da cobrança em CENTAVOS (payment.value ×100 — nunca netValue). */
  amount: number;
  /** externalReference gravado na criação (`orderId::idempotencyKey`). */
  externalReference?: string;
  /** orderId recuperado do externalReference (quando parseável). */
  orderId?: string;
  /** Presente na confirmação de cartão (PIX não exige — brief). */
  cartao?: AsaasWebhookCartao;
}

// ---------------------------------------------------------------------------
// AsaasProvider
// ---------------------------------------------------------------------------

export class AsaasProvider implements PaymentProvider {
  private readonly apiKey: string;
  private readonly webhookAuthToken: string;
  readonly environment: AsaasEnvironment;
  readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly dueDateDays: number;
  private readonly now: () => Date;
  private readonly fetchFn: FetchLike;

  /** Dedup em memória (best-effort por instância; durável = domínio). */
  private readonly refundsPorChave = new Map<string, RefundResult>();
  private readonly webhooksPorEntrega = new Map<string, WebhookResult>();

  constructor(config: AsaasProviderConfig) {
    const apiKey = config.apiKey.trim();
    if (apiKey.length === 0) {
      throw new AsaasConfigError('[asaas] apiKey vazia');
    }
    const token = config.webhookAuthToken.trim();
    // Regras do próprio Asaas para o authToken do webhook (32–255, sem
    // espaços, distinto da API key) — reforçadas aqui: token fraco é
    // autenticação fraca do ÚNICO mecanismo de autenticidade do webhook.
    if (token.length < 32 || token.length > 255 || /\s/.test(token)) {
      throw new AsaasConfigError(
        '[asaas] webhookAuthToken deve ter 32–255 chars sem espaços ' +
          '(regra do cadastro de webhook Asaas)'
      );
    }
    if (token === apiKey) {
      throw new AsaasConfigError(
        '[asaas] webhookAuthToken não pode ser a própria apiKey'
      );
    }

    this.environment = deriveAsaasEnvironment(apiKey, config.environment);
    if (this.environment === 'production' && config.permitirProducao !== true) {
      throw new AsaasConfigError(
        '[asaas] Chave de PRODUÇÃO sem permitirProducao=true — a ativação ' +
          'contra produção é um passo deliberado, nunca um default'
      );
    }

    this.apiKey = apiKey;
    this.webhookAuthToken = token;
    this.baseUrl =
      this.environment === 'sandbox'
        ? ASAAS_SANDBOX_BASE_URL
        : ASAAS_PRODUCTION_BASE_URL;
    this.userAgent = config.userAgent ?? 'leela-app';
    this.dueDateDays = config.dueDateDays ?? 1;
    this.now = config.now ?? (() => new Date());
    this.fetchFn = config.fetchFn ?? defaultFetch();
  }

  // ── Transporte ────────────────────────────────────────────────────────────

  private async request(
    method: 'GET' | 'POST',
    path: string,
    opts: { query?: Record<string, string>; body?: unknown } = {}
  ): Promise<unknown> {
    let url = `${this.baseUrl}${path}`;
    if (opts.query) {
      const qs = Object.entries(opts.query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs.length > 0) url += `?${qs}`;
    }

    const init: Parameters<FetchLike>[1] = {
      method,
      headers: {
        access_token: this.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    };

    const res = await this.fetchFn(url, init);
    const texto = await res.text();
    let json: unknown;
    if (texto.length > 0) {
      try {
        json = JSON.parse(texto);
      } catch {
        json = undefined; // corpo não-JSON: erro tratado pelo status abaixo
      }
    }

    if (res.status >= 400) {
      throw this.erroDaResposta(res, json);
    }
    return json;
  }

  /** Traduz 4xx/5xx em AsaasApiError SEM vazar chave/headers/corpo cru. */
  private erroDaResposta(res: FetchLikeResponse, json: unknown): AsaasApiError {
    const codes: string[] = [];
    const descriptions: string[] = [];
    if (json !== null && typeof json === 'object' && !Array.isArray(json)) {
      const errors = (json as Record<string, unknown>)['errors'];
      if (Array.isArray(errors)) {
        for (const e of errors) {
          if (e !== null && typeof e === 'object') {
            const rec = e as Record<string, unknown>;
            if (typeof rec['code'] === 'string') codes.push(rec['code']);
            if (typeof rec['description'] === 'string') {
              descriptions.push(rec['description']);
            }
          }
        }
      }
    }
    let resetSeconds: number | undefined;
    if (res.status === 429) {
      const reset = res.headers.get('RateLimit-Reset');
      const parsed = reset !== null ? Number(reset) : NaN;
      if (Number.isFinite(parsed)) resetSeconds = parsed;
    }
    return new AsaasApiError(res.status, codes, descriptions, resetSeconds);
  }

  // ── createCharge ──────────────────────────────────────────────────────────

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    this.validarCreateCharge(params);
    const externalReference = buildExternalReference(
      params.orderId,
      params.idempotencyKey
    );

    // 1. Idempotência (Kleppmann): lookup pela chave ANTES de criar —
    //    replay devolve a cobrança existente, zero POST.
    const existente = await this.buscarPorExternalReference(externalReference);
    if (existente !== undefined) {
      return this.montarChargeResult(existente);
    }

    // 2. Resolver cliente (o Asaas exige `customer` = cus_..., não inline).
    const customerId = await this.resolverCliente(params);

    // 3. Criar a cobrança. Regra de parcelamento do Asaas: 1x usa SÓ
    //    `value`; 2x+ usa `installmentCount` + `totalValue`, NUNCA `value`.
    const parcelas = params.installments ?? 1;
    const body: Record<string, unknown> = {
      customer: customerId,
      billingType: BILLING_TYPE[params.paymentMethod],
      dueDate: this.dueDate(),
      description: params.items.map((i) => i.description).join(' · '),
      externalReference,
      ...(parcelas > 1
        ? {
            installmentCount: parcelas,
            totalValue: reaisFromCentavos(params.amount),
          }
        : { value: reaisFromCentavos(params.amount) }),
    };

    const criado = asRecord(
      await this.request('POST', '/payments', { body }),
      'resposta de POST /payments'
    );
    const resultado = await this.montarChargeResult(criado);
    // RN-157 (CK2-T5) — contrato do provider: PIX com validade SEMPRE devolve
    // `expiresAt`. Preferência: `expirationDate` do pixQrCode do gateway
    // (montarChargeResult); fallback: relógio injetado + pixExpiraEmSegundos.
    // ⚠️ PREMISSA (documentada no report CK2): POST /payments do Asaas não
    // aceita expiração por minuto (dueDate é DIA); o enforcement fino dos 30
    // minutos é da PLATAFORMA (`pagamento.pixExpiraEm` + expirarPixPendente).
    // Pagamento que o gateway aceitar após o cancelamento cai em
    // 'ignorado_estado_final' no webhook — reconciliação manual (raro).
    if (
      params.pixExpiraEmSegundos !== undefined &&
      resultado.expiresAt === undefined
    ) {
      return {
        ...resultado,
        expiresAt: timestampDe(
          new Date(this.now().getTime() + params.pixExpiraEmSegundos * 1000)
        ),
      };
    }
    return resultado;
  }

  private validarCreateCharge(params: CreateChargeParams): void {
    if (params.orderId.trim().length === 0) {
      throw new AsaasValidationError('[asaas] orderId vazio');
    }
    if (params.idempotencyKey.trim().length === 0) {
      throw new AsaasValidationError('[asaas] idempotencyKey vazia (RN-333)');
    }
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new AsaasValidationError(
        `[asaas] amount deve ser centavos inteiros > 0: ${params.amount}`
      );
    }
    if (BILLING_TYPE[params.paymentMethod] === undefined) {
      throw new AsaasValidationError(
        `[asaas] paymentMethod não suportado: ${params.paymentMethod}`
      );
    }
    const parcelas = params.installments;
    if (parcelas !== undefined) {
      if (!Number.isInteger(parcelas) || parcelas < 1) {
        throw new AsaasValidationError(
          `[asaas] installments inválido: ${parcelas}`
        );
      }
      if (parcelas > 1 && params.paymentMethod !== 'credit_card') {
        throw new AsaasValidationError(
          '[asaas] Parcelamento só existe no cartão de crédito (ADR-006)'
        );
      }
    }
    // RN-157 (CK2-T5): validade de PIX — inteiro > 0, exclusiva do PIX.
    const pixExp = params.pixExpiraEmSegundos;
    if (pixExp !== undefined) {
      if (!Number.isInteger(pixExp) || pixExp <= 0) {
        throw new AsaasValidationError(
          `[asaas] pixExpiraEmSegundos inválido: ${pixExp}`
        );
      }
      if (params.paymentMethod !== 'pix') {
        throw new AsaasValidationError(
          '[asaas] pixExpiraEmSegundos só existe no PIX (RN-157)'
        );
      }
    }
  }

  /** dueDate = hoje (relógio injetado, UTC) + dueDateDays, `YYYY-MM-DD`. */
  private dueDate(): string {
    const d = new Date(
      this.now().getTime() + this.dueDateDays * 24 * 60 * 60 * 1000
    );
    return d.toISOString().slice(0, 10);
  }

  /** `GET /payments?externalReference=` — payment existente ou undefined. */
  private async buscarPorExternalReference(
    ref: string
  ): Promise<Record<string, unknown> | undefined> {
    const lista = asRecord(
      await this.request('GET', '/payments', {
        query: { externalReference: ref, limit: '2' },
      }),
      'resposta de GET /payments'
    );
    const data = lista['data'];
    if (!Array.isArray(data) || data.length === 0) return undefined;
    if (data.length > 1) {
      // Duas cobranças com a MESMA chave = duplicidade já consumada.
      // Escolher uma em silêncio esconderia um bug de dinheiro.
      throw new AsaasMappingError(
        `[asaas] externalReference ambíguo (${data.length} cobranças) — ` +
          'reconciliação manual necessária'
      );
    }
    return asRecord(data[0], 'payment do lookup por externalReference');
  }

  /**
   * Resolve o cliente Asaas: lookup por cpfCnpj; cria se não existir.
   * O Asaas PERMITE clientes duplicados — a unicidade é nossa (lookup
   * primeiro). `name` + `cpfCnpj` são obrigatórios lá.
   */
  private async resolverCliente(params: CreateChargeParams): Promise<string> {
    const taxId = params.customer.taxId?.replace(/\D/g, '') ?? '';
    if (taxId.length === 0) {
      throw new AsaasValidationError(
        '[asaas] customer.taxId (CPF/CNPJ) é obrigatório para o Asaas — ' +
          'o checkout precisa garantir o dado antes da ativação'
      );
    }

    const lista = asRecord(
      await this.request('GET', '/customers', {
        query: { cpfCnpj: taxId, limit: '1' },
      }),
      'resposta de GET /customers'
    );
    const data = lista['data'];
    if (Array.isArray(data) && data.length > 0) {
      const cliente = asRecord(data[0], 'customer do lookup');
      return reqString(cliente, 'id', 'customer do lookup');
    }

    const body: Record<string, unknown> = {
      name: params.customer.name,
      cpfCnpj: taxId,
      email: params.customer.email,
      externalReference: `leela-tenant:${params.tenantId}`,
      ...(params.customer.phone !== undefined
        ? { mobilePhone: params.customer.phone }
        : {}),
    };
    const criado = asRecord(
      await this.request('POST', '/customers', { body }),
      'resposta de POST /customers'
    );
    return reqString(criado, 'id', 'customer criado');
  }

  /** payment (criado OU do lookup idempotente) → ChargeResult do domínio. */
  private async montarChargeResult(
    payment: Record<string, unknown>
  ): Promise<ChargeResult> {
    const chargeId = reqString(payment, 'id', 'payment');
    const statusAsaas = reqString(payment, 'status', 'payment');
    const status = PAYMENT_STATUS_TO_CHARGE[statusAsaas];
    if (status === undefined) {
      throw new AsaasMappingError(
        `[asaas] Status de payment não mapeado: ${statusAsaas}`
      );
    }

    const paymentUrl = optString(payment, 'invoiceUrl');
    const boletoUrl = optString(payment, 'bankSlipUrl');
    const billingType = optString(payment, 'billingType');

    // PIX pendente: QR dinâmico vem de GET /payments/{id}/pixQrCode.
    // Falha aqui é NÃO-fatal (a cobrança JÁ existe; o invoiceUrl segue
    // pagável e um retry idempotente re-tenta o QR) — degradar > orfanar.
    let qrCode: string | undefined;
    let expiresAt: StructuralTimestamp | undefined;
    if (billingType === 'PIX' && status === 'pending') {
      try {
        const qr = asRecord(
          await this.request('GET', `/payments/${chargeId}/pixQrCode`),
          'resposta de pixQrCode'
        );
        qrCode = optString(qr, 'payload');
        const expiracao = optString(qr, 'expirationDate');
        if (expiracao !== undefined) {
          const parsed = new Date(expiracao.replace(' ', 'T'));
          if (!Number.isNaN(parsed.getTime())) {
            expiresAt = timestampDe(parsed);
          }
        }
      } catch (err) {
        if (!(err instanceof AsaasError)) throw err;
        // segue sem QR — paymentUrl cobre o pagamento
      }
    }

    return {
      chargeId,
      status,
      ...(paymentUrl !== undefined ? { paymentUrl } : {}),
      ...(qrCode !== undefined ? { qrCode } : {}),
      ...(boletoUrl !== undefined ? { boletoUrl } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      // boletoBarCode (linha digitável): campo da resposta NÃO confirmado
      // na coleta — omitido até validação em sandbox (nunca inventar).
    };
  }

  // ── refund ────────────────────────────────────────────────────────────────

  async refund(params: RefundParams): Promise<RefundResult> {
    if (params.idempotencyKey.trim().length === 0) {
      throw new AsaasValidationError('[asaas] idempotencyKey vazia (RN-333)');
    }
    // Dedup best-effort no processo (o Asaas não tem idempotency-key HTTP
    // para estorno; o dedup durável por-inscrito é do domínio — ADR-011).
    const cacheado = this.refundsPorChave.get(params.idempotencyKey);
    if (cacheado !== undefined) return cacheado;

    if (params.amount !== undefined) {
      if (!Number.isInteger(params.amount) || params.amount <= 0) {
        throw new AsaasValidationError(
          `[asaas] amount de estorno inválido: ${params.amount}`
        );
      }
    }

    const body: Record<string, unknown> = {
      description: params.reason,
      // amount omitido = estorno TOTAL (contrato do Asaas e da interface)
      ...(params.amount !== undefined
        ? { value: reaisFromCentavos(params.amount) }
        : {}),
    };

    // 400 aqui (ex.: PIX sem saldo p/ estornar) propaga como AsaasApiError:
    // erro de OPERAÇÃO, nunca vira status de cobrança — e NÃO é cacheado
    // (retry deve re-tentar o gateway).
    const resposta = asRecord(
      await this.request('POST', `/payments/${params.chargeId}/refund`, {
        body,
      }),
      'resposta de POST /payments/{id}/refund'
    );

    const resultado = this.montarRefundResult(params, resposta);
    this.refundsPorChave.set(params.idempotencyKey, resultado);
    return resultado;
  }

  /**
   * A resposta do estorno é o payment com o array `refunds` (pode haver
   * VÁRIOS parciais em PIX) — usa o mais recente por dateCreated.
   */
  private montarRefundResult(
    params: RefundParams,
    resposta: Record<string, unknown>
  ): RefundResult {
    const refunds = resposta['refunds'];
    if (!Array.isArray(refunds) || refunds.length === 0) {
      throw new AsaasMappingError(
        '[asaas] Resposta de estorno sem array refunds — shape fora do ' +
          'contrato coletado; validar em sandbox antes de confiar'
      );
    }
    let maisRecente: Record<string, unknown> | undefined;
    let maisRecenteData = '';
    for (const item of refunds) {
      const rec = asRecord(item, 'item de refunds');
      const dataCriacao = optString(rec, 'dateCreated') ?? '';
      if (maisRecente === undefined || dataCriacao >= maisRecenteData) {
        maisRecente = rec;
        maisRecenteData = dataCriacao;
      }
    }
    if (maisRecente === undefined) {
      throw new AsaasMappingError('[asaas] refunds vazio após parse');
    }

    const statusAsaas = reqString(maisRecente, 'status', 'refund');
    const status = REFUND_STATUS_MAP[statusAsaas];
    if (status === undefined) {
      throw new AsaasMappingError(
        `[asaas] Status de refund não mapeado: ${statusAsaas}`
      );
    }
    const valorReais = reqNumber(maisRecente, 'value', 'refund');
    const refundId =
      optString(maisRecente, 'id') ??
      optString(maisRecente, 'endToEndIdentifier') ??
      `refund:${params.chargeId}:${maisRecenteData || 'sem-data'}`;

    return {
      refundId,
      chargeId: params.chargeId,
      status,
      amount: centavosFromReais(Math.abs(valorReais)),
      processedAt: timestampDe(this.now()),
    };
  }

  // ── webhook: verify → parse → dedup (nesta ordem, sempre) ────────────────

  /**
   * Verificação de AUTENTICIDADE (Schneier) — roda ANTES de qualquer parse
   * ou efeito. O Asaas não usa HMAC: cada entrega traz o header
   * `asaas-access-token` com o authToken cadastrado; a camada HTTP coloca
   * esse valor em `payload.signature`. Comparação em TEMPO CONSTANTE
   * (sha256 dos dois lados + timingSafeEqual — digests de tamanho fixo
   * eliminam vazamento por comprimento).
   */
  verifyWebhook(payload: WebhookPayload): void {
    const recebido = payload.signature;
    if (typeof recebido !== 'string' || recebido.length === 0) {
      throw new AsaasWebhookAssinaturaError();
    }
    const hashRecebido = createHash('sha256').update(recebido, 'utf8').digest();
    const hashEsperado = createHash('sha256')
      .update(this.webhookAuthToken, 'utf8')
      .digest();
    if (!timingSafeEqual(hashRecebido, hashEsperado)) {
      throw new AsaasWebhookAssinaturaError();
    }
  }

  /**
   * Verifica (SEMPRE — não há parse de payload não-autêntico) e traduz a
   * entrega para o domínio, incluindo o bloco `cartao` quando a confirmação
   * é de cartão (a camada de ativação persiste em pagamento.cartao;
   * follow-up registrado — PIX não exige).
   *
   * Contrato de `payload.data` (montado pela camada HTTP na ativação):
   * o corpo do POST do Asaas — `{ id: 'evt_...', event, payment: {...} }`.
   */
  parseWebhook(payload: WebhookPayload): AsaasWebhookDetails {
    this.verifyWebhook(payload);

    const event = payload.event;
    let status = WEBHOOK_EVENT_TO_CHARGE[event];
    if (status === undefined) {
      if (!event.startsWith('PAYMENT_')) {
        throw new AsaasMappingError(
          `[asaas] Evento fora do domínio de cobranças: ${event}`
        );
      }
      // PAYMENT_* autêntico sem efeito mapeado (ex.: PAYMENT_CREATED,
      // PAYMENT_UPDATED, PAYMENT_REFUND_IN_PROGRESS): 'pending' = o
      // checkout registra a entrega e NÃO aplica efeito ('status_sem_efeito').
      status = 'pending';
    }

    const payment = asRecord(payload.data['payment'], 'data.payment');
    const chargeId = reqString(payment, 'id', 'payment do webhook');
    // SEMPRE payment.value (valor da cobrança) — netValue desconta taxas e
    // quebraria o cross-check de integridade do checkout.
    const valorReais = reqNumber(payment, 'value', 'payment do webhook');

    const eventId = optString(payload.data, 'id') ?? `${event}:${chargeId}`;
    const externalReference = optString(payment, 'externalReference');
    const parsedRef =
      externalReference !== undefined
        ? parseExternalReference(externalReference)
        : undefined;

    let cartao: AsaasWebhookCartao | undefined;
    const creditCardRaw = payment['creditCard'];
    if (
      status === 'confirmed' &&
      creditCardRaw !== null &&
      typeof creditCardRaw === 'object' &&
      !Array.isArray(creditCardRaw)
    ) {
      const cc = creditCardRaw as Record<string, unknown>;
      const bandeira = optString(cc, 'creditCardBrand');
      const numero = optString(cc, 'creditCardNumber');
      if (bandeira !== undefined && numero !== undefined) {
        const installmentCount = payment['installmentCount'];
        cartao = {
          bandeira,
          ultimos4: numero.slice(-4),
          ...(typeof installmentCount === 'number' &&
          Number.isInteger(installmentCount) &&
          installmentCount >= 1
            ? { parcelas: installmentCount }
            : {}),
        };
      }
    }

    return {
      eventId,
      event,
      chargeId,
      status,
      amount: centavosFromReais(valorReais),
      ...(externalReference !== undefined ? { externalReference } : {}),
      ...(parsedRef !== undefined ? { orderId: parsedRef.orderId } : {}),
      ...(cartao !== undefined ? { cartao } : {}),
    };
  }

  /**
   * Contrato ADR-006: verificação ANTES de qualquer efeito; idempotente
   * por ENTREGA (eventId `evt_...` — modelo at-least-once do Asaas).
   * O ledger durável por entrega é do domínio (webhookEventos); aqui o
   * dedup em memória espelha o mock e protege retries no mesmo processo.
   */
  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    const detalhes = this.parseWebhook(payload); // verify embutido

    const cacheado = this.webhooksPorEntrega.get(detalhes.eventId);
    if (cacheado !== undefined) return cacheado;

    const resultado: WebhookResult = {
      chargeId: detalhes.chargeId,
      status: detalhes.status,
      amount: detalhes.amount,
      processedAt: timestampDe(this.now()),
    };
    this.webhooksPorEntrega.set(detalhes.eventId, resultado);
    return resultado;
  }

  // ── Operações SEM mapeamento seguro (falha alta — nunca simular) ─────────

  /**
   * No Asaas o split é EMBUTIDO no POST /payments (walletId + fixedValue/
   * percentualValue sobre o netValue), não uma chamada por chargeId — e a
   * base de cálculo difere do mock (netValue vs bruto). Resolver na
   * ADR-006/ADR-013 antes de implementar (divergências 2 e 3 da coleta).
   */
  async splitRules(_params: SplitRulesParams): Promise<SplitRulesResult> {
    throw new AsaasOperacaoNaoSuportadaError(
      '[asaas] splitRules não suportado: split no Asaas é embutido na ' +
        'criação da cobrança (walletId, base netValue) — pendente de ' +
        'decisão ADR-006/ADR-013; não simular sucesso em dinheiro'
    );
  }

  /**
   * Endpoints de saldo/repasse NÃO coletados na discovery ("não
   * implementar por adivinhação" — asaas-api-reference.md).
   */
  async getPayout(_params: GetPayoutParams): Promise<PayoutResult> {
    throw new AsaasOperacaoNaoSuportadaError(
      '[asaas] getPayout não suportado: endpoints de saldo/repasse não ' +
        'mapeados na discovery — nova coleta antes de implementar'
    );
  }

  // ── Diagnóstico read-only (para a ativação — maestro) ───────────────────

  /**
   * Sanidade READ-ONLY: `GET /myAccount`. Zero escrita. É o teste que o
   * maestro roda contra produção na ativação (nunca a suíte automatizada).
   */
  async getAccountInfo(): Promise<Record<string, unknown>> {
    return asRecord(
      await this.request('GET', '/myAccount'),
      'resposta de GET /myAccount'
    );
  }
}

/**
 * billingType do Asaas por método da interface. Chave `string` de
 * propósito: com noUncheckedIndexedAccess o lookup devolve `| undefined`
 * e o guard de runtime (dado fora do contrato vindo de JS) compila.
 */
const BILLING_TYPE: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'CREDIT_CARD',
  boleto: 'BOLETO',
};

/**
 * Factory nomeada — ponto único que o futuro registry (ADR-013) importa.
 * NÃO lê process.env; a ativação injeta a config deliberadamente.
 */
export function createAsaasProvider(config: AsaasProviderConfig): AsaasProvider {
  return new AsaasProvider(config);
}
