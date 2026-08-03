// =============================================================================
// packages/api-client/src/platform/onboarding.ts
//
// Superfície de cliente do onboarding do organizador (E16 · RN-414/417).
//
//   - `getContatoOnboarding` lê o canal do CTA "Falar com o time Leela"
//     (`platform/configOnboarding`) — leitura permitida a QUALQUER conta
//     autenticada, porque quem precisa dela é justamente a conta travada.
//     Config ausente/malformada cai no padrão do core (fail-closed com
//     caminho vivo — o botão nunca fica sem destino).
//
//   - `resgatarConviteOrganizador` é o wrapper tipado da callable. Nunca vai
//     virar escrita direta: a coleção de convites é ilegível para o cliente
//     (RN-414) e o carimbo de uso é exclusivo da Function.
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import {
  CONTATO_ONBOARDING_PADRAO,
  PLATFORM_CONFIG_ONBOARDING_DOC,
  resolverContatoOnboarding,
  type ContatoOnboarding,
} from '@leela/core';

/**
 * Canal configurado do CTA (RN-417). Qualquer falha de leitura devolve o
 * padrão: um erro de rede não pode deixar a conta travada sem caminho.
 */
export async function getContatoOnboarding(db: Firestore): Promise<ContatoOnboarding> {
  try {
    const snap = await getDoc(doc(db, 'platform', PLATFORM_CONFIG_ONBOARDING_DOC));
    if (!snap.exists()) return CONTATO_ONBOARDING_PADRAO;
    return resolverContatoOnboarding(snap.get('contatoOnboarding'));
  } catch {
    return CONTATO_ONBOARDING_PADRAO;
  }
}

// ---------------------------------------------------------------------------
// Resgate do código (RN-414) — callable
// ---------------------------------------------------------------------------

export interface ResgatarConviteResult {
  tenantId: string;
  /** true = esta conta já havia resgatado ESTE código (retry idempotente). */
  replay: boolean;
}

/**
 * Resgata o código de convite e provisiona o tenant (RN-414).
 *
 * Erros propagados como FirebaseError:
 *   - `functions/permission-denied` → recusa ÚNICA e genérica do código
 *     (inexistente × usado × revogado × expirado são indistinguíveis);
 *   - `functions/resource-exhausted` → teto de tentativas (RN-415);
 *   - `functions/internal` → falha de INFRA no provisionamento (o código não
 *     foi queimado; vale tentar de novo). Não confunda com recusa: toda
 *     recusa, seja do código, seja do papel da conta, sai como
 *     `permission-denied` — `internal` não é sinal de código válido (o oráculo
 *     que a REV fechou; ver `contaElegivelParaResgate` na Function).
 *
 * Depois do sucesso o chamador PRECISA forçar refresh do ID token: a claim de
 * tenant acabou de nascer e o token em cache ainda não a carrega.
 */
export async function resgatarConviteOrganizador(
  functions: Functions,
  codigo: string
): Promise<ResgatarConviteResult> {
  const call = httpsCallable<{ codigo: string }, ResgatarConviteResult>(
    functions,
    'resgatarConviteOrganizador'
  );
  return (await call({ codigo })).data;
}
