/**
 * SidebarRail — nav flutuante do protótipo "Visao Geral v3" (lane HIFI-REC).
 *
 * Recriação FIEL do rail do handoff do dono (rodada 2026-08-09-redesign-ds):
 * pílula vertical destacada da borda (margem 20, raio 26, sombra elevation-3),
 * FECHADA por default (84px, só ícones) com tooltip flutuante por item, e
 * ABERTA (248px) com rótulo + badge; toggle circular meio para fora da borda
 * direita, marca com crossfade ícone↔wordmark e rodapé de avatar com dot de
 * presença. Toda medida vem de token `--rail-*` (rail-v3-tokens.test.ts pina
 * os valores extraídos do protótipo).
 *
 * Convive com a `Sidebar` clássica (240px, be-hero) — este componente NÃO a
 * substitui no DS; o consumidor escolhe a anatomia. Abaixo de `lg` o AppShell
 * segue colapsando para Drawer; desde a DELTA-UX (D-1008-R5) o rail também é
 * a PELE do menu mobile via `variant="drawer"` (o protótipo desenha o drawer
 * como o próprio rail, sempre aberto, altura total, sem margem/raio/toggle).
 *
 * Divergência deliberada do protótipo, registrada no handoff (P-REC-6): o
 * `.dc.html` põe `overflow:hidden` no item E o tooltip como filho absoluto
 * fora da caixa — as duas coisas juntas engoliriam o tooltip. Aqui o clip fica
 * num wrapper interno (ícone+rótulo) e o tooltip vive fora dele, preservando
 * as duas intenções (rótulo não vaza na animação de largura; tooltip aparece).
 *
 * ⛔ E MESMO ASSIM A DICA SAÍA CORTADA (UI-ACOES-MOTION · T1, 17/08). O dono, na
 * íntegra: *"os tooltips, do menu, quando ele está recolhido, aparecem de
 * maneira, cortada, dentro do próprio menu."* O P-REC-6 tirou o recorte do ITEM
 * e não viu o recorte de CIMA: o contêiner dos itens ROLA, e quem rola carrega
 * `SCROLL_Y_ONLY` (`overflow-y:auto` + `overflow-x:hidden`), que estabelece
 * retângulo de recorte na largura do rail. Medido no rail recolhido: dica de
 * 99px de largura, 0px visível — 100% recortada, com o `<nav>` em
 * `overflow-x: visible` (o recorte nunca foi do nav). `z-index` não resolvia,
 * porque `z-index` não vence recorte de overflow — só sair da caixa vence, e
 * sair da caixa é PORTAL.
 *
 * Por isso a dica do rail deixou de ser artesanal e passou a ser o `Tooltip`
 * canônico (§8 do cânone; shadcn-first da governança §8, que lista "tooltip"
 * entre os controles que nenhuma peça recria à mão). O portal entrou no próprio
 * `TooltipContent`, então o conserto vale para o sistema inteiro e não só aqui.
 * `data-rail-tip` segue no conteúdo como gancho de teste e de gate visual.
 *
 * Consequência de a11y, declarada: o Radix liga a dica ao item por
 * `aria-describedby` enquanto ela está ABERTA. O NOME acessível continua vindo
 * do `sr-only` do item — que existe com a dica fechada, que é o que importa —, e
 * a dica entra como DESCRIÇÃO. Mesmo desenho do sidebar do shadcn.
 *
 * A11y: nav landmark; toggle com `aria-expanded` + nome que troca
 * (Abrir/Recolher menu); item ativo com `aria-current="page"`; tooltip
 * `role="tooltip"` oculto de leitor (o rótulo acessível é o texto do item,
 * presente no DOM também fechado — via `sr-only` quando o rail está fechado).
 * Movimento de 650ms desligado sob `prefers-reduced-motion`.
 */

import * as React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { SCROLL_Y_ONLY } from '../../utils/scroll';
import { DropdownMenu, type DropdownMenuAction } from '../DropdownMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SidebarRailItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  active?: boolean;
  /** Mesmo contrato da Sidebar: `href` + `onClick` = link SPA interceptável. */
  onClick?: (event: React.MouseEvent) => void;
}

export interface SidebarRailProps {
  items: SidebarRailItem[];
  /** Marca fechada (ícone 42×42 — ex.: `<img src="/leela-icon.svg" />`). */
  brandIcon?: React.ReactNode;
  /** Marca aberta (wordmark h-34 — ex.: `<img src="/leela-logo-brasa.svg" />`). */
  brandLogo?: React.ReactNode;
  /** Avatar do rodapé; default = iniciais de `footerName` no tint da marca. */
  footerAvatar?: React.ReactNode;
  footerName?: string;
  /** Linha secundária do rodapé (ex.: "Ver perfil") — só visível aberto. */
  footerSubtitle?: string;
  onFooterClick?: () => void;
  /**
   * Menu do perfil (DELTA-UX-T4 · D-1008-R6): quando presente, o rodapé vira
   * TRIGGER do DropdownMenu canônico (L-021 — nada de popover artesanal),
   * ancorado ACIMA dele (side="top": o rodapé cola na borda inferior do
   * viewport). O trigger é `button` com `aria-haspopup`/`aria-expanded`
   * injetados via Slot e nome acessível SEMPRE (`aria-label` = footerName),
   * rail fechado E aberto — fecha a dívida F5 da fila HIFI-REC-FIX.
   * Tem precedência sobre `onFooterClick`.
   */
  footerMenu?: { menuLabel: string; actions: DropdownMenuAction[] };
  /** Estado inicial. O protótipo nasce FECHADO (84px). */
  defaultOpen?: boolean;
  /**
   * Anatomia (DELTA-UX-T3 · D-1008-R5). 'flutuante' (default) é a pílula
   * desktop do protótipo. 'drawer' é a MESMA nav como conteúdo do Drawer < lg
   * — o protótipo desenha o menu mobile como o próprio rail, sempre aberto,
   * altura total, sem margem/raio/toggle/tooltip (media query < lg do
   * .dc.html). A anatomia off-canvas (portal, scrim, focus-trap) segue sendo
   * do Drawer; aqui é só a pele v3.
   */
  variant?: 'flutuante' | 'drawer';
  /**
   * Slot extra entre marca e itens, visível SÓ com o rail aberto. Existe para
   * função que o protótipo não previu e não pode sumir do desktop (ex.:
   * alternador de painel do papel duplo) — divergência nomeada no handoff.
   */
  slotAberto?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Icon helper — ícone de item nos tokens do rail (21px, traço 2 do protótipo)
// ---------------------------------------------------------------------------

export function railNavIcon(Icon: LucideIcon): React.ReactNode {
  return (
    <Icon
      aria-hidden
      className={cn(
        'w-[var(--rail-icon-size)] h-[var(--rail-icon-size)]',
        '[stroke-width:var(--rail-icon-stroke)]',
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Iniciais do nome (2 letras) para o avatar default do rodapé. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : '';
  return (primeira + ultima).toUpperCase();
}

const MOTION_RAIL = cn(
  'transition-[width] duration-[var(--rail-motion)] ease-[var(--motion-easing-default)]',
  'motion-reduce:transition-none',
);

const MOTION_CROSSFADE = cn(
  'transition-[opacity,transform] duration-[var(--rail-motion)] ease-[var(--motion-easing-default)]',
  'motion-reduce:transition-none',
);

const SidebarRail = React.forwardRef<HTMLElement, SidebarRailProps>(
  (
    {
      items,
      brandIcon,
      brandLogo,
      footerAvatar,
      footerName,
      footerSubtitle,
      onFooterClick,
      footerMenu,
      defaultOpen = false,
      variant = 'flutuante',
      slotAberto,
      className,
    },
    ref,
  ) => {
    const drawer = variant === 'drawer';
    const [railAberto, setOpen] = React.useState(defaultOpen);
    // Drawer é a anatomia ABERTA por definição (protótipo < lg): rótulos no
    // fluxo, badges visíveis, sem toggle nem tooltip.
    const open = drawer || railAberto;
    const [menuPerfilAberto, setMenuPerfilAberto] = React.useState(false);
    const rotuloToggle = open ? 'Recolher menu' : 'Abrir menu';

    // -----------------------------------------------------------------------
    // Pill DESLIZANTE do item ativo (D-1008-R14): o fundo brasa + glow do item
    // ativo é UM elemento só, que viaja verticalmente quando a seleção troca —
    // antes cada item pintava o próprio fundo (aparecia/sumia, sem movimento).
    // A posição vem de MEDIÇÃO (offsetTop do item ativo — px de runtime, não
    // px de design); a LARGURA não se mede: o pill ancora em
    // left/right = --rail-px e acompanha a largura do rail até durante a
    // animação de abrir/fechar. Só nasce DEPOIS da primeira medição — entra no
    // DOM já em posição, sem animar do zero. Semântica intacta: aria-current
    // segue no item.
    // -----------------------------------------------------------------------
    const ativoId = items.find((i) => i.active)?.id ?? null;
    const itemRefs = React.useRef<Map<string, HTMLElement>>(new Map());
    const [indicadorY, setIndicadorY] = React.useState<number | null>(null);

    React.useLayoutEffect(() => {
      const el = ativoId ? itemRefs.current.get(ativoId) : null;
      setIndicadorY(el ? el.offsetTop : null);
    }, [ativoId, items, open]);

    const registrarItem = (id: string) => (el: HTMLElement | null): void => {
      if (el) itemRefs.current.set(id, el);
      else itemRefs.current.delete(id);
    };

    const avatar =
      footerAvatar ??
      (footerName ? (
        <span
          aria-hidden
          className={cn(
            'relative shrink-0 flex items-center justify-center',
            'w-[var(--rail-avatar)] h-[var(--rail-avatar)] rounded-[var(--radius-pill)]',
            'bg-[var(--action-brand-tint)] text-[var(--action-brand-tint-fg)]',
            'text-[length:var(--font-size-base)] font-[var(--font-weight-bold)]',
          )}
        >
          {iniciais(footerName)}
          {/* Dot de presença do protótipo: verde vitória com o MESMO glow do
              date-badge (`0 0 8px` na cor do sucesso — token compartilhado). */}
          <span
            className={cn(
              'absolute right-px bottom-px',
              'w-[var(--rail-dot)] h-[var(--rail-dot)] rounded-[var(--radius-pill)]',
              'bg-[var(--feedback-success)] shadow-[var(--datebadge-dot-glow)]',
            )}
          />
        </span>
      ) : null);

    // Conteúdo visual do rodapé — o mesmo nas três formas (div inerte, botão
    // legado de navegação, trigger do menu do perfil).
    const conteudoRodape = (
      <>
        {avatar}
        {open && footerName ? (
          <span className="flex flex-col flex-1 min-w-0 text-left">
            <span className="block truncate text-[length:var(--rail-tip-size)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
              {footerName}
            </span>
            {footerSubtitle ? (
              <span className="block whitespace-nowrap text-[length:var(--font-size-xs-plus)] text-[var(--text-tertiary)]">
                {footerSubtitle}
              </span>
            ) : null}
          </span>
        ) : null}
      </>
    );

    const classesRodape = (interativo: boolean): string =>
      cn(
        'w-full flex items-center justify-center gap-[var(--spacing-3)]',
        'border-t border-t-[var(--border-subtle)]',
        'pt-[var(--spacing-4)] px-[var(--rail-px)] pb-[var(--spacing-1)]',
        interativo &&
          cn(
            'cursor-pointer bg-transparent border-x-0 border-b-0 text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
          ),
      );

    // Rodapé (DELTA-UX-T4 · D-1008-R6): com `footerMenu`, o perfil é TRIGGER
    // do DropdownMenu canônico ancorado ACIMA (side="top") — clique abre o
    // popover pequeno (Configurações + alternador), rail fechado e aberto.
    // `aria-label` dá o nome acessível SEMPRE (fechado só há o avatar
    // aria-hidden — era a dívida F5); aria-haspopup/aria-expanded/aria-controls
    // entram via Slot do DropdownMenu. Sem menu, vale o padrão antigo:
    // botão só quando há destino (`onFooterClick`), senão div inerte.
    const RodapeComp: 'button' | 'div' = onFooterClick ? 'button' : 'div';
    const rodape =
      (footerName || footerAvatar) &&
      (footerMenu ? (
        <DropdownMenu
          open={menuPerfilAberto}
          onOpenChange={setMenuPerfilAberto}
          actions={footerMenu.actions}
          menuLabel={footerMenu.menuLabel}
          side="top"
          align="left"
          containerClassName="w-full"
          trigger={
            <button
              type="button"
              {...(footerName ? { 'aria-label': footerName } : {})}
              className={classesRodape(true)}
            >
              {conteudoRodape}
            </button>
          }
        />
      ) : (
        <RodapeComp
          {...(onFooterClick ? { type: 'button' as const, onClick: onFooterClick } : {})}
          className={classesRodape(Boolean(onFooterClick))}
        >
          {conteudoRodape}
        </RodapeComp>
      ));

    // O provider mora AQUI, não no consumidor: a dica é anatomia do rail
    // fechado, e exigir que cada app lembre de embrulhar o shell num
    // `TooltipProvider` transformaria um detalhe do Radix em pegadinha de
    // integração — com o sintoma sendo o rail perder a dica em silêncio.
    // `delayDuration={0}` preserva o comportamento anterior: a dica artesanal
    // acendia no primeiro frame do hover, sem espera.
    return (
      <TooltipProvider delayDuration={0}>
      <nav
        ref={ref}
        aria-label="Navegação principal"
        data-rail-open={open ? '1' : '0'}
        className={cn(
          'relative z-[5] shrink-0 flex flex-col items-center',
          'bg-[var(--surface-raised)]',
          'pt-[var(--rail-pt)] pb-[var(--rail-pb)]',
          drawer
            ? cn(
                // Protótipo < lg: o menu mobile É o rail, sempre aberto, altura
                // total, sem margem/raio (media query do .dc.html: top 0,
                // height 100vh, margin 0, border-radius 0, width 248).
                'h-full w-[var(--rail-width-open)] rounded-none',
              )
            : cn(
                'h-[calc(100%-2*var(--rail-margin))]',
                'my-[var(--rail-margin)] ml-[var(--rail-margin)]',
                'rounded-[var(--rail-radius)] shadow-elev-3',
                open ? 'w-[var(--rail-width-open)]' : 'w-[var(--rail-width)]',
                MOTION_RAIL,
              ),
          className,
        )}
      >
        {/* Toggle circular meio para fora da borda direita (protótipo:
            32px, top 34, right -16 = metade do próprio diâmetro). No drawer
            NÃO existe (media query do protótipo: display none < lg — quem
            fecha o off-canvas é o scrim/Esc do Drawer). */}
        {!drawer && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={rotuloToggle}
          aria-expanded={open}
          title={rotuloToggle}
          className={cn(
            'absolute top-[var(--rail-toggle-top)] -right-[calc(var(--rail-toggle-size)/2)] z-30',
            'w-[var(--rail-toggle-size)] h-[var(--rail-toggle-size)]',
            'flex items-center justify-center rounded-[var(--radius-pill)] border-none cursor-pointer',
            'bg-[var(--surface-base)] text-[var(--text-tertiary)] shadow-elev-3',
            'hover:bg-[var(--surface-high)] hover:text-[var(--text-primary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'flex items-center justify-center',
              MOTION_CROSSFADE,
              open ? 'rotate-180' : 'rotate-0',
            )}
          >
            <ChevronRight
              className={cn(
                'w-[var(--rail-toggle-icon)] h-[var(--rail-toggle-icon)]',
                '[stroke-width:var(--rail-toggle-stroke)]',
              )}
            />
          </span>
        </button>
        )}

        {/* Marca com crossfade: ícone (fechado) ↔ wordmark (aberto). */}
        {(brandIcon || brandLogo) && (
          <div
            className={cn(
              'relative w-full h-[var(--rail-brand-h)] mb-[var(--rail-brand-mb)]',
              'flex items-center justify-center px-[var(--rail-px)]',
            )}
          >
            {brandIcon ? (
              <span
                aria-hidden={open}
                className={cn(
                  'absolute top-0 left-1/2 pointer-events-none',
                  'w-[var(--rail-brand-icon)] h-[var(--rail-brand-icon)]',
                  'rounded-[var(--rail-brand-icon-radius)] overflow-hidden',
                  MOTION_CROSSFADE,
                  open
                    ? 'opacity-0 [transform:translateX(-50%)_scale(1.35)]'
                    : 'opacity-100 [transform:translateX(-50%)_scale(1)]',
                )}
              >
                {brandIcon}
              </span>
            ) : null}
            {brandLogo ? (
              <span
                aria-hidden={!open}
                className={cn(
                  'absolute top-[var(--spacing-1)] left-1/2 pointer-events-none',
                  'h-[var(--rail-brand-logo-h)] w-auto origin-center',
                  MOTION_CROSSFADE,
                  open
                    ? 'opacity-100 [transform:translateX(-50%)_scale(1)]'
                    : 'opacity-0 [transform:translateX(-50%)_scale(0.62)]',
                )}
              >
                {brandLogo}
              </span>
            ) : null}
          </div>
        )}

        {open && slotAberto ? (
          <div className="w-full px-[var(--rail-px)]">{slotAberto}</div>
        ) : null}

        {/* Itens (protótipo: gap 10, pt 34, px 14, rola só na vertical).
            `relative` ancora o pill deslizante — abs dentro do scroll
            container rola JUNTO com os itens. */}
        <div
          className={cn(
            'relative flex-1 w-full flex flex-col gap-[var(--rail-nav-gap)]',
            'pt-[var(--rail-nav-pt)] px-[var(--rail-px)]',
            SCROLL_Y_ONLY,
          )}
        >
          {indicadorY !== null ? (
            <span
              aria-hidden
              data-rail-indicador=""
              className={cn(
                'pointer-events-none absolute top-0 left-[var(--rail-px)] right-[var(--rail-px)]',
                'h-[var(--rail-item-h)] rounded-[var(--rail-item-radius)]',
                'bg-[var(--action-primary)] shadow-elev-brand',
                'transition-transform duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]',
                'motion-reduce:transition-none',
              )}
              style={{ transform: `translateY(${indicadorY}px)` }}
            />
          ) : null}
          {items.map((item) => (
            <RailNavItem
              key={item.id}
              item={item}
              open={open}
              itemRef={registrarItem(item.id)}
            />
          ))}
        </div>

        {rodape}
      </nav>
      </TooltipProvider>
    );
  },
);
SidebarRail.displayName = 'SidebarRail';

// ---------------------------------------------------------------------------
// RailNavItem
// ---------------------------------------------------------------------------

interface RailNavItemProps {
  item: SidebarRailItem;
  open: boolean;
  /** Ref do pill deslizante (D-1008-R14) — mede o offsetTop do item ativo. */
  itemRef?: (el: HTMLElement | null) => void;
}

function RailNavItem({ item, open, itemRef }: RailNavItemProps): JSX.Element {
  const Comp: 'a' | 'button' = item.href ? 'a' : 'button';

  const sharedProps = {
    'aria-current': item.active ? ('page' as const) : undefined,
    onClick: item.onClick,
    className: cn(
      // `relative` segue necessário: é o que põe o item ACIMA do pill
      // deslizante (DOM anterior). O `group/item` saiu junto com a dica
      // artesanal — era ele que acendia o tooltip no hover e no foco, e agora
      // quem faz isso é o Radix.
      'relative flex items-center w-full shrink-0',
      'h-[var(--rail-item-h)] rounded-[var(--rail-item-radius)]',
      'gap-[var(--rail-item-gap)] whitespace-nowrap no-underline',
      'text-[length:var(--rail-item-size)] font-[var(--font-weight-medium)]',
      open
        ? 'justify-start px-[var(--rail-item-px-open)]'
        : 'justify-center px-[var(--rail-item-px)]',
      // Protótipo: background/color em 150ms, box-shadow em 240ms.
      '[transition:background-color_var(--motion-duration-fast),color_var(--motion-duration-fast),box-shadow_var(--motion-duration-normal)]',
      'motion-reduce:transition-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
      // O FUNDO do ativo não mora mais aqui: desde a D-1008-R14 ele é o pill
      // deslizante único ([data-rail-indicador]) — o item ativo fica com a
      // tinta e o peso; o pill viaja por baixo (DOM anterior; itens são
      // positioned e pintam por cima).
      item.active
        ? 'text-[var(--action-primary-fg)] font-[var(--font-weight-bold)]'
        : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]',
    ),
  };

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'shrink-0 flex items-center justify-center',
          'w-[var(--rail-icon-box)] h-[var(--rail-icon-box)]',
        )}
      >
        {item.icon}
      </span>
      {open ? (
        <span className="flex-1 min-w-0 truncate text-left">{item.label}</span>
      ) : (
        // Rail fechado: o rótulo continua no nome acessível (o tooltip é
        // decorativo — `aria-hidden`, como o `[data-rail-tip]` do protótipo).
        <span className="sr-only">{item.label}</span>
      )}
      {open && item.badge !== undefined ? (
        <span
          className={cn(
            'inline-flex items-center shrink-0',
            'px-[var(--rail-badge-px)] py-[var(--spacing-0-5)] rounded-[var(--radius-xs)]',
            'text-[length:var(--font-size-xs)] font-[var(--font-weight-bold)]',
            'bg-[var(--surface-high)] text-[var(--text-secondary)]',
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const control =
    Comp === 'a' ? (
      <a href={item.href} ref={itemRef} {...sharedProps}>
        {content}
      </a>
    ) : (
      <button type="button" ref={itemRef} {...sharedProps}>
        {content}
      </button>
    );

  // Rail ABERTO não tem dica: o rótulo já está no fluxo (contrato do protótipo).
  if (open) return control;

  // Rail FECHADO: dica canônica e PORTALIZADA — é o portal que a tira do
  // recorte do contêiner de rolagem. `side="right"` reproduz a posição do
  // protótipo; o afastamento sai do MESMO token de antes (`--rail-tip-gap`),
  // aplicado como margem porque `sideOffset` do Radix só aceita número e a
  // medida é token. Hover E foco de teclado vêm de graça do Radix — era a
  // dívida F4 da DELTA-UX, antes resolvida à mão com `group-focus-visible`.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{control}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={0}
        data-rail-tip=""
        className={cn(
          'ml-[var(--rail-tip-gap)]',
          'flex items-center h-[var(--rail-tip-h)] px-[var(--rail-tip-px)] py-0',
          'rounded-[var(--rail-tip-radius)] border-0',
          'bg-[var(--surface-high)] text-[var(--text-primary)]',
          'text-[length:var(--rail-tip-size)] font-[var(--font-weight-semibold)]',
          'whitespace-nowrap shadow-elev-3',
        )}
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export { SidebarRail };
