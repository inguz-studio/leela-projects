import { describe, expect, it, vi } from 'vitest';
import { painelActiveId, shellSidebarSections } from '../sidebar';
// LEELA-NAVFIX-T2: os itens do menu passaram a receber o MouseEvent (é ele que
// permite `preventDefault()` e, com isso, ter `href` E navegação de SPA no mesmo
// item). O dublê é o mínimo que o handler lê — fonte única em src/test/clique.
import { CLIQUES_DO_NAVEGADOR, chamarOnClick } from '../../test/clique';

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
    // RN-233/RN-366: Configurações deixou de ser inerte e leva a `/conta`.
    ['/conta', 'configuracoes'],
    ['/conta/perfil-publico', 'configuracoes'],
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
    chamarOnClick(items.find((i) => i.id === 'clubs')?.onClick);
    expect(navigate).toHaveBeenCalledWith('/clubes');
    // RN-233/RN-823: CRM é a porta única da análise de vendas + clientes.
    chamarOnClick(items.find((i) => i.id === 'crm')?.onClick);
    expect(navigate).toHaveBeenCalledWith('/crm');
    // E10 · S811 seed: Marcas agora leva ao módulo de patrocinadores reutilizáveis.
    chamarOnClick(items.find((i) => i.id === 'marcas')?.onClick);
    expect(navigate).toHaveBeenCalledWith('/marcas');
    // RN-233 sem exceção aberta: TODO item do menu tem destino. Configurações
    // leva a `/conta`, onde vivem os Dados de recebimento (RN-366 · IAM-T5).
    chamarOnClick(items.find((i) => i.id === 'configuracoes')?.onClick);
    expect(navigate).toHaveBeenCalledWith('/conta');
  });

  it('RN-233: nenhum item de menu fica sem rota', () => {
    const navigate = vi.fn();
    const items = shellSidebarSections('/', navigate).flatMap((s) => s.items);
    for (const item of items) {
      expect(item.onClick, `item "${item.id}" sem destino`).toBeDefined();
    }
  });

  // -------------------------------------------------------------------------
  // LEELA-NAVFIX-T2 — o defeito espelhado: o menu navegava mas não era link.
  // -------------------------------------------------------------------------

  it('todo item com destino é LINK: href + onClick no mesmo item', () => {
    const items = shellSidebarSections('/', vi.fn()).flatMap((s) => s.items);
    for (const item of items) {
      expect(item.href, `item "${item.id}" navega mas não é link`).toBeTruthy();
      expect(item.onClick, `item "${item.id}" é link mas recarrega o documento`).toBeDefined();
    }
    // O par href↔destino é o mesmo — o link não mente sobre para onde vai.
    expect(items.find((i) => i.id === 'crm')?.href).toBe('/crm');
    expect(items.find((i) => i.id === 'configuracoes')?.href).toBe('/conta');
  });

  it('clique simples: preventDefault + navigate (sem recarregar o documento)', () => {
    const navigate = vi.fn();
    const items = shellSidebarSections('/', navigate).flatMap((s) => s.items);
    const evento = chamarOnClick(items.find((i) => i.id === 'eventos')?.onClick);
    expect(evento.defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/eventos');
  });

  it.each(CLIQUES_DO_NAVEGADOR)('%s NÃO é interceptado — o href faz o trabalho do navegador', (_nome, over) => {
    const navigate = vi.fn();
    const items = shellSidebarSections('/', navigate).flatMap((s) => s.items);
    const evento = chamarOnClick(items.find((i) => i.id === 'eventos')?.onClick, over);
    expect(evento.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
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

  // LEELA-DEBT-T2: a tabela abaixo é a nav de plataforma INTEIRA e vinha um
  // item atrasada — `taxa` (TAXAFLEX · S1606 · RN-178) entrou em PLATFORM_NAV e
  // ninguém trouxe para cá. O comportamento atual é o desejado (a rota
  // `/plataforma/taxa` existe e é a tabela GLOBAL de taxa por meio de
  // pagamento), então quem se move é a tabela do teste. O ícone, esse era gap
  // de verdade e foi consertado no código: `items.every(i => i.icon)` já
  // cobrava, mas caía depois desta linha e nunca chegava a ser avaliada.
  // LEELA-ESTORNO-T4 (decisão 43-b): `estornos` entra DEPOIS de repasses — a
  // fila cross-tenant de estornos e a ação direta do admin, com ícone próprio.
  it('/plataforma: nav própria com 9 itens, ícones e ativo por sub-rota', () => {
    const sections = shellSidebarSections('/plataforma/macro', vi.fn());
    expect(sections).toHaveLength(1);
    const items = sections[0]?.items ?? [];
    expect(items.map((i) => i.id)).toEqual([
      'tenants',
      'termos',
      'planos',
      // S1608-T2 · RN-413: os códigos de convite de organizador.
      'convites',
      'taxa',
      'repasses',
      'estornos',
      'billing',
      'macro',
    ]);
    expect(items.every((i) => i.icon)).toBe(true);
    expect(items.find((i) => i.id === 'macro')?.active).toBe(true);
    expect(items.find((i) => i.id === 'billing')?.badge).toBe('em breve');
  });

  it('/plataforma/taxa: item Taxa ativo, com ícone e navegável (TAXAFLEX)', () => {
    const navigate = vi.fn();
    const items = shellSidebarSections('/plataforma/taxa', navigate)[0]?.items ?? [];
    const taxa = items.find((i) => i.id === 'taxa');
    expect(taxa?.active).toBe(true);
    // O item que faltava na tabela era também o único sem ícone na barra.
    expect(taxa?.icon).toBeDefined();
    expect(taxa?.href).toBe('/plataforma/taxa');
    const evento = chamarOnClick(taxa?.onClick);
    expect(evento.defaultPrevented).toBe(true);
    // A-7 (LEELA-DEBT-T5): este item É a rota atual — clicar nele não empilha.
    expect(navigate).toHaveBeenCalledWith('/plataforma/taxa', { replace: true });
    // E nenhum outro item fica marcado junto — a barra diz UM lugar só.
    expect(items.filter((i) => i.active).map((i) => i.id)).toEqual(['taxa']);
  });

  it('/plataforma/planos: item Planos ativo e navegável (CB-T3)', () => {
    const navigate = vi.fn();
    const sections = shellSidebarSections('/plataforma/planos', navigate);
    const items = sections[0]?.items ?? [];
    const planos = items.find((i) => i.id === 'planos');
    expect(planos?.active).toBe(true);
    // LEELA-NAVFIX-T2: a nav de plataforma segue o mesmo padrão — href + SPA.
    expect(planos?.href).toBe('/plataforma/planos');
    const evento = chamarOnClick(planos?.onClick);
    expect(evento.defaultPrevented).toBe(true);
    // A-7: estando em /plataforma/planos, clicar em Planos substitui a entrada.
    expect(navigate).toHaveBeenCalledWith('/plataforma/planos', { replace: true });
    // Item de OUTRA rota segue empilhando — o A-7 é só sobre a atual.
    chamarOnClick(items.find((i) => i.id === 'macro')?.onClick);
    expect(navigate).toHaveBeenLastCalledWith('/plataforma/macro');
  });
});
