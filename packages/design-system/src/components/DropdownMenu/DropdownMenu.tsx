/**
 * DropdownMenu — menu de ações flutuante ancorado a um trigger (§2.5, C3).
 *
 * PROVENIÊNCIA (Lote A restante, decisão bd31974): VISUAL shadcn
 * `dropdown-menu`, COMPORTAMENTO nosso. Este componente É o antigo Popover do
 * E01 renomeado para o vocabulário shadcn: o painel do menu adota a receita
 * stock (rounded-md + border + bg-popover + p-1 + shadow + animate-in) via
 * classes de ALIAS shadcn→brasa, e os itens adotam hover/focus em accent
 * (= action-ghost-hover/-fg). O MOTOR de foco/teclado WAI-APG é o do E01,
 * portado integralmente — os 13 testes de comportamento migram juntos, não
 * são reescritos (DropdownMenu.test.tsx).
 *
 * Comportamento (inalterado vs Popover E01):
 *   - Controlado (open/onOpenChange): o pai garante "só um aberto por vez"
 *     guardando um único id aberto (padrão em Table renderActions).
 *   - Click fora fecha; Esc fecha e devolve o foco ao trigger.
 *   - Tab (e Shift+Tab) fecha o menu (WAI-APG menu pattern) e devolve o
 *     foco ao trigger (paridade com Esc). preventDefault: o menu vive em
 *     portal no fim do body, então o Tab nativo a partir do menuitem
 *     jogaria o foco para fora da página; do trigger, o próximo Tab segue
 *     a ordem normal do documento.
 *   - stopPropagation no trigger e em cada item (não dispara click da linha).
 *   - Teclado no menu: ↓ ↑ Home End percorrem os itens.
 *   - Menu renderiza em PORTAL no document.body com position:fixed ancorada
 *     no rect do trigger (F07): nunca é clipado por overflow de Table/células;
 *     reposiciona em scroll (capture) e resize enquanto aberto.
 *
 * Trigger: elemento único (ex.: <Button/>) — recebe onClick, aria-haspopup,
 * aria-expanded e aria-controls via Radix Slot (sem wrapper div clicável).
 *
 * Itens de checkbox (multi-seleção, WAI-APG menuitemcheckbox): quando uma ação
 * traz `checked` (boolean), o item vira `role="menuitemcheckbox"` com
 * `aria-checked` e NÃO fecha o menu ao clicar — o foco fica no item para marcar
 * vários (base do FilterMenu). O indicador visual reusa a linguagem do Checkbox
 * do DS (mesmos tokens), decorativo/aria-hidden: um <input> real aninhado num
 * <button> é interativo-dentro-de-interativo (ARIA inválida, mesma regra
 * documentada no Chip) — a semântica de marcado vive no aria-checked do item.
 * `count` opcional afixa um número à direita (ex.: contagem por categoria).
 *
 * A11y: role="menu" + role="menuitem"/"menuitemcheckbox" + foco no primeiro
 * item ao abrir.
 *
 * MOVIMENTO (BUILD-MOTION · 04/08). O menu entra e SAI com fade + zoom curto —
 * antes ele entrava animado e sumia por corte, porque o `open &&` tirava o nó
 * do DOM antes do primeiro frame de saída.
 *
 * ⛔ A DURAÇÃO DELE É OUTRA, DE PROPÓSITO: `--motion-menu-duration` (120ms),
 * não os 800ms de abertura do overlay. Menu não é superfície de leitura, é
 * affordance de PONTEIRO: a mão já está a caminho do item quando o menu abre.
 * Um menu que leva a mesma meia-segunda de um modal para assentar significa que
 * o alvo ainda está se movendo quando o clique chega — e o clique erra. A regra
 * que fica: superfície que a pessoa LÊ pode demorar; superfície que a pessoa
 * MIRA, não. Todos os números são token e trocam sozinhos.
 *
 * E é UM token só para as duas direções, enquanto o overlay virou PAR (800ms
 * para abrir, 250ms para fechar · decisão do dono de 05/08). O motivo de o menu
 * não ter sido dividido junto: o par existe para pagar a marca na abertura sem
 * cobrar pedágio no fechamento, e em 120ms não há pedágio a cobrar.
 *
 * Durante a saída o painel recebe `pointer-events-none`: um menu meio
 * transparente que ainda engole clique é pior que um menu que some seco.
 *
 * AA (matriz de contraste): item default = popover-foreground sobre popover
 * (text-primary/surface-overlay-opaque ✓ — DELTA-UX/D-1008-R4: o painel
 * flutuante nunca pinta o filme translúcido do vidro; a prova do portal está
 * em __tests__/superficie-portal.test.tsx); hover/focus = accent-foreground
 * sobre accent (action-ghost-fg/action-ghost-hover ✓); item destrutivo =
 * text-danger sobre surface-overlay-opaque e sobre feedback-danger-surface em
 * hover (✓). border-border é decorativa (frame shadcn), fora do gate 1.4.11.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../utils/cn';
import { DURACAO_MENU, estiloMotion, usePresencaOverlay } from '../../utils/overlayMotion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DropdownMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /**
   * Quando definido (boolean), o item vira `menuitemcheckbox` (multi-seleção):
   * mostra indicador de marcado, expõe `aria-checked` e NÃO fecha o menu ao
   * clicar. `undefined` = item de ação comum (`menuitem`, fecha ao clicar).
   */
  checked?: boolean;
  /** Número afixado à direita do item (ex.: contagem da categoria no filtro). */
  count?: number;
  /**
   * Ícone pequeno à ESQUERDA do rótulo (Leva 16 — o dono, na íntegra: *"devo
   * visualizar 'sair' como opção de logou e configurações. Ambos com pequenos
   * icones."*).
   *
   * O contrato recebe o elemento pronto (`icon={<Settings />}`) e não o nome do
   * ícone: o DS tem `lucide-react` como peer, não como dependência, e uma tabela
   * de nomes aqui dentro obrigaria o pacote a importar o catálogo inteiro para
   * servir dois itens de menu. Quem escolhe o desenho é a tela; quem manda no
   * tamanho e no traço é o DS — o wrapper aplica `--popover-icon-size` e
   * `--icon-stroke` no SVG filho, então nenhum consumidor precisa (nem
   * consegue) escolher o número.
   *
   * É decorativo por construção: o rótulo ao lado já nomeia a ação, então o
   * wrapper leva `aria-hidden` e o leitor de tela não ouve o ícone duas vezes.
   */
  icon?: React.ReactNode;
}

export interface DropdownMenuProps {
  actions: DropdownMenuAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Elemento único que dispara o menu (recebe props via Slot). */
  trigger: React.ReactElement;
  align?: 'left' | 'right';
  /**
   * Borda vertical de ancoragem (DELTA-UX-T4). Default 'bottom' (painel abre
   * ABAIXO do trigger). 'top' abre ACIMA — o caso do rodapé de perfil do
   * SidebarRail, colado na borda inferior do viewport: abrir para baixo
   * mandaria o painel para fora da tela.
   */
  side?: 'bottom' | 'top';
  /** Rótulo do landmark do menu (nome acessível). Default: "Ações". */
  menuLabel?: string;
  /** Classe extra do PAINEL do menu (o popover em portal), não do trigger. */
  className?: string;
  /**
   * Classe extra do CONTAINER do trigger (o wrapper de ancoragem). Existe para
   * o trigger poder ocupar a largura do pai (ex.: rodapé do rail, `w-full`) —
   * o container é `inline-flex` e, sem isso, encolheria no conteúdo.
   */
  containerClassName?: string;
}

// ---------------------------------------------------------------------------
// Indicador visual de marcado (menuitemcheckbox)
// ---------------------------------------------------------------------------

/**
 * Caixa de marcação DECORATIVA (aria-hidden) — reusa a linguagem visual do
 * Checkbox do DS (tokens de borda/ação + o mesmo check SVG). A semântica de
 * marcado é do `aria-checked` no item; aqui é só afeto visual, sem <input>
 * aninhado (que seria interativo dentro de <button> = ARIA inválida).
 */
function CheckIndicator({ checked }: { checked: boolean }): JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex h-[var(--spacing-4)] w-[var(--spacing-4)] shrink-0 items-center justify-center',
        'rounded-[var(--radius-sm)] border-[length:var(--input-border-width)]',
        'transition-[background-color,border-color] duration-[var(--motion-duration-fast)]',
        checked
          ? 'bg-[var(--action-primary)] border-[color:var(--action-primary)]'
          : 'bg-[var(--surface-raised)] border-input',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'h-[var(--spacing-3)] w-[var(--spacing-3)] text-[var(--action-primary-fg)]',
          checked ? 'block' : 'hidden',
        )}
      >
        <path d="m5 12 5 5L20 7" />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DropdownMenu({
  actions,
  open,
  onOpenChange,
  trigger,
  align = 'right',
  side = 'bottom',
  menuLabel = 'Ações',
  className,
  containerClassName,
}: DropdownMenuProps): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement>(null);
  const menuId = React.useId();

  // `presente` segura o painel no DOM durante a saída. Só o RENDER usa; todo
  // o comportamento (foco, click-fora, Esc, re-âncora) segue amarrado ao `open`
  // cru — um menu em saída não é mais um menu, e não deve escutar nada.
  const { presente, estado } = usePresencaOverlay(open, DURACAO_MENU);

  // Posição fixa ancorada no rect do trigger (menu vive em portal).
  // Eixo vertical por `side`: 'bottom' ancora o topo do painel na base do
  // trigger; 'top' ancora a BASE do painel no topo do trigger (via `bottom`
  // em coordenadas de viewport — cresce para cima sem medir a própria altura).
  const [position, setPosition] = React.useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({ top: 0, left: 0 });

  const updatePosition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vertical =
      side === 'top'
        ? { bottom: Math.max(0, window.innerHeight - rect.top) }
        : { top: rect.bottom };
    const horizontal =
      align === 'right'
        ? { right: Math.max(0, window.innerWidth - rect.right) }
        : { left: rect.left };
    setPosition({ ...vertical, ...horizontal });
  }, [align, side]);

  // Ancora ao abrir e re-ancora em scroll (capture pega scroll de qualquer
  // container pai, ex.: wrapper com overflow da Table) e resize.
  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Fecha em click fora — menu está em portal, então checa trigger E menu
  React.useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target) ?? false;
      const insideMenu = menuRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideMenu) {
        onOpenChange(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, onOpenChange]);

  // Fecha em Esc + devolve foco ao trigger
  React.useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  // Foco no primeiro item ao abrir
  React.useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled]),[role="menuitemcheckbox"]:not([disabled])',
      );
      first?.focus();
    }
  }, [open]);

  // Navegação por teclado dentro do menu (↓ ↑ Home End; Tab fecha)
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    // WAI-APG (menu): Tab/Shift+Tab fecha o menu. O menu vive em portal no
    // fim do body — deixar o Tab nativo correr a partir do menuitem jogaria
    // o foco para fora da página (depois do body não há nada). Fechamos,
    // prevenimos o default e devolvemos o foco ao trigger (paridade com
    // Esc): o usuário fica no lugar dele na página e o próximo Tab segue a
    // ordem normal do documento. aria-expanded volta a false junto.
    // (Radix Menu bloqueia Tab sem fechar; Headless UI fecha com foco
    // manual — fechar + trigger é o meio-termo determinístico.)
    if (e.key === 'Tab') {
      e.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
      return;
    }

    const items = menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>(
            '[role="menuitem"]:not([disabled]),[role="menuitemcheckbox"]:not([disabled])',
          ),
        )
      : [];
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  return (
    <div ref={containerRef} className={cn('relative inline-flex', containerClassName)}>
      {/* Trigger — recebe props direto no elemento, sem wrapper clicável */}
      <Slot
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        {trigger}
      </Slot>

      {/* Menu — portal no body: overflow de containers não clipa (F07).
          Painel shadcn dropdown-menu stock via aliases. */}
      {presente && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={handleMenuKeyDown}
          data-state={estado}
          style={{
            top: position.top,
            bottom: position.bottom,
            left: position.left,
            right: position.right,
            ...estiloMotion(estado, DURACAO_MENU),
          }}
          className={cn(
            'fixed z-50',
            side === 'top' ? 'mb-[var(--spacing-1)]' : 'mt-[var(--spacing-1)]',
            'min-w-[var(--popover-min-width)] w-max',
            'overflow-hidden rounded-md border border-border',
            'bg-popover text-popover-foreground',
            'shadow-elev-2',
            'p-[var(--spacing-1)]',
            // Motion (BUILD-MOTION): fade + zoom curto no enter E no exit,
            // gated por motion-safe. Menu saindo não recebe clique.
            'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95',
            'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-95',
            'data-[state=closed]:pointer-events-none',
            className,
          )}
        >
          {actions.map((action) => {
            const isCheckbox = action.checked !== undefined;
            return (
              <button
                key={action.id}
                type="button"
                role={isCheckbox ? 'menuitemcheckbox' : 'menuitem'}
                aria-checked={isCheckbox ? action.checked : undefined}
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  // Checkbox (multi-seleção): mantém o menu aberto e o foco no
                  // item para marcar várias. Ação comum: seleciona e fecha.
                  if (!isCheckbox) {
                    onOpenChange(false);
                    triggerRef.current?.focus();
                  }
                }}
                className={cn(
                  'flex items-center w-full rounded-sm gap-[var(--spacing-2)]',
                  'h-[var(--btn-height-sm)] px-[var(--spacing-3)]',
                  'text-[length:var(--font-size-base)] text-left whitespace-nowrap',
                  'transition-colors duration-[var(--motion-duration-fast)]',
                  'focus-visible:outline-none focus-visible:ring-inset',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                  action.destructive
                    ? 'text-[var(--text-danger)] hover:bg-[var(--feedback-danger-surface)] focus:bg-[var(--feedback-danger-surface)]'
                    : 'text-[var(--text-primary)] hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  action.disabled && 'opacity-40 pointer-events-none',
                )}
              >
                {isCheckbox && <CheckIndicator checked={action.checked ?? false} />}
                {action.icon ? (
                  <span
                    aria-hidden
                    className={cn(
                      'shrink-0 inline-flex items-center justify-center',
                      // O tamanho e o traço são do DS, não do consumidor: o
                      // seletor de filho alcança o SVG do lucide sem exigir que
                      // a tela passe className no ícone (que foi como o rail
                      // acabou com três tamanhos antes do `railNavIcon`).
                      '[&>svg]:h-[var(--popover-icon-size)] [&>svg]:w-[var(--popover-icon-size)]',
                      '[&>svg]:[stroke-width:var(--icon-stroke)]',
                    )}
                  >
                    {action.icon}
                  </span>
                ) : null}
                <span className="flex-1">{action.label}</span>
                {action.count !== undefined && (
                  <span className="shrink-0 tabular-nums text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                    {action.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

DropdownMenu.displayName = 'DropdownMenu';

export { DropdownMenu };
