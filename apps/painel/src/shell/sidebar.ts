// =============================================================================
// Seções da Sidebar do shell RAIZ do painel (Lote B3).
//
// Puro (pathname + navigate → seções): decide entre a navegação do PRODUTOR
// (6 itens canônicos do DS pós-RN-233, tabela do doc de IA Be Hero) e a
// navegação de PLATAFORMA (super-admin, nav própria em
// routes/plataforma/_lib/nav.ts).
// O item ativo é derivado do pathname — a sidebar é a mesma em todas as
// rotas, só o conteúdo troca (contrato "permanece visível e imutável").
//
// LEELA-NAVFIX-T2 — o defeito ESPELHADO do das abas. As abas eram `<a href>`
// sem `preventDefault` (recarregavam o documento); aqui era o contrário: só
// `onClick`, sem `href`. O menu navegava por SPA mas NÃO era link — sem
// ctrl+clique, sem clique do meio, sem "copiar endereço do link", sem preview
// de URL na barra de status. O painel tinha os dois modos de falha ao mesmo
// tempo. Agora cada item com destino leva `href` E `onClick` com
// `preventDefault`: é link de verdade e o clique simples segue sendo SPA.
// =============================================================================

import {
  DEFAULT_SIDEBAR_SECTIONS,
  sidebarNavIcon,
  type SidebarItem,
  type SidebarSection,
} from '@leela/design-system';
import { Banknote, Building2, CreditCard, FileText, Gauge, Percent, Tags, Undo2, type LucideIcon } from 'lucide-react';
import { PLATFORM_NAV, activeNavId } from '../routes/plataforma/_lib/nav';
import { onClickSpa, type NavegarSpa } from '../lib/navSpa';

/** id do item do produtor → rota conhecida do painel (undefined = inerte por ora). */
const HREF_POR_ID: Record<string, string | undefined> = {
  'visao-geral': '/',
  eventos: '/eventos',
  clubs: '/clubes',
  // RN-233/RN-823: o item CRM leva à área que reúne Visão geral (a análise de
  // vendas que era `/financeiro`), Clientes e Comunicação. Sucede o antigo id
  // `comunicacao`; a comunicação por evento/clube (E06/E05) segue nas próprias
  // telas — o hub soma, não substitui.
  crm: '/crm',
  // E10 · S811 seed: o item Marcas leva ao módulo de patrocinadores
  // reutilizáveis (RN-171). Deixa de ser placeholder inerte.
  marcas: '/marcas',
  // RN-233/RN-366 (IAM-T5): `Configurações` deixa de ser inerte. Passa a
  // hospedar os Dados de recebimento — cadastro único do titular — e por isso
  // ganha destino. A regra "item de menu sem rota é proibido" nasce sem
  // exceção aberta.
  configuracoes: '/conta',
};

/** Ícone Lucide por item da nav de plataforma (nav do super-admin é própria —
 *  fora da tabela do doc de IA, que cobre só os 8 itens do produtor). */
const PLATFORM_NAV_ICONS: Record<string, LucideIcon> = {
  tenants: Building2,
  termos: FileText,
  planos: Tags,
  // TAXAFLEX (S1606 · RN-178): o item entrou em PLATFORM_NAV mas ficou de fora
  // desta tabela e renderizava SEM ícone, único assim na barra do super-admin
  // (LEELA-DEBT-T2). A asserção `items.every(i => i.icon)` já cobrava isso —
  // ela ficava atrás da comparação da lista, que caía antes.
  taxa: Percent,
  repasses: Banknote,
  // T4 · decisão 43-b: fila cross-tenant de estornos + ação direta do admin.
  estornos: Undo2,
  billing: CreditCard,
  macro: Gauge,
};

/**
 * id do item ATIVO da navegação do produtor dado o pathname (null = nenhum).
 *
 * `/financeiro` saiu da tabela (RN-233): enquanto a rota legada ainda responde
 * — ela só redireciona (RN-234) — nenhum item fica marcado, que é o estado
 * honesto para uma URL que não é mais destino de menu nenhum.
 */
export function painelActiveId(pathname: string): string | null {
  if (pathname === '/') return 'visao-geral';
  if (pathname.startsWith('/eventos')) return 'eventos';
  if (pathname.startsWith('/clubes')) return 'clubs';
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/marcas')) return 'marcas';
  if (pathname.startsWith('/conta')) return 'configuracoes';
  return null;
}

function producerSections(
  ativoId: string | null,
  navigate: NavegarSpa,
  pathname: string,
  eventosAtivos?: number | null
): SidebarSection[] {
  return DEFAULT_SIDEBAR_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.map((item) => {
      const href = HREF_POR_ID[item.id];
      // nav-badge com dado REAL (mockup: Eventos = badge neutro com contagem).
      // Sem contagem (null/0) não há badge — estado honesto, nunca 0 decorativo.
      const badge =
        item.id === 'eventos' && typeof eventosAtivos === 'number' && eventosAtivos > 0
          ? { badge: eventosAtivos, badgeVariant: 'neutral' as const }
          : {};
      return {
        ...item,
        active: item.id === ativoId,
        ...badge,
        // href + onClick juntos: link de verdade, clique simples em SPA.
        // A-7 (LEELA-DEBT-T5): o `pathname` entra como rota atual — clicar no
        // item do menu onde a pessoa já está deixa de empilhar histórico.
        ...(href ? { href, onClick: onClickSpa(navigate, href, pathname) } : {}),
      };
    }),
  }));
}

function platformSections(pathname: string, navigate: NavegarSpa): SidebarSection[] {
  const ativo = activeNavId(pathname);
  return [
    {
      label: 'PLATAFORMA',
      items: PLATFORM_NAV.map((item): SidebarItem => {
        const Icon = PLATFORM_NAV_ICONS[item.id];
        const base: SidebarItem = {
          id: item.id,
          label: item.label,
          icon: Icon ? sidebarNavIcon(Icon) : undefined,
          active: item.id === ativo,
        };
        if (item.badge !== undefined) base.badge = item.badge;
        if (item.href) {
          const href = item.href;
          base.href = href;
          base.onClick = onClickSpa(navigate, href, pathname);
        }
        return base;
      }),
    },
  ];
}

/**
 * Seções da sidebar para o pathname atual: nav de plataforma em
 * `/plataforma/*`, nav do produtor em todas as demais rotas.
 * `eventosAtivos` (quando conhecido e > 0) vira o nav-badge neutro do item
 * Eventos — dado real da mesma fonte da Visão Geral.
 * @pure
 */
export function shellSidebarSections(
  pathname: string,
  navigate: NavegarSpa,
  eventosAtivos?: number | null
): SidebarSection[] {
  if (pathname.startsWith('/plataforma')) {
    return platformSections(pathname, navigate);
  }
  return producerSections(painelActiveId(pathname), navigate, pathname, eventosAtivos);
}
