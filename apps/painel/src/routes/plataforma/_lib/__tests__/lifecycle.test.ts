import { describe, it, expect } from 'vitest';
import { lifecycleActionFor, SUSPEND_PREVIEW } from '../lifecycle';

describe('lifecycleActionFor', () => {
  it('pending → aprovar (ativo), direto', () => {
    const a = lifecycleActionFor('pending');
    expect(a).toEqual({ to: 'ativo', label: 'Aprovar tenant', variant: 'primary', confirm: false });
  });

  it('ativo → suspender (suspenso), com confirmação destrutiva', () => {
    const a = lifecycleActionFor('ativo');
    expect(a?.to).toBe('suspenso');
    expect(a?.variant).toBe('destructive');
    expect(a?.confirm).toBe(true);
  });

  it('suspenso → reativar (ativo), direto', () => {
    const a = lifecycleActionFor('suspenso');
    expect(a).toEqual({ to: 'ativo', label: 'Reativar', variant: 'primary', confirm: false });
  });

  it('preview de suspensão preserva dados/membros/histórico', () => {
    expect(SUSPEND_PREVIEW.loses.length).toBeGreaterThan(0);
    expect(SUSPEND_PREVIEW.keeps.join(' ')).toMatch(/hist[óo]rico/i);
  });
});
