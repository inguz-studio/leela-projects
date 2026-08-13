// =============================================================================
// KitsLayout — sub-nav interna da seção Kits (S205-T2): Cadastro | Distribuição
// | Estoque | Entrega. "Entrega" aponta para o balcão (S204). Repassa o evento
// do Outlet às rotas-filhas. Sob o EventoLayout (header + sub-nav do evento).
// =============================================================================

import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import type { SubNavTab } from '@leela/design-system';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { AreaSubNav } from '../../../components/nav/AreaSubNav';

export function KitsLayout(): JSX.Element {
  const ctx = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();
  const slug = ctx.evento.slug;
  const base = `/eventos/${slug}/kits`;

  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'cadastro';

  // `href` fica (ctrl+clique, clique do meio, copiar endereço); o clique simples
  // é interceptado e navega por SPA — a fiação vive no `AreaSubNav`.
  const tabs: SubNavTab[] = [
    { id: 'cadastro', label: 'Cadastro', href: base, active: ativa === 'cadastro' },
    { id: 'distribuicao', label: 'Distribuição', href: `${base}/distribuicao`, active: ativa === 'distribuicao' },
    { id: 'estoque', label: 'Estoque', href: `${base}/estoque`, active: ativa === 'estoque' },
    { id: 'entrega', label: 'Credenciamento', href: `/eventos/${slug}/credenciamento`, active: false },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <AreaSubNav tabs={tabs} aria-label="Seções de kits" />
      <Outlet context={ctx} />
    </div>
  );
}

KitsLayout.displayName = 'KitsLayout';
