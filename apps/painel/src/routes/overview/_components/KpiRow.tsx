// =============================================================================
// KpiRow — os 4 cards de KPI do topo da Visão Geral (S600-T3, recomposto no
// Lote FIDELIDADE T4 fiel ao mockup `.kpi` em densidade COMPACT). Presentational
// puro: consome o retorno de `getOverview` (agregado ∑ — NUNCA recalcula).
//
// Anatomia do mockup: label com ícone 14px · valor 34px display italic (com
// slot de moeda 22px na Receita) · foot com trend chip (`.trend` 10px/700
// uppercase, pares feedback-* da matriz AA) OU badge de risco OU sparkline.
// Elevação: elev-1 em repouso, hover levanta 2px e sobe pra elev-2 (fecha o
// minor m1 do QA-LIVE — os KPIs estavam chapados, sem anel hairline).
//
// Honestidade das vagas (#15): `derivarKpis` só soma vagas de evento PÚBLICO
// com capacidade conhecida e marca `eventoEmRisco` para qualquer ocupação
// ≥ LIMIAR_ESGOTANDO (0,9). Logo, um esgotamento real (vagas=0) SEMPRE acende
// o risco (ocupação ≥ 1,0). Um `vagasRestantes===0` COM `eventoEmRisco===null`
// só acontece quando NENHUMA capacidade é conhecida → 0 falso: renderiza "—"
// (nunca 0 falso, contrato do próprio kpis.ts), distinto de "esgotado".
// Trends: a janela real do contrato é 7d vs. 7d anteriores → "vs. 7 dias".
// Conversão: série vazia até E12 → "—" sem sparkline (nunca inventa curva).
// =============================================================================

import * as React from 'react';
import { ArrowDown, ArrowUp, CreditCard, Route, TrendingUp, Users } from 'lucide-react';
import { Badge, Sparkline, cn } from '@leela/design-system';
import type { OverviewKPIs } from '@leela/core';
import { formatBRL, formatInt, formatPct, formatTrend } from '../_lib/format';

export interface KpiRowProps {
  kpis: OverviewKPIs;
}

// ---------------------------------------------------------------------------
// TrendChip — `.trend` do mockup: chip 10px/700 uppercase com seta 10px.
// Cores pelos pares feedback-success/danger (fg sobre surface) já na matriz.
// ---------------------------------------------------------------------------

function TrendChip({ pct }: { pct: number }): JSX.Element {
  const up = pct >= 0;
  const Seta = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--trend-gap)] whitespace-nowrap',
        'px-[var(--trend-px)] py-[var(--trend-py)] rounded-[var(--radius-xs)]',
        'text-[length:var(--trend-font-size)] font-[var(--font-weight-bold)]',
        'uppercase tracking-[var(--trend-spacing)]',
        up
          ? 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]'
          : 'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]'
      )}
    >
      <Seta
        aria-hidden
        className="w-[var(--trend-icon-size)] h-[var(--trend-icon-size)] [stroke-width:2.5]"
      />
      {formatTrend(pct)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  icon: React.ReactNode;
  /** Valor principal (34px display italic — compact do mockup). */
  value: string;
  /** Prefixo de moeda (22px, secondary) — mockup `.kpi-value .currency`. */
  currency?: string | undefined;
  /** Trend real do contrato (null = sem base → "—"); omitido = não se aplica. */
  trendPct?: number | null | undefined;
  /** Legenda ao lado do trend/badge (`.kpi-sub`, 11px, 1 linha). */
  sub?: string | undefined;
  /** Badge de risco (KPI de vagas — mockup badge-vulcao "Esgotando"). */
  riskBadge?: string | undefined;
  /** Série do sparkline (só renderiza com ≥ 2 pontos). */
  sparkline?: readonly number[] | undefined;
}

function KpiCard({
  label,
  icon,
  value,
  currency,
  trendPct,
  sub,
  riskBadge,
  sparkline,
}: KpiCardProps): JSX.Element {
  const temSparkline = sparkline !== undefined && sparkline.length >= 2;

  return (
    <div
      className={cn(
        'flex flex-col gap-[var(--kpi-gap)]',
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--kpi-padding)]',
        // Elevação do mockup (fecha m1): anel hairline no repouso, lift no hover
        'shadow-elev-1 hover:shadow-elev-2',
        'hover:translate-y-[calc(-1*var(--spacing-0-5))]',
        'transition-[transform,box-shadow] duration-[var(--motion-duration-normal)] ease-[var(--motion-easing-default)]'
      )}
    >
      {/* Label com ícone (mockup `.kpi-label`) */}
      <span
        className={cn(
          'flex items-center gap-[var(--kpi-label-gap)]',
          'text-[length:var(--kpi-label-size)] font-[var(--font-weight-medium)]',
          'text-[var(--text-tertiary)] tracking-[var(--kpi-label-spacing)]'
        )}
      >
        <span
          aria-hidden
          className="shrink-0 flex items-center [&_svg]:w-[var(--kpi-label-icon-size)] [&_svg]:h-[var(--kpi-label-icon-size)]"
        >
          {icon}
        </span>
        {label}
      </span>

      {/* Valor (mockup `.kpi-value`, compact 34px) */}
      <span
        className={cn(
          'font-display italic font-[var(--font-weight-bold)]',
          'text-[length:var(--kpi-value-size)] leading-none tracking-[var(--kpi-value-spacing)]',
          'text-[var(--text-primary)]'
        )}
      >
        {currency ? (
          <span
            className={cn(
              'text-[length:var(--kpi-currency-size)] font-[var(--font-weight-semibold)]',
              'text-[var(--text-secondary)] mr-[var(--spacing-1)]'
            )}
          >
            {currency}
          </span>
        ) : null}
        {value}
      </span>

      {/* Foot (mockup `.kpi-foot`, min-h 24) */}
      <span className="flex items-center justify-between gap-[var(--kpi-label-gap)] min-h-[var(--kpi-foot-min-h)]">
        {temSparkline ? (
          <Sparkline values={sparkline} className="text-[var(--text-brand)]" />
        ) : (
          <>
            {riskBadge ? (
              <Badge variant="vulcao">{riskBadge}</Badge>
            ) : trendPct === undefined || trendPct === null ? (
              <span className="text-[length:var(--kpi-sub-size)] text-[var(--text-tertiary)]">
                —
              </span>
            ) : (
              <TrendChip pct={trendPct} />
            )}
            {sub ? (
              <span className="min-w-0 truncate text-[length:var(--kpi-sub-size)] text-[var(--text-tertiary)]">
                {sub}
              </span>
            ) : null}
          </>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiRow
// ---------------------------------------------------------------------------

export function KpiRow({ kpis }: KpiRowProps): JSX.Element {
  // 0 sem risco = nenhuma capacidade conhecida (0 falso) → "—", não "0".
  const vagasDesconhecidas = kpis.vagasRestantes === 0 && kpis.eventoEmRisco === null;

  return (
    <section
      aria-label="Indicadores consolidados"
      className="grid grid-cols-2 gap-[var(--layout-grid-gap)] lg:grid-cols-4"
    >
      <KpiCard
        label="Inscrições totais"
        icon={<Users />}
        value={formatInt(kpis.inscricoesTotais)}
        trendPct={kpis.inscricoesTrendPct}
        sub={kpis.inscricoesTrendPct !== null ? 'vs. 7 dias' : undefined}
      />
      <KpiCard
        label="Receita confirmada"
        icon={<CreditCard />}
        currency="R$"
        value={formatBRL(kpis.receitaConfirmada).replace(/^R\$\s?/u, '')}
        trendPct={kpis.receitaTrendPct}
        sub={kpis.receitaTrendPct !== null ? 'vs. 7 dias' : undefined}
      />
      <KpiCard
        label="Vagas restantes"
        icon={<Route />}
        value={vagasDesconhecidas ? '—' : formatInt(kpis.vagasRestantes)}
        riskBadge={kpis.eventoEmRisco ? 'Esgotando' : undefined}
        sub={kpis.eventoEmRisco?.nome}
      />
      <KpiCard
        label="Taxa de conversão"
        icon={<TrendingUp />}
        value={formatPct(kpis.taxaConversaoPct)}
        sparkline={kpis.conversaoSparkline}
      />
    </section>
  );
}

KpiRow.displayName = 'KpiRow';
