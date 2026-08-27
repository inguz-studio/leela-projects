// =============================================================================
// OverviewPage — container do Overview (rota-índice de `/eventos/:slug`).
// Pega o evento do Outlet context (EventoLayout) e LÊ os agregados via hooks
// existentes (useFinanceiro · useInscritosRecentes — NUNCA refaz fetch nem
// recalcula receita). Deriva os dados dos 5 blocos e entrega ao dashboard
// presentational. Analytics ausentes (gap E12) degradam com honestidade.
// V2708-17: `useTodosInscritos` alimenta o PainelOperacional (credenciamento
// ao vivo) no slot abaixo do fold — não bloqueia LCP. Cache compartilhado com
// o balcão (queryKeys.inscritos.todos) mantém o dado fresco quando o operador
// tem as duas abas abertas.
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { diagnosticoVitrine, modalidadesVitrine } from '@leela/core';
import { OverviewDashboard } from './OverviewDashboard';
import { derivaAtividade } from './atividade';
import { prepararModalidades } from './modalidades';
import { derivaAlertas } from '../../_lib/alertas';
import { ticketMedioPorPagante } from '../../_lib/financeiro';
import { diasParaEvento, formatDataHoraExtenso } from '../../_lib/format';
import { useFinanceiro } from '../../_data/financeiro';
import { useInscritosRecentes } from '../../_data/eventos';
import { useLotes } from '../../_data/lotes';
import { useTodosInscritos } from '../../_data/inscritos';
import { PainelOperacional } from '../../entrega/PainelOperacional';
import type { EventoOutletContext } from '../EventoLayout';

export function OverviewPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data: recentes, loading: recentesLoading } = useInscritosRecentes(evento.id, 6);
  const { data: fin } = useFinanceiro(evento.id);
  // VITRINE-FIX: os lotes entram no Overview para responder "a página pública
  // está vendendo?" — a mesma pergunta, pela mesma régua do core, que a landing
  // responde. Enquanto os lotes não chegam, `null` = não sabemos, e nenhum
  // alerta de vitrine é inventado.
  const { data: lotes } = useLotes(evento.id);
  // V2708-17: inscritos completos para o PainelOperacional. Non-realtime
  // (TanStack Query), compartilha cache com o balcão quando ambos estão abertos
  // — sem segundo listener, sem custo de LCP adicional.
  const { data: todosInscritos } = useTodosInscritos(evento.id);

  const vitrine =
    lotes === null
      ? null
      : diagnosticoVitrine(
          modalidadesVitrine({
            modalidades: evento.modalidades,
            percursos: evento.percursos,
            lotes,
          }),
          evento.data.toDate(),
          new Date(),
        );

  const capacidade = evento.capacidade ?? null;
  const receitaTotal = fin?.receitaBruta ?? evento.receitaConfirmada;

  const { inscricoes, receita } = prepararModalidades(
    fin?.inscritos.porModalidade ?? {},
    fin?.receitaPorModalidade,
  );

  // V2708-17: últimos atendidos derivados do pool completo, ordenados por
  // checkinEm desc (mais recente primeiro). PainelOperacional usa esta lista
  // quando `ultimosAtendidos.length > 0`, sem recorrer ao fallback linear.
  const ultimosAtendidos = React.useMemo(
    () =>
      (todosInscritos ?? [])
        .filter((i) => i.checkinEm != null)
        .sort((a, b) => (b.checkinEm?.toMillis() ?? 0) - (a.checkinEm?.toMillis() ?? 0))
        .slice(0, 5)
        .map((i) => i.atletaNome),
    [todosInscritos],
  );

  // Slot do credenciamento: renderizado apenas quando temos dados de inscritos
  // para evitar skeleton desnecessário no LCP principal.
  const credenciamentoSlot =
    todosInscritos != null ? (
      <PainelOperacional
        inscritos={todosInscritos}
        ultimosAtendidos={ultimosAtendidos}
        usaChip={evento.usaChip}
        faixaChips={evento.faixaChips ?? null}
      />
    ) : undefined;

  return (
    <OverviewDashboard
      dias={diasParaEvento(evento.data)}
      dataLinha={formatDataHoraExtenso(evento.data)}
      qtdInscritos={evento.qtdInscritos}
      capacidade={capacidade}
      receitaConfirmada={evento.receitaConfirmada}
      // D-1008-R19 · receita confirmada ÷ clientes que PAGARAM, os dois números
      // do MESMO `financeiro/current`. Sem agregado, `null` → "—" honesto: o
      // ticket não volta a ser dividido pela contagem de inscritos, que carrega
      // emissão pendente junto com pagamento.
      ticketMedio={ticketMedioPorPagante(fin)}
      receitaSemana={fin?.receitaSemana ?? null}
      ticketSparkline={fin?.ticketSparkline}
      taxaConversaoPct={fin?.taxaConversaoPct ?? null}
      repassePrevisto={fin?.receitaLiquida ?? null}
      taxaPct={fin?.taxaPct ?? null}
      inscricoesModal={inscricoes}
      receitaTotal={receitaTotal}
      receitaModal={receita}
      atividade={derivaAtividade(recentes)}
      atividadeLoading={recentesLoading}
      alertas={derivaAlertas(evento, new Date(), vitrine)}
      credenciamentoSlot={credenciamentoSlot}
    />
  );
}

OverviewPage.displayName = 'OverviewPage';
