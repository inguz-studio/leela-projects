/**
 * Tabs — troca de conteúdo in-page sobre Radix Tabs (§2.7).
 *
 * §2.7: TODOS os painéis ficam no DOM (forceMount); o inativo é ocultado
 * via data-[state=inactive]:hidden — busca em página e SEO de protótipo
 * dependem disso.
 *
 * Visual da lista segue §2.14: ativa com underline Brasa 2px + semibold;
 * contador pill opcional por tab.
 * A11y: roles tablist/tab/tabpanel, setas ← → e Home/End via Radix.
 * §2.16 flat.
 */

import * as React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Tab inicial (modo não controlado). Default: primeira. */
  defaultTab?: string;
  /** Modo controlado. */
  value?: string;
  onValueChange?: (id: string) => void;
  'aria-label'?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Tabs({
  tabs,
  defaultTab,
  value,
  onValueChange,
  'aria-label': ariaLabel = 'Abas',
  className,
}: TabsProps): JSX.Element {
  return (
    <RadixTabs.Root
      {...((defaultTab ?? tabs[0]?.id) !== undefined
        ? { defaultValue: (defaultTab ?? tabs[0]?.id) as string }
        : {})}
      {...(value !== undefined ? { value } : {})}
      {...(onValueChange !== undefined ? { onValueChange } : {})}
      className={className}
    >
      <RadixTabs.List
        aria-label={ariaLabel}
        className={cn(
          'flex items-end gap-[var(--spacing-1)]',
          'h-[var(--subnav-height)]',
          'border-b border-b-[var(--border-subtle)]',
        )}
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.id}
            value={tab.id}
            className={cn(
              'relative inline-flex items-center gap-[var(--spacing-2)]',
              'h-full pb-[var(--spacing-1)] px-[var(--spacing-3)]',
              'text-[length:var(--font-size-base)] whitespace-nowrap',
              'text-[var(--text-secondary)] font-[var(--font-weight-regular)]',
              'transition-colors duration-[var(--motion-duration-fast)]',
              'hover:text-[var(--text-primary)]',
              'rounded-t-[var(--radius-sm)]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[color:var(--border-focus)]',
              // Ativa: §2.14 — semibold + underline Brasa 2px
              'data-[state=active]:text-[var(--text-primary)]',
              'data-[state=active]:font-[var(--font-weight-semibold)]',
              'data-[state=active]:after:absolute data-[state=active]:after:bottom-0',
              'data-[state=active]:after:left-0 data-[state=active]:after:right-0',
              'data-[state=active]:after:h-[var(--subnav-underline)]',
              'data-[state=active]:after:bg-[var(--border-brand)]',
              'data-[state=active]:after:rounded-t-[var(--radius-sm)]',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center',
                  'h-[var(--subnav-pill-height)] min-w-[var(--subnav-pill-min-width)]',
                  'px-[var(--spacing-2)]',
                  'rounded-[var(--subnav-pill-radius)]',
                  'text-[length:var(--subnav-pill-font-size)] font-[var(--font-weight-semibold)]',
                  'bg-[var(--surface-base)]',
                )}
              >
                {tab.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {tabs.map((tab) => (
        <RadixTabs.Content
          key={tab.id}
          value={tab.id}
          forceMount
          className={cn(
            'pt-[var(--spacing-4)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--border-focus)]',
            // §2.7: painel inativo permanece no DOM, apenas oculto
            'data-[state=inactive]:hidden',
          )}
        >
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}

Tabs.displayName = 'Tabs';

export { Tabs };
