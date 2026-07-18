// =============================================================================
// packages/core/src/email/EmailProvider.ts
//
// Port plugável de e-mail transacional (LEELA-R9E · S-R9-14 · RN-137 ·
// padrão ADR-006 — espelho do PaymentProvider).
//
// Nenhum SDK/HTTP de provedor concreto aqui — adapters em
// functions/src/email/ (impl de referência: BrevoProvider). Trocar de
// provedor = NOVA impl deste port, ZERO mudança nos consumidores (convite
// E18, convite de influenciador PF RN-316, campanhas E06, aniversário E19).
//
// CONTRATO DE CONTEÚDO: o port recebe conteúdo JÁ RENDERIZADO E SANITIZADO
// (assunto/html/texto) — a renderização de template + sanitização dos campos
// do organizador (anti-phishing/injeção) vive em functions/src/email/
// templates.ts, ANTES do port. O adapter nunca re-interpola nada.
// =============================================================================

/** Destinatário de um e-mail transacional. */
export interface EmailDestinatario {
  email: string;
  /** Nome de exibição — já sanitizado pelo template. */
  nome?: string;
}

/** Parâmetros de envio transacional (conteúdo pronto — ver cabeçalho). */
export interface SendTransactionalParams {
  to: EmailDestinatario;
  /** Assunto — linha única (o template remove CR/LF). */
  assunto: string;
  /** Corpo HTML já renderizado/escapado. */
  html: string;
  /** Alternativa texto puro (acessibilidade/anti-spam). */
  texto?: string;
  /**
   * Tag de observabilidade do provedor (ex.: 'convite-afiliado') —
   * NUNCA carrega PII.
   */
  tag?: string;
}

/** Resultado do envio. */
export interface SendTransactionalResult {
  ok: true;
  /** Id da mensagem no provedor (null quando o provedor não devolve). */
  messageId: string | null;
}

/**
 * Port de e-mail transacional (RN-137). Implementações:
 *   - `BrevoProvider` (functions/src/email/brevoProvider.ts) — referência.
 * Seleção: `selectEmailProvider` (fail-closed — SEM `BREVO_API_KEY` não há
 * provider e cada consumidor mantém o comportamento fail-closed vigente).
 */
export interface EmailProvider {
  /** Nome do provedor (observabilidade) — ex.: 'brevo'. */
  readonly name: string;
  /**
   * Envia um e-mail transacional. Lança em falha de HTTP/config — o
   * chamador decide a compensação (ex.: convite segue pendente e o
   * organizador reenvia). NUNCA loga a chave nem o corpo do destinatário.
   */
  sendTransactional(
    params: SendTransactionalParams
  ): Promise<SendTransactionalResult>;
}
