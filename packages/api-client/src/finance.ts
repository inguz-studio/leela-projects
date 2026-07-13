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

// ---------------------------------------------------------------------------
// Solicitação e cancelamento de repasse (L2-T3 · RN-351/352/353 · decisão #11)
// ---------------------------------------------------------------------------

export interface RequestRepasseInput {
  /** Valor solicitado (R$, 2 casas). O ESPELHO client de RN-352 é só UX —
   *  o servidor relê o disponível e é autoritativo (failed-precondition). */
  valor: number;
}

export interface RequestRepasseResult {
  repasseId: string;
  estado: 'solicitado';
  valor: number;
  /** Disponível APÓS comprometer esta solicitação (RN-351). */
  disponivel: number;
}

/** Solicita um repasse (tenant_owner). Servidor valida contra o saldo. */
export async function requestRepasse(
  input: RequestRepasseInput
): Promise<RequestRepasseResult> {
  const fn = httpsCallable<RequestRepasseInput, RequestRepasseResult>(
    getLeelaFunctions(),
    'requestRepasse'
  );
  const { data } = await fn(input);
  return data;
}

export interface CancelRepasseInput {
  repasseId: string;
}

export interface CancelRepasseResult {
  repasseId: string;
  estado: 'cancelado';
  /** true = já estava cancelado (retry idempotente). */
  replay: boolean;
}

/** Cancela uma solicitação AINDA em 'solicitado' (só o tenant_owner). */
export async function cancelRepasse(
  input: CancelRepasseInput
): Promise<CancelRepasseResult> {
  const fn = httpsCallable<CancelRepasseInput, CancelRepasseResult>(
    getLeelaFunctions(),
    'cancelRepasse'
  );
  const { data } = await fn(input);
  return data;
}
