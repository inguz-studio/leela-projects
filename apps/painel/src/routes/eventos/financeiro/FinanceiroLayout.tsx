// =============================================================================
// FinanceiroLayout — casca da seção Financeiro do evento (S207 + S904-T5).
// Sob o EventoLayout (RequirePapel area="financeiro" já gateia o acesso). Monta
// uma sub-nav de duas superfícies:
//   Resumo — repasse/breakdown do organizador (S207, superfície viva);
//   Reembolsos e transferências — a fila de decisão (S904-T5).
// Repassa `{ evento }` às rotas-filhas via Outlet context (mesmo contrato do
// EventoLayout — as páginas leem `evento` sem recomputar).
// =============================================================================

import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { SubNav, type SubNavTab } from '@leela/design-system';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function FinanceiroLayout(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();

  const base = `/eventos/${evento.slug}/financeiro`;
  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'resumo';

  const tabs: SubNavTab[] = [
    { id: 'resumo', label: 'Resumo', href: base, active: ativa === 'resumo' },
    {
      id: 'reembolsos',
      label: 'Reembolsos e transferências',
      href: `${base}/reembolsos`,
      active: ativa === 'reembolsos',
    },
  ];

  const context: EventoOutletContext = { evento };

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <SubNav tabs={tabs} aria-label="Seções do financeiro" divider />
      <Outlet context={context} />
    </div>
  );
}

FinanceiroLayout.displayName = 'FinanceiroLayout';
