import { describe, expect, it, vi } from 'vitest';
import { painelActiveId, shellSidebarSections } from '../sidebar';

describe('painelActiveId', () => {
  it.each([
    ['/', 'visao-geral'],
    ['/eventos', 'eventos'],
    ['/eventos/corrida/kits/novo', 'eventos'],
    ['/clubes', 'clubs'],
    ['/clubes/trail/desafios', 'clubs'],
    ['/financeiro', 'financeiro'],
    ['/financeiro/repasses', 'financeiro'],
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
    // Financeiro navega para a ANÁLISE de vendas (RN-820: rota índice; a SubNav
    // interna alcança os repasses do organizador — RN-349).
    items.find((i) => i.id === 'financeiro')?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/financeiro');
    // Itens ainda inertes (sem rota) permanecem sem onClick — estado honesto.
    expect(items.find((i) => i.id === 'comunicacao')?.onClick).toBeUndefined();
  });

  it('nav-badge de Eventos: contagem > 0 vira badge neutro (mockup)', () => {
    const sections = shellSidebarSections('/', vi.fn(), 3);
    const eventos = sections.flatMap((s) => s.items).find((i) => i.id === 'eventos');
    expect(eventos?.badge).toBe(3);
    expect(eventos?.badgeVariant).toBe('neutral');
  });

  it('sem contagem (null/0/undefined) não há badge — estado honesto', () => {
    for (const contagem of [null, 0, undefined]) {
      const sections = shellSidebarSections('/', vi.fn(), contagem);
      const eventos = sections.flatMap((s) => s.items).find((i) => i.id === 'eventos');
      expect(eventos?.badge, `contagem=${String(contagem)}`).toBeUndefined();
    }
  });

  it('/plataforma: nav própria com 6 itens, ícones e ativo por sub-rota', () => {
    const sections = shellSidebarSections('/plataforma/macro', vi.fn());
    expect(sections).toHaveLength(1);
    const items = sections[0]?.items ?? [];
    expect(items.map((i) => i.id)).toEqual(['tenants', 'termos', 'planos', 'repasses', 'billing', 'macro']);
    expect(items.every((i) => i.icon)).toBe(true);
    expect(items.find((i) => i.id === 'macro')?.active).toBe(true);
    expect(items.find((i) => i.id === 'billing')?.badge).toBe('em breve');
  });

  it('/plataforma/planos: item Planos ativo e navegável (CB-T3)', () => {
    const navigate = vi.fn();
    const sections = shellSidebarSections('/plataforma/planos', navigate);
    const items = sections[0]?.items ?? [];
    const planos = items.find((i) => i.id === 'planos');
    expect(planos?.active).toBe(true);
    planos?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/plataforma/planos');
  });
});
