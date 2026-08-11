// =============================================================================
// OverviewKpis — 4 cards de métrica do Overview (LEELA-FID-EVT-T3), fiéis ao
// mockup `Overview do Evento.html`: Receita confirmada (+Δ semana) · Ticket médio
// (sparkline) · Taxa de conversão · Repasse previsto (após taxa + badge). Só LÊ
// agregados (∑ `receitaConfirmada`, `financeiro/current`) — NUNCA recalcula.
//
// D-1008-R19: o ticket médio chega DERIVADO (`ticketMedioPorPagante`), receita
// confirmada ÷ clientes que PAGARAM. Aqui ele dividia por `qtdInscritos`, ou
// seja, por emissões pendentes junto com as pagas — o número que o dono pegou.
//
// Reuso-first: Sparkline e Badge do DS; tokens de card. Degrada honesto: sem a
// série/Δ/conversão/repasse (gap E12 em produção), o card mostra o que existe.
// =============================================================================

import type { ReactNode } from 'react';
import { Badge, Sparkline, cn } from '@leela/design-system';
import { formatBRL, formatInt } from '../../_lib/format';

export interface OverviewKpisProps {
  receitaConfirmada: number;
  /**
   * Ticket médio JÁ DERIVADO (`ticketMedioPorPagante` — D-1008-R19): receita
   * confirmada ÷ clientes que PAGARAM. `null`/omitido = indeterminado → "—".
   *
   * Chega pronto de propósito. Até a R19 este card dividia por `qtdInscritos`,
   * e a contagem de inscritos estava aqui só para servir a essa divisão — a
   * prop saiu junto com o defeito: sem inscritos no componente, o denominador
   * errado não tem como voltar por descuido.
   */
  ticketMedio?: number | null | undefined;
  /** Δ de receita na semana (R$; null/omitido = esconde). */
  receitaSemana?: number | null | undefined;
  /** Série do ticket p/ sparkline (vazia = esconde). */
  ticketSparkline?: number[] | undefined;
  /** Conversão visitantes→inscritos (% ; null = "—"). */
  taxaConversaoPct?: number | null | undefined;
  /** Repasse previsto ao produtor (R$; null = "—"). */
  repassePrevisto?: number | null | undefined;
  /** % da taxa aplicada (para o rodapé do repasse). */
  taxaPct?: number | null | undefined;
}

function KpiTile({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-[var(--spacing-2)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]',
        className,
      )}
    >
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{label}</span>
      <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
      {children ? <div className="mt-auto pt-[var(--spacing-1)]">{children}</div> : null}
    </div>
  );
}

export function OverviewKpis({
  receitaConfirmada,
  ticketMedio,
  receitaSemana,
  ticketSparkline,
  taxaConversaoPct,
  repassePrevisto,
  taxaPct,
}: OverviewKpisProps): JSX.Element {
  const temSpark = Array.isArray(ticketSparkline) && ticketSparkline.length >= 2;

  return (
    <section
      aria-label="Indicadores do evento"
      className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiTile label="Receita confirmada" value={formatBRL(receitaConfirmada)}>
        {typeof receitaSemana === 'number' && receitaSemana > 0 ? (
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            <strong className="font-[var(--font-weight-semibold)] text-[var(--feedback-success-fg)]">
              +{formatBRL(receitaSemana)}
            </strong>{' '}
            esta semana
          </span>
        ) : null}
      </KpiTile>

      <KpiTile
        label="Ticket médio"
        value={typeof ticketMedio === 'number' ? formatBRL(ticketMedio) : '—'}
      >
        {temSpark ? (
          <Sparkline
            values={ticketSparkline as number[]}
            aria-label="Tendência do ticket médio"
            className="text-[var(--text-brand)]"
          />
        ) : null}
      </KpiTile>

      <KpiTile
        label="Taxa de conversão"
        value={typeof taxaConversaoPct === 'number' ? `${formatInt(Math.round(taxaConversaoPct))}%` : '—'}
      >
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          visitantes → inscritos
        </span>
      </KpiTile>

      <KpiTile
        label="Repasse previsto"
        value={typeof repassePrevisto === 'number' ? formatBRL(repassePrevisto) : '—'}
      >
        <div className="flex items-center gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {typeof taxaPct === 'number' ? `após taxa ${formatInt(taxaPct)}%` : 'após taxa Leela'}
          </span>
          <Badge variant="alerta" className="ml-auto">
            Aguardando encerramento
          </Badge>
        </div>
      </KpiTile>
    </section>
  );
}

OverviewKpis.displayName = 'OverviewKpis';
