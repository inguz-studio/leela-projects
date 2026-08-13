// =============================================================================
// FinanceiroLayout — casca da seção Financeiro do evento (S207 + S904-T5).
// Sob o EventoLayout (RequirePapel area="financeiro" já gateia o acesso). Monta
// uma sub-nav de duas superfícies:
//   Caixa — o macro DESTE evento: o que entrou, o que é taxa, o que sobra
//           (S207, superfície viva). Era "Resumo" até a rodada IA-MENU
//           (RN-235); mudou o RÓTULO, que é o que a pessoa lê — a URL
//           (`/eventos/{slug}/financeiro`) e a permissão (area="financeiro")
//           seguem idênticas.
//   Reembolsos e transferências — a fila de decisão (S904-T5).
//
// Caixa do evento e REPASSE são coisas separadas, e o Vitor foi explícito
// nisso: "o caixa de eventos é separado dos repasses". A visão macro de
// repasses vive em `/eventos/repasses`.
// Repassa `{ evento }` às rotas-filhas via Outlet context (mesmo contrato do
// EventoLayout — as páginas leem `evento` sem recomputar).
// =============================================================================

import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import type { SubNavTab } from '@leela/design-system';
import type { EventoOutletContext } from '../evento/EventoLayout';
import { AreaSubNav } from '../../../components/nav/AreaSubNav';

export function FinanceiroLayout(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { pathname } = useLocation();

  const base = `/eventos/${evento.slug}/financeiro`;
  const resto = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\/+/, '') : '';
  const ativa = resto.split('/')[0] || 'resumo';

  // `href` fica (ctrl+clique, clique do meio, copiar endereço); o clique simples
  // é interceptado e navega por SPA — a fiação vive no `AreaSubNav`.
  const tabs: SubNavTab[] = [
    { id: 'resumo', label: 'Caixa', href: base, active: ativa === 'resumo' },
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
      <AreaSubNav tabs={tabs} aria-label="Seções do financeiro" />
      <Outlet context={context} />
    </div>
  );
}

FinanceiroLayout.displayName = 'FinanceiroLayout';
