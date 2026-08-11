/**
 * SubNav — barra de sub-navegação (§2.14).
 *
 * Container: TRANSPARENTE (D-1008-R18), padding 0 40px (--subnav-px), SEM
 * border-bottom (a `divider` opcional das terciárias segue existindo). Itens e
 * indicador deslizante assentam DIRETO sobre a página.
 * Tab inativa: font-weight 400, text-secondary.
 * Tab ativa: font-weight 600, text-primary, sublinhado Brasa 2px (indicador
 * deslizante único — D-1008-R14).
 * Contador: pill radius 10px, min-width 28px, height 20px, bg-surface-raised
 * (um passo ACIMA do fundo p/ o pill não sumir), font-size 11px.
 *
 * Decisão (Vitor 2026-07-11): SubNav plano — sem divisor; o sublinhado da aba
 * ativa carrega a orientação sozinho (sobrepõe o "§2.16 flat: border-bottom é
 * divider permitido").
 *
 * D-1008-R18 (dono, 11/08): o fundo da barra fica TRANSPARENTE. O container
 * pintava `--surface-base` opaco — igual à página FLAT, mas por cima do
 * `--page-glow` do vidro isso desenhava uma faixa escura sólida ("o background
 * dos menus secundários"). Escopo preciso da decisão: SÓ a barra de navegação
 * de área/rota (este componente — todas as áreas herdam); controles
 * segmentados DENTRO de cards (Tabs §2.7 e afins) mantêm a anatomia do
 * protótipo; menus FLUTUANTES seguem opacos (D-1008-R4 de pé). AA por estado
 * medido contra o fundo da PÁGINA nos 3 temas: gate na suíte de contraste
 * (`contrast.test.ts` · describe D-1008-R18).
 *
 * Semântica: navegação entre rotas — nav landmark + lista de links com
 * aria-current="page" na ativa (não é tablist; Tabs §2.7 cobre troca in-page).
 * Teclado: Tab percorre os links normalmente; ← → como atalho opcional.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { SCROLL_X_ONLY_SEM_CROMO } from '../../utils/scroll';

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

  // -------------------------------------------------------------------------
  // Indicador DESLIZANTE (D-1008-R14): o sublinhado da aba ativa é UM elemento
  // só, que viaja entre as posições quando a seleção troca — antes era um
  // ::after POR aba (aparecia/sumia, sem movimento). Posição e largura vêm de
  // MEDIÇÃO de layout (offsetLeft/offsetWidth da aba ativa — px de runtime,
  // não px de design; nenhuma medida nova entrou na escala). Movimento pelos
  // tokens de motion e desligado sob prefers-reduced-motion. O elemento só
  // nasce DEPOIS da primeira medição — entra no DOM já em posição, sem
  // animar do zero.
  // -------------------------------------------------------------------------
  const ativoIdx = tabs.findIndex((t) => t.active);
  const [indicador, setIndicador] = React.useState<{ x: number; w: number } | null>(null);

  React.useLayoutEffect(() => {
    const el = ativoIdx >= 0 ? tabRefs.current[ativoIdx] : null;
    if (!el) {
      setIndicador(null);
      return undefined;
    }
    const medir = (): void => setIndicador({ x: el.offsetLeft, w: el.offsetWidth });
    medir();
    // Largura de aba muda com fonte/viewport — re-mede no resize.
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [ativoIdx, tabs]);

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
        // `relative` ancora o indicador deslizante (D-1008-R14) — o nav é o
        // offsetParent das abas, então offsetLeft e translateX falam a mesma
        // régua, e o indicador rola JUNTO com o conteúdo (abs dentro do
        // scroll container).
        // D-1008-R18: fundo TRANSPARENTE — era `--surface-base` opaco, que
        // sobre o page-glow do vidro virava uma faixa sólida. Explícito (e não
        // ausência de classe) para o contrato ser grep-ável e o consumidor não
        // "herdar" um fundo por acidente de composição.
        'relative bg-transparent',
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
        // TRAVA DE ROLAGEM — DEPOIS do `className` DE PROPÓSITO (REV-LOTES).
        //
        // `cn` é `twMerge`, que resolve conflito pelo ÚLTIMO da lista. Enquanto
        // estas classes vinham antes do `className`, um consumidor passando
        // `overflow-y-auto` (ou `overflow-auto`, ou `[scrollbar-width:auto]`,
        // ou `overflow-x-hidden`) APAGAVA a trava silenciosamente e ressuscitava
        // um defeito que o dono já reportou DUAS vezes — com o teste de contrato
        // ainda verde, porque ele renderiza sem `className`. Vindo por último, a
        // trava vence qualquer override: o eixo do SubNav não é configurável.
        // Cor, fundo, padding e borda seguem sobrescrevíveis (outros grupos).
        //
        // A escolha do SEM_CROMO é da navegação, e é o pedido literal do dono,
        // feito duas vezes: `w-max` na lista estoura a largura em tablet/celular,
        // a barra horizontal clássica do Windows/Chrome come ~15px da ALTURA do
        // nav, a lista tem altura fixa (`h-[--subnav-height]`) e a sobra vira a
        // barra VERTICAL. Sem cromo, nenhuma altura é roubada e a cascata não
        // começa. As abas que não cabem continuam alcançáveis (gesto, trackpad,
        // arrastar, setas ←/→) — por isso NÃO é `overflow-x: hidden`, que
        // esconderia aba, o defeito que o Adendo 12 existiu para consertar.
        //
        // A regra da casa e o porquê do eixo y fechado estão em utils/scroll.ts.
        // ---------------------------------------------------------------------
        SCROLL_X_ONLY_SEM_CROMO,
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
            // O sublinhado da ativa NÃO mora mais aqui: desde a D-1008-R14 ele
            // é o indicador deslizante ÚNICO (span [data-subnav-indicador] no
            // nav) — um ::after por aba não desliza, só pisca de posição.
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
      {/* Indicador deslizante (D-1008-R14): o único sublinhado, viajando entre
          as abas. Decorativo (aria-hidden) — a semântica da ativa segue no
          aria-current. Largura/posição por medição (px de runtime, não de
          design); movimento pelos tokens de motion, honrando motion-reduce. */}
      {indicador ? (
        <span
          aria-hidden
          data-subnav-indicador=""
          className={cn(
            'pointer-events-none absolute bottom-0 left-0',
            'h-[var(--subnav-underline)] bg-[var(--border-brand)]',
            'rounded-t-[var(--radius-sm)]',
            'transition-[transform,width] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]',
            'motion-reduce:transition-none',
          )}
          style={{ width: indicador.w, transform: `translateX(${indicador.x}px)` }}
        />
      ) : null}
    </nav>
  );
}

SubNav.displayName = 'SubNav';

export { SubNav };
