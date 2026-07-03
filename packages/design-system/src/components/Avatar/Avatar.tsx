/**
 * Avatar — imagem circular com fallback de iniciais + estado VIP.
 *
 * Tamanhos: sm (32px) | md (40px) | lg (48px)
 * Fallback: gradiente com iniciais do nome (até 2 letras)
 * Estado VIP: ring dourado (elevation-brand)
 *
 * A11y: aria-label descrevendo o usuário representado.
 * §2.16 flat — sem borda decorativa (exceto ring VIP).
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last  = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

// Deterministic gradient from name (keeps consistent color per user)
function getGradientAngle(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return hash % 360;
}

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

const avatarVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center',
    'rounded-[var(--avatar-radius)] overflow-hidden',
    'select-none',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'w-[var(--avatar-size-sm)] h-[var(--avatar-size-sm)] text-[length:var(--font-size-xs)]',
        md: 'w-[var(--avatar-size-md)] h-[var(--avatar-size-md)] text-[length:var(--font-size-sm)]',
        lg: 'w-[var(--avatar-size-lg)] h-[var(--avatar-size-lg)] text-[length:var(--font-size-base)]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof avatarVariants> {
  /** Name used to derive initials and gradient. Required for accessibility. */
  name: string;
  /** Optional image URL. Falls back to initials when absent or on error. */
  src?: string;
  /** VIP state — adds brand glow ring. */
  vip?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, name, src, vip = false, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);
    const showImage = Boolean(src) && !imgError;
    const initials  = getInitials(name);
    const angle     = getGradientAngle(name);

    return (
      <span
        ref={ref}
        role="img"
        aria-label={name}
        className={cn(
          avatarVariants({ size, className }),
          vip && 'ring-2 ring-[color:var(--action-primary)] ring-offset-1 ring-offset-[color:var(--surface-base)]',
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center font-semibold text-[var(--action-primary-fg)]"
            style={{
              background: `linear-gradient(${angle}deg, var(--action-primary), var(--action-primary-pressed))`,
            }}
          >
            {initials}
          </span>
        )}
      </span>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar };
