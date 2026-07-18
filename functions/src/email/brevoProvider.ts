// =============================================================================
// functions/src/email/brevoProvider.ts
//
// Impl de REFERÊNCIA do port EmailProvider (LEELA-R9E · S-R9-14 · RN-137):
// Brevo (brevo.com), API transacional REST `POST /v3/smtp/email`.
// Decisão do Vitor (adendo 8, 2026-07-18): Brevo supersede Resend por custo
// (free 300/dia; 1º pago US$9). SendPulse descartado (throttle 50/h).
//
// SEGREDO (disciplina R6/Asaas): `BREVO_API_KEY` vive no env/Secret Manager;
// NUNCA logada, NUNCA ecoada em erro, NUNCA persistida. O fingerprint de
// memoização usa SHA-256 (selectEmailProvider).
//
// FAIL-HARD (espelho do selectProvider R6): chave PRESENTE + config inválida
// (prefixo estranho, sender ausente/ inválido) → LANÇA BrevoConfigError.
// Nunca degrada para "sem envio" em silêncio: chave presente = alguém espera
// e-mail REAL; engolir viraria convite/campanha que "foi" mas não foi.
//
// DOMÍNIO DE ENVIO (fato da doc Brevo, não invenção): remetente precisa ser
// um sender VERIFICADO na conta Brevo (e-mail confirmado ou domínio
// autenticado); sem isso a API rejeita o envio. Até o domínio {DOMINIO_LEELA}
// ser decidido/verificado, usar o e-mail verificado da conta free — limite
// free 300 e-mails/dia (suficiente para teste).
//
// HTTP: `fetch` global (Node 20) com `fetchFn` INJETÁVEL — os testes cobrem
// o adapter com HTTP mockado (TODO da spec: teste real e2e é opt-in
// `BREVO_E2E=1`, skip documentado até a chave existir).
// =============================================================================

import type {
  EmailProvider,
  SendTransactionalParams,
  SendTransactionalResult,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Env vars do adapter (S-R9-14). A chave é ação externa do Vitor. */
export const BREVO_API_KEY_ENV = 'BREVO_API_KEY';
export const BREVO_SENDER_EMAIL_ENV = 'BREVO_SENDER_EMAIL';
export const BREVO_SENDER_NAME_ENV = 'BREVO_SENDER_NAME';

/** Prefixo das chaves de API v3 do Brevo (doc oficial: `xkeysib-`). */
export const BREVO_KEY_PREFIX = 'xkeysib-';

/** Endpoint transacional (doc Brevo — POST /v3/smtp/email). */
export const BREVO_SMTP_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

/** Erro de CONFIG (chave presente mas inválida/incompleta) — fail-hard. */
export class BrevoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrevoConfigError';
  }
}

/** Erro de ENVIO (HTTP não-2xx / rede). Nunca carrega chave nem PII. */
export class BrevoSendError extends Error {
  readonly httpStatus: number | null;

  constructor(httpStatus: number | null, message: string) {
    super(message);
    this.name = 'BrevoSendError';
    this.httpStatus = httpStatus;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deriva a config do env — LANÇA com chave presente e config inválida
 * (nunca "meio configurado" em silêncio). Mensagens só citam NOMES de env
 * var, nunca valores. @pure
 */
export function brevoConfigFromEnv(
  env: Record<string, string | undefined>
): BrevoConfig {
  const apiKey = (env[BREVO_API_KEY_ENV] ?? '').trim();
  if (apiKey.length === 0) {
    throw new BrevoConfigError(`${BREVO_API_KEY_ENV} ausente.`);
  }
  if (!apiKey.startsWith(BREVO_KEY_PREFIX)) {
    // Chave fora do formato documentado = colagem errada (típico: chave de
    // OUTRO provedor no slot) — parar aqui evita vazar a chave errada num
    // header para um host que não é o dono dela.
    throw new BrevoConfigError(
      `${BREVO_API_KEY_ENV} fora do formato esperado (prefixo ${BREVO_KEY_PREFIX}).`
    );
  }
  const senderEmail = (env[BREVO_SENDER_EMAIL_ENV] ?? '').trim();
  if (!EMAIL_RE.test(senderEmail)) {
    throw new BrevoConfigError(
      `${BREVO_SENDER_EMAIL_ENV} ausente/inválido (remetente verificado no Brevo é obrigatório).`
    );
  }
  const senderName = (env[BREVO_SENDER_NAME_ENV] ?? '').trim() || 'Leela';
  return { apiKey, senderEmail, senderName };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

type FetchFn = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export interface BrevoProvider extends EmailProvider {
  readonly name: 'brevo';
}

/**
 * Cria o adapter Brevo sobre o port EmailProvider.
 * @param config config validada (brevoConfigFromEnv)
 * @param fetchFn HTTP injetável (testes com mock; default fetch global)
 */
export function createBrevoProvider(
  config: BrevoConfig,
  fetchFn: FetchFn = fetch as unknown as FetchFn
): BrevoProvider {
  return {
    name: 'brevo',

    async sendTransactional(
      params: SendTransactionalParams
    ): Promise<SendTransactionalResult> {
      const to = params.to;
      if (!EMAIL_RE.test(to.email)) {
        throw new BrevoSendError(null, 'Destinatário inválido.');
      }
      // Assunto de LINHA ÚNICA por construção (defesa em profundidade — o
      // template já sanitiza; a borda re-garante que CR/LF nunca sai daqui).
      const assunto = params.assunto.replace(/[\r\n]+/g, ' ').trim();
      if (assunto.length === 0 || params.html.length === 0) {
        throw new BrevoSendError(null, 'Assunto/corpo vazios.');
      }

      const body: Record<string, unknown> = {
        sender: { email: config.senderEmail, name: config.senderName },
        to: [
          {
            email: to.email,
            ...(typeof to.nome === 'string' && to.nome.length > 0
              ? { name: to.nome }
              : {}),
          },
        ],
        subject: assunto,
        htmlContent: params.html,
        ...(typeof params.texto === 'string' && params.texto.length > 0
          ? { textContent: params.texto }
          : {}),
        ...(typeof params.tag === 'string' && params.tag.length > 0
          ? { tags: [params.tag] }
          : {}),
      };

      let resp: Awaited<ReturnType<FetchFn>>;
      try {
        resp = await fetchFn(BREVO_SMTP_ENDPOINT, {
          method: 'POST',
          headers: {
            'api-key': config.apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(body),
        });
      } catch {
        // Erro de rede: mensagem OPACA — nunca ecoar o erro cru (poderia
        // carregar a URL com headers em algumas stacks de fetch).
        throw new BrevoSendError(null, 'Falha de rede ao contatar o Brevo.');
      }

      if (!resp.ok) {
        // Corpo de erro do Brevo carrega `code`/`message` — NUNCA a chave.
        // Mesmo assim, só o STATUS sai na mensagem (log estruturado do
        // chamador decide o que registrar; nada de eco de payload).
        throw new BrevoSendError(
          resp.status,
          `Brevo respondeu ${resp.status} no envio transacional.`
        );
      }

      let messageId: string | null = null;
      try {
        const data = (await resp.json()) as { messageId?: unknown };
        if (typeof data.messageId === 'string' && data.messageId.length > 0) {
          messageId = data.messageId;
        }
      } catch {
        messageId = null; // 2xx sem JSON — envio ok, id desconhecido
      }
      return { ok: true, messageId };
    },
  };
}
