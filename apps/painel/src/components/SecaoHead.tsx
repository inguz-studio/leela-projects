// =============================================================================
// SecaoHead — o cabeçalho de bloco da Visão Geral, num lugar só.
//
// A anatomia (título display itálico + link opcional à direita, com o mesmo
// `--layout-section-head-mb` e a mesma seta) já existia repetida em
// `ActiveEvents` e `RecentRegistrations`. Os blocos novos da v3 seriam a
// terceira e a quarta cópia, e é exatamente aí que uma cópia vira drift: basta
// uma delas ganhar um token diferente e os títulos da mesma tela param de casar.
//
// Não sobe ao design system porque é composição de tela, não primitivo: o DS já
// publica o `PageHeader` (cabeçalho de PÁGINA) e não tem — nem precisa ter —
// opinião sobre como um bloco interno se anuncia. Fica em `src/components`
// porque a tela de Engajamento usa a MESMA anatomia: um cabeçalho de bloco que
// muda de lugar conforme a tela não é cabeçalho de bloco, é enfeite.
// =============================================================================

import { ChevronRight } from 'lucide-react';
import { cn } from '@leela/design-system';

export interface SecaoHeadProps {
  titulo: string;
  /** Uma linha de contexto sob o título (o "subtítulo" dos blocos da v3). */
  descricao?: string;
  /** Rótulo do link à direita — sem ele, não há link. */
  acaoRotulo?: string;
  onAcao?: (() => void) | undefined;
}

export function SecaoHead({
  titulo,
  descricao,
  acaoRotulo,
  onAcao,
}: SecaoHeadProps): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-[var(--spacing-3)] mb-[var(--layout-section-head-mb)]">
      <div className="min-w-0">
        <h2
          className={cn(
            'font-display italic',
            'text-[length:var(--section-title-size)] font-[var(--font-weight-bold)]',
            'tracking-[var(--section-title-spacing)]',
            'text-[var(--text-primary)]',
          )}
        >
          {titulo}
        </h2>
        {descricao ? (
          <p className="mt-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {descricao}
          </p>
        ) : null}
      </div>
      {acaoRotulo && onAcao ? (
        <button
          type="button"
          onClick={onAcao}
          className={cn(
            'inline-flex shrink-0 items-center gap-[var(--spacing-1)]',
            'text-[length:var(--section-link-size)] text-[var(--text-tertiary)]',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'hover:text-[var(--action-brand-tint-fg)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
          )}
        >
          {acaoRotulo}
          <ChevronRight
            aria-hidden
            className="w-[var(--section-link-icon-size)] h-[var(--section-link-icon-size)]"
          />
        </button>
      ) : null}
    </div>
  );
}

SecaoHead.displayName = 'SecaoHead';
