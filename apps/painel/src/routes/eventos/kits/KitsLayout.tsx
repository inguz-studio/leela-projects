// =============================================================================
// KitsLayout — sub-nav interna da seção Kits (S205-T2): Cadastro | Distribuição
// | Estoque | Entrega. "Entrega" aponta para o balcão (S204). Repassa o evento
// do Outlet às rotas-filhas. Sob o EventoLayout (header + sub-nav do evento).
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
      { id: 'entrega', label: 'Entrega', href: `/eventos/${slug}/entrega`, active: false },
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
