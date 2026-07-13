// =============================================================================
// @leela/api-client — callables do REPASSE do organizador (LEELA-E09s-L2)
//
// Wrappers tipados de `httpsCallable` para o fluxo de saque (E09-slim).
// SÓ transporte (padrão checkout.ts): validação, saldo, cifra e transições
// são decisão EXCLUSIVA do servidor (RN-352/353/354/357) — nenhum cálculo
// de dinheiro aqui. Contratos = espelho de functions/src/finance/*.
//
// LGPD (RN-354): `saveDadosBancarios` envia o dado em claro APENAS no
// callable (TLS) e recebe de volta SOMENTE a versão mascarada; o número
// completo nunca fica no cliente do organizador.
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import { getLeelaFunctions } from './firebase';

// ---------------------------------------------------------------------------
// Dados bancários (L2-T2 · RN-354 · ADR-014)
// ---------------------------------------------------------------------------

export type TipoContaBancariaInput = 'corrente' | 'poupanca';

export interface SaveDadosBancariosInput {
  banco: string;
  agencia: string;
  /** Número em claro — trafega SÓ no callable; o servidor cifra e mascara. */
  conta: string;
  tipo: TipoContaBancariaInput;
  pix?: string;
  titular: string;
  cpfCnpj: string;
}

/** Versão MASCARADA — a única que o cliente vê de volta (RN-354). */
export interface DadosBancariosMascarados {
  tenantId: string;
  banco: string;
  agencia: string;
  contaMascarada: string;
  tipo: TipoContaBancariaInput;
  pixMascarado: string | null;
  titular: string;
  cpfCnpjMascarado: string;
}

export interface SaveDadosBancariosResult {
  dadosBancarios: DadosBancariosMascarados;
}

/**
 * Cadastra/atualiza os dados bancários do tenant (tenant_owner). Reenvio
 * sobrescreve idempotente preservando `criadoEm`. Retorna SÓ o mascarado.
 */
export async function saveDadosBancarios(
  input: SaveDadosBancariosInput
): Promise<SaveDadosBancariosResult> {
  const fn = httpsCallable<SaveDadosBancariosInput, SaveDadosBancariosResult>(
    getLeelaFunctions(),
    'saveDadosBancarios'
  );
  const { data } = await fn(input);
  return data;
}
