import { describe, expect, it, vi } from 'vitest';
import { painelActiveId, shellSidebarSections } from '../sidebar';

describe('painelActiveId', () => {
  it.each([
    ['/', 'visao-geral'],
    ['/eventos', 'eventos'],
    ['/eventos/corrida/kits/novo', 'eventos'],
    ['/clubes', 'clubs'],
    ['/clubes/trail/desafios', 'clubs'],
    ['/health', null],
  ])('%s → %s', (pathname, esperado) => {
    expect(painelActiveId(pathname)).toBe(esperado);
  });
});

describe('shellSidebarSections', () => {
  it('rotas do produtor: 8 itens, todos com ícone, ativo marcado', () => {
    const sections = shellSidebarSections('/eventos', vi.fn());
    const items = sections.flatMap((s) => s.items);
    expect(items).toHaveLength(8);
    expect(items.every((i) => i.icon)).toBe(true);
    expect(items.find((i) => i.id === 'eventos')?.active).toBe(true);
  });

  it('itens com rota conhecida navegam; inertes não têm onClick', () => {
    const navigate = vi.fn();
    const sections = shellSidebarSections('/', navigate);
    const items = sections.flatMap((s) => s.items);
    items.find((i) => i.id === 'clubs')?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/clubes');
    expect(items.find((i) => i.id === 'financeiro')?.onClick).toBeUndefined();
  });

  it('/plataforma: nav própria com 4 itens, ícones e ativo por sub-rota', () => {
    const sections = shellSidebarSections('/plataforma/macro', vi.fn());
    expect(sections).toHaveLength(1);
    const items = sections[0]?.items ?? [];
    expect(items.map((i) => i.id)).toEqual(['tenants', 'termos', 'billing', 'macro']);
    expect(items.every((i) => i.icon)).toBe(true);
    expect(items.find((i) => i.id === 'macro')?.active).toBe(true);
    expect(items.find((i) => i.id === 'billing')?.badge).toBe('em breve');
  });
});
