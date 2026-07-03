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
// Plataforma multi-tenant (ADR-009 · E16-S1600-T1)
// ---------------------------------------------------------------------------
export type { TenantStatus, TenantTipo, Tenant, TenantInput } from './platform/tenant';
export { canTransition } from './platform/tenant';
