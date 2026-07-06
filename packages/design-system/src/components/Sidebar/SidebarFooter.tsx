/**
 * SidebarFooter — rodapé do painel de navegação (contrato visual `.sidebar-footer`
 * do mockup Be Hero): avatar + nome + subtítulo, acima de uma borda sutil.
 *
 * Componível: os DADOS vêm do consumidor (avatar como nó — ex.: <Avatar
 * size="sm" name={nome} /> — nome e subtítulo como strings). Nenhum usuário
 * hardcoded no DS. Com `onClick`, o rodapé inteiro vira botão (ex.: abrir
 * perfil) com nome acessível = nome do usuário.
 *
 * A11y: texto real no DOM (sem aria-label sintético); foco visível quando
 * interativo. §2.16 flat — só a borda-topo separadora, por token.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SidebarFooterProps {
  /** Nó de avatar (ex.: `<Avatar size="sm" name={nome} />`). */
  avatar?: React.ReactNode;
  /** Nome de exibição do usuário logado. */
  name: string;
  /** Linha secundária (ex.: cargo ou "Ver perfil"). */
  subtitle?: string;
  /** Torna o rodapé interativo (botão). */
  onClick?: () => void;
  className?: string;
}

export function SidebarFooter({
  avatar,
  name,
  subtitle,
  onClick,
  className,
}: SidebarFooterProps): JSX.Element {
  const content = (
    <>
      {avatar && <span className="shrink-0">{avatar}</span>}
      <span className="flex flex-col min-w-0 flex-1 text-left">
        <span
          className={cn(
            'truncate',
            // Mockup `.sidebar-footer .name`: 13px/600
            'text-[length:var(--sidebar-footer-name-size)]',
            'font-[var(--font-weight-semibold)]',
            'text-[var(--text-primary)]',
          )}
        >
          {name}
        </span>
        {subtitle && (
          <span
            className={cn(
              'truncate',
              // Mockup `.sidebar-footer .link`: 11px tertiary (hover brand)
              'text-[length:var(--sidebar-footer-link-size)]',
              'text-[var(--text-tertiary)]',
              onClick && 'group-hover:text-[var(--action-brand-tint-fg)]',
              'transition-colors duration-[var(--motion-duration-fast)]',
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </>
  );

  const sharedClasses = cn(
    'flex items-center w-full',
    // Mockup `.sidebar-footer`: padding 14px 16px, gap 12
    'gap-[var(--sidebar-footer-gap)]',
    'px-[var(--sidebar-footer-px)] py-[var(--sidebar-footer-py)]',
    'border-t border-[color:var(--border-subtle)]',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          sharedClasses,
          'group',
          'transition-colors duration-[var(--motion-duration-fast)]',
          'hover:bg-[var(--action-ghost-hover)]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[color:var(--border-focus)]',
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={sharedClasses}>{content}</div>;
}

SidebarFooter.displayName = 'SidebarFooter';
