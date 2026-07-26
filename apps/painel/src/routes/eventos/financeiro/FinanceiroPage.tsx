// =============================================================================
// FinanceiroPage — container da rota `/eventos/:slug/financeiro` (S207-T1), a
// aba **Caixa** do evento. Superfície VIVA (UX-DADOS): assina
// `financeiro/current` via onSnapshot (useFinanceiroRealtime) — o painel
// reflete cada recomputo do gatilho na hora, sem revisitar a tela. O listener
// escreve na chave partilhada Overview↔Caixa, então voltar ao Overview
// reidrata já fresco.
//
// RN-349/RN-235 (IAM-T7): a Caixa passa a mostrar a linha de repasse DESTE
// evento. Nada de backend novo — lê o MESMO `useHistoricoRepasses` e aplica a
// MESMA função pura `associarRepassesPorEvento` que a visão macro
// (`/eventos/repasses`) usa. Os dois números se reconciliam por CONSTRUÇÃO:
// mesma fonte, mesma derivação, mesmo campo exato `eventoId`. Se algum dia
// divergirem, é bug de dado — não de duas contas diferentes.
// =============================================================================

import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { podeAcessar } from '@leela/core';
import { FinanceiroView } from './FinanceiroView';
import { useFinanceiroRealtime } from '../../../lib/query/realtime';
import { useFinanceiroSession } from '../repasses/_data/session';
import { useHistoricoRepasses } from '../repasses/_data/repasses';
import { associarRepassesPorEvento } from '../repasses/_lib/repassesPorEvento';
import { usePapelEvento } from '../_data/papelEvento';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function FinanceiroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const navigate = useNavigate();
  const { data, loading, error } = useFinanceiroRealtime(evento.id);

  const session = useFinanceiroSession();
  const historico = useHistoricoRepasses(session.tenantId);
  const { papel } = usePapelEvento(evento);

  // Σ dos repasses vivos ({solicitado, aprovado, pago}) associados a ESTE
  // evento. `undefined` (evento sem repasse) vira `null` = estado honesto.
  const repasseDoEvento = useMemo(
    () => associarRepassesPorEvento(historico.data).porEvento.get(evento.id) ?? null,
    [historico.data, evento.id],
  );

  // RN-320: o atalho para a visão macro segue a MATRIZ ÚNICA de papéis, a
  // mesma que o RequirePapel consulta — nunca uma segunda regra de acesso.
  const podeVerRepasses = papel !== null && podeAcessar(papel, 'financeiro');

  return (
    <FinanceiroView
      slug={evento.slug}
      financeiro={data}
      loading={loading}
      error={error}
      repasseDoEvento={repasseDoEvento}
      repasseLoading={session.status === 'loading' || historico.loading}
      podeVerRepasses={podeVerRepasses}
      onVerRepasses={() => navigate('/eventos/repasses')}
    />
  );
}

FinanceiroPage.displayName = 'FinanceiroPage';
