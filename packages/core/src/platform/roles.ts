// =============================================================================
// packages/core/src/platform/roles.ts
//
// Papéis de plataforma e guards puros de autorização (ADR-009, RN-401).
//
// Regra: o cliente NUNCA é fonte de verdade de papel.
// Claims vêm do token Firebase (setCustomUserClaims via Admin SDK / Function).
// Guards puros aqui são reutilizados por UI e por testes de Rules.
// =============================================================================

import type { PapelEvento } from '../eventos/equipe';

/**
 * Papéis de plataforma via Firebase custom claims (ADR-009, RN-401).
 *
 *   platform_admin — dono da plataforma (cross-tenant, visão macro)
 *   tenant_owner   — produtor/promotor owner do seu tenant
 *   tenant_staff   — membro da equipe do tenant (papel abaixo do owner)
 *   promoter       — afiliado/promotor (cross-evento, dentro do tenant)
 *   athlete        — atleta (identidade global, sem tenantId)
 */
export type Role =
  | 'platform_admin'
  | 'tenant_owner'
  | 'tenant_staff'
  | 'promoter'
  | 'athlete';

/**
 * Custom claims presentes no token Firebase ID após setTenantClaims().
 * Lidos pelas Security Rules e pela lógica de autorização dos apps.
 *
 * `tenantId` é omitido para `athlete` e `platform_admin` (cross-tenant).
 */
export interface AuthClaims {
  role: Role;
  /** Ausente para athlete e platform_admin */
  tenantId?: string;
  /**
   * Papel anterior quando a superfície ADMIN rebaixou o usuário a `athlete`
   * (gravado/limpo SOMENTE por mergeTenantClaims — functions setTenantClaims).
   * Desambigua demoção DELIBERADA do estado byte-idêntico produzido pela
   * corrida do trigger onCreateUser (review Onda1 L2 #12): a exceção
   * athlete+doc do provisionTenant só re-eleva quando este marcador está
   * AUSENTE. Promoção a qualquer papel não-athlete remove o marcador.
   */
  demotedFromRole?: Role;
  /**
   * Papéis POR EVENTO (RN-320 · E04-L4): mapa `eventoId → papel`, mantido
   * EXCLUSIVAMENTE pela Function `setClaimsEquipe` via merge preservador —
   * nunca sobrescreve `role`/`tenantId` nem papéis de outros eventos.
   * Ausente quando o usuário não integra equipe de evento algum.
   */
  eventos?: Record<string, PapelEvento>;
}

/**
 * Por qual PORTA uma escrita de gestão entrou (decisão 43-b · T4). Vive no
 * core porque atravessa as três camadas: a Function carimba, o api-client
 * transporta e a tela mostra de quem foi a mão.
 *
 *   organizador — owner/staff escrevendo no PRÓPRIO tenant;
 *   plataforma  — `platform_admin` agindo cross-tenant sobre tenant alheio.
 *
 * Confundir as duas apaga a única prova de quem mandou mexer na inscrição (ou
 * no dinheiro) de outra empresa.
 */
export type TrilhaOperacao = 'organizador' | 'plataforma';

// ---------------------------------------------------------------------------
// Guards puros — sem efeitos colaterais, seguros para testes
// ---------------------------------------------------------------------------

/**
 * Verifica se os claims indicam um platform_admin.
 * platform_admin acessa dados de qualquer tenant (RN-400).
 */
export function isPlatformAdmin(claims: AuthClaims): boolean {
  return claims.role === 'platform_admin';
}

/**
 * Verifica se o usuário pertence ao tenant especificado.
 * Retorna true também para platform_admin (acesso cross-tenant).
 *
 * Uso: autorização de leitura de dados tenant-scoped (RN-400).
 */
export function belongsToTenant(claims: AuthClaims, tenantId: string): boolean {
  if (isPlatformAdmin(claims)) return true;
  return claims.tenantId === tenantId;
}

/**
 * Verifica se o usuário é owner ou staff de um tenant específico.
 * NÃO inclui platform_admin (use belongsToTenant para isso).
 */
export function isTenantMember(claims: AuthClaims, tenantId: string): boolean {
  return (
    (claims.role === 'tenant_owner' || claims.role === 'tenant_staff') &&
    claims.tenantId === tenantId
  );
}

/**
 * Verifica se o usuário pode elevar papéis (só platform_admin).
 * Usado como guard antes de invocar setTenantClaims (RN-401).
 */
export function canSetClaims(callerClaims: AuthClaims): boolean {
  return isPlatformAdmin(callerClaims);
}
