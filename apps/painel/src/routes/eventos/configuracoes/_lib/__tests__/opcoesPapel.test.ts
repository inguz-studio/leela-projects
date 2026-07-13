// =============================================================================
// Testes da alçada de gestão de papéis (S304-T3) — espelha a anti-escalada do
// servidor (podeGerirPapelEquipe): admin não mexe no organizador, ninguém gere
// o próprio papel, convite nunca cria organizador.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { papeisAtribuiveis, papeisConvidaveis, podeGerirMembro } from '../opcoesPapel';

describe('papeisAtribuiveis', () => {
  it('organizador atribui os 4 papéis', () => {
    expect(papeisAtribuiveis('organizador')).toEqual([
      'organizador',
      'administrador',
      'operador',
      'financeiro',
    ]);
  });
  it('administrador nunca atribui organizador', () => {
    expect(papeisAtribuiveis('administrador')).toEqual([
      'administrador',
      'operador',
      'financeiro',
    ]);
  });
  it('operador/financeiro/null não gerem equipe', () => {
    expect(papeisAtribuiveis('operador')).toEqual([]);
    expect(papeisAtribuiveis('financeiro')).toEqual([]);
    expect(papeisAtribuiveis(null)).toEqual([]);
  });
});

describe('papeisConvidaveis', () => {
  it('convite nunca inclui organizador (nem para o dono)', () => {
    expect(papeisConvidaveis('organizador')).toEqual(['administrador', 'operador', 'financeiro']);
    expect(papeisConvidaveis('administrador')).toEqual(['administrador', 'operador', 'financeiro']);
    expect(papeisConvidaveis('operador')).toEqual([]);
  });
});

describe('podeGerirMembro', () => {
  it('organizador gere administrador/operador/financeiro', () => {
    for (const papel of ['administrador', 'operador', 'financeiro'] as const) {
      expect(
        podeGerirMembro({ gestor: 'organizador', gestorUid: 'g', membroPapel: papel, membroUid: 'm' }),
      ).toBe(true);
    }
  });

  it('administrador NÃO destitui o organizador', () => {
    expect(
      podeGerirMembro({ gestor: 'administrador', gestorUid: 'g', membroPapel: 'organizador', membroUid: 'dono' }),
    ).toBe(false);
  });

  it('organizador pode gerir outro organizador (transferência é alçada dele)', () => {
    expect(
      podeGerirMembro({ gestor: 'organizador', gestorUid: 'g', membroPapel: 'organizador', membroUid: 'outro' }),
    ).toBe(true);
  });

  it('ninguém gere o próprio papel', () => {
    expect(
      podeGerirMembro({ gestor: 'organizador', gestorUid: 'eu', membroPapel: 'organizador', membroUid: 'eu' }),
    ).toBe(false);
    expect(
      podeGerirMembro({ gestor: 'administrador', gestorUid: 'eu', membroPapel: 'administrador', membroUid: 'eu' }),
    ).toBe(false);
  });

  it('operador/financeiro não gerem ninguém', () => {
    expect(
      podeGerirMembro({ gestor: 'operador', gestorUid: 'g', membroPapel: 'operador', membroUid: 'm' }),
    ).toBe(false);
    expect(
      podeGerirMembro({ gestor: 'financeiro', gestorUid: 'g', membroPapel: 'financeiro', membroUid: 'm' }),
    ).toBe(false);
  });
});
