/**
 * Sidebar — painel de navegação lateral do shell.
 *
 * Seções (RN-233, rodada IA-MENU 2026-07-19 — o menu foi de 8 para 6 itens):
 *   OPERAÇÃO: Visão Geral, Eventos, Clubs, CRM, Parcerias
 *   CONTA:    Configurações
 *
 * `Financeiro` e `Analytics` saíram do catálogo: a análise de vendas virou
 * CRM › Visão geral (RN-823) e os repasses viraram subdivisão de Eventos
 * (RN-366). `Analytics` era placeholder inerte e divergente — a RN-821 o
 * suprimia no consumidor; a RN-823 manda removê-lo aqui, na fonte, para não
 * voltar por descuido em outro consumidor.
 *
 * FIXA em 240px (`--sidebar-width`), padrão Be Hero — decisão vinculante do
 * Vitor (2026-07-05, brief ds-consolidacao-shadcn-brasa §2): a variante fixa
 * SUBSTITUI o modo colapsável; não há mais toggle nem largura de 64px.
 *
 * Métricas exatas do mockup be-hero (`.sidebar/.nav/.nav-label/.nav-item/
 * .nav-badge`, lote FIDELIDADE T2): nav 16x12 gap 2; label 10px/.08em
 * uppercase pad 12/12/8; item 10x12 gap 12 texto 14/500 ícone 20; badge
 * 10px/700 pad 2x6. A borda-direita hairline é ANATOMIA do mockup
 * (`.sidebar { border-right: .5px }`) — exceção deliberada ao §2.16 flat,
 * registrada no patch de congruência: é o fio que separa a nav do conteúdo.
 *
 * Slot `brand`: bloco de marca componível (ex.: `<SidebarBrand mark="LEELA"
 * sub="Painel do Organizador" />`) — o DS entrega a ESTRUTURA; o texto vem do
 * consumidor.
 *
 * A11y: nav landmark "Navegação principal", aria-current="page" no item ativo,
 * foco visível, navegação por teclado.
 */

import * as React from 'react';
import {
  Heart,
  LayoutDashboard,
  Megaphone,
  Settings,
  Ticket,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SCROLL_Y_ONLY } from '../../utils/scroll';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Variante do badge de contagem (mockup: CRM = danger, Eventos = neutral). */
export type SidebarBadgeVariant = 'danger' | 'neutral';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  /** Cor do badge — union fechada; default 'danger' (o `.nav-badge` do mockup). */
  badgeVariant?: SidebarBadgeVariant;
  active?: boolean;
  /**
   * Recebe o evento — em `href` + `onClick`, permite `preventDefault()` (nav
   * SPA). Mesmo contrato do `CardEvento`/`SubNav`.
   *
   * O item vira `<a href>` quando recebe `href` e `<button>` quando não recebe;
   * as duas formas chamam este handler. Passar os DOIS é o estado correto: o
   * menu volta a ser linkável (ctrl+clique, clique do meio, copiar endereço) e
   * o clique simples ainda navega por SPA, porque o consumidor intercepta com
   * `preventDefault()`. Só `onClick` (sem `href`) é o defeito espelhado do
   * `<a href>` sem `preventDefault`: navega, mas não é link.
   *
   * Alargamento ADITIVO: `() => void` continua atribuível a este tipo.
   */
  onClick?: (event: React.MouseEvent) => void;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Bloco de marca componível no topo (ex.: `<SidebarBrand ... />`). */
  brand?: React.ReactNode;
  /** Rodapé componível (ex.: `<SidebarFooter avatar={...} name={...} />`). */
  footer?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Nav icon helper + default 8 nav items (exported for convenience)
// ---------------------------------------------------------------------------

/**
 * Renderiza um ícone Lucide nos tokens de ícone da Sidebar: 20px
 * (`--sidebar-icon-size`, mockup `.nav-item svg`), traço 1.75
 * (`--icon-stroke`), `currentColor` (a cor vem do wrapper do item).
 * Uso pelos consumidores ao montar seções próprias de Sidebar.
 */
export function sidebarNavIcon(Icon: LucideIcon): React.ReactNode {
  return (
    <Icon
      aria-hidden
      className={cn(
        'w-[var(--sidebar-icon-size)] h-[var(--sidebar-icon-size)]',
        '[stroke-width:var(--icon-stroke)]',
      )}
    />
  );
}

/**
 * Mapeamento item → ícone da fonte da verdade (doc de IA do painel Be Hero,
 * §Sidebar), reconciliado pela rodada IA-MENU: **6 itens**, não 8.
 *
 * O id `comunicacao` virou `crm` (rótulo "CRM") porque a casca deixou de ser
 * só comunicação — passa a abrigar Visão geral, Clientes e Comunicação.
 *
 * REDESIGN-V2 · item 3 — quatro ícones trocaram de SIGNIFICADO, não de desenho.
 * O menu antigo descrevia o dado que a tela guarda; o novo descreve o que o
 * organizador vende ou cuida:
 *
 *   Eventos  CalendarDays → Ticket     evento é ingresso, não data
 *   Clubs    UsersRound   → Heart      comunidade, não um monte de pessoa
 *   CRM      Bell         → User       pessoa é o cliente (o sino era o aviso)
 *   Parcerias (era Marcas) Briefcase → Megaphone  parceria/patrocínio comunica
 *
 * `Ticket` é EXCLUSIVO deste item de menu: agenda e campos de data seguem em
 * `CalendarDays`/`CalendarCheck`, e trocar isso confundiria "quando acontece"
 * com "o que se vende". Visão Geral e Configurações ficam como estavam.
 */
export interface SidebarNavIconEntry {
  id: string;
  label: string;
  /** Nome do componente Lucide — o que catálogos exibem sob o desenho. */
  iconName: string;
  Icon: LucideIcon;
}

/**
 * Catálogo da nav default: id → rótulo → componente Lucide, em UM lugar.
 *
 * Existe porque `DEFAULT_SIDEBAR_SECTIONS` guarda o ícone já RENDERIZADO
 * (`React.ReactNode`), e de um nó renderizado não se recupera o nome do
 * componente — foi assim que a página de ícones do showcase pôde manter uma
 * lista paralela escrita à mão, que derivou até citar "Financeiro" e
 * "Analytics", dois itens que a rodada IA-MENU tinha removido. Re-sincronizar
 * aquela lista consertaria o sintoma; derivá-la daqui é o que impede a próxima
 * deriva. As seções abaixo e o showcase leem os dois deste array.
 */
export const DEFAULT_SIDEBAR_NAV_ICONS: readonly SidebarNavIconEntry[] = [
  { id: 'visao-geral',   label: 'Visão geral',   iconName: 'LayoutDashboard', Icon: LayoutDashboard },
  { id: 'eventos',       label: 'Eventos',       iconName: 'Ticket',          Icon: Ticket },
  { id: 'clubs',         label: 'Clubs',         iconName: 'Heart',           Icon: Heart },
  { id: 'crm',           label: 'CRM',           iconName: 'User',            Icon: User },
  // D-1008-R17: "Marcas" virou "Parcerias" no MESMO slot — a área absorveu
  // assessorias parceiras e afiliações (migradas de clubs) além das marcas.
  // Megaphone fica: patrocínio/parceria comunica (troca de ícone não foi
  // decidida; candidata natural seria Handshake — vetável).
  { id: 'parcerias',     label: 'Parcerias',     iconName: 'Megaphone',       Icon: Megaphone },
  { id: 'configuracoes', label: 'Configurações', iconName: 'Settings',        Icon: Settings },
] as const;

/** Monta um item de seção a partir do id declarado no catálogo acima. */
function itemPadrao(id: string): SidebarItem {
  const entrada = DEFAULT_SIDEBAR_NAV_ICONS.find((e) => e.id === id);
  if (!entrada) throw new Error(`item "${id}" não existe em DEFAULT_SIDEBAR_NAV_ICONS`);
  return { id: entrada.id, label: entrada.label, icon: sidebarNavIcon(entrada.Icon) };
}

export const DEFAULT_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'OPERAÇÃO',
    items: ['visao-geral', 'eventos', 'clubs', 'crm', 'parcerias'].map(itemPadrao),
  },
  {
    label: 'CONTA',
    items: ['configuracoes'].map(itemPadrao),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ sections, brand, footer, className }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Navegação principal"
        className={cn(
          'flex flex-col h-full',
          // Congruência mockup be-hero: sidebar vive no fundo da página
          // (surface-base) e fecha com a hairline direita do mockup.
          'bg-[var(--surface-base)]',
          'border-r border-r-[var(--border-subtle)]',
          'w-[var(--sidebar-width)]',
          className,
        )}
      >
        {/* Bloco de marca (slot componível — dados do consumidor) */}
        {brand}

        {/* Nav (mockup `.nav`: 16x12, gap 2, labels no fluxo).
            Rola só na vertical: o rail tem largura fixa (`--sidebar-width`), e um
            rótulo de item mais largo que ela desenhava barra horizontal dentro do
            menu, porque o eixo x era `visible` e o CSS o promovia a `auto`.
            Regra em utils/scroll.ts. */}
        <div
          className={cn(
            'flex flex-col flex-1',
            'py-[var(--sidebar-nav-py)] px-[var(--sidebar-nav-px)]',
            'gap-[var(--sidebar-nav-gap)]',
            SCROLL_Y_ONLY,
          )}
        >
          {sections.map((section) => (
            <React.Fragment key={section.label}>
              <p
                className={cn(
                  'pt-[var(--sidebar-label-pt)] pb-[var(--sidebar-label-pb)] px-[var(--sidebar-label-px)]',
                  'text-[length:var(--sidebar-label-size)]',
                  'font-[var(--font-weight-semibold)]',
                  'text-[var(--text-tertiary)]',
                  'tracking-[var(--sidebar-label-spacing)] uppercase',
                )}
              >
                {section.label}
              </p>
              <ul role="list" className="flex flex-col gap-[var(--sidebar-nav-gap)]">
                {section.items.map((item) => (
                  <SidebarNavItem key={item.id} item={item} />
                ))}
              </ul>
            </React.Fragment>
          ))}
        </div>

        {/* Rodapé (avatar + nome — B4); dados vêm do consumidor */}
        {footer}
      </nav>
    );
  },
);
Sidebar.displayName = 'Sidebar';

// ---------------------------------------------------------------------------
// SidebarNavItem
// ---------------------------------------------------------------------------

const BADGE_VARIANT_CLASSES: Record<SidebarBadgeVariant, string> = {
  danger: 'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]',
  neutral: 'bg-[var(--surface-high)] text-[var(--text-secondary)]',
};

interface SidebarNavItemProps {
  item: SidebarItem;
}

function SidebarNavItem({ item }: SidebarNavItemProps): JSX.Element {
  const Comp: 'a' | 'button' = item.href ? 'a' : 'button';

  const sharedProps = {
    'aria-current': item.active ? ('page' as const) : undefined,
    onClick: item.onClick,
    className: cn(
      'group relative flex items-center gap-[var(--sidebar-item-gap)]',
      'py-[var(--sidebar-item-py)] px-[var(--sidebar-item-px)]',
      'w-full',
      'rounded-[var(--radius-sm)]',
      // Mockup `.nav-item`: 14px/500 sempre — o ativo muda só as cores.
      'text-[length:var(--sidebar-item-size)] font-[var(--font-weight-medium)]',
      'transition-colors duration-[var(--motion-duration-fast)]',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[color:var(--border-focus)]',
      // Item ativo (congruência mockup be-hero `.nav-item.active`): tint de
      // marca + texto laranja + barra 2px encostada na borda da sidebar (o
      // -12px do mockup = padding horizontal da nav). AA do texto sobre o tint
      // provado por composição alpha-sobre-surface em contrast.test.ts.
      item.active
        ? cn(
            'bg-[var(--action-brand-tint)]',
            'text-[var(--action-brand-tint-fg)]',
            'before:content-[""] before:absolute',
            'before:left-[calc(-1*var(--sidebar-nav-px))]',
            'before:top-[var(--sidebar-active-bar-inset)]',
            'before:bottom-[var(--sidebar-active-bar-inset)]',
            'before:w-[var(--sidebar-active-bar)]',
            'before:rounded-r-[var(--sidebar-active-bar)]',
            'before:bg-[var(--border-brand)]',
          )
        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]',
    ),
  };

  const content = (
    <>
      {item.icon && (
        <span
          aria-hidden
          className={cn(
            'shrink-0 flex items-center justify-center',
            'w-[var(--sidebar-icon-size)] h-[var(--sidebar-icon-size)]',
            'transition-colors duration-[var(--motion-duration-fast)]',
            // Mockup: ícone tertiary no rest, secondary no hover, brasa no ativo.
            item.active
              ? 'text-[var(--text-brand)]'
              : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]',
          )}
        >
          {item.icon}
        </span>
      )}
      <span className="flex-1 truncate text-left">
        {item.label}
      </span>
      {item.badge !== undefined && (
        <span
          className={cn(
            'ml-auto inline-flex items-center justify-center',
            'px-[var(--sidebar-badge-px)] py-[var(--sidebar-badge-py)]',
            'rounded-[var(--sidebar-badge-radius)]',
            'text-[length:var(--sidebar-badge-size)] font-[var(--font-weight-bold)]',
            'tracking-[var(--sidebar-badge-spacing)]',
            BADGE_VARIANT_CLASSES[item.badgeVariant ?? 'danger'],
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  if (Comp === 'a') {
    return (
      <li>
        <a href={item.href} {...sharedProps}>
          {content}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button type="button" {...sharedProps}>
        {content}
      </button>
    </li>
  );
}

export { Sidebar };
