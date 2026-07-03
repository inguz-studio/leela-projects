/**
 * Skeleton — placeholder de carregamento (T4).
 *
 * Regra DoD Tela: listas carregam com skeleton, nunca spinner solto.
 * Shimmer via animate-pulse, respeitando prefers-reduced-motion
 * (motion-safe). Decorativo: aria-hidden, sem role.
 * §2.16 flat.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * text: linha de texto (altura de 1 linha, largura total)
   * rect: bloco retangular (dimensione via className)
   * circle: avatar/ícone redondo
   */
  variant?: 'text' | 'rect' | 'circle';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Skeleton({ variant = 'rect', className, ...props }: SkeletonProps): JSX.Element {
  return (
    <div
      aria-hidden
      data-variant={variant}
      className={cn(
        'bg-[var(--surface-overlay)]',
        'motion-safe:animate-pulse',
        variant === 'text' && 'h-[var(--spacing-4)] w-full rounded-[var(--skeleton-radius)]',
        variant === 'rect' && 'rounded-[var(--skeleton-radius)]',
        variant === 'circle' && 'rounded-[var(--radius-pill)]',
        className,
      )}
      {...props}
    />
  );
}

Skeleton.displayName = 'Skeleton';

export { Skeleton };
