// =============================================================================
// functions/src/payments/selectProvider.ts
//
// Seleção do PaymentProvider (ADR-006 · LEELA-E12 · fundação do checkout).
//
// Decisão Vitor 2026-07-11: o checkout roda de ponta a ponta SEM chave/KYC
// do Asaas, via provider sandbox (MockPaymentProvider — REUSADO, não
// duplicado). O AsaasProvider real entra depois ATRÁS DESTA MESMA seleção,
// sem tocar no fluxo.
//
// FAIL-SAFE (Schneier — o modo de falha decide o design):
//   - SEM chave Asaas configurada  → MockPaymentProvider (sandbox).
//   - COM chave Asaas configurada  → LANÇA. Chave presente = alguém espera
//     pagamento REAL; cair em sandbox silenciosamente simularia dinheiro em
//     ambiente que se acredita produtivo — o pior modo de falha possível.
//     Quando o AsaasProvider existir, este é o ÚNICO ponto a trocar.
//   O sandbox NUNCA roda se houver chave real (regra inviolável do brief).
// =============================================================================

import type { PaymentProvider } from '@leela/core';
import { mockPaymentProvider } from './mockProvider';

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

/** Chave real presente mas o adapter Asaas ainda não existe — parada dura. */
export class AsaasNaoImplementadoError extends Error {
  constructor() {
    super(
      `${ASAAS_API_KEY_ENV} está configurada mas o AsaasProvider ainda não ` +
        'foi implementado — o sandbox NUNCA roda com chave real (fail-safe ' +
        'E12). Remova a chave para operar em sandbox, ou aguarde o adapter.'
    );
    this.name = 'AsaasNaoImplementadoError';
  }
}

/**
 * Seleciona o PaymentProvider do ambiente.
 *
 * @param env  ambiente (default `process.env`) — injetável nos testes
 * @returns MockPaymentProvider (sandbox) quando NÃO há chave Asaas
 * @throws  AsaasNaoImplementadoError quando há chave real (fail-safe:
 *          nunca degradar pagamento real para sandbox em silêncio)
 */
export function selectPaymentProvider(
  env: ProviderEnv = process.env
): PaymentProvider {
  if (hasAsaasKey(env)) {
    // Ponto único de troca: quando functions/src/payments/asaasAdapter.ts
    // existir, retornar o adapter real AQUI — o resto do fluxo não muda.
    throw new AsaasNaoImplementadoError();
  }
  return mockPaymentProvider;
}
