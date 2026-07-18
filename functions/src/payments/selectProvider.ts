// =============================================================================
// functions/src/payments/selectProvider.ts
//
// Seleção do PaymentProvider (ADR-006 · LEELA-E12 → ativado em LEELA-R6).
//
// Histórico: até R6 o checkout rodava 100% no MockPaymentProvider e chave
// presente = parada dura (AsaasProvider existia mas não era roteado). A
// ativação R6 (2026-07-18, chave SANDBOX no functions/.env) troca ESTE ponto
// único: chave presente → AsaasProvider real (ADR-006 §7 do report).
//
// FAIL-SAFE (Schneier — o modo de falha decide o design):
//   - SEM chave Asaas configurada  → MockPaymentProvider (sandbox local).
//   - COM chave Asaas configurada  → AsaasProvider REAL. O ambiente é
//     derivado do PREFIXO da chave ($aact_hmlg_ = sandbox); chave de
//     PRODUÇÃO sem `permitirProducao: true` explícito NÃO constrói — e este
//     seletor NUNCA passa `permitirProducao` (ativar produção é um passo
//     deliberado futuro, fora deste seletor).
//   - COM chave mas config INVÁLIDA (ex.: ASAAS_WEBHOOK_AUTH_TOKEN ausente/
//     fraco) → LANÇA (AsaasConfigError). NUNCA degrada para Mock: chave
//     presente = alguém espera pagamento REAL; cair em sandbox em silêncio
//     simularia dinheiro em ambiente que se acredita produtivo — o pior
//     modo de falha possível. (Deliberado: o brief R6 sugeria "erro de
//     config → Mock + log"; a regra inviolável de E12 "o sandbox NUNCA roda
//     se houver chave real" prevalece — downgrade silencioso para Mock é
//     exatamente o ataque que a review antagonista caça.)
// =============================================================================

import { createHash } from 'crypto';
import type { PaymentProvider } from '@leela/core';
import { mockPaymentProvider } from './mockProvider';
import {
  asaasConfigFromEnv,
  createAsaasProvider,
  type AsaasProvider,
} from './asaasProvider';

/** Nome da env var da chave de API do Asaas (D2 — gateway decidido). */
export const ASAAS_API_KEY_ENV = 'ASAAS_API_KEY';

/** Ambiente mínimo que a seleção lê (injetável — testável sem process.env). */
export type ProviderEnv = Record<string, string | undefined>;

/**
 * Há chave Asaas REAL configurada? (string não-vazia após trim —
 * env var vazia/whitespace conta como ausente). @pure
 */
export function hasAsaasKey(env: ProviderEnv): boolean {
  const key = env[ASAAS_API_KEY_ENV];
  return typeof key === 'string' && key.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Instância memoizada do AsaasProvider
//
// Uma instância por (apiKey, webhookAuthToken) no processo: preserva o dedup
// em memória do adapter (refunds/webhooks por entrega) entre invocações da
// mesma Function e evita reconstruir/re-derivar ambiente a cada request.
// Fingerprint por sha256 — a chave NUNCA fica retida em texto além da
// própria config do adapter.
// ---------------------------------------------------------------------------

let asaasCache: { fingerprint: string; provider: AsaasProvider } | null = null;

function asaasProviderDoEnv(env: ProviderEnv): AsaasProvider {
  // Lança AsaasConfigError se chave/token ausentes — propaga (fail-hard).
  const config = asaasConfigFromEnv(env);
  const fingerprint = createHash('sha256')
    .update(`${config.apiKey}\n${config.webhookAuthToken}`, 'utf8')
    .digest('hex');
  if (asaasCache !== null && asaasCache.fingerprint === fingerprint) {
    return asaasCache.provider;
  }
  // Construção valida: prefixo da chave → ambiente; produção sem
  // permitirProducao=true LANÇA (nunca passamos o flag aqui); token de
  // webhook fraco/igual à chave LANÇA. Qualquer erro propaga — com chave
  // presente NÃO existe fallback para Mock.
  const provider = createAsaasProvider(config);
  asaasCache = { fingerprint, provider };
  return provider;
}

/** Reset do cache (SÓ testes — simula processo novo). */
export function resetAsaasProviderCache(): void {
  asaasCache = null;
}

/**
 * Seleciona o PaymentProvider do ambiente.
 *
 * @param env  ambiente (default `process.env`) — injetável nos testes
 * @returns MockPaymentProvider quando NÃO há chave Asaas; AsaasProvider
 *          real (sandbox por prefixo `$aact_hmlg_`) quando há
 * @throws  AsaasConfigError quando há chave mas a config é inválida
 *          (token de webhook ausente/fraco, chave de produção sem
 *          `permitirProducao`, prefixo irreconhecível) — NUNCA degrada
 *          para Mock com chave presente (regra inviolável E12/R6)
 */
export function selectPaymentProvider(
  env: ProviderEnv = process.env
): PaymentProvider {
  if (hasAsaasKey(env)) {
    return asaasProviderDoEnv(env);
  }
  return mockPaymentProvider;
}
