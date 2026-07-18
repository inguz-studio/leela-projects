/**
 * SubNav — barra de sub-navegação (§2.14).
 *
 * Container: bg-surface-base (= fundo da página, plano), padding 0 40px
 * (--subnav-px), SEM border-bottom. O único indicador é o sublinhado Brasa 2px
 * da aba ativa (::after).
 * Tab inativa: font-weight 400, text-secondary.
 * Tab ativa: font-weight 600, text-primary, underline Brasa 2px via ::after.
 * Contador: pill radius 10px, min-width 28px, height 20px, bg-surface-raised
 * (um passo ACIMA do fundo plano p/ o pill não sumir), font-size 11px.
 *
 * Decisão (Vitor 2026-07-11): SubNav plano — fundo igual ao da página e sem
 * divisor. Sobrepõe o "§2.16 flat: border-bottom é divider permitido": aqui a
 * palavra do Vitor vence, o sublinhado da aba ativa carrega a orientação
 * sozinho. O pill do contador inverte a relação de elevação (era base sobre
 * raised; agora raised sobre base) para preservar exatamente o mesmo delta de
 * luminância — o contraste do texto das abas sobre o novo fundo MELHORA
 * (text-secondary #BFBFBF sobre #0C0C0C ≈ 10.6:1; text-primary ≈ 18:1).
 *
 * Semântica: navegação entre rotas — nav landmark + lista de links com
 * aria-current="page" na ativa (não é tablist; Tabs §2.7 cobre troca in-page).
 * Teclado: Tab percorre os links normalmente; ← → como atalho opcional.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubNavTab {
  id: string;
  label: string;
  href?: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

export interface SubNavProps {
  tabs: SubNavTab[];
  /** Rótulo do landmark de navegação. */
  'aria-label'?: string;
  /**
   * Divisória inferior (RN-229 · S-R9-10). Default `false` = plano (decisão do
   * Vitor 2026-07-11, preservado em TODOS os consumidores existentes). `true`
   * alinha ao padrão de Comunicação (Tabs §2.7): `border-b` em `--border-subtle`
   * — usado nas sub-navs TERCIÁRIAS dentro de eventos (Financeiro/Kits/Config).
   */
  divider?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SubNav({
  tabs,
  'aria-label': ariaLabel = 'Navegação de seções',
  divider = false,
  className,
}: SubNavProps): JSX.Element {
  const tabRefs = React.useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      tabRefs.current[(index + 1) % tabs.length]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tabRefs.current[(index - 1 + tabs.length) % tabs.length]?.focus();
    }
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'bg-[var(--surface-base)]',
        'px-[var(--subnav-px)]',
        // RN-229 (S-R9-10): divisória opcional das terciárias, igual a Comunicação.
        divider && 'border-b border-b-[var(--border-subtle)]',
        className,
      )}
    >
      <ul role="list" className="flex items-end gap-[var(--spacing-1)] h-[var(--subnav-height)]">
        {tabs.map((tab, index) => {
          const isActive = tab.active ?? false;
          const sharedClass = cn(
            'relative inline-flex items-center gap-[var(--spacing-2)]',
            'h-full pb-[var(--spacing-1)]',
            'px-[var(--spacing-3)]',
            'text-[length:var(--font-size-base)]',
            'whitespace-nowrap',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--border-focus)]',
            'rounded-t-[var(--radius-sm)]',
            isActive
              ? 'text-[var(--text-primary)] font-[var(--font-weight-semibold)]'
              : 'text-[var(--text-secondary)] font-[var(--font-weight-regular)] hover:text-[var(--text-primary)]',
            // Underline indicator (Brasa 2px)
            isActive && [
              'after:absolute after:bottom-0 after:left-0 after:right-0',
              'after:h-[var(--subnav-underline)] after:bg-[var(--border-brand)]',
              'after:rounded-t-[var(--radius-sm)]',
            ],
          );

          const content = (
            <>
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'h-[var(--subnav-pill-height)] min-w-[var(--subnav-pill-min-width)]',
                    'px-[var(--spacing-2)]',
                    'rounded-[var(--subnav-pill-radius)]',
                    'text-[length:var(--subnav-pill-font-size)] font-[var(--font-weight-semibold)]',
                    'bg-[var(--surface-raised)]',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </>
          );

          return (
            <li key={tab.id} className="h-full">
              {tab.href ? (
                <a
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={sharedClass}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onClick={tab.onClick}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={sharedClass}
                  onClick={tab.onClick}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

SubNav.displayName = 'SubNav';

export { SubNav };
