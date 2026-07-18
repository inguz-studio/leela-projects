'use client';

// =============================================================================
// Tipografia do checkout (LEELA-R13 · frente 1) — escala DS, local.
//
// DECISÃO DO VITOR (adendo 10): "o DS também não está sendo aplicado na
// consistência de tipografias" no checkout. Este módulo dá UMA escala única de
// título de etapa para todos os Steps, dirigida por TOKENS do design system
// (`--font-size-*` / `--font-weight-*`) — a mesma família de classes que os
// componentes do @leela/design-system usam internamente
// (`text-[length:var(--font-size-*)]`). O DS é LEITURA (lane R9-A): consumimos
// os tokens, não editamos o pacote. Um ícone Lucide de apoio acompanha o título
// (frente 5, "ícones de apoio"); é decorativo (aria-hidden) — o texto carrega o
// significado.
//
// Server-safe por herança: os Steps são Client Components; `lucide-react` é SVG
// puro. Sem importar o barrel do DS (createContext) — só tokens + Lucide.
// =============================================================================

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Título de ETAPA (H2) com ícone de apoio. Escala de token
 * `--font-size-xl` (sm: `--font-size-2xl`), um degrau abaixo do H1 do checkout
 * (`--font-size-2xl` / sm `--font-size-3xl`).
 */
export function TituloEtapa({
  icone: Icone,
  children,
  className,
}: {
  icone: LucideIcon;
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <h2
      className={cn(
        'flex items-center gap-2.5 font-display text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] tracking-tight text-text-primary sm:text-[length:var(--font-size-2xl)]',
        className,
      )}
    >
      <Icone size={22} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
      <span>{children}</span>
    </h2>
  );
}

/**
 * Subtítulo/apoio da etapa — o parágrafo de contexto sob o `TituloEtapa`.
 * Escala secundária consistente (`--font-size-base`) em todos os Steps.
 */
export function ApoioEtapa({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <p className={cn('mt-1.5 text-[length:var(--font-size-base)] text-text-secondary', className)}>
      {children}
    </p>
  );
}
