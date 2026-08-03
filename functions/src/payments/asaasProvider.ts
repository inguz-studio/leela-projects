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
//
// TETO DE ESPERA (DEC-0727, item 28): 15s POR CHAMADA, aplicado no `request`
// — um lugar só, e por isso vale para toda chamada Asaas, inclusive as que
// ainda não existem. Estouro vira `AsaasTimeoutError`, com o estado do
// gateway declarado DESCONHECIDO: não é sucesso, não é fracasso, e NÃO
// dispara reconciliação por leitura (mesma família de 5xx/429/rede caída —
// o gateway está mudo, e a segunda viagem sairia do bolso do comprador).
// =============================================================================

import { createHash, timingSafeEqual } from 'crypto';
import type {
  PaymentProvider,
  CreateChargeParams,
  ChargeResult,
  ChargeStatus,
  CancelChargeParams,
  CancelChargeResult,
  SplitRulesParams,
  SplitRulesResult,
  RefundParams,
  RefundResult,
  WebhookPayload,
  WebhookResult,
  WebhookRefundInfo,
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

/**
 * Teto de espera POR CHAMADA ao Asaas — 15 segundos (DEC-0727, item 28:
 * *"Aceito o teto de 15s, de aguardar o asaas."*).
 *
 * POR QUE AQUI E SÓ AQUI: todas as chamadas HTTP do adapter passam pelo
 * `request`. Um teto por operação (createCharge, cancelCharge, refund…)
 * seria N tetos para manter em sincronia e um esquecido por definição; o
 * teto no transporte vale para a chamada que ainda não existe.
 *
 * NÃO é constante negociável por config de propósito: um knob de timeout é
 * um jeito silencioso de desligar o teto (`timeoutMs: 600000` passa em
 * qualquer review de tipo). O valor é decisão do dono; mudá-lo é mudar esta
 * linha, com o commit que essa mudança merece.
 *
 * O que este número NÃO é: um contrato de latência do checkout. É o ponto
 * em que a plataforma para de esperar — o pior caso da callable é a SOMA
 * dos tetos das chamadas que ela faz (ver `TETO_ASAAS_*` em
 * createInscricaoCharge.ts).
 */
export const ASAAS_TIMEOUT_MS = 15_000;

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

/**
 * O Asaas NÃO respondeu dentro do teto de `ASAAS_TIMEOUT_MS` (DEC-0727).
 *
 * ⚠️ ESTADO DESCONHECIDO — o ponto inteiro deste erro.
 *
 * Um timeout não é um "não". A requisição pode ter chegado, sido processada
 * e ter tido efeito no gateway (uma cobrança CRIADA, uma cobrança REMOVIDA,
 * um estorno APLICADO) sem que a resposta voltasse na janela. Quem trata
 * este erro não sabe — e não pode fingir que sabe:
 *
 *   - NÃO tratar como sucesso (o invariante "nunca sucesso otimista" do
 *     PaymentProvider vale aqui igual);
 *   - NÃO tratar como fracasso definitivo, nem contar ao comprador que
 *     "nada foi cobrado": o dinheiro pode ter saído;
 *   - NÃO reconciliar por leitura no ato: gateway que não respondeu em 15s
 *     não responde melhor à pergunta seguinte, e a segunda viagem sai do
 *     bolso de quem está parado no checkout. É a MESMA família de 5xx/429/
 *     rede caída — uma chamada, e sobe (ver `erroMereceReconciliacao`).
 *
 * QUEM RESOLVE o desconhecido, então: o webhook do Asaas (cobrança que
 * existe avisa quando é paga) e o REPLAY idempotente — `createCharge` faz
 * lookup por `externalReference` antes de qualquer POST, então a tentativa
 * seguinte com a MESMA `idempotencyKey` encontra a cobrança que este
 * timeout deixou órfã, em vez de criar a segunda.
 *
 * A face disso pro comprador é "processando pagamento" (DEC-0727) — nunca
 * um erro que afirme mais do que a plataforma sabe.
 *
 * ── ESCRITAS: `efeitoPossivel` e o caso do ESTORNO (risco R9 da
 *    investigação INV-CANCEL-ESTORNO) ─────────────────────────────────────
 *
 * Em GET, não saber é barato: leitura não muda nada, e a pergunta pode ser
 * repetida à vontade. Nas ESCRITAS (`POST` de cobrança, `POST` de estorno,
 * `DELETE` de cancelamento) o mesmo timeout carrega um efeito POSSÍVEL e
 * indeterminado — é isso que `efeitoPossivel` marca, em campo legível por
 * código e não em prosa que ninguém lê no `catch`.
 *
 * O estorno é o caso mais afiado, e o único cuja proteção NÃO mora aqui:
 *   - `createCharge` tem lookup por `externalReference` (o replay ENCONTRA
 *     a cobrança órfã) e `cancelCharge` tem reconciliação por leitura de
 *     status. `refund` não tem nem um nem outro: o Asaas não expõe
 *     idempotency-key HTTP para estorno, e o dedup deste adapter é em
 *     MEMÓRIA (morre com a instância da Function).
 *   - Logo, um `POST /payments/{id}/refund` que estourou o teto pode ter
 *     estornado de verdade. Repetir por conta própria é o caminho para o
 *     ESTORNO DUPLO; tratar como falha simples é o caminho para o estorno
 *     enviado-e-não-registrado. Nenhum dos dois é aceitável em silêncio.
 *
 * REGRA, portanto: o adapter NÃO re-tenta nada por conta própria — nem
 * escrita nem leitura, nem uma vez. Uma chamada, um resultado (ou este
 * erro). Quem decide re-tentar é o CHAMADOR, contra o próprio ledger
 * durável (`webhookEventos`/`reembolsos` — ADR-011), que é a única camada
 * capaz de saber se aquele estorno já foi registrado. A lane ESTORNO-ADMIN
 * consome exatamente esta semântica: `efeitoPossivel === true` significa
 * "confira o ledger e o extrato ANTES de repetir", nunca "pode repetir".
 */
export class AsaasTimeoutError extends AsaasError {
  /** Teto que estourou, em ms (documenta o número no próprio erro). */
  readonly timeoutMs: number;
  /** Método HTTP da chamada abortada. */
  readonly method: string;
  /** Path da chamada (SEM query, SEM headers — a chave não passa por aqui). */
  readonly path: string;
  /**
   * Marcador explícito para quem faz `catch`: o efeito da chamada no
   * gateway é indeterminado. Literal, não booleano, para que o código que
   * lê isto seja obrigado a nomear o estado.
   */
  readonly estadoNoGateway = 'desconhecido' as const;
  /**
   * A chamada abortada podia MUDAR estado no gateway (POST/DELETE)?
   *
   * `true` = cobrança criada, cobrança removida ou estorno aplicado são
   * desfechos possíveis desta chamada, e o chamador tem de conferir o
   * próprio ledger antes de qualquer nova tentativa. `false` (GET) = a
   * chamada não muda nada; repetir é seguro.
   */
  readonly efeitoPossivel: boolean;

  constructor(method: string, path: string, timeoutMs: number) {
    const escreve = method !== 'GET';
    super(
      `[asaas] Sem resposta em ${timeoutMs}ms (${method} ${path}) — a ` +
        'chamada foi abortada e o efeito no gateway é DESCONHECIDO: ' +
        (escreve
          ? 'ela PODE ter tido efeito (cobrança, cancelamento ou estorno). ' +
            'Não afirmar sucesso nem fracasso, não repetir sem conferir o ' +
            'ledger; webhook e replay idempotente resolvem o resto'
          : 'leitura sem efeito — repetir é seguro')
    );
    this.timeoutMs = timeoutMs;
    this.method = method;
    this.path = path;
    this.efeitoPossivel = escreve;
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

/**
 * Subset estrutural de fetch — o global satisfaz; os testes injetam fake.
 *
 * `signal` entrou com o teto de 15s (DEC-0727): o `fetch` global honra o
 * AbortSignal e FECHA a conexão quando o teto estoura — sem ele, abortar
 * seria só parar de esperar, com o socket vivo somando pressão no gateway.
 * Fakes de teste podem ignorar o campo: o teto NÃO depende de cooperação do
 * transporte (o `Promise.race` do `request` decide), o signal é o que evita
 * o vazamento na chamada real.
 */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
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
 * Teto do campo `externalReference` no Asaas. Acima disso o gateway responde
 * HTTP 400 `invalid_externalReference` e a cobrança NÃO nasce.
 *
 * Este número não é folclore: ele veio do corpo do próprio erro em produção
 * (`exceeds the maximum size of [100]`, INV-PIXINTERNAL) e é a razão de a
 * compra ter ficado 100% quebrada entre 29/07 e 02/08 — a forma antiga
 * (`orderId::idempotencyKey`, com a chave INTEIRA no sufixo) chegava a 155
 * chars com ids reais. Nenhum doc da coleta mencionava o limite.
 */
export const EXTERNAL_REF_MAX_LEN = 100;

/** Hex do digest do sufixo. 16 hex = 64 bits — colisão irrelevante aqui (v. abaixo). */
const EXTERNAL_REF_DIGEST_LEN = 16;

/**
 * Erro NOMEADO do estouro do teto — a guarda que faltava (T2 · PIXFIX-EXTREF).
 *
 * Subclasse de `AsaasValidationError` de propósito: quem já tratava validação
 * do adapter continua tratando, e quem quiser a causa exata testa por
 * `instanceof`. Existe para que o defeito apareça na BANCADA, com o número na
 * mensagem, em vez de virar um 400 opaco do gateway em cima do comprador.
 */
export class AsaasExternalReferenceTooLongError extends AsaasValidationError {
  readonly tamanho: number;
  readonly limite: number;
  constructor(tamanho: number, limite: number, orderIdLen: number) {
    super(
      `[asaas] externalReference com ${tamanho} chars excede o limite de ` +
        `${limite} do gateway (orderId tem ${orderIdLen} chars) — a cobrança ` +
        'seria recusada com invalid_externalReference'
    );
    this.tamanho = tamanho;
    this.limite = limite;
  }
}

/**
 * Digest curto e determinístico da chave de idempotência (sha256 hex, 16).
 *
 * Por que digest e não a chave inteira: o sufixo NUNCA carregou informação
 * nova. No único caller de produção a chave é `charge-${orderId}` — função
 * pura do prefixo, entropia adicional ZERO. O que o sufixo dá é estabilidade:
 * a mesma chave produz sempre o mesmo `externalReference`, que é o que faz o
 * lookup `GET /payments?externalReference=` encontrar o replay antes do POST.
 * Um digest preserva essa propriedade e cabe em tamanho fixo.
 *
 * Colisão: o prefixo `orderId` já identifica o pedido sozinho, então duas
 * chaves distintas só colidiriam DENTRO do mesmo pedido — e aí colidir é o
 * comportamento certo (é o mesmo pedido, uma cobrança só). @pure
 */
export function digestIdempotencyKey(idempotencyKey: string): string {
  return createHash('sha256')
    .update(idempotencyKey, 'utf8')
    .digest('hex')
    .slice(0, EXTERNAL_REF_DIGEST_LEN);
}

/**
 * `externalReference = orderId::digest16(idempotencyKey)`. O sufixo dá
 * idempotência por chave (lookup exato antes do POST); o prefixo carrega o
 * orderId VERBATIM (ADR-011) para reconciliação/webhook. @pure
 *
 * O prefixo é intocado de propósito: `parseExternalReference` e o desempate
 * do webhook leem `orderId` dele, e é esse id que abre o pedido no Firestore.
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
  return `${orderId}${EXTERNAL_REF_SEP}${digestIdempotencyKey(idempotencyKey)}`;
}

/**
 * Inverso de buildExternalReference (separa no PRIMEIRO `::`). @pure
 *
 * O segundo campo é o DIGEST, não a chave: o inverso é total só para o
 * `orderId` — que é o único lado que a reconciliação e o webhook consomem.
 */
export function parseExternalReference(
  ref: string
): { orderId: string; idempotencyDigest: string } | undefined {
  const idx = ref.indexOf(EXTERNAL_REF_SEP);
  if (idx <= 0) return undefined;
  return {
    orderId: ref.slice(0, idx),
    idempotencyDigest: ref.slice(idx + EXTERNAL_REF_SEP.length),
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

/**
 * Extrai de um `payment` de webhook QUAL estorno a entrega confirma (RN-372):
 * o item mais recente de `refunds[]` com status DONE — a confirmação. Sem
 * DONE, sem array ou com shape fora do contrato devolve `undefined`: nunca
 * lança, porque 4xx em entrega autêntica pausa a fila de webhooks do Asaas.
 * @pure
 */
export function extrairRefundDaEntrega(
  payment: Record<string, unknown>
): WebhookRefundInfo | undefined {
  const refunds = payment['refunds'];
  if (!Array.isArray(refunds) || refunds.length === 0) return undefined;
  let escolhido: Record<string, unknown> | undefined;
  let escolhidoData = '';
  for (const item of refunds) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    if (REFUND_STATUS_MAP[String(rec['status'])] !== 'approved') continue;
    const dataCriacao = optString(rec, 'dateCreated') ?? '';
    if (escolhido === undefined || dataCriacao >= escolhidoData) {
      escolhido = rec;
      escolhidoData = dataCriacao;
    }
  }
  if (escolhido === undefined) return undefined;
  const valor = escolhido['value'];
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return undefined;
  const refundId =
    optString(escolhido, 'id') ?? optString(escolhido, 'endToEndIdentifier');
  if (refundId === undefined) return undefined;
  return {
    refundId,
    amountCentavos: centavosFromReais(Math.abs(valor)),
    status: 'approved',
  };
}

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
  /**
   * Presente em `PAYMENT_REFUNDED` com `payment.refunds[]` — diz QUAL estorno
   * a entrega confirma (RN-372). É o que permite fechar a saga do estorno
   * certo num pedido de GRUPO, onde há vários parciais na mesma cobrança.
   */
  refund?: WebhookRefundInfo;
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
  /** Dedup de cancelamento (RN-157 · T3) — mesma disciplina do refund. */
  private readonly cancelamentosPorChave = new Map<string, CancelChargeResult>();
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
    method: 'GET' | 'POST' | 'DELETE',
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

    const { status, headers, texto } = await this.viagemComTeto(
      method,
      path,
      url,
      init
    );
    let json: unknown;
    if (texto.length > 0) {
      try {
        json = JSON.parse(texto);
      } catch {
        json = undefined; // corpo não-JSON: erro tratado pelo status abaixo
      }
    }

    if (status >= 400) {
      throw this.erroDaResposta({ status, headers }, json);
    }
    return json;
  }

  /**
   * A viagem de ida e volta com TETO (DEC-0727, item 28) — 15s por chamada.
   *
   * O teto cobre a resposta INTEIRA, headers **e** corpo: `fetch` resolve
   * quando os headers chegam, e um corpo que nunca termina de chegar é a
   * mesma espera indeterminada de um gateway mudo. Medir só até o header
   * deixaria a porta que o teto existe para fechar entreaberta.
   *
   * DOIS mecanismos, um propósito:
   *   - `AbortController` → a conexão real MORRE (nada de socket órfão
   *     segurando quota do Asaas depois que já desistimos dela);
   *   - `Promise.race` → o teto vale mesmo que o transporte ignore o signal.
   *     É o que torna o teto TESTÁVEL sem rede: um `fetchFn` que nunca
   *     resolve estoura em 15s de relógio (fake timers) porque a decisão é
   *     nossa, não do fetch.
   *
   * Sem `unhandledRejection`: o `race` registra reação nas duas promessas,
   * então o AbortError que o fetch real levanta DEPOIS de perdermos a
   * corrida já nasce tratado. E o timer morre no `finally` — caminho feliz
   * não deixa handle pendurado prendendo o processo da Function.
   */
  private async viagemComTeto(
    method: string,
    path: string,
    url: string,
    init: Parameters<FetchLike>[1]
  ): Promise<{
    status: number;
    headers: FetchLikeResponse['headers'];
    texto: string;
  }> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const teto = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AsaasTimeoutError(method, path, ASAAS_TIMEOUT_MS));
      }, ASAAS_TIMEOUT_MS);
    });

    const viagem = (async () => {
      const res = await this.fetchFn(url, { ...init, signal: controller.signal });
      return { status: res.status, headers: res.headers, texto: await res.text() };
    })();

    try {
      return await Promise.race([viagem, teto]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /**
   * Traduz 4xx/5xx em AsaasApiError SEM vazar chave/headers/corpo cru.
   * Recebe só status+headers: o corpo já foi lido (uma vez) na viagem.
   */
  private erroDaResposta(
    res: Pick<FetchLikeResponse, 'status' | 'headers'>,
    json: unknown
  ): AsaasApiError {
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
    // Guarda dura do teto do gateway (T2 · PIXFIX-EXTREF). Roda ANTES do POST
    // e antes do lookup: um externalReference longo demais não serve nem para
    // consultar. O `buildExternalReference` aqui é o MESMO que o createCharge
    // usa adiante — validar por reconstrução é o que impede a guarda de
    // divergir do valor realmente enviado.
    const refCandidato = buildExternalReference(
      params.orderId,
      params.idempotencyKey
    );
    if (refCandidato.length > EXTERNAL_REF_MAX_LEN) {
      throw new AsaasExternalReferenceTooLongError(
        refCandidato.length,
        EXTERNAL_REF_MAX_LEN,
        params.orderId.length
      );
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
    // DEC-0727: o TIMEOUT de 15s cai nesta mesma porta (AsaasTimeoutError é
    // AsaasError). Deliberado: a cobrança já nasceu, e derrubar tudo por
    // causa do QR devolveria "erro" sobre dinheiro que já pode ser cobrado.
    // O comprador segue pelo invoiceUrl; o QR volta no replay.
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

  // ── cancelCharge ──────────────────────────────────────────────────────────

  /**
   * Cancela a cobrança no Asaas (RN-157 · S1209-PIXBE-T3): `DELETE
   * /payments/{id}` — a operação de "remover cobrança" do Asaas, que mapeia
   * para o status `DELETED` (já traduzido como `cancelled` em
   * PAYMENT_STATUS_TO_CHARGE). Depois dela o QR/link não é mais pagável.
   *
   * FALHA ALTO por desenho: cobrança já RECEBIDA/CONFIRMADA faz o Asaas
   * responder 4xx e o AsaasApiError SOBE. É essa subida que garante o
   * fail-safe do `expirarPixPendente` — pedido cujo dinheiro entrou nunca é
   * cancelado por timer.
   *
   * IDEMPOTÊNCIA: dedup best-effort por chave no processo (mesmo padrão do
   * `refund` — o Asaas não tem idempotency-key HTTP).
   *
   * ── PIXCARRINHO-REV · A1-REV: "não confirmei" ≠ "já está morta" ──────────
   * O dedup por chave só vale DENTRO do processo. Numa instância nova (o caso
   * normal em Cloud Functions), o DELETE repetido sobre uma cobrança JÁ
   * removida volta a bater no Asaas — e ali "já removida" chega pelo MESMO
   * canal que "recusei": um erro HTTP. Tratar os dois como falha era
   * defensável enquanto o cancelamento era um caminho isolado; o
   * PIX-CARRINHO-T1 o pôs DENTRO da criação da próxima cobrança, e aí a
   * confusão vira DEADLOCK DE COMPRA: a chave da sentinela é determinística,
   * então toda tentativa daquele carrinho repete o mesmo erro para sempre e
   * a negativa "tente de novo em alguns instantes" vira mentira permanente.
   *
   * RECONCILIAÇÃO POR LEITURA, não por otimismo: quando o DELETE não prova a
   * morte, o adapter PERGUNTA ao gateway (`GET /payments/{id}`) em que estado
   * a cobrança está. Sucesso só sai com resposta POSITIVA — `DELETED`, ou a
   * ausência da cobrança. `RECEIVED`/`CONFIRMED`/`PENDING`/`RESTORED`, corpo
   * sem `status` ou GET que também falha continuam LEVANTANDO: o invariante
   * do PaymentProvider ("nunca sucesso otimista") fica intacto, e é ele que
   * impede o timer de matar pedido cujo dinheiro entrou.
   *
   * Custo: o GET só existe no caminho de FALHA. O caminho feliz segue com uma
   * chamada só — nada foi acrescentado ao caminho quente do checkout.
   *
   * ⚠️ PREMISSA (a mesma disciplina do createCharge): o shape `{deleted,
   * id}` vem da doc do Asaas e NÃO foi confirmado contra a conta real nesta
   * lane — a suíte cobre o adapter com HTTP mockado. Validar em sandbox
   * junto da ativação da chave.
   */
  async cancelCharge(params: CancelChargeParams): Promise<CancelChargeResult> {
    if (params.chargeId.trim().length === 0) {
      throw new AsaasValidationError('[asaas] chargeId vazio no cancelamento');
    }
    if (params.idempotencyKey.trim().length === 0) {
      throw new AsaasValidationError('[asaas] idempotencyKey vazia (RN-333)');
    }
    const cacheado = this.cancelamentosPorChave.get(params.idempotencyKey);
    if (cacheado !== undefined) {
      return { ...cacheado, jaCancelada: true, processedAt: timestampDe(this.now()) };
    }

    let resposta: Record<string, unknown>;
    try {
      resposta = asRecord(
        await this.request('DELETE', `/payments/${params.chargeId}`),
        'resposta de DELETE /payments/{id}'
      );
    } catch (err) {
      // O DELETE não vingou. Antes de negar a venda de quem chamou, PERGUNTA
      // ao gateway se a cobrança já não estava morta — é a diferença entre
      // uma recusa transitória e um deadlock permanente.
      //
      // MAS SÓ QUANDO A PERGUNTA PODE SER RESPONDIDA: um 4xx é um veredito do
      // gateway sobre ESTA cobrança e pode esconder "ela já morreu"; 5xx, 429
      // e queda de rede são o gateway não respondendo, e nesse estado o GET
      // também não responderia — insistir só somaria espera ao comprador, que
      // está no caminho quente do checkout desde o T1.
      if (
        this.erroMereceReconciliacao(err) &&
        (await this.cobrancaConfirmadamenteMorta(params.chargeId))
      ) {
        return this.registrarCancelamento(params, true);
      }
      throw err;
    }
    if (resposta['deleted'] !== true) {
      // Sem `deleted: true` não há prova de que a cobrança morreu no corpo do
      // DELETE. Devolver sucesso aqui seria a mentira mais cara desta lane —
      // mas a prova pode existir do outro lado, e só a leitura decide.
      if (await this.cobrancaConfirmadamenteMorta(params.chargeId)) {
        return this.registrarCancelamento(params, true);
      }
      throw new AsaasMappingError(
        `[asaas] DELETE /payments/${params.chargeId} sem deleted=true — ` +
          'cancelamento NÃO confirmado'
      );
    }

    return this.registrarCancelamento(params, false);
  }

  /**
   * O erro do DELETE é um VEREDITO do gateway sobre esta cobrança (4xx, menos
   * 429), ou é o gateway não respondendo (5xx, 429, rede)? Só o primeiro caso
   * merece a leitura de reconciliação: no segundo, a resposta seria a mesma
   * ausência de resposta, e a espera extra cairia no colo do comprador.
   *
   * DEC-0727: o TIMEOUT entra na segunda família, e o `instanceof
   * AsaasApiError` já o mantém fora — `AsaasTimeoutError` não é resposta
   * nenhuma, é a ausência dela. Explícito aqui porque é invariante cobrado
   * por teste: 5xx/429/rede/timeout = UMA chamada. Gateway que ficou 15s sem
   * responder não fica mais falante na pergunta seguinte, e quem pagaria os
   * outros 15s é o comprador parado no checkout.
   */
  private erroMereceReconciliacao(err: unknown): boolean {
    if (!(err instanceof AsaasApiError)) return false;
    return err.httpStatus >= 400 && err.httpStatus < 500 && err.httpStatus !== 429;
  }

  /** Resultado de cancelamento + dedup por chave (uma escrita, um lugar). */
  private registrarCancelamento(
    params: CancelChargeParams,
    jaCancelada: boolean
  ): CancelChargeResult {
    const resultado: CancelChargeResult = {
      chargeId: params.chargeId,
      status: 'cancelled',
      jaCancelada: false,
      processedAt: timestampDe(this.now()),
    };
    this.cancelamentosPorChave.set(params.idempotencyKey, resultado);
    return { ...resultado, jaCancelada };
  }

  /**
   * O gateway CONFIRMA que esta cobrança não é mais pagável? (A1-REV)
   *
   * Só duas respostas contam como prova, e as duas são leituras positivas:
   *
   *   - `status === 'DELETED'` — o caminho ESPERADO. O Asaas mantém a
   *     cobrança removida recuperável (é por isso que `DELETED` é um status
   *     no `PAYMENT_STATUS_TO_CHARGE`, e não um sumiço), então "já removida"
   *     se prova por leitura sem depender de interpretar texto de erro.
   *
   *   - `404` no próprio GET — a conta deste `apiKey` não conhece a cobrança.
   *     ⚠️ Note o limite honesto desta leitura: ela prova que a cobrança não
   *     é alcançável POR NÓS, não que nenhum QR exista no mundo. O caso em
   *     que a diferença importaria é a chave apontando para OUTRA conta
   *     Asaas — e nesse cenário a cobrança antiga já é inalcançável de todo
   *     jeito (não cancelamos, não lemos, e o webhook dela não chega),
   *     então recusar a compra nova não protegeria ninguém: só somaria um
   *     comprador travado a um estado que já está quebrado. Registrado como
   *     escalado da review (item 32 do painel de decisões).
   *
   * Qualquer outra coisa é `false` — inclusive o GET falhando por 5xx/rede/
   * TIMEOUT de 15s (não saber não é saber que morreu) e `RESTORED` (o Asaas
   * permite ressuscitar uma cobrança removida, e ressuscitada ela está VIVA).
   */
  private async cobrancaConfirmadamenteMorta(chargeId: string): Promise<boolean> {
    try {
      const payment = asRecord(
        await this.request('GET', `/payments/${chargeId}`),
        'resposta de GET /payments/{id}'
      );
      return payment['status'] === 'DELETED';
    } catch (err) {
      return err instanceof AsaasApiError && err.httpStatus === 404;
    }
  }

  // ── refund ────────────────────────────────────────────────────────────────

  /**
   * Estorno no Asaas — `POST /payments/{id}/refund`.
   *
   * ⚠️ TETO DE 15s E ESTADO DESCONHECIDO (DEC-0727 · risco R9 da
   * INV-CANCEL-ESTORNO): esta é a escrita mais exposta do adapter. Ao
   * contrário de `createCharge` (lookup por `externalReference`) e de
   * `cancelCharge` (reconciliação por leitura de status), o estorno não tem
   * como PERGUNTAR ao gateway se já aconteceu — o Asaas não dá
   * idempotency-key HTTP para refund e o dedup abaixo é em memória, logo
   * morre com a instância da Function.
   *
   * Consequência assumida, sem retry escondido: um `AsaasTimeoutError` aqui
   * sai com `efeitoPossivel: true` e NENHUMA segunda chamada é feita por
   * este método. Re-tentar é decisão de quem chama, contra o ledger durável
   * de reembolsos (ADR-011) — e é a lane ESTORNO-ADMIN que vai ser dona
   * dessa decisão. Repetir aqui por conta própria seria a receita do estorno
   * DUPLO; devolver "falhou, tente de novo" seria a receita do estorno
   * enviado-e-não-registrado.
   */
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

    // Bloco de ESTORNO (RN-372): em PAYMENT_REFUNDED o payment traz
    // `refunds[]` — o mais recente DIZ qual estorno esta entrega confirma.
    // Shape fora do contrato aqui NUNCA derruba a entrega (responder 4xx a
    // webhook autêntico pausa a fila do Asaas): sem bloco, o domínio decide
    // pelo carimbo vivo do ledger.
    let refund: WebhookRefundInfo | undefined;
    if (status === 'refunded') {
      refund = extrairRefundDaEntrega(payment);
      if (refund === undefined) {
        this.logRefundIndecifravel(chargeId);
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
      ...(refund !== undefined ? { refund } : {}),
    };
  }

  /** Telemetria isolada (mantém o parse puro e testável). */
  private logRefundIndecifravel(chargeId: string): void {
    console.warn('[asaas] PAYMENT_REFUNDED sem refunds[] decifrável', {
      chargeId,
    });
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
      // RN-372: o bloco de estorno atravessa até o core, que casa com o
      // carimbo do ledger. Ausente em toda entrega que não é estorno.
      ...(detalhes.refund !== undefined ? { refund: detalhes.refund } : {}),
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
