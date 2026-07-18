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
  /** Id do kit real do evento (`eventos/{id}/kits/{kitId}`) — soma o delta. */
  kitId?: string;
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
  /** Nome do kit escolhido (rótulo do Resumo) — `null` quando sem kit. */
  kitNome: string | null;
  /** Delta do kit já embutido em `preco` (0 sem kit; NEGATIVO = desconto). */
  kitPreco: number;
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
  // Cotação pública/anônima NÃO expõe a `taxa` (repasse do organizador):
  // revelaria o platformFeePct do termo privado do tenant (RN-330/RN-404).
  // O comprador paga `totalCobrado`; a taxa vive no painel autenticado.
  /**
   * Taxa de serviço paga pelo COMPRADOR (RN-347): 0 = evento 'incorporada'
   * (sem linha no Resumo); > 0 = 'repassada' — a UI mostra "Taxa de serviço
   * R$ X,XX" (VALOR já embutido em `totalCobrado`; nunca percentual).
   */
  taxaServico: number;
  /**
   * Total à vista do comprador SEM juros (valorFinal + taxaServico) — o
   * "à vista sai por" do Resumo. Em 'incorporada' == valorFinal.
   */
  totalAVista: number;
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
  /** Rótulo do kit persistido no inscrito (RN-202) — default 'sem_kit'. */
  kit?: KitInscritoInput;
  /** Id do kit real do evento — precifica o delta via o core (RN-210/211). */
  kitId?: string;
}

export interface CreateInscricaoChargeInput {
  eventoId: string;
  inscritos: CheckoutInscritoInput[];
  responsavelIndex?: number;
  responsavel: { nome: string; email: string };
  forma: FormaPagamento;
  parcelas: number;
  cupomCodigo?: string;
  /**
   * Atribuição de afiliado (R9-E · RN-313): refCodigo do `?ref=` +
   * instante do PRIMEIRO clique (localStorage). Ref desconhecido/fora da
   * janela NUNCA bloqueia a compra — o servidor só descarta a atribuição.
   */
  ref?: { codigo: string; clicadoEmMillis?: number };
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
    /** Taxa de serviço do COMPRADOR (RN-347): 0 em 'incorporada'; valor em R$. */
    taxaServico: number;
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

// ---------------------------------------------------------------------------
// Estorno por inscrito (organizador — LEELA-E04 · FABLE-B · ADR-011 · RN-337/341)
// ---------------------------------------------------------------------------

/**
 * Input do estorno por inscrito — SEM canal de valor: o QUANTO estornar é
 * decisão EXCLUSIVA do servidor (lê `pedido.itens[].valorFinal`, RN-337).
 * Espelho do contrato de `functions/src/checkout/estornarInscricao.ts`.
 */
export interface EstornarInscricaoInput {
  pedidoId: string;
  inscritoId: string;
  /** Motivo do estorno (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

/** Resultado do estorno — os valores VÊM do servidor, nunca calculados aqui. */
export interface EstornarInscricaoResult {
  pedidoId: string;
  pagamentoId: string;
  inscritoId: string;
  /** Id do refund no gateway (prova da devolução). */
  refundId: string;
  /** Valor estornado em R$ — a LINHA do inscrito, decidida pelo servidor. */
  valorEstornado: number;
  /** true = estorno já aplicado antes (replay idempotente) — sem efeito novo. */
  duplicado: boolean;
  /** true = com este estorno o pagamento ficou INTEGRALMENTE estornado. */
  pagamentoEstornadoIntegral: boolean;
}

/**
 * Estorna UM inscrito do pedido em grupo (ADR-011/RN-341). Só transporte:
 * envia (pedido, inscrito, motivo) e devolve o resultado do servidor.
 * Idempotente por (pedidoId, inscritoId) NO servidor — reenviar não re-estorna.
 */
export async function estornarInscricao(
  input: EstornarInscricaoInput
): Promise<EstornarInscricaoResult> {
  const fn = httpsCallable<EstornarInscricaoInput, EstornarInscricaoResult>(
    getLeelaFunctions(),
    'estornarInscricao'
  );
  const res = await fn(input);
  return res.data;
}
