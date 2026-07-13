// =============================================================================
// Testes do gate de papel das Configurações (S304-T2/T3). Cobre o atalho de
// titularidade (dono = organizador), a leitura por claim e o gate célula a
// célula contra a matriz `podeAcessar` de @leela/core (fonte única).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { PAPEIS_EVENTO, podeAcessar, type PapelEvento } from '@leela/core';
import {
  papelDoUsuarioNoEvento,
  podeEditarConfiguracoes,
  podeGerirEquipe,
} from '../gateEvento';

const evento = { id: 'meia-floripa-2026', organizadorId: 'uid-dono' };

describe('papelDoUsuarioNoEvento', () => {
  it('dono do evento é organizador mesmo sem doc/claim de equipe', () => {
    expect(papelDoUsuarioNoEvento(evento, 'uid-dono', null)).toBe('organizador');
    expect(papelDoUsuarioNoEvento(evento, 'uid-dono', { eventos: {} })).toBe('organizador');
  });

  it('membro entra pelo claim eventos[eventoId]', () => {
    const claims = { eventos: { 'meia-floripa-2026': 'financeiro' } };
    expect(papelDoUsuarioNoEvento(evento, 'uid-outro', claims)).toBe('financeiro');
  });

  it('sem claim e sem titularidade → null', () => {
    expect(papelDoUsuarioNoEvento(evento, 'uid-outro', null)).toBeNull();
    expect(papelDoUsuarioNoEvento(evento, null, null)).toBeNull();
  });

  it('claim de OUTRO evento não vaza', () => {
    const claims = { eventos: { 'maratona-2027': 'organizador' } };
    expect(papelDoUsuarioNoEvento(evento, 'uid-outro', claims)).toBeNull();
  });

  it('claim malformado (fora do enum) não vira papel', () => {
    const claims = { eventos: { 'meia-floripa-2026': 'root' } };
    expect(papelDoUsuarioNoEvento(evento, 'uid-outro', claims)).toBeNull();
  });
});

describe('gate de área — espelha a matriz podeAcessar (célula a célula)', () => {
  it.each(PAPEIS_EVENTO)('configuracoes: %s', (papel: PapelEvento) => {
    expect(podeEditarConfiguracoes(papel)).toBe(podeAcessar(papel, 'configuracoes'));
  });

  it.each(PAPEIS_EVENTO)('equipe: %s', (papel: PapelEvento) => {
    expect(podeGerirEquipe(papel)).toBe(podeAcessar(papel, 'equipe'));
  });

  it('só organizador e administrador editam configurações / gerem equipe', () => {
    expect(podeEditarConfiguracoes('organizador')).toBe(true);
    expect(podeEditarConfiguracoes('administrador')).toBe(true);
    expect(podeEditarConfiguracoes('operador')).toBe(false);
    expect(podeEditarConfiguracoes('financeiro')).toBe(false);
    expect(podeGerirEquipe('operador')).toBe(false);
    expect(podeGerirEquipe('financeiro')).toBe(false);
  });

  it('papel null nunca acessa', () => {
    expect(podeEditarConfiguracoes(null)).toBe(false);
    expect(podeGerirEquipe(null)).toBe(false);
  });
});
