// =============================================================================
// packages/core/src/platform/tenant.ts
//
// Modelo da entidade Tenant (produtor/promotor na plataforma).
// Fundação multi-tenant — ADR-009.
//
// Estratégia de partição (ADR-009 §Estratégia de partição):
//   - TENANT-SCOPED: eventos, clubes, inscritos, comunicados, parcerias,
//     programaAfiliacao, pagamentos, equipe, promotores, subscriptions.
//   - GLOBAL: atletas, catalogoAcoes, config/system.
//   - PLATAFORMA: tenants/{id}, tenants/{id}/commercialTerms, platform/…
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Status / lifecycle (RN-402)
// Transições válidas: pending → ativo → suspenso → ativo
// ---------------------------------------------------------------------------

/** Status do ciclo de vida do tenant (RN-402) */
export type TenantStatus = 'pending' | 'ativo' | 'suspenso';

/** Tipo de conta do tenant */
export type TenantTipo = 'produtor' | 'promotor';

// Grafo de transições permitidas — só o platform_admin transita (RN-402)
const VALID_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  pending: ['ativo'],
  ativo: ['suspenso'],
  suspenso: ['ativo'],
};

/**
 * Valida se a transição de status `from → to` é permitida (RN-402).
 *
 * Transições válidas:
 *   pending → ativo       (aprovação/provisionamento)
 *   ativo   → suspenso    (suspensão pelo platform_admin)
 *   suspenso → ativo      (reativação)
 *
 * Qualquer outra transição retorna false.
 *
 * @pure — sem efeitos colaterais; seguro para usar em testes.
 */
export function canTransition(from: TenantStatus, to: TenantStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Entidade Tenant
// ---------------------------------------------------------------------------

/**
 * Perfil do produtor/promotor na plataforma.
 * Coleção: `tenants/{tenantId}` (docId = uuid gerado no provisionamento).
 *
 * ADR-009:
 *   - Dado de um tenant nunca é legível por outro.
 *   - Security Rules: leitura por membro do tenant OU platform_admin;
 *     escrita apenas pelo platform_admin (ou via Function/Admin SDK).
 *   - Campos ∑ (saúde) são mantidos por Cloud Function, nunca pelo cliente.
 */
export interface Tenant {
  /** docId = uuid */
  id: string;
  /** Nome comercial do produtor/promotor */
  nome: string;
  /** Slug único na plataforma (formato: kebab-case, sem espaços) */
  slug: string;
  /** Ciclo de vida (RN-402) */
  status: TenantStatus;
  /** UID do profissional owner (→ profissionais/{ownerUid}) */
  ownerUid: string;
  /** Tipo de conta */
  tipo: TenantTipo;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  // ── Campos ∑ de saúde (mantidos por Cloud Function) ──────────────────────
  /** Receita bruta confirmada acumulada (∑ por Function) */
  gmvAcumulado?: number;
  /** Número de eventos com status 'publicado' ou 'ao_vivo' (∑ por Function) */
  eventosAtivos?: number;
  /** Timestamp da última atividade detectada (Function) */
  ultimaAtividadeEm?: Timestamp;
}

/**
 * Payload mínimo para criar/provisionar um tenant.
 * Validação completa em `functions/src/platform/provisionTenant.ts`.
 */
export interface TenantInput {
  nome: string;
  /** Deve ser único; validado no servidor */
  slug: string;
  tipo: TenantTipo;
  /** E-mail do owner (deve ter conta no Firebase Auth ou será criado) */
  ownerEmail: string;
}
