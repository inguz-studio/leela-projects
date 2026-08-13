// =============================================================================
// KitsLayout — sub-nav interna da seção Kits (S205-T2): Cadastro | Distribuição
// | Estoque. Repassa o evento do Outlet às rotas-filhas. Sob o EventoLayout
// (header + sub-nav do evento).
//
// S1257 (leva 11 · 12/08) — SAIU o quarto item, "Credenciamento". Ele tinha o
// MESMO `href` da aba de Credenciamento do menu secundário do evento
// (`_lib/subnav.ts`), sem tela própria e sem versão resumida: era um atalho de
// saída, e `active` era `false` em toda rota porque o destino vive fora da
// árvore de Kits. Quem credencia sai pelo menu do evento, como já faz para
// Inscritos e Financeiro. A régua é a da RN-399 — uma porta só por destino.
// =============================================================================

import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { SubNav, type SubNavTab } from '@leela/design-system';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { tabsComNavSpa } from '../../../lib/navSpa';

export function KitsLayout(): JSX.Element {
  const ctx = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const slug = ctx.evento.slug;
  const base = `/eventos/${slug}/kits`;

  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'cadastro';

  // `href` fica (ctrl+clique, clique do meio, copiar endereço); o clique simples
  // é interceptado e navega por SPA — LEELA-NAVFIX-T2.
  const tabs: SubNavTab[] = tabsComNavSpa(
    [
      { id: 'cadastro', label: 'Cadastro', href: base, active: ativa === 'cadastro' },
      { id: 'distribuicao', label: 'Distribuição', href: `${base}/distribuicao`, active: ativa === 'distribuicao' },
      { id: 'estoque', label: 'Estoque', href: `${base}/estoque`, active: ativa === 'estoque' },
    ],
    navigate,
    pathname,
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <SubNav tabs={tabs} aria-label="Seções de kits" divider />
      <Outlet context={ctx} />
    </div>
  );
}

KitsLayout.displayName = 'KitsLayout';
