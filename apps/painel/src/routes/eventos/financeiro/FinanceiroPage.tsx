// =============================================================================
// FinanceiroPage — container da rota `/eventos/:slug/financeiro` (S207-T1).
// Superfície VIVA (UX-DADOS): assina `financeiro/current` via onSnapshot
// (useFinanceiroRealtime) — o painel reflete cada recomputo do gatilho na hora,
// sem revisitar a tela. O listener escreve na chave partilhada Overview↔
// Financeiro, então voltar ao Overview reidrata já fresco.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { FinanceiroView } from './FinanceiroView';
import { useFinanceiroRealtime } from '../../../lib/query/realtime';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function FinanceiroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data, loading, error } = useFinanceiroRealtime(evento.id);

  return <FinanceiroView slug={evento.slug} financeiro={data} loading={loading} error={error} />;
}

FinanceiroPage.displayName = 'FinanceiroPage';
