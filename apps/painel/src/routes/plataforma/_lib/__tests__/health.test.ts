import { describe, it, expect } from 'vitest';
import { statusTenantBadge, healthTenantBadge, isTenantCritico } from '../health';

describe('statusTenantBadge', () => {
  it('mapeia ativo → vitoria', () => {
    expect(statusTenantBadge('ativo')).toEqual({ label: 'Ativo', variant: 'vitoria' });
  });
  it('mapeia pending → alerta', () => {
    expect(statusTenantBadge('pending')).toEqual({ label: 'Aguardando', variant: 'alerta' });
  });
  it('mapeia suspenso → vulcao', () => {
    expect(statusTenantBadge('suspenso')).toEqual({ label: 'Suspenso', variant: 'vulcao' });
  });
});

describe('healthTenantBadge', () => {
  it('saudavel → vitoria; atencao → alerta; critico → vulcao', () => {
    expect(healthTenantBadge('saudavel').variant).toBe('vitoria');
    expect(healthTenantBadge('atencao').variant).toBe('alerta');
    expect(healthTenantBadge('critico').variant).toBe('vulcao');
  });
});

describe('isTenantCritico', () => {
  it('só suspenso é crítico', () => {
    expect(isTenantCritico('suspenso')).toBe(true);
    expect(isTenantCritico('ativo')).toBe(false);
    expect(isTenantCritico('pending')).toBe(false);
  });
});
