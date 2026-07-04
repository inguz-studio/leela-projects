// =============================================================================
// Seções da Sidebar do shell do produtor, com "Visão Geral" ativa (S600-T1).
//
// Reusa as 8 entradas canônicas do DS (DEFAULT_SIDEBAR_SECTIONS) e liga cada
// item a uma rota do painel. Só as rotas já existentes navegam; as demais
// ficam inertes até o épico correspondente (mantém baixo atrito).
// =============================================================================

import { DEFAULT_SIDEBAR_SECTIONS, type SidebarSection } from '@leela/design-system';

/** id do item ativo → rota conhecida do painel (ou undefined = inerte por ora). */
const HREF_POR_ID: Record<string, string | undefined> = {
  'visao-geral': '/',
  eventos: '/eventos',
  clubs: '/clubes',
  financeiro: undefined,
  comunicacao: undefined,
  marcas: undefined,
  analytics: undefined,
  configuracoes: undefined,
};

/**
 * Monta as seções da Sidebar marcando `ativoId` como página atual e ligando
 * navegação aos itens com rota conhecida.
 * @pure
 */
export function overviewSidebarSections(
  ativoId: string,
  navigate: (href: string) => void
): SidebarSection[] {
  return DEFAULT_SIDEBAR_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.map((item) => {
      const href = HREF_POR_ID[item.id];
      return {
        ...item,
        active: item.id === ativoId,
        ...(href ? { onClick: () => navigate(href) } : {}),
      };
    }),
  }));
}
