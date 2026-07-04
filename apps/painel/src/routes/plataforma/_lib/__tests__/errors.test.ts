import { describe, it, expect } from 'vitest';
import { platformErrorMessage } from '../errors';

describe('platformErrorMessage', () => {
  it('failed-precondition → mensagem de guarda de papel/estado', () => {
    const msg = platformErrorMessage({ code: 'functions/failed-precondition' });
    expect(msg).toMatch(/papel conflitante|transi[çc][ãa]o/i);
  });

  it('permission-denied → mensagem de permissão de admin', () => {
    expect(platformErrorMessage({ code: 'functions/permission-denied' })).toMatch(/permiss[ãa]o/i);
  });

  it('already-exists → slug já vinculado', () => {
    expect(platformErrorMessage({ code: 'functions/already-exists' })).toMatch(/slug/i);
  });

  it('code desconhecido → fallback genérico', () => {
    expect(platformErrorMessage(new Error('boom'))).toMatch(/n[ãa]o foi poss[íi]vel/i);
  });

  it('null/undefined → string vazia', () => {
    expect(platformErrorMessage(null)).toBe('');
    expect(platformErrorMessage(undefined)).toBe('');
  });
});
