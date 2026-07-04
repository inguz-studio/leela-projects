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

/** Papéis do profissional na plataforma (via custom claims) */
export type PapelProfissional = 'coordenador' | 'organizador' | 'admin';

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

// ---------------------------------------------------------------------------
// PaymentProvider — interface plugável (ADR-006)
// Movida para src/payments/PaymentProvider.ts; re-exportada aqui para
// manter retrocompatibilidade de imports de '@leela/core'.
// ---------------------------------------------------------------------------
export type {
  PaymentMethod,
  ChargeStatus,
  RefundStatus,
  PayoutStatus,
  CustomerData,
  ChargeItem,
  CreateChargeParams,
  ChargeResult,
  SplitRecipient,
  ResolvedSplitRecipient,
  SplitRulesParams,
  SplitRulesResult,
  RefundParams,
  RefundResult,
  WebhookPayload,
  WebhookResult,
  GetPayoutParams,
  PayoutResult,
  PaymentProvider,
} from './payments/PaymentProvider';

// ---------------------------------------------------------------------------
// Módulo Clubs (LEELA-E05 · S101-T1)
// Entidade Clube movida para src/clubs/clube.ts; re-exportada aqui para
// manter retrocompatibilidade de imports de '@leela/core'.
// ---------------------------------------------------------------------------
export type {
  Clube,
  ClubeInput,
  PapelClube,
  VisibilidadeClube,
  ModeloEntradaClube,
} from './clubs';
export {
  CLUBE_NOME_MAX,
  CLUBE_DESCRICAO_MAX,
  validarSlugClube,
  validarClube,
  ALFABETO_CODIGO_CONVITE,
  TAMANHO_CODIGO_CONVITE,
  gerarCodigoConvite,
  validarCodigoConvite,
} from './clubs';

// ---------------------------------------------------------------------------
// Módulo Eventos (LEELA-E03 · S200-T1 / S203-T1 / S205-T1)
// Entidade Evento movida para src/eventos/evento.ts; re-exportada aqui para
// manter retrocompatibilidade de imports de '@leela/core'.
// ---------------------------------------------------------------------------
export type { Evento, StatusEvento } from './eventos/evento';
export {
  STATUS_EVENTO,
  isStatusEvento,
  CAMPOS_AGREGADOS_EVENTO,
  temVenda,
  eventoPublico,
  parseEvento,
} from './eventos/evento';

export type { Inscrito, KitInscrito, StatusInscrito } from './eventos/inscrito';
export {
  KITS_INSCRITO,
  isKitInscrito,
  STATUS_INSCRITO,
  isStatusInscrito,
  CAMPOS_FUNCTION_INSCRITO,
  chipVinculado,
  inscritoAtivo,
  parseInscrito,
} from './eventos/inscrito';

export type { Kit, ItemKit, OrigemItem, UsadoEmKit } from './eventos/kit';
export {
  precoKitValido,
  kitEhDesconto,
  parseKit,
  ORIGENS_ITEM,
  isOrigemItem,
  podeExibirLogo,
  exibirLogoCoerente,
  computeUsadoEm,
  parseItemKit,
} from './eventos/kit';

// ---------------------------------------------------------------------------
// Plataforma multi-tenant (ADR-009 · E16-S1600)
// ---------------------------------------------------------------------------
export type { TenantStatus, TenantTipo, Tenant, TenantInput } from './platform/tenant';
export { canTransition } from './platform/tenant';

// Papéis e guards puros (E16-S1600-T2)
export type { Role, AuthClaims } from './platform/roles';
export { isPlatformAdmin, belongsToTenant, isTenantMember, canSetClaims } from './platform/roles';

// Termos comerciais por tenant (E16-S1602-T1 · RN-404/405/406/410)
export type {
  InstallmentRules,
  Anticipation,
  CommercialTerms,
  CommercialTermsInput,
} from './platform/commercialTerms';
export {
  DEFAULT_COMMERCIAL_TERMS,
  validateCommercialTerms,
  isValidTermsVersionBump,
} from './platform/commercialTerms';

// Provisionamento de tenant (E16-S1601-T1 · RN-403)
export type { ProvisionInput } from './platform/provisioning';
export { validateProvisionInput, buildInitialTerms } from './platform/provisioning';

