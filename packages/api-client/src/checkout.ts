// =============================================================================
// @leela/api-client — callables do checkout público (LEELA-S1203)
//
// Wrappers tipados de `httpsCallable` para o fluxo de 5 etapas. NENHUM cálculo
// de dinheiro aqui — só transporte: a UI envia o input, o servidor (core)
// devolve os valores. Os contratos abaixo são o ESPELHO dos contratos das Cloud
// Functions (functions/src/checkout/*) — o cliente não depende de `functions`.
//
// Auth: todas exigem sessão (anon uid — ver `loginAnonimo`). O token é anexado
// automaticamente pelo Firebase SDK.
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import type { FormaPagamento } from '@leela/core';
import { getLeelaFunctions } from './firebase';

// ---------------------------------------------------------------------------
// Cotação read-only (etapa Resumo)
// ---------------------------------------------------------------------------

export interface CotarItemInput {
  modalidade: string;
}

export interface CotarInscricaoCheckoutInput {
  eventoId: string;
  itens: CotarItemInput[];
  forma: FormaPagamento;
  parcelas: number;
  cupomCodigo?: string;
}

export interface CotarItemResult {
  modalidade: string;
  loteNome: string | null;
  preco: number;
}

export interface CotarParcelaResult {
  parcelas: number;
  valorParcela: number;
  valorTotal: number;
}

export interface CotarInscricaoCheckoutResult {
  itens: CotarItemResult[];
  valorBase: number;
  desconto: number;
  valorFinal: number;
  cupomAplicado: { codigo: string; tipo: string; valor: number } | null;
  taxa: number;
  opcoesParcelamento: CotarParcelaResult[];
  parcelamento: CotarParcelaResult;
  totalCobrado: number;
  forma: FormaPagamento;
}

/** Cota a venda (base→desconto→final→parcelas) sem escrever nada. Read-only. */
export async function cotarInscricaoCheckout(
  input: CotarInscricaoCheckoutInput
): Promise<CotarInscricaoCheckoutResult> {
  const fn = httpsCallable<CotarInscricaoCheckoutInput, CotarInscricaoCheckoutResult>(
    getLeelaFunctions(),
    'cotarInscricaoCheckout'
  );
  const res = await fn(input);
  return res.data;
}

// ---------------------------------------------------------------------------
// Criação do pedido + cobrança (etapa Pagamento)
// ---------------------------------------------------------------------------

/** Kit do inscrito (RN-202) — espelho de KitInscrito do core. */
export type KitInscritoInput = 'kit_ouro' | 'kit_prata' | 'kit_basico' | 'sem_kit';

export interface CheckoutInscritoInput {
  nome: string;
  email: string;
  cpf: string;
  modalidade: string;
  kit?: KitInscritoInput;
}

export interface CreateInscricaoChargeInput {
  eventoId: string;
  inscritos: CheckoutInscritoInput[];
  responsavelIndex?: number;
  responsavel: { nome: string; email: string };
  forma: FormaPagamento;
  parcelas: number;
  cupomCodigo?: string;
  /** Chave de idempotência do cliente (8–64 A-Za-z0-9_- — RN-333). */
  idempotencyKey: string;
}

export interface CreateInscricaoChargeResult {
  pedidoId: string;
  pagamentoId: string;
  inscritoIds: string[];
  chargeId: string;
  paymentUrl?: string;
  qrCode?: string;
  statusPedido: string;
  valores: {
    valorBase: number;
    desconto: number;
    valorFinal: number;
    totalCobrado: number;
    parcelas: number;
    valorParcela: number;
  };
}

/**
 * Cria o pedido em grupo (ADR-011) + emite a cobrança no provider (Mock no
 * sandbox). Idempotente por (uid, idempotencyKey): reenviar com a MESMA chave
 * devolve o MESMO pedido/cobrança — a UI reusa a chave no retry.
 */
export async function createInscricaoCharge(
  input: CreateInscricaoChargeInput
): Promise<CreateInscricaoChargeResult> {
  const fn = httpsCallable<CreateInscricaoChargeInput, CreateInscricaoChargeResult>(
    getLeelaFunctions(),
    'createInscricaoCharge'
  );
  const res = await fn(input);
  return res.data;
}

// ---------------------------------------------------------------------------
// Confirmação sandbox (etapa Confirmação — "o Mock dispara o webhook")
// ---------------------------------------------------------------------------

export interface ConfirmarPagamentoSandboxInput {
  pedidoId: string;
}

export interface ConfirmarPagamentoSandboxResult {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  statusGateway: string;
  duplicado: boolean;
  ignorado: boolean;
  statusPedido: string;
}

/**
 * Dispara o webhook de confirmação ASSINADO (sandbox) — fecha
 * pedido→pago/inscrito→confirmado pela única porta de confirmação. Fail-closed
 * com chave Asaas real. Idempotente por pedido (reenviar não duplica receita).
 */
export async function confirmarPagamentoSandbox(
  input: ConfirmarPagamentoSandboxInput
): Promise<ConfirmarPagamentoSandboxResult> {
  const fn = httpsCallable<ConfirmarPagamentoSandboxInput, ConfirmarPagamentoSandboxResult>(
    getLeelaFunctions(),
    'confirmarPagamentoSandbox'
  );
  const res = await fn(input);
  return res.data;
}
