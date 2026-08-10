// =============================================================================
// Blocos do protótipo "Visao Geral v3" (HIFI-REC) — a anatomia repetida das
// seções, num lugar só. O protótipo desenha TODA seção como um cartão vidro
// (surface-raised + blur + raio de card + sombra) com um eyebrow uppercase na
// cor de tinta da marca; os stats são número display + rótulo; os links de
// rodapé e os CTAs têm um formato cada. Quatro seções copiando esse markup é
// como nasce drift — mesma razão do SecaoHead (ver comentário de lá).
//
// Fica na tela (não no DS) porque é composição da Visão Geral: o DS dá os
// tokens (--v3-*) e primitivos; a opinião de como uma seção do dashboard se
// anuncia é desta rota. Medidas SEMPRE por token — zero px/hex aqui.
// =============================================================================

import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Cascata — entrada da tela em cascata (README §5): fade + subida de 12px,
// passo por índice via token --motion-stagger. Uma vez por montagem;
// desligado sob prefers-reduced-motion (estado final preservado).
// ---------------------------------------------------------------------------

export function Cascata({
  i,
  children,
  className,
}: {
  /** Posição REAL na grade — o passo é `i * var(--motion-stagger)`. */
  i: number;
  children: ReactNode;
  className?: string | undefined;
}): JSX.Element {
  return (
    <div
      className={cn('animate-revela-secao motion-reduce:animate-none min-w-0', className)}
      style={{ animationDelay: `calc(${i} * var(--motion-stagger))` } as CSSProperties}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CartaoV3 — a moldura de seção do protótipo
// ---------------------------------------------------------------------------

export interface CartaoV3Props {
  children: ReactNode;
  /** Nome acessível da seção (protótipo: toda seção é um landmark nomeado). */
  aria: string;
  /** Sombra: seções de dado usam elev-2, listas/apoio elev-1 (protótipo). */
  elev?: 1 | 2;
  /** Padding: 20px nas seções compactas, 24px nas de gráfico (protótipo). */
  padding?: 'p' | 'lg';
  className?: string | undefined;
}

export function CartaoV3({
  children,
  aria,
  elev = 1,
  padding = 'p',
  className,
}: CartaoV3Props): JSX.Element {
  return (
    <section
      aria-label={aria}
      className={cn(
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)]',
        '[backdrop-filter:var(--card-blur)]',
        padding === 'lg' ? 'p-[var(--v3-card-p-lg)]' : 'p-[var(--v3-card-p)]',
        elev === 2 ? 'shadow-elev-2' : 'shadow-elev-1',
        className,
      )}
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// EyebrowV3 — o h2 uppercase das seções ("PRÓXIMO EVENTO", "CLUBS"…)
// ---------------------------------------------------------------------------

export function EyebrowV3({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  /** Ícone Lucide 15px do protótipo (nem toda seção tem). */
  icon?: ReactNode;
  className?: string | undefined;
}): JSX.Element {
  return (
    <h2
      className={cn(
        'flex items-center gap-[var(--spacing-2)]',
        'text-[length:var(--font-size-xs-plus)] font-[var(--font-weight-bold)]',
        'uppercase tracking-[var(--countdown-eyebrow-spacing)]',
        'text-[var(--action-brand-tint-fg)]',
        'mb-[var(--spacing-4)]',
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className="shrink-0 flex items-center [&_svg]:w-[var(--v3-icon-sm)] [&_svg]:h-[var(--v3-icon-sm)]"
        >
          {icon}
        </span>
      ) : null}
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// StatV3 — número display + rótulo embaixo (stats do countdown e dos Clubs)
// ---------------------------------------------------------------------------

export function StatV3({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: string;
  rotulo: string;
  /** Primeiro stat do countdown vem na cor da marca (protótipo). */
  destaque?: boolean;
}): JSX.Element {
  return (
    <div>
      <span
        className={cn(
          'block font-display font-[var(--font-weight-extrabold)]',
          'text-[length:var(--font-size-xl)] leading-none whitespace-nowrap',
          destaque ? 'text-[var(--text-brand)]' : 'text-[var(--text-primary)]',
        )}
      >
        {valor}
      </span>
      <span className="block mt-[var(--spacing-1-5)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {rotulo}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkV3 — "Ver agora" / "Ver agenda completa" com a seta do protótipo
// ---------------------------------------------------------------------------

export function LinkV3({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string | undefined;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-[var(--spacing-2)] shrink-0',
        'border-none bg-transparent cursor-pointer',
        'text-[length:var(--font-size-sm-plus)] font-[var(--font-weight-semibold)]',
        'text-[var(--text-brand)] no-underline hover:underline',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden className="w-[var(--v3-icon-sm)] h-[var(--v3-icon-sm)]" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// CtaV3 — o botão de largura cheia do protótipo (primário 48px / neutro 44px)
// ---------------------------------------------------------------------------

export function CtaV3({
  children,
  onClick,
  variant = 'primario',
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primario' | 'neutro';
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-center gap-[var(--spacing-2-5)]',
        'border-none rounded-[var(--radius-md)] cursor-pointer',
        'transition-colors duration-[var(--motion-duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
        variant === 'primario'
          ? cn(
              'h-[var(--v3-cta-h)]',
              'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
              'text-[length:var(--font-size-base-plus)] font-[var(--font-weight-bold)]',
              'hover:bg-[var(--action-primary-hover)]',
            )
          : cn(
              'h-[var(--v3-cta-h-sm)]',
              'bg-[var(--surface-high)] text-[var(--text-primary)]',
              'text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)]',
              'hover:bg-[var(--action-secondary-hover)]',
            ),
      )}
    >
      {children}
      <ArrowRight aria-hidden className="w-[var(--v3-icon-sm)] h-[var(--v3-icon-sm)]" />
    </button>
  );
}
