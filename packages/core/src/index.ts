// =============================================================================
// @leela/core — tipos de domínio base + interface de pagamento
// Ref: leela-specs/modelo-de-dados-firestore.md + ADR-006 + ADR-009
// =============================================================================

// ---------------------------------------------------------------------------
// Timestamp
// Interface estruturalmente compatível com firebase/firestore.Timestamp e
// firebase-admin/firestore.Timestamp (structural typing do TypeScript).
// ---------------------------------------------------------------------------

export interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

// ---------------------------------------------------------------------------
// Enums / literal types de domínio
// ---------------------------------------------------------------------------

/** Papel do membro dentro de um clube (RN-103) */
export type PapelMembro = 'owner' | 'admin' | 'membro';

/** Status derivado do membro no clube (RN-102 — calculado por Function) */
export type StatusMembro = 'ativo' | 'novo' | 'inativo';

/** Via pela qual o atleta entrou no clube */
export type EntradaVia = 'codigo' | 'convite' | 'link';

/** Visibilidade do clube (RN-140) */
export type VisibilidadeClube = 'publica' | 'indexavel' | 'privada';

/** Modelo de entrada do clube (RN-104) */
export type ModeloEntradaClube = 'gratuito' | 'pago_em_breve';

/** Papéis do profissional na plataforma (via custom claims) */
export type PapelProfissional = 'coordenador' | 'organizador' | 'admin';

/** Status do ciclo de vida de um evento */
export type StatusEvento = 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado';

/**
 * Papéis de plataforma via Firebase custom claims (ADR-008, ADR-009).
 * Accompanhados de `tenantId` no claim para todos os papéis não-athlete.
 */
export type RolePlataforma =
  | 'platform_admin'
  | 'tenant_owner'
  | 'tenant_staff'
  | 'promoter'
  | 'athlete';

// ---------------------------------------------------------------------------
// Entidades de domínio base
// ADR-009: todo agregado tenant-scoped carrega tenantId.
// Entidades globais (cross-tenant): Atleta, CatalogoAcao.
// ---------------------------------------------------------------------------

/**
 * Atleta — identidade global cross-tenant.
 * Coleção: `atletas/{atletaId}` (docId = Firebase Auth uid).
 */
export interface Atleta {
  id: string;
  nome: string;
  email: string;
  /** Iniciais usadas como avatar fallback */
  avatarInit?: string;
  criadoEm: Timestamp;
}

/**
 * Profissional — produtor/organizador de eventos e clubes.
 * Coleção: `profissionais/{profId}`.
 * Tenant-scoped via custom claim `tenantId` (ADR-009).
 */
export interface Profissional {
  id: string;
  /** Tenant ao qual este profissional pertence (ADR-009) */
  tenantId: string;
  nome: string;
  /** E-mail único na plataforma */
  email: string;
  /** Papéis atribuídos — granularidade via custom claims */
  papeis: PapelProfissional[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Clube de corrida — tenant-scoped.
 * Coleção: `clubes/{clubId}` (docId = slug).
 * Subcoleções: membros, desafios, parcerias, comunicados, permissoesAdmin.
 */
export interface Clube {
  /** docId = slug */
  id: string;
  /** Isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Máx. 60 caracteres */
  nome: string;
  /** Máx. 280 caracteres */
  descricao: string;
  slug: string;
  categoria: string;
  modalidade: string;
  localizacao: string;
  /** Referência ao profissional owner */
  ownerId: string;
  /** 5 chars; exclui 0/O/1/I/L (RN-101) */
  codigoConvite: string;
  visibilidade: VisibilidadeClube;
  /** Exige aprovação manual de novos membros (RN-141) */
  aprovacaoManual: boolean;
  modeloEntrada: ModeloEntradaClube;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdMembrosAtivos: number;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdDesafiosAtivos: number;
}

/**
 * Membro — join Atleta ↔ Clube.
 * Subcoleção: `clubes/{clubId}/membros/{membroId}`.
 * Herda tenantId do clube pai.
 */
export interface Membro {
  id: string;
  /** Propagado do clube pai para filtragem direta (ADR-009) */
  tenantId: string;
  /** Referência ao atleta */
  atletaId: string;
  /** 🔁 Desnormalizado — mantido por Function */
  atletaNome: string;
  papel: PapelMembro;
  entrouEm: Timestamp;
  entrouVia: EntradaVia;
  /** Status derivado (RN-102) — calculado por Function ou no read via core */
  status: StatusMembro;
}

/**
 * Evento de corrida — tenant-scoped.
 * Coleção: `eventos/{eventoId}` (docId = slug).
 * Subcoleções: inscritos, kits, programaAfiliacao, politicaVendas, aprovisionamento, etc.
 */
export interface Evento {
  /** docId = slug */
  id: string;
  /** Isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Referência ao profissional organizador */
  organizadorId: string;
  nome: string;
  data: Timestamp;
  local: string;
  /** Lista de percursos/modalidades do evento */
  modalidades: string[];
  slug: string;
  status: StatusEvento;
  /** Usa chip de cronometragem (RN-207) */
  usaChip: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdInscritos: number;
  /** Agregado ∑ financeiro confirmado — mantido por Cloud Function */
  receitaConfirmada: number;
}

// ---------------------------------------------------------------------------
// PaymentProvider — interface plugável (ADR-006)
// Nenhum SDK de gateway concreto aqui; adapters ficam em functions/src/payments/
// ---------------------------------------------------------------------------

/** Métodos de pagamento suportados */
export type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

/** Status do ciclo de vida de uma cobrança */
export type ChargeStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/** Status de um estorno */
export type RefundStatus = 'pending' | 'approved' | 'rejected';

/** Status de repasse ao produtor */
export type PayoutStatus = 'pending' | 'scheduled' | 'paid' | 'failed';

/** Dados do pagador/cliente */
export interface CustomerData {
  name: string;
  email: string;
  /** CPF ou CNPJ (opcional, exigido por alguns gateways) */
  taxId?: string;
  phone?: string;
}

/** Item individual dentro de uma cobrança */
export interface ChargeItem {
  id: string;
  description: string;
  /** Valor em centavos */
  amount: number;
  quantity: number;
}

/** Parâmetros para criação de cobrança */
export interface CreateChargeParams {
  /** ID do pedido no domínio Leela (ADR-011) */
  orderId: string;
  tenantId: string;
  /** Valor total em centavos */
  amount: number;
  paymentMethod: PaymentMethod;
  /** Parcelas — somente para cartão de crédito */
  installments?: number;
  customer: CustomerData;
  items: ChargeItem[];
  /** Chave de idempotência obrigatória (invariante: webhook idempotente) */
  idempotencyKey: string;
}

/** Resultado da criação de cobrança */
export interface ChargeResult {
  chargeId: string;
  status: ChargeStatus;
  /** URL de checkout (PIX/boleto) */
  paymentUrl?: string;
  /** Payload do QR Code PIX (base64 ou string raw) */
  qrCode?: string;
  /** URL do boleto bancário */
  boletoUrl?: string;
  /** Linha digitável do boleto */
  boletoBarCode?: string;
  expiresAt?: Timestamp;
}

/** Beneficiário de um split de pagamento */
export interface SplitRecipient {
  /** ID do destinatário no gateway */
  recipientId: string;
  /** Valor em centavos */
  amount: number;
  /** Percentual alternativo ao amount fixo */
  percentage?: number;
}

/** Parâmetros para configuração de split */
export interface SplitRulesParams {
  chargeId: string;
  tenantId: string;
  /** Taxa da plataforma em % (RN-330) */
  platformFeePct: number;
  recipients: SplitRecipient[];
}

/** Resultado do split configurado */
export interface SplitRulesResult {
  ruleId: string;
  chargeId: string;
  recipients: SplitRecipient[];
  appliedAt: Timestamp;
}

/** Parâmetros para solicitação de estorno */
export interface RefundParams {
  chargeId: string;
  tenantId: string;
  /** Valor em centavos; estorno total se omitido */
  amount?: number;
  reason: string;
  /** Chave de idempotência — reprocessamento do webhook não duplica (RN-333) */
  idempotencyKey: string;
}

/** Resultado do estorno */
export interface RefundResult {
  refundId: string;
  chargeId: string;
  status: RefundStatus;
  /** Valor efetivamente estornado em centavos */
  amount: number;
  processedAt: Timestamp;
}

/**
 * Payload bruto recebido do gateway via webhook.
 * Assinatura deve ser verificada antes do processamento (invariante: webhook assinado).
 */
export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  /** Assinatura HMAC ou equivalente do gateway */
  signature: string;
  deliveredAt: string;
}

/** Resultado normalizado do processamento do webhook */
export interface WebhookResult {
  chargeId: string;
  status: ChargeStatus;
  /** Valor confirmado em centavos */
  amount: number;
  processedAt: Timestamp;
}

/** Parâmetros para consulta de repasses */
export interface GetPayoutParams {
  tenantId: string;
  /** Filtro por período; sem filtro = consulta o saldo disponível */
  period?: {
    start: Timestamp;
    end: Timestamp;
  };
}

/** Resultado da consulta de repasse */
export interface PayoutResult {
  payoutId: string;
  tenantId: string;
  /** Valor em centavos */
  amount: number;
  status: PayoutStatus;
  scheduledAt: Timestamp;
  /** Preenchido quando status = 'paid' */
  paidAt?: Timestamp;
}

/**
 * PaymentProvider — contrato plugável de gateway de pagamento (ADR-006).
 *
 * Implementações concretas (Stripe, PagarMe, Asaas, etc.) ficam em
 * `functions/src/payments/{provider}Adapter.ts` e são injetadas por DI.
 * Nenhum cliente nunca instancia o gateway diretamente.
 *
 * Suporte obrigatório a assinatura + split (RN-104, ADR-006).
 */
export interface PaymentProvider {
  /**
   * Cria uma cobrança. Idempotente via `idempotencyKey`.
   * Deve suportar PIX, boleto e cartão de crédito.
   */
  createCharge(params: CreateChargeParams): Promise<ChargeResult>;

  /**
   * Configura regras de split para uma cobrança existente.
   * Chamado após `createCharge` para definir repasse plataforma/produtor.
   */
  splitRules(params: SplitRulesParams): Promise<SplitRulesResult>;

  /**
   * Solicita estorno total ou parcial. Idempotente via `idempotencyKey`.
   * Reverte split quando aplicável (RN-337).
   */
  refund(params: RefundParams): Promise<RefundResult>;

  /**
   * Processa payload de webhook do gateway.
   * DEVE verificar assinatura antes de atualizar estado financeiro.
   * Idempotente — reprocessamento não duplica estado.
   */
  handleWebhook(payload: WebhookPayload): Promise<WebhookResult>;

  /**
   * Consulta repasse disponível ou por período para um tenant.
   */
  getPayout(params: GetPayoutParams): Promise<PayoutResult>;
}
