// =============================================================================
// OverviewPage — container do Overview (rota-índice de `/eventos/:slug`).
// Pega o evento do Outlet context (EventoLayout) e LÊ os agregados via hooks
// existentes (useFinanceiro · useInscritosRecentes — NUNCA refaz fetch nem
// recalcula receita). Deriva os dados dos 5 blocos e entrega ao dashboard
// presentational. Analytics ausentes (gap E12) degradam com honestidade.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { diagnosticoVitrine, modalidadesVitrine } from '@leela/core';
import { OverviewDashboard } from './OverviewDashboard';
import { derivaAtividade } from './atividade';
import { prepararModalidades } from './modalidades';
import { derivaAlertas } from '../../_lib/alertas';
import { diasParaEvento, formatDataHoraExtenso } from '../../_lib/format';
import { useFinanceiro } from '../../_data/financeiro';
import { useInscritosRecentes } from '../../_data/eventos';
import { useLotes } from '../../_data/lotes';
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

  return (
    <OverviewDashboard
      dias={diasParaEvento(evento.data)}
      dataLinha={formatDataHoraExtenso(evento.data)}
      qtdInscritos={evento.qtdInscritos}
      capacidade={capacidade}
      receitaConfirmada={evento.receitaConfirmada}
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
    />
  );
}

OverviewPage.displayName = 'OverviewPage';
