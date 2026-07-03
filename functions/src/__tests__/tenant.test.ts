/**
 * tenant.test.ts — unit tests para canTransition (LEELA-S1600-T1)
 *
 * Não requer emulador — lógica pura.
 */

import { describe, it, expect } from 'vitest';
import { canTransition } from '@leela/core';

describe('canTransition (RN-402 — lifecycle do tenant)', () => {
  // Transições VÁLIDAS
  it('pending → ativo: permitido (aprovação)', () => {
    expect(canTransition('pending', 'ativo')).toBe(true);
  });

  it('ativo → suspenso: permitido (suspensão)', () => {
    expect(canTransition('ativo', 'suspenso')).toBe(true);
  });

  it('suspenso → ativo: permitido (reativação)', () => {
    expect(canTransition('suspenso', 'ativo')).toBe(true);
  });

  // Transições INVÁLIDAS
  it('pending → suspenso: negado', () => {
    expect(canTransition('pending', 'suspenso')).toBe(false);
  });

  it('ativo → pending: negado (retroação não permitida)', () => {
    expect(canTransition('ativo', 'pending')).toBe(false);
  });

  it('suspenso → pending: negado', () => {
    expect(canTransition('suspenso', 'pending')).toBe(false);
  });

  it('ativo → ativo: negado (self-transition inválida)', () => {
    expect(canTransition('ativo', 'ativo')).toBe(false);
  });

  it('pending → pending: negado', () => {
    expect(canTransition('pending', 'pending')).toBe(false);
  });

  it('suspenso → suspenso: negado', () => {
    expect(canTransition('suspenso', 'suspenso')).toBe(false);
  });
});
