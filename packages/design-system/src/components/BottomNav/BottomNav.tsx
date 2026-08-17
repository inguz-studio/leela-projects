/**
 * BottomNav — a barra FLUTUANTE horizontal inferior do mobile (lane NAV-MOBILE,
 * leva 20).
 *
 * O dono, na íntegra: *"Já o Menu no formato mobile, pode ser uma barra
 * flutuante, horizontal a ficar na parte inferior da tela. e a parte de logout,
 * configurações, na barra superior no lado direito, com o ícone de perfil."*
 *
 * ## O que ela substitui, e por que não é "mais uma nav"
 *
 * Abaixo de `lg` a navegação do produtor era o drawer off-canvas do `AppShell`
 * (D-1008-R5, que a decisão de hoje SUPERSEDE nessa superfície): dois toques
 * para qualquer destino, mais os 800 ms de abertura do overlay — que existem de
 * propósito, porque é onde a marca aparece, mas viram pedágio num destino que se
 * alcança dez vezes por dia. Medido pela régua L-021 em 375, quatro dos sete
 * caminhos mais comuns caem de dois toques para um, um empata e nenhum piora.
 *
 * ## Anatomia
 *
 * Pílula flutuante: respiro das três bordas por `--bottomnav-margin`, raio 22,
 * `shadow-elev-3` e o mesmo vidro dos cartões (`--card-blur`). Itens de ícone
 * SOBRE rótulo — o rótulo fica no fluxo, sempre visível: ícone mudo em barra de
 * quatro é adivinhação, e aqui não há dica de hover para socorrer (não há hover
 * no dedo).
 *
 * ## O indicador é o mesmo do rail, deitado
 *
 * O pill do ativo é UM elemento só que VIAJA na horizontal quando a seleção
 * troca (mesma decisão da D-1008-R14 no `SidebarRail`, onde ele viaja na
 * vertical): mesma tinta `--action-primary`, mesmo `shadow-elev-brand`, mesma
 * duração e mesmo easing. A posição vem de MEDIÇÃO (`offsetLeft`/`offsetWidth`
 * do item ativo — px de runtime, não px de design), e o pill só entra no DOM
 * DEPOIS da primeira medição, já em posição, sem animar do zero. Semântica
 * intacta: `aria-current="page"` segue no item.
 *
 * ## Safe-area, e por que ela é margem e não padding
 *
 * O entalhe do iOS entra por `--bottomnav-safe-b` (`env(safe-area-inset-bottom)`)
 * SOMADO à margem inferior: a pílula sobe inteira acima do indicador de home, em
 * vez de crescer de altura e deixar a última fileira de pixels do rótulo debaixo
 * dele. Altura constante é o que mantém o alvo de toque previsível entre um
 * iPhone com entalhe e um sem.
 *
 * ## O breakpoint mora aqui, de propósito
 *
 * `lg:hidden` é anatomia da peça, não escolha do consumidor: a barra existe
 * exatamente onde o rail do `AppShell` não existe (`hidden lg:block`), e deixar
 * os dois números em dois arquivos é como eles se separam. Mesmo desenho da
 * barra superior mobile, que também carrega o próprio `lg:hidden`.
 *
 * ## O espaço embaixo da página é contrato, não conselho
 *
 * A barra flutua SOBRE o conteúdo. Quem monta a página reserva o espaço com
 * `RESPIRO_BOTTOMNAV` no contêiner que rola — a constante mora ao lado da peça
 * pela mesma razão do `SCROLL_Y_ONLY`: regra em dois arquivos é regra que
 * diverge.
 *
 * A11y: `nav` landmark nomeado; item ativo com `aria-current="page"`; item com
 * `href` é link de verdade (ctrl+clique, clique do meio, copiar endereço) e o
 * `onClick` intercepta para SPA; badge tem texto acessível próprio, porque "3"
 * solto ao lado de "Eventos" não diz o que são três. Movimento desligado sob
 * `prefers-reduced-motion`.
 */

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  /** Contagem afixada ao ícone (ex.: eventos ativos). */
  badge?: string | number;
  /**
   * Nome acessível do badge. Sem ele o leitor ouve "Eventos 3" e não sabe o que
   * são três — o número visual é `aria-hidden` e este texto é o que soa.
   */
  badgeLabel?: string;
  active?: boolean;
  /** Mesmo contrato do `SidebarRail`: `href` + `onClick` = link SPA interceptável. */
  onClick?: (event: React.MouseEvent) => void;
}

export interface BottomNavProps {
  /**
   * Destinos da barra. Quatro é o desenho decidido (leva 20); a peça não trava
   * o número porque dois e três são recortes legítimos de outra superfície, mas
   * acima de cinco o alvo de toque encolhe abaixo do confortável em 375.
   */
  items: BottomNavItem[];
  /** Nome do landmark. Default: 'Navegação principal'. */
  ariaLabel?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Icon helper — ícone nos tokens da barra (22px, traço 2, igual ao do rail)
// ---------------------------------------------------------------------------

export function bottomNavIcon(Icon: LucideIcon): React.ReactNode {
  return (
    <Icon
      aria-hidden
      className={cn(
        'w-[var(--bottomnav-icon-size)] h-[var(--bottomnav-icon-size)]',
        '[stroke-width:var(--bottomnav-icon-stroke)]',
      )}
    />
  );
}

/**
 * Espaço que a PÁGINA reserva embaixo para nada ficar atrás da barra.
 *
 * Entra no contêiner que rola, e só abaixo de `lg` — acima disso a barra não
 * existe e o respiro seria buraco. O valor é UM token
 * (`--bottomnav-space` = altura + duas margens + entalhe do iOS), então trocar a
 * altura da barra não pede varredura por telas.
 */
export const RESPIRO_BOTTOMNAV = 'pb-[var(--bottomnav-space)] lg:pb-0';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
  ({ items, ariaLabel = 'Navegação principal', className }, ref) => {
    const ativoId = items.find((i) => i.active)?.id ?? null;
    const itemRefs = React.useRef<Map<string, HTMLElement>>(new Map());
    const [indicador, setIndicador] = React.useState<{ x: number; w: number } | null>(null);

    React.useLayoutEffect(() => {
      const el = ativoId ? itemRefs.current.get(ativoId) : null;
      setIndicador(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    }, [ativoId, items]);

    const registrarItem = (id: string) => (el: HTMLElement | null): void => {
      if (el) itemRefs.current.set(id, el);
      else itemRefs.current.delete(id);
    };

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        data-bottomnav=""
        className={cn(
          'lg:hidden fixed inset-x-0 bottom-0 z-[15]',
          // O invólucro não come clique: só a pílula é alvo. Sem isto, a faixa
          // transparente das laterais engoliria o toque no conteúdo embaixo.
          'pointer-events-none',
          'px-[var(--bottomnav-margin)]',
          'pb-[calc(var(--bottomnav-margin)+var(--bottomnav-safe-b))]',
          className,
        )}
      >
        <div
          className={cn(
            'pointer-events-auto relative mx-auto flex items-stretch',
            'h-[var(--bottomnav-height)] max-w-[var(--bottomnav-max-w)]',
            'gap-[var(--bottomnav-gap)] px-[var(--bottomnav-px)]',
            'rounded-[var(--bottomnav-radius)] bg-[var(--surface-raised)]',
            '[backdrop-filter:var(--card-blur)] shadow-elev-3',
          )}
        >
          {indicador !== null ? (
            <span
              aria-hidden
              data-bottomnav-indicador=""
              className={cn(
                'pointer-events-none absolute top-[var(--bottomnav-px)] bottom-[var(--bottomnav-px)] left-0',
                'rounded-[var(--bottomnav-item-radius)]',
                'bg-[var(--action-primary)] shadow-elev-brand',
                'transition-[transform,width] duration-[var(--bottomnav-motion)] ease-[var(--motion-easing-default)]',
                'motion-reduce:transition-none',
              )}
              style={{ transform: `translateX(${indicador.x}px)`, width: `${indicador.w}px` }}
            />
          ) : null}
          {items.map((item) => (
            <BottomNavButton key={item.id} item={item} itemRef={registrarItem(item.id)} />
          ))}
        </div>
      </nav>
    );
  },
);
BottomNav.displayName = 'BottomNav';

// ---------------------------------------------------------------------------
// BottomNavButton
// ---------------------------------------------------------------------------

interface BottomNavButtonProps {
  item: BottomNavItem;
  itemRef?: (el: HTMLElement | null) => void;
}

function BottomNavButton({ item, itemRef }: BottomNavButtonProps): JSX.Element {
  const Comp: 'a' | 'button' = item.href ? 'a' : 'button';

  const sharedProps = {
    'aria-current': item.active ? ('page' as const) : undefined,
    onClick: item.onClick,
    className: cn(
      // `relative` põe o item ACIMA do pill deslizante (DOM anterior) — mesma
      // mecânica do rail.
      'relative flex flex-1 min-w-0 flex-col items-center justify-center',
      'gap-[var(--bottomnav-item-gap)] rounded-[var(--bottomnav-item-radius)]',
      'border-none bg-transparent cursor-pointer no-underline',
      '[transition:color_var(--motion-duration-fast)]',
      'motion-reduce:transition-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
      item.active
        ? 'text-[var(--action-primary-fg)] font-[var(--font-weight-bold)]'
        : 'text-[var(--text-tertiary)] font-[var(--font-weight-medium)]',
    ),
  };

  const content = (
    <>
      <span aria-hidden className="relative shrink-0 flex items-center justify-center">
        {item.icon}
        {item.badge !== undefined ? (
          <span
            className={cn(
              'absolute -top-[var(--spacing-1)] left-full -ml-[var(--spacing-2)]',
              'inline-flex items-center justify-center',
              'h-[var(--bottomnav-badge-size)] min-w-[var(--bottomnav-badge-size)]',
              'px-[var(--bottomnav-badge-px)] rounded-[var(--radius-pill)]',
              'text-[length:var(--font-size-xs)] font-[var(--font-weight-bold)]',
              'bg-[var(--surface-high)] text-[var(--text-secondary)]',
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate text-[length:var(--bottomnav-label-size)] leading-none">
        {item.label}
      </span>
      {item.badge !== undefined && item.badgeLabel ? (
        <span className="sr-only">{item.badgeLabel}</span>
      ) : null}
    </>
  );

  return Comp === 'a' ? (
    <a href={item.href} ref={itemRef} {...sharedProps}>
      {content}
    </a>
  ) : (
    <button type="button" ref={itemRef} {...sharedProps}>
      {content}
    </button>
  );
}

export { BottomNav };
