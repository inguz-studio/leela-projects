/**
 * EventRow — linha de evento da Visão Geral (mockup be-hero `.event-row`,
 * DEFAULT COMPACT persistido: pad 8×14, thumb 40, gap 12).
 *
 * DEDUP (mds-librarian): NÃO é variante do CardEvento — aquele é card
 * VERTICAL de mídia 16/10 para o hub (media em cima, corpo embaixo); este é
 * grid HORIZONTAL denso (thumb 40 + nome/meta + contagem + badge + ação) para
 * listas do dashboard. Anatomias disjuntas → componente próprio.
 *
 * Anatomia (grid `40px 1fr auto auto auto`):
 *   [thumb gradiente por modalidade] [nome + meta com dot-sep] [contagem x/y]
 *   [badge de status] [ação]
 *
 * - Thumb: gradiente semântico `--thumb-{variant}` (AA do ícone branco .9
 *   provado por composição sobre a região do gradiente que o ícone ocupa —
 *   contrast.test.ts, EventThumb §); ícone default por variante (lucide).
 * - Hover: levanta 1px (mockup) + elev-2; motion por token.
 * - A11y: a navegação acessível é o slot `action` (botão real). `onClick` na
 *   row é atalho de mouse (cursor-pointer), sem role — replica o mockup sem
 *   aninhar interativos.
 */

import * as React from 'react';
import {
  Bike,
  Dumbbell,
  Flower2,
  Footprints,
  MonitorPlay,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventThumbVariant = 'corrida' | 'ciclismo' | 'yoga' | 'virtual' | 'crossfit';

export interface EventRowCount {
  /** Valor principal (ex.: "453"). */
  value: string;
  /** Total opcional — renderiza " / total" em texto terciário (ex.: "500"). */
  total?: string;
  /** Rótulo uppercase sob o valor (ex.: "Inscrições"). */
  label: string;
}

export interface EventRowProps {
  name: string;
  thumbVariant: EventThumbVariant;
  /** Ícone central do thumb; default: ícone lucide da variante. */
  thumbIcon?: React.ReactNode;
  /** Itens da linha de meta — intercalados com dot-sep (`.event-meta`). */
  metaItems?: React.ReactNode[];
  count?: EventRowCount;
  /** Badge de status (ex.: `<Badge variant="vitoria">Publicado</Badge>`). */
  badge?: React.ReactNode;
  /** Ação da linha (ex.: `<Button variant="secondary" size="sm">Gerenciar</Button>`). */
  action?: React.ReactNode;
  /** Atalho de mouse na row inteira; o caminho de teclado é o `action`. */
  onClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Thumb — mapa fechado variante → classe token (nada de style dinâmico)
// ---------------------------------------------------------------------------

const THUMB_BG: Record<EventThumbVariant, string> = {
  corrida:  'bg-[image:var(--thumb-corrida)]',
  ciclismo: 'bg-[image:var(--thumb-ciclismo)]',
  yoga:     'bg-[image:var(--thumb-yoga)]',
  virtual:  'bg-[image:var(--thumb-virtual)]',
  crossfit: 'bg-[image:var(--thumb-crossfit)]',
};

const THUMB_ICON: Record<EventThumbVariant, LucideIcon> = {
  corrida:  Footprints,
  ciclismo: Bike,
  yoga:     Flower2,
  virtual:  MonitorPlay,
  crossfit: Dumbbell,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EventRow = React.forwardRef<HTMLDivElement, EventRowProps>(
  (
    { name, thumbVariant, thumbIcon, metaItems, count, badge, action, onClick, className },
    ref,
  ) => {
    const DefaultIcon = THUMB_ICON[thumbVariant];
    const meta = (metaItems ?? []).filter(
      (item) => item !== null && item !== undefined && item !== false,
    );

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'grid items-center',
          'grid-cols-[var(--eventrow-thumb-size)_minmax(0,1fr)_auto_auto_auto]',
          'gap-[var(--eventrow-gap)]',
          'px-[var(--eventrow-px)] py-[var(--eventrow-py)]',
          'rounded-[var(--radius-lg)] bg-[var(--surface-raised)] shadow-elev-1',
          'transition-[transform,box-shadow] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]',
          'hover:-translate-y-[calc(var(--spacing-0-5)/2)] hover:shadow-elev-2',
          onClick && 'cursor-pointer',
          className,
        )}
      >
        {/* Thumb */}
        <span
          aria-hidden
          className={cn(
            'relative flex items-center justify-center shrink-0 overflow-hidden',
            'w-[var(--eventrow-thumb-size)] h-[var(--eventrow-thumb-size)]',
            'rounded-[var(--radius-md)]',
            THUMB_BG[thumbVariant],
            'text-[color:var(--thumb-icon-fg)]',
            '[&_svg]:w-[var(--eventrow-thumb-icon-size)] [&_svg]:h-[var(--eventrow-thumb-icon-size)]',
            '[&_svg]:[stroke-width:var(--icon-stroke)]',
          )}
        >
          {thumbIcon ?? <DefaultIcon />}
        </span>

        {/* Nome + meta */}
        <div className="min-w-0">
          <div
            className={cn(
              'truncate',
              'text-[length:var(--eventrow-name-size)] font-[var(--font-weight-semibold)]',
              'text-[var(--text-primary)]',
              'mb-[var(--eventrow-name-mb)]',
            )}
          >
            {name}
          </div>
          {meta.length > 0 && (
            <div
              className={cn(
                'flex items-center flex-wrap',
                'gap-[var(--eventrow-meta-gap)]',
                'text-[length:var(--eventrow-meta-size)] text-[var(--text-tertiary)]',
              )}
            >
              {meta.map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        'rounded-[var(--radius-pill)]',
                        'w-[var(--eventrow-dot-size)] h-[var(--eventrow-dot-size)]',
                        // Aproximação registrada: mockup usa neutro-500 #313131;
                        // o semantic mais próximo é border-default (#383838).
                        'bg-[var(--border-default)]',
                      )}
                    />
                  )}
                  <span className="flex items-center min-w-0">{item}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Contagem (x/y) */}
        {count ? (
          <div className="text-right min-w-[var(--eventrow-count-min-w)]">
            <div
              className={cn(
                'text-[length:var(--eventrow-count-size)] font-[var(--font-weight-semibold)]',
                'text-[var(--text-primary)] tabular-nums',
              )}
            >
              {count.value}
              {count.total ? (
                <span className="text-[var(--text-tertiary)] font-[var(--font-weight-regular)]">
                  {' '}/ {count.total}
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                'mt-[var(--spacing-0-5)]',
                'text-[length:var(--eventrow-count-label-size)] font-[var(--font-weight-semibold)]',
                'text-[var(--text-tertiary)] uppercase',
                'tracking-[var(--eventrow-count-label-spacing)]',
              )}
            >
              {count.label}
            </div>
          </div>
        ) : (
          <span aria-hidden />
        )}

        {/* Badge de status */}
        {badge ? <div className="flex items-center">{badge}</div> : <span aria-hidden />}

        {/* Ação */}
        {action ? (
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        ) : (
          <span aria-hidden />
        )}
      </div>
    );
  },
);
EventRow.displayName = 'EventRow';

export { EventRow };
