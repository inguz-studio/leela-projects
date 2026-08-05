/**
 * SubNav — barra de sub-navegação (§2.14).
 *
 * Container: bg-surface-base (= fundo da página, plano), padding 0 40px
 * (--subnav-px), SEM border-bottom. O único indicador é o sublinhado Brasa 2px
 * da aba ativa (::after).
 * Tab inativa: font-weight 400, text-secondary.
 * Tab ativa: font-weight 600, text-primary, underline Brasa 2px via ::after.
 * Contador: pill radius 10px, min-width 28px, height 20px, bg-surface-raised
 * (um passo ACIMA do fundo plano p/ o pill não sumir), font-size 11px.
 *
 * Decisão (Vitor 2026-07-11): SubNav plano — fundo igual ao da página e sem
 * divisor. Sobrepõe o "§2.16 flat: border-bottom é divider permitido": aqui a
 * palavra do Vitor vence, o sublinhado da aba ativa carrega a orientação
 * sozinho. O pill do contador inverte a relação de elevação (era base sobre
 * raised; agora raised sobre base) para preservar exatamente o mesmo delta de
 * luminância — o contraste do texto das abas sobre o novo fundo MELHORA
 * (text-secondary #BFBFBF sobre #0C0C0C ≈ 10.6:1; text-primary ≈ 18:1).
 *
 * Semântica: navegação entre rotas — nav landmark + lista de links com
 * aria-current="page" na ativa (não é tablist; Tabs §2.7 cobre troca in-page).
 * Teclado: Tab percorre os links normalmente; ← → como atalho opcional.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubNavTab {
  id: string;
  label: string;
  href?: string;
  count?: number;
  active?: boolean;
  /**
   * Recebe o evento — em `href` + `onClick`, permite `preventDefault()` (nav
   * SPA). Mesmo contrato do `CardEvento` (a primitiva que já tinha o conserto).
   * O `href` CONTINUA no DOM: é o que dá ctrl/cmd+clique, clique do meio,
   * "copiar endereço do link" e preview da URL na barra de status. Quem quer
   * navegação de SPA intercepta aqui; quem não passa `onClick` mantém a
   * navegação de documento do navegador.
   *
   * Alargamento ADITIVO: `() => void` continua atribuível a este tipo, então
   * nenhum consumidor existente precisa mudar.
   */
  onClick?: (event: React.MouseEvent) => void;
}

export interface SubNavProps {
  tabs: SubNavTab[];
  /** Rótulo do landmark de navegação. */
  'aria-label'?: string;
  /**
   * Divisória inferior (RN-229 · S-R9-10). Default `false` = plano (decisão do
   * Vitor 2026-07-11, preservado em TODOS os consumidores existentes). `true`
   * alinha ao padrão de Comunicação (Tabs §2.7): `border-b` em `--border-subtle`
   * — usado nas sub-navs TERCIÁRIAS dentro de eventos (Financeiro/Kits/Config).
   */
  divider?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SubNav({
  tabs,
  'aria-label': ariaLabel = 'Navegação de seções',
  divider = false,
  className,
}: SubNavProps): JSX.Element {
  const tabRefs = React.useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      tabRefs.current[(index + 1) % tabs.length]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tabRefs.current[(index - 1 + tabs.length) % tabs.length]?.focus();
    }
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'bg-[var(--surface-base)]',
        'px-[var(--subnav-px)]',
        // Adendo 12 (R9-A · tablet/mobile): a barra de sub-navegação de eventos
        // tem N abas (Visão/Inscritos/Kits/…/Financeiro/Config) que estouravam a
        // largura em tablet/mobile ("slider horizontal quebrando"). Scroll
        // horizontal INTERNO: em telas estreitas a barra rola em vez de quebrar.
        // `overscroll-x-contain` evita que o gesto de scroll da barra role a página.
        'overscroll-x-contain',
        // RN-229 (S-R9-10): divisória opcional das terciárias, igual a Comunicação.
        divider && 'border-b border-b-[var(--border-subtle)]',
        className,
        // ---------------------------------------------------------------------
        // TRAVA DE OVERFLOW — DEPOIS do `className` DE PROPÓSITO (REV-LOTES).
        //
        // `cn` é `twMerge`, que resolve conflito pelo ÚLTIMO da lista. Enquanto
        // estas classes vinham antes do `className`, um consumidor passando
        // `overflow-y-auto` (ou `overflow-auto`, ou `[scrollbar-width:auto]`,
        // ou `overflow-x-hidden`) APAGAVA a trava silenciosamente e ressuscitava
        // um defeito que o dono já reportou DUAS vezes — com o teste de contrato
        // ainda verde, porque ele renderiza sem `className`. Vindo por último, a
        // trava vence qualquer override: o eixo do SubNav não é configurável.
        // Cor, fundo, padding e borda seguem sobrescrevíveis (outros grupos).
        // ---------------------------------------------------------------------
        // BUILD-LOTES-UX · frente F (REINCIDÊNCIA — o dono já tinha pedido isto).
        //
        // O Adendo 12 resolveu a QUEBRA de layout e deixou as duas barras de
        // rolagem na tela. Elas nascem em cascata:
        //   1. `w-max` na lista faz o conteúdo ficar mais largo que a barra em
        //      tablet/celular → o `overflow-x: auto` desenha a barra horizontal.
        //      No Windows/Chrome ela é CLÁSSICA (ocupa espaço), não overlay —
        //      "no desktop nenhuma scrollbar aparece" era verdade só no desktop;
        //   2. essa barra come ~15px da ALTURA de conteúdo do nav, e a lista tem
        //      altura fixa (`h-[--subnav-height]`) → sobra vertical de exatamente
        //      a espessura da barra;
        //   3. pelo CSS de overflow, um eixo não-`visible` promove o outro de
        //      `visible` a `auto` → a sobra do passo 2 vira a barra VERTICAL.
        // Ou seja: a barra horizontal fabricava a vertical.
        //
        // Conserto na causa: some com o CROMO da barra — o scroll continua
        // (gesto, trackpad, arrastar, e as setas ←/→ que já movem o foco), então
        // nenhum pixel de altura é roubado e o passo 2 deixa de existir.
        // `overflow-y-hidden` fecha o passo 3 de vez, e nunca corta conteúdo: a
        // lista tem a altura exata do nav. NÃO usar `overflow-x: hidden` — isso
        // esconderia as abas que não cabem, que é o que o Adendo 12 evitou.
        'overflow-x-auto',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'overflow-y-hidden',
      )}
    >
      <ul role="list" className="flex w-max items-end gap-[var(--spacing-1)] h-[var(--subnav-height)]">
        {tabs.map((tab, index) => {
          const isActive = tab.active ?? false;
          const sharedClass = cn(
            'relative inline-flex items-center gap-[var(--spacing-2)]',
            'h-full pb-[var(--spacing-1)]',
            'px-[var(--spacing-3)]',
            'text-[length:var(--font-size-base)]',
            'whitespace-nowrap',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--border-focus)]',
            'rounded-t-[var(--radius-sm)]',
            isActive
              ? 'text-[var(--text-primary)] font-[var(--font-weight-semibold)]'
              : 'text-[var(--text-secondary)] font-[var(--font-weight-regular)] hover:text-[var(--text-primary)]',
            // Underline indicator (Brasa 2px)
            isActive && [
              'after:absolute after:bottom-0 after:left-0 after:right-0',
              'after:h-[var(--subnav-underline)] after:bg-[var(--border-brand)]',
              'after:rounded-t-[var(--radius-sm)]',
            ],
          );

          const content = (
            <>
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'h-[var(--subnav-pill-height)] min-w-[var(--subnav-pill-min-width)]',
                    'px-[var(--spacing-2)]',
                    'rounded-[var(--subnav-pill-radius)]',
                    'text-[length:var(--subnav-pill-font-size)] font-[var(--font-weight-semibold)]',
                    'bg-[var(--surface-raised)]',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </>
          );

          return (
            <li key={tab.id} className="h-full">
              {tab.href ? (
                <a
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={sharedClass}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onClick={tab.onClick}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={sharedClass}
                  onClick={tab.onClick}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

SubNav.displayName = 'SubNav';

export { SubNav };
