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
 * A11y: nav landmark "Navegação principal", aria-current="page" no item ativo,
 * foco visível, navegação por teclado.
 * §2.16 flat — sem borda decorativa na nav.
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

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Rodapé componível (ex.: `<SidebarFooter avatar={...} name={...} />`). */
  footer?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Nav icon helper + default 8 nav items (exported for convenience)
// ---------------------------------------------------------------------------

/**
 * Renderiza um ícone Lucide nos tokens de ícone do DS: 24px (`--icon-size`),
 * traço 1.75 (`--icon-stroke`), `currentColor` (herda a cor do item).
 * Uso pelos consumidores ao montar seções próprias de Sidebar.
 */
export function sidebarNavIcon(Icon: LucideIcon): React.ReactNode {
  return (
    <Icon
      aria-hidden
      className={cn(
        'w-[var(--icon-size)] h-[var(--icon-size)]',
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
  ({ sections, footer, className }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Navegação principal"
        className={cn(
          'flex flex-col h-full',
          'bg-[var(--surface-raised)]',
          'w-[var(--sidebar-width)]',
          className,
        )}
      >
        {/* Sections */}
        <div className="flex flex-col flex-1 overflow-y-auto gap-[var(--spacing-6)] py-[var(--spacing-4)]">
          {sections.map((section) => (
            <div key={section.label}>
              <p
                className={cn(
                  'px-[var(--spacing-4)] pb-[var(--spacing-2)]',
                  'text-[length:var(--font-size-xs)]',
                  'font-[var(--font-weight-semibold)]',
                  'text-[var(--text-tertiary)]',
                  'tracking-widest uppercase',
                )}
              >
                {section.label}
              </p>
              <ul role="list" className="flex flex-col gap-[var(--spacing-1)]">
                {section.items.map((item) => (
                  <SidebarNavItem key={item.id} item={item} />
                ))}
              </ul>
            </div>
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

interface SidebarNavItemProps {
  item: SidebarItem;
}

function SidebarNavItem({ item }: SidebarNavItemProps): JSX.Element {
  const Comp: 'a' | 'button' = item.href ? 'a' : 'button';

  const sharedProps = {
    'aria-current': item.active ? ('page' as const) : undefined,
    onClick: item.onClick,
    className: cn(
      'flex items-center gap-[var(--spacing-3)]',
      'h-[var(--btn-height-md)]',
      'px-[var(--spacing-4)]',
      'w-full',
      'rounded-[var(--radius-sm)]',
      'text-[length:var(--font-size-base)]',
      'transition-colors duration-[var(--motion-duration-fast)]',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[color:var(--border-focus)]',
      item.active
        ? 'bg-[var(--action-ghost-hover)] text-[var(--text-primary)] font-[var(--font-weight-semibold)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)]',
    ),
  };

  const content = (
    <>
      {item.icon && (
        <span aria-hidden className="shrink-0 w-[var(--icon-size)] h-[var(--icon-size)] flex items-center justify-center">
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
            'h-[var(--badge-height)] min-w-[var(--badge-height)] px-[var(--badge-px)]',
            'rounded-[var(--badge-radius)]',
            'text-[length:var(--badge-font-size)] font-[var(--badge-font-weight)]',
            'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
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
