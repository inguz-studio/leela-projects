/**
 * roles.test.ts — unit tests para guards puros de autorização (LEELA-S1600-T2)
 *
 * Não requer emulador — lógica pura.
 */

import { describe, it, expect } from 'vitest';
import {
  isPlatformAdmin,
  belongsToTenant,
  isTenantMember,
  canSetClaims,
} from '@leela/core';
import type { AuthClaims } from '@leela/core';

// Fixtures de claims
const adminClaims: AuthClaims = { role: 'platform_admin' };
const ownerCastelo: AuthClaims = { role: 'tenant_owner', tenantId: 'castelo-producoes' };
const staffCastelo: AuthClaims = { role: 'tenant_staff', tenantId: 'castelo-producoes' };
const ownerPasso: AuthClaims = { role: 'tenant_owner', tenantId: 'passo-certo' };
const athleteClaims: AuthClaims = { role: 'athlete' };

describe('isPlatformAdmin', () => {
  it('retorna true para platform_admin', () => {
    expect(isPlatformAdmin(adminClaims)).toBe(true);
  });

  it('retorna false para tenant_owner', () => {
    expect(isPlatformAdmin(ownerCastelo)).toBe(false);
  });

  it('retorna false para athlete', () => {
    expect(isPlatformAdmin(athleteClaims)).toBe(false);
  });
});

describe('belongsToTenant', () => {
  it('platform_admin pertence a qualquer tenant (acesso cross-tenant)', () => {
    expect(belongsToTenant(adminClaims, 'castelo-producoes')).toBe(true);
    expect(belongsToTenant(adminClaims, 'passo-certo')).toBe(true);
    expect(belongsToTenant(adminClaims, 'qualquer-tenant')).toBe(true);
  });

  it('tenant_owner pertence ao próprio tenant', () => {
    expect(belongsToTenant(ownerCastelo, 'castelo-producoes')).toBe(true);
  });

  it('tenant_owner NÃO pertence a outro tenant (RN-400)', () => {
    expect(belongsToTenant(ownerCastelo, 'passo-certo')).toBe(false);
  });

  it('athlete não pertence a nenhum tenant (sem tenantId)', () => {
    expect(belongsToTenant(athleteClaims, 'castelo-producoes')).toBe(false);
  });

  it('dado belongsToTenant(claims,"A") com claims.tenantId="B" → false', () => {
    // Critério de aceite explícito do épico
    expect(belongsToTenant(ownerPasso, 'castelo-producoes')).toBe(false);
  });
});

describe('isTenantMember', () => {
  it('tenant_owner é membro do próprio tenant', () => {
    expect(isTenantMember(ownerCastelo, 'castelo-producoes')).toBe(true);
  });

  it('tenant_staff é membro do próprio tenant', () => {
    expect(isTenantMember(staffCastelo, 'castelo-producoes')).toBe(true);
  });

  it('tenant_owner NÃO é membro de outro tenant', () => {
    expect(isTenantMember(ownerCastelo, 'passo-certo')).toBe(false);
  });

  it('platform_admin NÃO é membro (usa belongsToTenant para cross-tenant)', () => {
    // platform_admin não deve aparecer como "member" — usa isPlatformAdmin()
    expect(isTenantMember(adminClaims, 'castelo-producoes')).toBe(false);
  });

  it('athlete não é membro de nenhum tenant', () => {
    expect(isTenantMember(athleteClaims, 'castelo-producoes')).toBe(false);
  });
});

describe('canSetClaims', () => {
  it('platform_admin pode setar claims', () => {
    expect(canSetClaims(adminClaims)).toBe(true);
  });

  it('tenant_owner não pode setar claims', () => {
    expect(canSetClaims(ownerCastelo)).toBe(false);
  });

  it('athlete não pode setar claims', () => {
    expect(canSetClaims(athleteClaims)).toBe(false);
  });
});
