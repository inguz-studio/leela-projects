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
import type { FormaPagamento, GeneroInscrito } from '@leela/core';
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
  /**
   * TAXAFLEX (RN-180 · S1210): total À VISTA do comprador POR OPÇÃO de meio
   * — a UI exibe o total em cada opção antes de pagar (PIX vs cartão) quando
   * a taxa é repassada e varia por meio. SÓ valores em R$ (nunca %). `null`
   * num meio = derivação indisponível; ausente = servidor antigo (a UI cai
   * no comportamento vigente sem total por opção).
   */
  totaisPorMeio?: { pix: number | null; cartao_credito: number | null };
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
  /**
   * Map `itemId → sufixo de SKU` (RN-223/RN-231 · TAMANHOS-GRADE): `'M'`
   * (grade única/unissex) ou `'feminina__M'` (grade por corte) — POR
   * INSCRITO (cada atleta escolhe o seu). O servidor valida FAIL-CLOSED
   * contra a grade configurada do evento; forjado ⇒ invalid-argument.
   */
  tamanhos?: Record<string, string>;
  /**
   * Nascimento date-only `yyyy-mm-dd` POR ATLETA (CKMOD · spec §5.1).
   * Opcional; o servidor valida (data civil, ≥ 1900, no passado) e persiste
   * no bloco `[reg]` do inscrito.
   */
  nascimento?: string;
  /**
   * Gênero POR INSCRITO (CK2 · RN-154) — enum canônico GENEROS_INSCRITO do
   * core (o mesmo da demografia RN-820/822). Opcional; o servidor valida
   * contra o enum e persiste no `[reg]` + nos dados conhecidos da pessoa.
   */
  genero?: GeneroInscrito;
}

/** Endereço do COMPRADOR (CKMOD · spec §5.1 item 3) — 1× por pedido. */
export interface CheckoutEnderecoInput {
  /** CEP com ou sem máscara (o servidor canoniza p/ 8 dígitos). */
  cep: string;
  logradouro: string;
  /** Pode ser vazio (CEP rural/novo — lookup não devolve). */
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento?: string;
}

export interface CreateInscricaoChargeInput {
  eventoId: string;
  inscritos: CheckoutInscritoInput[];
  responsavelIndex?: number;
  /** `telefone` (CKMOD §5.1): canal de contato do pedido — opcional. */
  responsavel: { nome: string; email: string; telefone?: string };
  /** Endereço do comprador (CKMOD §5.1) — validado/persistido no servidor. */
  endereco?: CheckoutEnderecoInput;
  /**
   * Aceites do pagar (CKMOD §5.3): a UI envia SÓ os booleans confirmados
   * ({termos: true, saude: true}); versão vigente + timestamp são carimbados
   * pelo SERVIDOR (RN-149 pattern — nunca enviar/aceitar versão daqui).
   * OBRIGATÓRIO (CKFORM-T3 · flip F-4a): pedido sem os 2 aceites é
   * REJEITADO server-side.
   */
  aceites: {
    termos: boolean;
    saude: boolean;
    /**
     * CK2 (RN-156): aceite do termo de saúde CUSTOM do organizador —
     * OBRIGATÓRIO quando o evento tem termo custom ativo (o leitor público
     * projeta `termoSaudeCustom`); o servidor rejeita fail-closed sem ele.
     */
    saudeCustom?: boolean;
  };
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
  /**
   * Expiração da cobrança PIX em epoch-ms (CK2 · RN-157) — presente só no
   * PIX. Base do TIMER de 30 min da UI; replay devolve a MESMA expiração.
   */
  pixExpiraEmMillis?: number;
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
// Prefill do checkout (CK2 · RN-154 — dados conhecidos do PRÓPRIO comprador)
// ---------------------------------------------------------------------------

/** Endereço pré-preenchível (espelho de EnderecoPedido — CEP canônico). */
export interface CheckoutPrefillEndereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento?: string;
}

/** Dados conhecidos da PRÓPRIA pessoa ('' = não conhecido). */
export interface CheckoutPrefill {
  nome: string;
  /** CPF canônico (11 dígitos) — o PRÓPRIO, da pessoa vinculada à conta. */
  cpf: string;
  genero: GeneroInscrito;
  nascimento: string;
  telefone: string;
  endereco?: CheckoutPrefillEndereco;
}

export interface GetCheckoutPrefillResult {
  /**
   * null = sem prefill (sessão anônima, sem vínculo, sem dados, e-mail não
   * verificado ou não correspondente — RN-174: denies indistinguíveis).
   */
  prefill: CheckoutPrefill | null;
}

/**
 * Dados conhecidos do comprador AUTENTICADO para pré-preencher o checkout
 * (RN-154). O servidor resolve pela pessoa VINCULADA à conta (RN-173) —
 * nunca há canal para pedir dados de terceiro; sessão anônima recebe null.
 * RN-174: o vínculo só nasce com pagamento CONFIRMADO + conta do e-mail da
 * compra, e a leitura ainda exige e-mail do token VERIFICADO (Firebase
 * nativo) e igual ao da compra — sem isso o resultado é `prefill: null`
 * (mesmo shape de "sem ficha"; a UI só abre o form vazio).
 */
export async function getCheckoutPrefill(): Promise<GetCheckoutPrefillResult> {
  const fn = httpsCallable<Record<string, never>, GetCheckoutPrefillResult>(
    getLeelaFunctions(),
    'getCheckoutPrefill'
  );
  const res = await fn({});
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
// Expiração do PIX (CK2 · RN-157 — timer de 30 min)
// ---------------------------------------------------------------------------

export interface ExpirarPixPendenteInput {
  pedidoId: string;
}

export interface ExpirarPixPendenteResult {
  pedidoId: string;
  /** Estado do pedido APÓS a chamada ('cancelado' quando expirou). */
  statusPedido: string;
  /** true = esta chamada aplicou pendente → cancelado (pix_expirado). */
  expirado: boolean;
  /** true = pedido já estava em estado final (resposta idempotente). */
  jaFinal: boolean;
}

/**
 * Materializa a expiração do PIX quando o timer da UI zera (RN-157): o
 * SERVIDOR confere o próprio relógio (chamar antes da hora ⇒
 * failed-precondition) e transiciona pendente → cancelado (pix_expirado).
 * O retry do comprador é NOVA cotação (novo pedido, idempotencyKey nova).
 * NOTA (CK2): o re-export raiz do pacote fica para o lote CHECKOUT2-FORM
 * (arquivo index.ts em edição por outra lane) — importar de
 * '@leela/api-client/src/checkout' ou adicionar o re-export na fiação da UI.
 */
export async function expirarPixPendente(
  input: ExpirarPixPendenteInput
): Promise<ExpirarPixPendenteResult> {
  const fn = httpsCallable<ExpirarPixPendenteInput, ExpirarPixPendenteResult>(
    getLeelaFunctions(),
    'expirarPixPendente'
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
