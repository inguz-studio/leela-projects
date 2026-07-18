// =============================================================================
// functions/src/email/selectEmailProvider.ts
//
// Seleção do EmailProvider (LEELA-R9E · S-R9-14 · RN-137 — espelho do
// selectPaymentProvider/R6, ADR-006).
//
// FAIL-CLOSED (a regra da story):
//   - SEM `BREVO_API_KEY`  → `null`. NÃO há mock de e-mail: cada consumidor
//     mantém o comportamento fail-closed VIGENTE (convite E18 bloqueado em
//     produção; campanhas só registram no log de comunicação). A chave NÃO
//     existe ainda (ação externa do Vitor) — este é o estado de produção hoje.
//   - COM chave + config inválida (prefixo errado, sender ausente) → LANÇA
//     (BrevoConfigError). Nunca "meio enviado" em silêncio.
//   - COM chave válida → BrevoProvider real, memoizado por fingerprint
//     SHA-256 (a chave nunca fica retida além da config do adapter).
//
// Trocar de provedor = nova impl do port + este seletor. Nenhum consumidor
// conhece "Brevo" — só o port (@leela/core EmailProvider).
// =============================================================================

import { createHash } from 'crypto';
import type { EmailProvider } from '@leela/core';
import {
  BREVO_API_KEY_ENV,
  brevoConfigFromEnv,
  createBrevoProvider,
  type BrevoProvider,
} from './brevoProvider';

/** Ambiente mínimo que a seleção lê (injetável — testável sem process.env). */
export type EmailEnv = Record<string, string | undefined>;

/**
 * Há chave Brevo configurada? (string não-vazia após trim). @pure
 */
export function hasBrevoKey(env: EmailEnv): boolean {
  const key = env[BREVO_API_KEY_ENV];
  return typeof key === 'string' && key.trim().length > 0;
}

let brevoCache: { fingerprint: string; provider: BrevoProvider } | null = null;

/** Reset do cache (SÓ testes — simula processo novo). */
export function resetEmailProviderCache(): void {
  brevoCache = null;
}

/**
 * Seleciona o EmailProvider do ambiente.
 *
 * @returns `null` quando NÃO há chave (fail-closed — consumidores mantêm o
 *          comportamento vigente); BrevoProvider real quando há.
 * @throws  BrevoConfigError quando há chave mas a config é inválida —
 *          NUNCA devolve null com chave presente (chave = alguém espera
 *          e-mail real; engolir seria o pior modo de falha).
 */
export function selectEmailProvider(
  env: EmailEnv = process.env
): EmailProvider | null {
  if (!hasBrevoKey(env)) return null;
  const config = brevoConfigFromEnv(env); // lança se inválida — propaga
  const fingerprint = createHash('sha256')
    .update(`${config.apiKey}\n${config.senderEmail}\n${config.senderName}`, 'utf8')
    .digest('hex');
  if (brevoCache !== null && brevoCache.fingerprint === fingerprint) {
    return brevoCache.provider;
  }
  const provider = createBrevoProvider(config);
  brevoCache = { fingerprint, provider };
  return provider;
}
