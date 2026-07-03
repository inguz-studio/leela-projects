/**
 * Sidebar — painel de navegação lateral do shell.
 *
 * Seções:
 *   OPERAÇÃO: Visão Geral, Eventos, Clubs, Financeiro, Comunicação, Marcas, Analytics
 *   CONTA:    Configurações
 *
 * Colapsável: ícone-only quando `collapsed=true`.
 * A11y: nav landmark, aria-current="page" no item ativo, aria-expanded no toggle.
 * §2.16 flat — sem borda decorativa na nav.
 */

import * as React from 'react';
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Default 8 nav items (exported for convenience)
// ---------------------------------------------------------------------------

export const DEFAULT_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { id: 'visao-geral',  label: 'Visão Geral',   icon: null },
      { id: 'eventos',      label: 'Eventos',        icon: null },
      { id: 'clubs',        label: 'Clubs',          icon: null },
      { id: 'financeiro',   label: 'Financeiro',     icon: null },
      { id: 'comunicacao',  label: 'Comunicação',    icon: null },
      { id: 'marcas',       label: 'Marcas',         icon: null },
      { id: 'analytics',    label: 'Analytics',      icon: null },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { id: 'configuracoes', label: 'Configurações', icon: null },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ sections, collapsed = false, onToggleCollapse, className }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Navegação principal"
        className={cn(
          'flex flex-col h-full',
          'bg-[var(--surface-raised)]',
          'transition-[width] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]',
          collapsed
            ? 'w-[var(--sidebar-collapsed-width)]'
            : 'w-[var(--sidebar-width)]',
          className,
        )}
      >
        {/* Toggle button */}
        <button
          type="button"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center justify-center',
            'h-[var(--btn-height-md)] w-full',
            'text-[var(--text-secondary)]',
            'hover:text-[var(--text-primary)] hover:bg-[var(--action-ghost-hover)]',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--border-focus)]',
          )}
        >
          <span aria-hidden className="text-sm font-semibold">
            {collapsed ? '→' : '←'}
          </span>
        </button>

        {/* Sections */}
        <div className="flex flex-col flex-1 overflow-y-auto gap-[var(--spacing-6)] py-[var(--spacing-4)]">
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
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
              )}
              <ul role="list" className="flex flex-col gap-[var(--spacing-1)]">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
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
  collapsed: boolean;
}

function SidebarNavItem({ item, collapsed }: SidebarNavItemProps): JSX.Element {
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
      {!collapsed && (
        <span className="flex-1 truncate text-left">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && (
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
