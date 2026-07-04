import { describe, it, expect } from 'vitest';
import {
  filtrarMembros,
  kpisMembros,
  papelMembroLabel,
  statusMembroBadge,
} from '../membros';
import { mkMembro } from '../../_test/fixtures';

const LISTA = [
  mkMembro({ id: '1', atletaNome: 'Camila Ramos', papel: 'admin', status: 'ativo' }),
  mkMembro({ id: '2', atletaNome: 'Felipe Martins', papel: 'owner', status: 'ativo' }),
  mkMembro({ id: '3', atletaNome: 'Larissa Heidrich', papel: 'membro', status: 'novo' }),
  mkMembro({ id: '4', atletaNome: 'Thiago Bittencourt', papel: 'membro', status: 'inativo' }),
  mkMembro({ id: '5', atletaNome: 'Camila Souza', papel: 'membro', status: 'ativo' }),
];

describe('filtrarMembros', () => {
  it('sem filtros retorna tudo', () => {
    expect(filtrarMembros(LISTA)).toHaveLength(5);
  });

  it('busca "Camila" casa dois membros (case-insensitive)', () => {
    const r = filtrarMembros(LISTA, { busca: 'camila' });
    expect(r.map((m) => m.id).sort()).toEqual(['1', '5']);
  });

  it('status × papel é INTERSEÇÃO, nunca união', () => {
    // status=ativo (1,2,5) ∩ papel=membro (3,4,5) = {5}
    const r = filtrarMembros(LISTA, { status: 'ativo', papel: 'membro' });
    expect(r.map((m) => m.id)).toEqual(['5']);
  });

  it('busca + status + papel combinados', () => {
    // busca "camila" (1,5) ∩ ativo (1,2,5) ∩ membro (3,4,5) = {5}
    const r = filtrarMembros(LISTA, { busca: 'camila', status: 'ativo', papel: 'membro' });
    expect(r.map((m) => m.id)).toEqual(['5']);
  });

  it('filtro que zera retorna lista vazia (base do EmptyState)', () => {
    expect(filtrarMembros(LISTA, { busca: 'zzz' })).toHaveLength(0);
  });
});

describe('kpisMembros', () => {
  it('conta total, ativos, novos, inativos e admins (owner conta como admin)', () => {
    const k = kpisMembros(LISTA);
    expect(k).toEqual({ total: 5, ativos: 3, novos: 1, inativos: 1, admins: 2 });
  });
});

describe('badges e rótulos', () => {
  it('status mapeia para variante semântica (nunca hex)', () => {
    expect(statusMembroBadge('ativo').variant).toBe('vitoria');
    expect(statusMembroBadge('novo').variant).toBe('heroico');
    expect(statusMembroBadge('inativo').variant).toBe('alerta');
  });

  it('papel tem rótulo pt-BR', () => {
    expect(papelMembroLabel('owner')).toBe('Owner');
    expect(papelMembroLabel('admin')).toBe('Admin');
    expect(papelMembroLabel('membro')).toBe('Membro');
  });
});
