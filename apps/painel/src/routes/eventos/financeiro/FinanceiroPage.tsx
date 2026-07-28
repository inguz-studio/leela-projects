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
import { useTenantSession } from '../../../lib/session/tenantSession';
import { useHistoricoRepasses, useSaldoRepasse } from '../repasses/_data/repasses';
import { associarRepassesPorEvento } from '../repasses/_lib/repassesPorEvento';
import { usePapelEvento } from '../_data/papelEvento';
import { contextoDaCaixa, type ContextoRepasseEvento } from '../_lib/financeiro';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function FinanceiroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const navigate = useNavigate();
  const { data, loading, error } = useFinanceiroRealtime(evento.id);

  const session = useTenantSession();
  const historico = useHistoricoRepasses(session.tenantId);
  // Item 49: o teto de verdade do saque. O disponível do EVENTO não conhece a
  // janela D+N (RN-348), que é grandeza do TENANT — é o MESMO `saldo/current`
  // que a visão macro e o modal de repasse leem, com a MESMA chave de cache
  // (quente se o organizador já passou por Eventos › Repasses). Nenhuma soma
  // nova: o consolidado é ∑ do servidor (RN-350/351).
  const saldo = useSaldoRepasse(session.tenantId);
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

  // As guardas do termo (NaN) e do teto do tenant (item 49) vivem na função
  // pura, não aqui: é conta de dinheiro, e conta de dinheiro tem teste.
  const contexto = useMemo<ContextoRepasseEvento>(
    () =>
      contextoDaCaixa({
        encerrado: evento.status === 'encerrado',
        retencaoPct: termos.data?.retencaoRepassePct,
        disponivelTenant: saldo.data?.disponivel,
      }),
    [evento.status, termos.data, saldo.data],
  );

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
      // Item 50: o erro do termo deixa de ser engolido. A MESMA lane que fez o
      // erro do histórico chegar à tela não aplicou aqui, e a leitura falhando
      // com termo negociado de 30% volta a prometer mais que o saque aceita.
      termoErro={termos.error}
      // Item 49: sem o consolidado do tenant o card volta ao número do evento,
      // que é exatamente o que o item corrige. Declarado, não silencioso.
      tetoTenantErro={saldo.error}
      contexto={contexto}
      podeVerRepasses={podeVerRepasses}
      onVerRepasses={() => navigate('/eventos/repasses')}
    />
  );
}

FinanceiroPage.displayName = 'FinanceiroPage';
