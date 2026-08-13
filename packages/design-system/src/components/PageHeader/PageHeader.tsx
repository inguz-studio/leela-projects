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
        // `min-h` sozinho não segura a altura: o header é item de um flex
        // COLUNA com altura definida (a área de rolagem do shell), e ali
        // `flex-shrink:1` comprime a caixa até o próprio `min-height` enquanto
        // o conteúdo continua precisando de mais. Abaixo de `lg` o slot de
        // ações embrulha (`basis-full`) e o conteúdo passa de 96px para
        // 135-157px — a caixa ficava em 96 e a linha embrulhada era PINTADA
        // POR CIMA do primeiro bloco da página (medido em 12/08: 61px de
        // vazamento em 320/375, 39px em 768; a régua de data da Visão Geral
        // caía sobre o eyebrow do cartão "Próximo evento"). `shrink-0` devolve
        // a altura ao conteúdo. Em `lg` nada muda: lá o conteúdo já cabe nos
        // 96px e a caixa continua idêntica.
        'shrink-0',
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
              // Degrau responsivo do §4 do handoff-v2 (`< md`), que a régua
              // nunca tinha implementado: o título de página ficava em 40px
              // até em 320px. O tamanho é decisão do DS e mora no par de
              // tokens `--header-title-size{,-compact}` — a tela não escolhe.
              'text-[length:var(--header-title-size-compact)]',
              'md:text-[length:var(--header-title-size)]',
              'tracking-[var(--header-title-spacing)]',
              'font-[var(--font-weight-bold)]',
              'text-[var(--text-primary)]',
              'min-w-0',
              // `truncate` só a partir de `md`. Abaixo dele a caixa do header
              // cresce com o conteúdo (o `shrink-0` acima), então cortar o
              // título com reticências deixou de ser necessário — e era o que
              // sobrava do defeito: reduzir o corpo para 2rem e ainda entregar
              // "Meia Marato…" não resolve a queixa, só a encolhe. Em `md`+ o
              // corte continua protegendo a linha única de 96px.
              'md:truncate',
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
