/**
 * PageHeader — cabeçalho de contexto 96px (§2.1).
 *
 * Contém: avatar/nome, badges de status, metadados, slot de ações.
 * Altura 96px via --header-height token.
 * §2.16 flat — sem borda decorativa.
 * A11y: heading semântico, region landmark.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageHeaderProps {
  title: string;
  /**
   * Uma linha de contexto sob o título. Aceita nó para ênfase inline — o
   * protótipo Visao Geral v3 (HIFI-REC) pinta o nome do usuário em
   * `<strong>` na cor da marca dentro da saudação.
   */
  subtitle?: React.ReactNode;
  avatar?: React.ReactNode;
  badges?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PageHeader({
  title,
  subtitle,
  avatar,
  badges,
  metadata,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header
      aria-label={title}
      className={cn(
        // Responsivo (LEELA-RESP-M4): abaixo de `lg` o header quebra e o slot de
        // ações desce para a própria linha (`basis-full`), devolvendo a largura
        // à coluna de título/metadata — sem isso, ações `shrink-0` espremem a
        // coluna e a metadata quebra 1 palavra/linha em 390. Desktop (`lg`) fica
        // `flex-nowrap`, layout de linha única idêntico ao anterior.
        'flex flex-wrap items-center gap-[var(--spacing-4)] lg:flex-nowrap',
        'min-h-[var(--header-height)]',
        'px-[var(--spacing-6)]',
        // Congruência mockup `.page-head` (T7, fecha Directive da T6): o
        // page-head é FLAT sobre o fundo — sem surface raised.
        'bg-transparent',
        className,
      )}
    >
      {/* Avatar slot */}
      {avatar && (
        <div className="shrink-0" aria-hidden>
          {avatar}
        </div>
      )}

      {/* Title + badges + metadata */}
      <div className="flex flex-col justify-center gap-[var(--spacing-1)] min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-[var(--spacing-2)] flex-wrap">
          <h1
            className={cn(
              // `.h1` do mockup: display italic bold 40px ls -.01em (T7).
              'font-display italic',
              'text-[length:var(--header-title-size)]',
              'tracking-[var(--header-title-spacing)]',
              'font-[var(--font-weight-bold)]',
              'text-[var(--text-primary)]',
              'min-w-0',
              'truncate',
            )}
          >
            {title}
          </h1>
          {badges && (
            <div className="flex items-center gap-[var(--spacing-2)] flex-wrap">
              {badges}
            </div>
          )}
        </div>
        {(subtitle || metadata) && (
          <div className="flex items-center gap-[var(--spacing-3)] flex-wrap">
            {subtitle && (
              // 0.9375rem do protótipo v3 (era `sm`): a saudação é a linha de
              // boas-vindas do painel, não uma legenda — o corpo dela sobe.
              <p className="text-[length:var(--font-size-base-plus)] text-[var(--text-secondary)]">
                {subtitle}
              </p>
            )}
            {metadata && (
              <div className="flex items-center gap-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {metadata}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions slot */}
      {actions && (
        <div className="flex items-center gap-[var(--spacing-3)] shrink-0 ml-auto basis-full lg:basis-auto">
          {actions}
        </div>
      )}
    </header>
  );
}

PageHeader.displayName = 'PageHeader';

export { PageHeader };
