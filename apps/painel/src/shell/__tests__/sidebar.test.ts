import { describe, expect, it, vi } from 'vitest';
import { painelActiveId, shellSidebarSections } from '../sidebar';

describe('painelActiveId', () => {
  it.each([
    ['/', 'visao-geral'],
    ['/eventos', 'eventos'],
    ['/eventos/corrida/kits/novo', 'eventos'],
    ['/clubes', 'clubs'],
    ['/clubes/trail/desafios', 'clubs'],
    // RN-233: `Financeiro` deixou de ser item de menu. Enquanto a rota legada
    // ainda responde (só para redirecionar — RN-234), NENHUM item fica ativo.
    ['/financeiro', null],
    ['/financeiro/repasses', null],
    // RN-233: o item `crm` (rótulo "CRM") sucede o antigo `comunicacao`.
    ['/crm', 'crm'],
    ['/crm/visao-geral', 'crm'],
    ['/crm/clientes', 'crm'],
    ['/crm/clientes/tipo_abc123', 'crm'],
    ['/crm/comunicacao', 'crm'],
    // E10 · S811 seed: o módulo Marcas ativa o item Marcas.
    ['/marcas', 'marcas'],
    ['/marcas/qualquer', 'marcas'],
    ['/health', null],
  ])('%s → %s', (pathname, esperado) => {
    expect(painelActiveId(pathname)).toBe(esperado);
  });
});

describe('shellSidebarSections', () => {
  it('RN-233: nav do produtor = 6 itens, na ordem, todos com ícone, ativo marcado', () => {
    const sections = shellSidebarSections('/eventos', vi.fn());
    const items = sections.flatMap((s) => s.items);
    expect(items).toHaveLength(6);
    expect(items.map((i) => i.id)).toEqual([
      'visao-geral',
      'eventos',
      'clubs',
      'crm',
      'marcas',
      'configuracoes',
    ]);
    expect(items.every((i) => i.icon)).toBe(true);
    expect(items.find((i) => i.id === 'eventos')?.active).toBe(true);
  });

  it('RN-233/RN-823: "Financeiro" e "Analytics" sumiram da nav do produtor', () => {
    const sections = shellSidebarSections('/', vi.fn());
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'analytics')).toBeUndefined();
    expect(items.find((i) => i.id === 'financeiro')).toBeUndefined();
    // e não sobraram por um filtro do consumidor: sumiram na fonte (o DS).
    expect(items.find((i) => i.id === 'comunicacao')).toBeUndefined();
  });

  it('/crm marca "CRM" como ativo; /financeiro (legado) não marca nada', () => {
    const doCrm = shellSidebarSections('/crm', vi.fn()).flatMap((s) => s.items);
    expect(doCrm.find((i) => i.id === 'crm')?.active).toBe(true);
    expect(doCrm.find((i) => i.id === 'crm')?.label).toBe('CRM');

    const doLegado = shellSidebarSections('/financeiro', vi.fn()).flatMap((s) => s.items);
    expect(doLegado.some((i) => i.active)).toBe(false);
  });

  it('itens com rota conhecida navegam; inertes não têm onClick', () => {
    const navigate = vi.fn();
    const sections = shellSidebarSections('/', navigate);
    const items = sections.flatMap((s) => s.items);
    items.find((i) => i.id === 'clubs')?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/clubes');
    // RN-233/RN-823: CRM é a porta única da análise de vendas + clientes.
    items.find((i) => i.id === 'crm')?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/crm');
    // E10 · S811 seed: Marcas agora leva ao módulo de patrocinadores reutilizáveis.
    items.find((i) => i.id === 'marcas')?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/marcas');
    // `configuracoes` ganha destino no IAM-T5 (Dados de recebimento em /conta);
    // até lá segue inerte — estado honesto, sem onClick.
    expect(items.find((i) => i.id === 'configuracoes')?.onClick).toBeUndefined();
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
