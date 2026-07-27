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
//
// RN-367 (DEC-0727C): o disponível agora sai da base do SAQUE, que precisa de
// duas coisas que o agregado do evento não carrega — o encerramento (RN-350) e
// a % de retenção do termo do tenant. As duas chegam por aqui, pelas MESMAS
// fontes da visão macro (`evento.status` e `commercialTerms/current`).
// =============================================================================

import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { podeAcessar } from '@leela/core';
import { FinanceiroView } from './FinanceiroView';
import { useFinanceiroRealtime } from '../../../lib/query/realtime';
import { commercialTermsQuery } from '../../../lib/query/queries';
import { useFinanceiroSession } from '../repasses/_data/session';
import { useHistoricoRepasses } from '../repasses/_data/repasses';
import { associarRepassesPorEvento } from '../repasses/_lib/repassesPorEvento';
import { usePapelEvento } from '../_data/papelEvento';
import type { ContextoRepasseEvento } from '../_lib/financeiro';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function FinanceiroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const navigate = useNavigate();
  const { data, loading, error } = useFinanceiroRealtime(evento.id);

  const session = useFinanceiroSession();
  const historico = useHistoricoRepasses(session.tenantId);
  const { papel } = usePapelEvento(evento);

  // Termo comercial — AUXILIAR, exatamente como em `useRepassesPorEvento`:
  // alimenta só a % de retenção e nunca bloqueia a tela. Ausente ou ilegível ⇒
  // o core aplica o default 15 (RN-350). A diferença de % entre o default e um
  // termo negociado move o número, e é por isso que o termo é lido em vez de
  // chutado — mas um termo indisponível não pode apagar a Caixa inteira.
  const termos = useQuery({
    ...commercialTermsQuery(session.tenantId ?? ''),
    enabled: !!session.tenantId,
  });

  const contexto = useMemo<ContextoRepasseEvento>(() => {
    const pct = termos.data?.retencaoRepassePct;
    return {
      encerrado: evento.status === 'encerrado',
      ...(typeof pct === 'number' ? { retencaoPct: pct } : {}),
    };
  }, [evento.status, termos.data]);

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
      // DEC-0727 tornou o disponível DEPENDENTE deste reader: sem o histórico a
      // Σ chega vazia e o número não abate. O erro tem de chegar à tela — antes
      // da DEC-0727 ele era cosmético (o disponível não abatia de todo jeito),
      // agora ele é a diferença entre um valor abatido e um valor cheio com
      // cara de final (review CAIXADISP-REV, R-4).
      repasseErro={historico.error}
      contexto={contexto}
      podeVerRepasses={podeVerRepasses}
      onVerRepasses={() => navigate('/eventos/repasses')}
    />
  );
}

FinanceiroPage.displayName = 'FinanceiroPage';
