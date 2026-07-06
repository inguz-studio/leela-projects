import { describe, it, expect } from 'vitest';
import { eventoEsgotado, statusEventoBadge } from '../status';

describe('statusEventoBadge', () => {
  it('mapeia cada status para rótulo + variante semântica', () => {
    expect(statusEventoBadge('rascunho')).toEqual({ label: 'Rascunho', variant: 'neutro' });
    expect(statusEventoBadge('publicado')).toEqual({ label: 'Publicado', variant: 'heroico' });
    expect(statusEventoBadge('ao_vivo')).toEqual({ label: 'Ao vivo', variant: 'vitoria' });
    expect(statusEventoBadge('encerrado')).toEqual({ label: 'Encerrado', variant: 'neutro' });
  });
});

describe('eventoEsgotado (QA m2)', () => {
  it('true só com capacidade conhecida e lotação atingida', () => {
    expect(eventoEsgotado({ qtdInscritos: 60, capacidade: 60 })).toBe(true);
    expect(eventoEsgotado({ qtdInscritos: 61, capacidade: 60 })).toBe(true);
    expect(eventoEsgotado({ qtdInscritos: 59, capacidade: 60 })).toBe(false);
  });

  it('sem capacidade (null/undefined/0) nunca afirma esgotamento — honesto', () => {
    expect(eventoEsgotado({ qtdInscritos: 999, capacidade: null })).toBe(false);
    expect(eventoEsgotado({ qtdInscritos: 999 })).toBe(false);
    expect(eventoEsgotado({ qtdInscritos: 0, capacidade: 0 })).toBe(false);
  });
});
