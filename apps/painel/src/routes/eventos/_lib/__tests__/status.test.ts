import { describe, it, expect } from 'vitest';
import { statusEventoBadge } from '../status';

describe('statusEventoBadge', () => {
  it('mapeia cada status para rótulo + variante semântica', () => {
    expect(statusEventoBadge('rascunho')).toEqual({ label: 'Rascunho', variant: 'neutro' });
    expect(statusEventoBadge('publicado')).toEqual({ label: 'Publicado', variant: 'heroico' });
    expect(statusEventoBadge('ao_vivo')).toEqual({ label: 'Ao vivo', variant: 'vitoria' });
    expect(statusEventoBadge('encerrado')).toEqual({ label: 'Encerrado', variant: 'neutro' });
  });
});
