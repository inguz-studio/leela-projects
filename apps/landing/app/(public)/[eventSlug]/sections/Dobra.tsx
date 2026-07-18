import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Dobra — primitiva de RITMO da página de evento (LEELA-R7).
 *
 * Duas garantias, uma por vez inexistentes no ad-hoc de cada seção:
 *  1. Ritmo VERTICAL uniforme entre dobras — `py-16 → sm:py-20 → lg:py-24`
 *     (tokens de spacing 16/20/24 = 64/80/96px do DS; nenhum eixo novo).
 *  2. CONTÊINER ÚNICO — `mx-auto max-w-5xl` com gutters `px-4 → sm:px-6 →
 *     lg:px-8`. Todas as dobras compartilham a MESMA calha horizontal, então as
 *     bordas de conteúdo alinham verticalmente descendo a página.
 *
 * Sem `border` e sem troca de `background`: as dobras fluem sobre o MESMO
 * `surface-base` do layout público — a separação entre elas é SÓ espaçamento.
 * Zero linhas, zero costuras (pedido do Vitor).
 */
export function Dobra({
  children,
  id,
  center = false,
  className,
}: {
  children: ReactNode;
  id?: string;
  /** Centraliza o conteúdo (usado no bloco de fechamento/checkout). */
  center?: boolean;
  className?: string;
}): React.JSX.Element {
  return (
    <section id={id} className={cn('px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24', className)}>
      <div className={cn('mx-auto w-full max-w-5xl', center && 'text-center')}>{children}</div>
    </section>
  );
}
