// =============================================================================
// Seções da Sidebar do shell RAIZ do painel (Lote B3).
//
// Puro (pathname + navigate → seções): decide entre a navegação do PRODUTOR
// (8 itens canônicos do DS, tabela do doc de IA Be Hero) e a navegação de
// PLATAFORMA (super-admin, nav própria em routes/plataforma/_lib/nav.ts).
// O item ativo é derivado do pathname — a sidebar é a mesma em todas as
// rotas, só o conteúdo troca (contrato "permanece visível e imutável").
// =============================================================================

import {
  DEFAULT_SIDEBAR_SECTIONS,
  sidebarNavIcon,
  type SidebarItem,
  type SidebarSection,
} from '@leela/design-system';
import { Banknote, Building2, CreditCard, FileText, Gauge, Tags, type LucideIcon } from 'lucide-react';
import { PLATFORM_NAV, activeNavId } from '../routes/plataforma/_lib/nav';

/** id do item do produtor → rota conhecida do painel (undefined = inerte por ora). */
const HREF_POR_ID: Record<string, string | undefined> = {
  'visao-geral': '/',
  eventos: '/eventos',
  clubs: '/clubes',
  // RN-820: o item Financeiro leva à ANÁLISE de vendas (rota índice); a SubNav
  // interna (Análise | Repasses) alcança os repasses do organizador (RN-349).
  financeiro: '/financeiro',
  comunicacao: undefined,
  marcas: undefined,
  configuracoes: undefined,
};

/**
 * Itens do produtor suprimidos da nav renderizada (RN-821). "Analytics" era um
 * placeholder INERTE e DIVERGENTE: a Análise de vendas já é a superfície única
 * de desempenho + analytics, alcançada pelo item "Financeiro" (→ /financeiro).
 * Manter uma segunda entrada morta (ou apontá-la ao mesmo destino) confundiria
 * o organizador com duas portas para a mesma tela. O item vive no DS
 * (DEFAULT_SIDEBAR_SECTIONS, compartilhado) — filtramos aqui, no consumidor,
 * sem tocar o design system.
 */
const IDS_SUPRIMIDOS: ReadonlySet<string> = new Set(['analytics']);

/** Ícone Lucide por item da nav de plataforma (nav do super-admin é própria —
 *  fora da tabela do doc de IA, que cobre só os 8 itens do produtor). */
const PLATFORM_NAV_ICONS: Record<string, LucideIcon> = {
  tenants: Building2,
  termos: FileText,
  planos: Tags,
  repasses: Banknote,
  billing: CreditCard,
  macro: Gauge,
};

/** id do item ATIVO da navegação do produtor dado o pathname (null = nenhum). */
export function painelActiveId(pathname: string): string | null {
  if (pathname === '/') return 'visao-geral';
  if (pathname.startsWith('/eventos')) return 'eventos';
  if (pathname.startsWith('/clubes')) return 'clubs';
  if (pathname.startsWith('/financeiro')) return 'financeiro';
  return null;
}

function producerSections(
  ativoId: string | null,
  navigate: (href: string) => void,
  eventosAtivos?: number | null
): SidebarSection[] {
  return DEFAULT_SIDEBAR_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items
      .filter((item) => !IDS_SUPRIMIDOS.has(item.id))
      .map((item) => {
      const href = HREF_POR_ID[item.id];
      // nav-badge com dado REAL (mockup: Eventos = badge neutro com contagem).
      // Sem contagem (null/0) não há badge — estado honesto, nunca 0 decorativo.
      const badge =
        item.id === 'eventos' && typeof eventosAtivos === 'number' && eventosAtivos > 0
          ? { badge: eventosAtivos, badgeVariant: 'neutral' as const }
          : {};
      return {
        ...item,
        active: item.id === ativoId,
        ...badge,
        ...(href ? { onClick: () => navigate(href) } : {}),
      };
    }),
  }));
}

function platformSections(
  pathname: string,
  navigate: (href: string) => void
): SidebarSection[] {
  const ativo = activeNavId(pathname);
  return [
    {
      label: 'PLATAFORMA',
      items: PLATFORM_NAV.map((item): SidebarItem => {
        const Icon = PLATFORM_NAV_ICONS[item.id];
        const base: SidebarItem = {
          id: item.id,
          label: item.label,
          icon: Icon ? sidebarNavIcon(Icon) : undefined,
          active: item.id === ativo,
        };
        if (item.badge !== undefined) base.badge = item.badge;
        if (item.href) {
          const href = item.href;
          base.onClick = () => navigate(href);
        }
        return base;
      }),
    },
  ];
}

/**
 * Seções da sidebar para o pathname atual: nav de plataforma em
 * `/plataforma/*`, nav do produtor em todas as demais rotas.
 * `eventosAtivos` (quando conhecido e > 0) vira o nav-badge neutro do item
 * Eventos — dado real da mesma fonte da Visão Geral.
 * @pure
 */
export function shellSidebarSections(
  pathname: string,
  navigate: (href: string) => void,
  eventosAtivos?: number | null
): SidebarSection[] {
  if (pathname.startsWith('/plataforma')) {
    return platformSections(pathname, navigate);
  }
  return producerSections(painelActiveId(pathname), navigate, eventosAtivos);
}
