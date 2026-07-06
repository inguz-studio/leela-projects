/**
 * Sidebar — painel de navegação lateral do shell.
 *
 * Seções:
 *   OPERAÇÃO: Visão Geral, Eventos, Clubs, Financeiro, Comunicação, Marcas, Analytics
 *   CONTA:    Configurações
 *
 * FIXA em 240px (`--sidebar-width`), padrão Be Hero — decisão vinculante do
 * Vitor (2026-07-05, brief ds-consolidacao-shadcn-brasa §2): a variante fixa
 * SUBSTITUI o modo colapsável; não há mais toggle nem largura de 64px.
 *
 * Métricas exatas do mockup be-hero (`.sidebar/.nav/.nav-label/.nav-item/
 * .nav-badge`, lote FIDELIDADE T2): nav 16x12 gap 2; label 10px/.08em
 * uppercase pad 12/12/8; item 10x12 gap 12 texto 14/500 ícone 20; badge
 * 10px/700 pad 2x6. A borda-direita hairline é ANATOMIA do mockup
 * (`.sidebar { border-right: .5px }`) — exceção deliberada ao §2.16 flat,
 * registrada no patch de congruência: é o fio que separa a nav do conteúdo.
 *
 * Slot `brand`: bloco de marca componível (ex.: `<SidebarBrand mark="LEELA"
 * sub="Painel do Organizador" />`) — o DS entrega a ESTRUTURA; o texto vem do
 * consumidor.
 *
 * A11y: nav landmark "Navegação principal", aria-current="page" no item ativo,
 * foco visível, navegação por teclado.
 */

import * as React from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  Settings,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Variante do badge de contagem (mockup: Comunicação = danger, Eventos = neutral). */
export type SidebarBadgeVariant = 'danger' | 'neutral';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  /** Cor do badge — union fechada; default 'danger' (o `.nav-badge` do mockup). */
  badgeVariant?: SidebarBadgeVariant;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Bloco de marca componível no topo (ex.: `<SidebarBrand ... />`). */
  brand?: React.ReactNode;
  /** Rodapé componível (ex.: `<SidebarFooter avatar={...} name={...} />`). */
  footer?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Nav icon helper + default 8 nav items (exported for convenience)
// ---------------------------------------------------------------------------

/**
 * Renderiza um ícone Lucide nos tokens de ícone da Sidebar: 20px
 * (`--sidebar-icon-size`, mockup `.nav-item svg`), traço 1.75
 * (`--icon-stroke`), `currentColor` (a cor vem do wrapper do item).
 * Uso pelos consumidores ao montar seções próprias de Sidebar.
 */
export function sidebarNavIcon(Icon: LucideIcon): React.ReactNode {
  return (
    <Icon
      aria-hidden
      className={cn(
        'w-[var(--sidebar-icon-size)] h-[var(--sidebar-icon-size)]',
        '[stroke-width:var(--icon-stroke)]',
      )}
    />
  );
}

/** Mapeamento item → ícone da fonte da verdade (doc de IA do painel Be Hero, §Sidebar). */
export const DEFAULT_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { id: 'visao-geral',  label: 'Visão Geral',   icon: sidebarNavIcon(LayoutDashboard) },
      { id: 'eventos',      label: 'Eventos',        icon: sidebarNavIcon(CalendarDays) },
      { id: 'clubs',        label: 'Clubs',          icon: sidebarNavIcon(UsersRound) },
      { id: 'financeiro',   label: 'Financeiro',     icon: sidebarNavIcon(BarChart3) },
      { id: 'comunicacao',  label: 'Comunicação',    icon: sidebarNavIcon(Bell) },
      { id: 'marcas',       label: 'Marcas',         icon: sidebarNavIcon(Briefcase) },
      { id: 'analytics',    label: 'Analytics',      icon: sidebarNavIcon(TrendingUp) },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { id: 'configuracoes', label: 'Configurações', icon: sidebarNavIcon(Settings) },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ sections, brand, footer, className }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Navegação principal"
        className={cn(
          'flex flex-col h-full',
          // Congruência mockup be-hero: sidebar vive no fundo da página
          // (surface-base) e fecha com a hairline direita do mockup.
          'bg-[var(--surface-base)]',
          'border-r border-r-[var(--border-subtle)]',
          'w-[var(--sidebar-width)]',
          className,
        )}
      >
        {/* Bloco de marca (slot componível — dados do consumidor) */}
        {brand}

        {/* Nav (mockup `.nav`: 16x12, gap 2, labels no fluxo) */}
        <div
          className={cn(
            'flex flex-col flex-1 overflow-y-auto',
            'py-[var(--sidebar-nav-py)] px-[var(--sidebar-nav-px)]',
            'gap-[var(--sidebar-nav-gap)]',
          )}
        >
          {sections.map((section) => (
            <React.Fragment key={section.label}>
              <p
                className={cn(
                  'pt-[var(--sidebar-label-pt)] pb-[var(--sidebar-label-pb)] px-[var(--sidebar-label-px)]',
                  'text-[length:var(--sidebar-label-size)]',
                  'font-[var(--font-weight-semibold)]',
                  'text-[var(--text-tertiary)]',
                  'tracking-[var(--sidebar-label-spacing)] uppercase',
                )}
              >
                {section.label}
              </p>
              <ul role="list" className="flex flex-col gap-[var(--sidebar-nav-gap)]">
                {section.items.map((item) => (
                  <SidebarNavItem key={item.id} item={item} />
                ))}
              </ul>
            </React.Fragment>
          ))}
        </div>

        {/* Rodapé (avatar + nome — B4); dados vêm do consumidor */}
        {footer}
      </nav>
    );
  },
);
Sidebar.displayName = 'Sidebar';

// ---------------------------------------------------------------------------
// SidebarNavItem
// ---------------------------------------------------------------------------

const BADGE_VARIANT_CLASSES: Record<SidebarBadgeVariant, string> = {
  danger: 'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]',
  neutral: 'bg-[var(--surface-high)] text-[var(--text-secondary)]',
};

interface SidebarNavItemProps {
  item: SidebarItem;
}

function SidebarNavItem({ item }: SidebarNavItemProps): JSX.Element {
  const Comp: 'a' | 'button' = item.href ? 'a' : 'button';

  const sharedProps = {
    'aria-current': item.active ? ('page' as const) : undefined,
    onClick: item.onClick,
    className: cn(
      'group relative flex items-center gap-[var(--sidebar-item-gap)]',
      'py-[var(--sidebar-item-py)] px-[var(--sidebar-item-px)]',
      'w-full',
      'rounded-[var(--radius-sm)]',
      // Mockup `.nav-item`: 14px/500 sempre — o ativo muda só as cores.
      'text-[length:var(--sidebar-item-size)] font-[var(--font-weight-medium)]',
      'transition-colors duration-[var(--motion-duration-fast)]',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[color:var(--border-focus)]',
      // Item ativo (congruência mockup be-hero `.nav-item.active`): tint de
      // marca + texto laranja + barra 2px encostada na borda da sidebar (o
      // -12px do mockup = padding horizontal da nav). AA do texto sobre o tint
      // provado por composição alpha-sobre-surface em contrast.test.ts.
      item.active
        ? cn(
            'bg-[var(--action-brand-tint)]',
            'text-[var(--action-brand-tint-fg)]',
            'before:content-[""] before:absolute',
            'before:left-[calc(-1*var(--sidebar-nav-px))]',
            'before:top-[var(--sidebar-active-bar-inset)]',
            'before:bottom-[var(--sidebar-active-bar-inset)]',
            'before:w-[var(--sidebar-active-bar)]',
            'before:rounded-r-[var(--sidebar-active-bar)]',
            'before:bg-[var(--border-brand)]',
          )
        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]',
    ),
  };

  const content = (
    <>
      {item.icon && (
        <span
          aria-hidden
          className={cn(
            'shrink-0 flex items-center justify-center',
            'w-[var(--sidebar-icon-size)] h-[var(--sidebar-icon-size)]',
            'transition-colors duration-[var(--motion-duration-fast)]',
            // Mockup: ícone tertiary no rest, secondary no hover, brasa no ativo.
            item.active
              ? 'text-[var(--text-brand)]'
              : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]',
          )}
        >
          {item.icon}
        </span>
      )}
      <span className="flex-1 truncate text-left">
        {item.label}
      </span>
      {item.badge !== undefined && (
        <span
          className={cn(
            'ml-auto inline-flex items-center justify-center',
            'px-[var(--sidebar-badge-px)] py-[var(--sidebar-badge-py)]',
            'rounded-[var(--sidebar-badge-radius)]',
            'text-[length:var(--sidebar-badge-size)] font-[var(--font-weight-bold)]',
            'tracking-[var(--sidebar-badge-spacing)]',
            BADGE_VARIANT_CLASSES[item.badgeVariant ?? 'danger'],
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  if (Comp === 'a') {
    return (
      <li>
        <a href={item.href} {...sharedProps}>
          {content}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button type="button" {...sharedProps}>
        {content}
      </button>
    </li>
  );
}

export { Sidebar };
