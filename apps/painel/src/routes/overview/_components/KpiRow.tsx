// =============================================================================
// KpiRow — a régua de indicadores da Visão Geral, recriada FIEL à seção
// "Últimos 7 dias" do protótipo "Visao Geral v3" (lane HIFI-REC).
//
// Anatomia do protótipo: UM cartão vidro de largura cheia com 4 células —
// ícone num círculo de 46px, rótulo uppercase pequeno, número display 1.625rem
// e a linha de delta ("↑ 12%") — separadas por divisórias verticais.
//
// Verdade de dado (P-REC-4 — número não volta a mentir): o protótipo rotula
// "Receita 7 dias" / "Inscrições 7 dias" / "Check-ins 7 dias". Os agregados
// reais do `getOverview` são TOTAIS do portfólio (a janela de 7d existe só na
// comparação do trend), e check-in de club não existe no backend. Os rótulos
// seguem a semântica real — "Inscrições totais", "Receita confirmada", "Vagas
// restantes", "Taxa de conversão" — e a seção se chama "Indicadores", não
// "Últimos 7 dias". Divergência nomeada no handoff.
//
// Honestidade preservada da tela anterior: vagas 0-falso mostra "—" (nunca 0),
// risco ≥ limiar acende "Esgotando", conversão sem série mostra "—" e o delta
// só aparece quando o contrato manda base de comparação (null → sem linha).
//
// Responsivo (README §4 + REFACTOR item 6): 1 coluna abaixo de 480 (`xs`),
// 2×2 de `xs` a `lg`, 4 colunas em `lg`; as divisórias acompanham as colunas.
// =============================================================================

import * as React from 'react';
import { CreditCard, Route, TrendingUp, Users } from 'lucide-react';
import { Badge, Sparkline, cn } from '@leela/design-system';
import type { OverviewKPIs } from '@leela/core';
import { formatBRL, formatInt, formatPct } from '../_lib/format';
import { CartaoV3, EyebrowV3 } from './CartaoV3';

export interface KpiRowProps {
  kpis: OverviewKPIs;
}

/** "↑ 12%" / "↓ 3%" do protótipo (valor absoluto; a seta carrega o sinal). @pure */
export function deltaTexto(pct: number): string {
  const abs = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    Math.abs(pct)
  );
  return `${pct >= 0 ? '↑' : '↓'} ${abs}%`;
}

interface CelulaProps {
  label: string;
  icon: React.ReactNode;
  valor: string;
  /** Prefixo de moeda (protótipo mantém o número inteiro na mesma linha). */
  moeda?: string | undefined;
  trendPct?: number | null | undefined;
  riskBadge?: string | undefined;
  sub?: string | undefined;
  sparkline?: readonly number[] | undefined;
  /** Divisória à esquerda (todas menos a 1ª, seguindo as colunas ativas). */
  divisoria?: 'sempre' | 'nunca' | 'so-lg';
}

function Celula({
  label,
  icon,
  valor,
  moeda,
  trendPct,
  riskBadge,
  sub,
  sparkline,
  divisoria = 'nunca',
}: CelulaProps): JSX.Element {
  const temSparkline = sparkline !== undefined && sparkline.length >= 2;
  return (
    <div
      className={cn(
        'flex items-center gap-[var(--spacing-4)] min-w-0',
        'py-[var(--spacing-2)] xs:py-0',
        'xs:px-[var(--spacing-6)] first:pl-0',
        divisoria === 'sempre' && 'xs:border-l xs:border-l-[var(--border-subtle)]',
        divisoria === 'so-lg' && 'lg:border-l lg:border-l-[var(--border-subtle)]',
      )}
    >
      {/* Círculo de 46px com o ícone na cor da marca (protótipo). */}
      <span
        aria-hidden
        className={cn(
          'shrink-0 flex items-center justify-center rounded-[var(--radius-pill)]',
          'w-[var(--v3-kpi-icon)] h-[var(--v3-kpi-icon)]',
          'bg-[var(--surface-overlay)] text-[var(--text-brand)]',
          '[&_svg]:w-[var(--v3-icon-md)] [&_svg]:h-[var(--v3-icon-md)]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block text-[length:var(--font-size-xs-plus)] font-[var(--font-weight-semibold)]',
            'uppercase tracking-[var(--v3-label-spacing)] text-[var(--text-tertiary)]',
            'truncate',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'block mt-[var(--spacing-1-5)] whitespace-nowrap',
            'font-display font-[var(--font-weight-extrabold)]',
            'text-[length:var(--v3-kpi-size)] leading-none text-[var(--text-primary)]',
          )}
        >
          {moeda ? (
            <span className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-secondary)] mr-[var(--spacing-1)]">
              {moeda}
            </span>
          ) : null}
          {valor}
        </span>
        <span className="flex items-center gap-[var(--spacing-2)] mt-[var(--spacing-1-5)] min-h-[var(--kpi-foot-min-h)]">
          {temSparkline ? (
            <Sparkline values={sparkline} className="text-[var(--text-brand)]" />
          ) : (
            <>
              {riskBadge ? (
                <Badge variant="vulcao">{riskBadge}</Badge>
              ) : trendPct === undefined || trendPct === null ? (
                <span className="text-[length:var(--font-size-sm-plus)] text-[var(--text-tertiary)]">
                  —
                </span>
              ) : (
                <span
                  className={cn(
                    'text-[length:var(--font-size-sm-plus)] font-[var(--font-weight-semibold)]',
                    trendPct >= 0
                      ? 'text-[var(--feedback-success)]'
                      : 'text-[var(--feedback-danger)]',
                  )}
                >
                  {deltaTexto(trendPct)}
                </span>
              )}
              {sub ? (
                <span className="min-w-0 truncate text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  {sub}
                </span>
              ) : null}
            </>
          )}
        </span>
      </span>
    </div>
  );
}

export function KpiRow({ kpis }: KpiRowProps): JSX.Element {
  // 0 sem risco = nenhuma capacidade conhecida (0 falso) → "—", não "0".
  const vagasDesconhecidas = kpis.vagasRestantes === 0 && kpis.eventoEmRisco === null;

  return (
    <CartaoV3 aria="Indicadores consolidados">
      <EyebrowV3 icon={<TrendingUp />}>Indicadores</EyebrowV3>
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <Celula
          label="Inscrições totais"
          icon={<Users />}
          valor={formatInt(kpis.inscricoesTotais)}
          trendPct={kpis.inscricoesTrendPct}
          sub={kpis.inscricoesTrendPct !== null ? 'vs. 7 dias' : undefined}
        />
        <Celula
          label="Receita confirmada"
          icon={<CreditCard />}
          moeda="R$"
          valor={formatBRL(kpis.receitaConfirmada).replace(/^R\$\s?/u, '')}
          trendPct={kpis.receitaTrendPct}
          sub={kpis.receitaTrendPct !== null ? 'vs. 7 dias' : undefined}
          divisoria="sempre"
        />
        <Celula
          label="Vagas restantes"
          icon={<Route />}
          valor={vagasDesconhecidas ? '—' : formatInt(kpis.vagasRestantes)}
          riskBadge={kpis.eventoEmRisco ? 'Esgotando' : undefined}
          sub={kpis.eventoEmRisco?.nome}
          divisoria="so-lg"
        />
        <Celula
          label="Taxa de conversão"
          icon={<TrendingUp />}
          valor={formatPct(kpis.taxaConversaoPct)}
          sparkline={kpis.conversaoSparkline}
          divisoria="sempre"
        />
      </div>
    </CartaoV3>
  );
}

KpiRow.displayName = 'KpiRow';
