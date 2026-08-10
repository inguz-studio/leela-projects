// =============================================================================
// OcupacaoEventos — "Ocupação dos últimos eventos" (REDESIGN-DS · Visão Geral v3).
//
// Barras horizontais porque a tarefa é comparar magnitude entre categorias
// (`design-principles` §c/§d) — e barras com denominador, porque o que interessa
// não é "quantos inscritos" (isso o KPI já diz) e sim "quanto da capacidade foi
// preenchida". O `BarChart` do DS já leva `total` por barra: dá o trilho, o
// "x / y · %" no tooltip e a TABELA equivalente em sr-only, que é o que mantém
// o bloco legível sem enxergar cor.
//
// Sem componente novo de gráfico: o DS tem o BarChart canônico (ADR-010,
// Recharts) e reinventar barra por tela é a dívida que a governança de DS
// proíbe. O protótipo pinta as barras pela rampa lime→âmbar do §6 — a rampa
// não existe no tema brasa (só em dark-wine; finding no handoff), então a cor
// segue a paleta categórica do DS. A identidade nunca é só cor aqui: cada barra
// carrega rótulo direto e o valor "x / y".
//
// A honestidade do bloco está na derivação (`_lib/ocupacao`), não aqui: evento
// sem capacidade conhecida não vira barra com denominador inventado — ele fica
// de fora e a nota diz quantos ficaram.
// =============================================================================

import { BarChart, EmptyState, Skeleton, type BarChartDatum } from '@leela/design-system';
import { CalendarRange } from 'lucide-react';
import type { OcupacaoDosEventos } from '../_lib/ocupacao';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';
import { SecaoHead } from '../../../components/SecaoHead';

export interface OcupacaoEventosProps {
  ocupacao: OcupacaoDosEventos | null;
  loading: boolean;
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** Link do cabeçalho — leva ao hub de eventos. */
  onVerEventos?: (() => void) | undefined;
}

/** Altura do plot: uma faixa por barra, com folga de respiro. @pure */
export function alturaDoPlot(barras: number): number {
  return Math.max(1, barras) * 34 + 24;
}

export function OcupacaoEventos({
  ocupacao,
  loading,
  error,
  onRetry,
  onVerEventos,
}: OcupacaoEventosProps): JSX.Element {
  const linhas = ocupacao?.linhas ?? [];
  const dados: BarChartDatum[] = linhas.map((l) => ({
    label: l.nome,
    value: l.inscritos,
    total: l.capacidade,
  }));

  return (
    <section aria-label="Ocupação dos últimos eventos" className="flex flex-col">
      <SecaoHead
        titulo="Ocupação dos últimos eventos"
        descricao="Inscritos sobre as vagas oferecidas em cada evento."
        acaoRotulo="Ver todos os eventos"
        onAcao={onVerEventos}
      />

      {loading ? (
        <div role="status" aria-label="Carregando ocupação dos eventos">
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : error ? (
        <PanelError
          message="Não foi possível carregar a ocupação dos seus eventos."
          onRetry={onRetry}
        />
      ) : dados.length === 0 ? (
        <EmptyState
          icon={<CalendarRange aria-hidden />}
          title="Sem ocupação para mostrar"
          description={
            ocupacao && ocupacao.semCapacidade > 0
              ? 'Seus eventos ainda não têm capacidade definida. Sem o total de vagas não existe taxa de ocupação — defina a capacidade na configuração do evento.'
              : 'Assim que um evento com vagas definidas receber inscrições, a ocupação aparece aqui.'
          }
        />
      ) : (
        <div className="rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
          <BarChart
            data={dados}
            aria-label="Ocupação dos últimos eventos, inscritos sobre vagas"
            height={alturaDoPlot(dados.length)}
            formatValue={formatInt}
          />
          {ocupacao && ocupacao.semCapacidade > 0 ? (
            <p className="mt-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {ocupacao.semCapacidade === 1
                ? '1 evento ficou de fora por não ter capacidade definida.'
                : `${formatInt(ocupacao.semCapacidade)} eventos ficaram de fora por não ter capacidade definida.`}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

OcupacaoEventos.displayName = 'OcupacaoEventos';
