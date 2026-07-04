// Testa o core puro de convite (packages/core/src/clubs/convite.ts, S104-T1)
// consumido via @leela/core — cobre RN-106.
import { describe, it, expect } from 'vitest';
import {
  CONVITE_MAX_EMAILS,
  parseEmails,
  validarConvite,
  validarEmail,
} from '@leela/core';

const emailsValidos = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `atleta${i}@gmail.com`);

describe('validarEmail', () => {
  it('aceita formato válido e rejeita inválido', () => {
    expect(validarEmail('pedro@gmail.com')).toBe(true);
    expect(validarEmail('sem-arroba')).toBe(false);
    expect(validarEmail('a@b')).toBe(false);
    expect(validarEmail('a b@c.com')).toBe(false);
  });
});

describe('parseEmails', () => {
  it('separa por vírgula, ponto e vírgula, espaço e quebra de linha', () => {
    expect(parseEmails('a@x.com, b@x.com; c@x.com\nd@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
      'd@x.com',
    ]);
  });

  it('deduplica (case-insensitive) e descarta vazios', () => {
    expect(parseEmails('a@x.com, A@X.COM,, b@x.com')).toEqual(['a@x.com', 'b@x.com']);
  });
});

describe('validarConvite (RN-106)', () => {
  it('1 email é válido', () => {
    expect(validarConvite(['pedro@gmail.com']).valido).toBe(true);
  });

  it('50 emails é válido (limite superior)', () => {
    expect(validarConvite(emailsValidos(CONVITE_MAX_EMAILS)).valido).toBe(true);
  });

  it('0 email é inválido (mínimo)', () => {
    const r = validarConvite([]);
    expect(r.valido).toBe(false);
    expect(r.erros.length).toBeGreaterThan(0);
  });

  it('51 emails é inválido (máximo)', () => {
    const r = validarConvite(emailsValidos(51));
    expect(r.valido).toBe(false);
    expect(r.erros.some((e) => e.includes('50'))).toBe(true);
  });

  it('email com formato inválido invalida o lote e é listado', () => {
    const r = validarConvite(['ok@gmail.com', 'quebrado']);
    expect(r.valido).toBe(false);
    expect(r.invalidos).toContain('quebrado');
  });
});
