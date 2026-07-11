/**
 * Toolbar — barra de ferramentas global do main (mockup be-hero `.toolbar`).
 *
 * Layout puro, sem estado: slots `start` (busca) e `end` (icon-buttons +
 * ação primária), space-between, fechando em hairline com pb 16
 * (--layout-toolbar-pb, T1) e mb 4. Gaps por token (--toolbar-gap 12;
 * grupo direito --toolbar-end-gap 8, o `.toolbar-right` do mockup).
 *
 * Responsivo (LEELA-RESP-M2): em `lg`+ (desktop 1440 INTOCADO) é a linha única
 * do mockup — busca à esquerda, ações à direita, space-between. Abaixo de `lg`
 * (mesmo ponto de colapso do shell, 1024px) a barra EMPILHA: a busca ocupa a
 * própria linha (full-width) e o grupo de ações desce para a linha de baixo,
 * alinhado à direita. Isso mata o defeito M2 do QA-LIVE-2 — a busca fixa de
 * 320px + ícones + CTA "Novo evento" não cabiam no main de ~310px (390 − 2×40
 * de page-px) e se sobrepunham/cortavam. Empilhar (em vez de esconder a busca
 * atrás de um ícone ou jogar as ações num overflow) mantém todo controle
 * visível e acessível — decisão pela design-principles (foco no uso, sem
 * enterrar tarefa/ação primária atrás de tap extra).
 *
 * A11y: role="toolbar" com aria-label; os controles dentro dos slots mantêm
 * a própria semântica (searchbox, buttons) — nenhum controle é removido no
 * refluxo, só reposicionado.
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
        // <lg: empilha (coluna). Sem items-center → children esticam full-width
        // (default stretch), então a busca preenche a linha e as ações a de baixo.
        'flex flex-col gap-[var(--toolbar-gap)]',
        // lg+: linha única space-between do mockup — desktop 1440 intocado.
        'lg:flex-row lg:items-center lg:justify-between',
        'pb-[var(--layout-toolbar-pb)] mb-[var(--toolbar-mb)]',
        'border-b border-b-[var(--border-subtle)]',
        className,
      )}
    >
      <div className="flex items-center gap-[var(--toolbar-gap)] min-w-0">{start}</div>
      {/* justify-end alinha o grupo à direita quando ele estica no empilhado
          (<lg); em lg+ o grupo é shrink-0/content-width e justify-end é no-op. */}
      <div className="flex items-center justify-end gap-[var(--toolbar-end-gap)] shrink-0">{end}</div>
    </div>
  );
}

Toolbar.displayName = 'Toolbar';

export { Toolbar };
