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

import type { ReactNode } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@leela/design-system';

export interface SecaoHeadProps {
  titulo: string;
  /** Uma linha de contexto sob o título (o "subtítulo" dos blocos da v3). */
  descricao?: string;
  /**
   * Explicação do bloco atrás de um "?" ao lado do título (REFACTOR item 12).
   *
   * O subtítulo descritivo ocupa uma linha inteira em TODO card, o tempo todo,
   * para uma informação que se lê uma vez. Atrás do "?" ele fica a um clique de
   * quem precisa e some da varredura de quem já sabe.
   *
   * O conteúdo abre em PORTAL, na raiz do documento (REFACTOR item 8). A causa
   * é concreta: basta um ancestral com `transform` — um card com
   * `translateY(-2px)` no hover, por exemplo — para virar bloco de contenção, e
   * aí `position: fixed` passa a se ancorar no card, com a dica indo parar
   * atrás do vizinho. Em portal, o problema não pode acontecer.
   */
  ajuda?: string;
  /**
   * Controle de RECORTE DO PRÓPRIO CARD, à esquerda do link de ação
   * (REFACTOR item 9). Fica aqui, e não numa barra de filtros da tela, porque
   * um filtro compartilhado entre dois cards muda os dois com um clique só —
   * o vizinho reflui sem ninguém ter pedido. Quem desenha o cabeçalho não sabe
   * qual é o recorte; quem tem o estado é o card.
   */
  controle?: ReactNode;
  /** Rótulo do link à direita — sem ele, não há link. */
  acaoRotulo?: string;
  onAcao?: (() => void) | undefined;
}

export function SecaoHead({
  titulo,
  descricao,
  ajuda,
  controle,
  acaoRotulo,
  onAcao,
}: SecaoHeadProps): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-[var(--spacing-3)] mb-[var(--layout-section-head-mb)]">
      <div className="min-w-0">
        <div className="flex items-center gap-[var(--spacing-1)]">
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
          {ajuda ? (
            <Popover>
              <PopoverTrigger asChild>
                {/* O nome acessível cita o bloco: numa tela com seis "?", seis
                    botões chamados "ajuda" não dizem ajuda sobre o quê. */}
                <IconButton aria-label={`O que "${titulo}" mostra`}>
                  <HelpCircle aria-hidden />
                </IconButton>
              </PopoverTrigger>
              <PopoverContent
                className={cn(
                  'max-w-xs px-[var(--spacing-3)] py-[var(--spacing-2)]',
                  // Fonte DECLARADA, não herdada (REFACTOR item 8): fora da
                  // árvore do painel, o conteúdo em portal deixa de herdar a
                  // família e cai na fonte do sistema.
                  'font-[family-name:var(--font-family-ui)]',
                  'text-[length:var(--font-size-sm)] text-[var(--text-secondary)]',
                )}
              >
                {ajuda}
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
        {descricao ? (
          <p className="mt-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {descricao}
          </p>
        ) : null}
      </div>
      {controle ? <div className="shrink-0 self-center">{controle}</div> : null}
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
