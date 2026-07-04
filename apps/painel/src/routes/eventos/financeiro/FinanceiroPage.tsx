// =============================================================================
// FinanceiroPage — container da rota `/eventos/:slug/financeiro` (S207-T1).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { FinanceiroView } from './FinanceiroView';
import { useFinanceiro } from '../_data/financeiro';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function FinanceiroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data, loading, error } = useFinanceiro(evento.id);

  return <FinanceiroView slug={evento.slug} financeiro={data} loading={loading} error={error} />;
}

FinanceiroPage.displayName = 'FinanceiroPage';
