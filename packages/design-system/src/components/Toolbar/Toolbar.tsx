/**
 * Toolbar — barra de ferramentas global do main (mockup be-hero `.toolbar`).
 *
 * Layout puro, sem estado: slots `start` (busca) e `end` (icon-buttons +
 * ação primária), space-between, fechando em hairline com pb 16
 * (--layout-toolbar-pb, T1) e mb 4. Gaps por token (--toolbar-gap 12;
 * grupo direito --toolbar-end-gap 8, o `.toolbar-right` do mockup).
 *
 * A11y: role="toolbar" com aria-label; os controles dentro dos slots mantêm
 * a própria semântica (searchbox, buttons).
 * §2.16 flat — só a hairline separadora, por token.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToolbarProps {
  /** Lado esquerdo (ex.: `<SearchInput />`). */
  start?: React.ReactNode;
  /** Lado direito (ex.: IconButtons + Button primário). */
  end?: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Toolbar({
  start,
  end,
  'aria-label': ariaLabel = 'Ferramentas globais',
  className,
}: ToolbarProps): JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center justify-between',
        'gap-[var(--toolbar-gap)]',
        'pb-[var(--layout-toolbar-pb)] mb-[var(--toolbar-mb)]',
        'border-b border-b-[var(--border-subtle)]',
        className,
      )}
    >
      <div className="flex items-center gap-[var(--toolbar-gap)] min-w-0">{start}</div>
      <div className="flex items-center gap-[var(--toolbar-end-gap)] shrink-0">{end}</div>
    </div>
  );
}

Toolbar.displayName = 'Toolbar';

export { Toolbar };
