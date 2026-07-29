import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CONTAINER_GUTTER, CONTAINER_LARGURA } from '@/lib/containerPublico';

/**
 * Dobra — primitiva de RITMO da página de evento (LEELA-R7).
 *
 * Duas garantias, uma por vez inexistentes no ad-hoc de cada seção:
 *  1. Ritmo VERTICAL uniforme entre dobras — `py-16 → sm:py-20 → lg:py-24`
 *     (tokens de spacing 16/20/24 = 64/80/96px do DS; nenhum eixo novo).
 *  2. CONTÊINER ÚNICO (`lib/containerPublico` — DEC-0729 · achado 14 · C2):
 *     gutter no `<section>`, `max-w-5xl` sozinho no `<div>` interno. Todas as
 *     dobras — e agora também header e Hero, mesma fonte — compartilham a
 *     MESMA calha horizontal, então as bordas de conteúdo alinham
 *     verticalmente descendo a página.
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
    <section id={id} className={cn(CONTAINER_GUTTER, 'py-16 sm:py-20 lg:py-24', className)}>
      <div className={cn(CONTAINER_LARGURA, center && 'text-center')}>{children}</div>
    </section>
  );
}
