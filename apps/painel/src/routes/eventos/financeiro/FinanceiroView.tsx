// =============================================================================
// FinanceiroView — financeiro do evento (S207-T1). Lê o agregado (nunca
// recalcula receita): cards bruto/taxa/líquido (null-safe RN-406), breakdown
// por kit/modalidade/status e export CSV das linhas exibidas. Presentational.
// =============================================================================

import {
  BarChart,
  Button,
  DonutChart,
  EmptyState,
  Skeleton,
  Table,
  type TableColumn,
} from '@leela/design-system';
import type { FinanceiroEvento } from '@leela/api-client';
import {
  breakdownFinanceiro,
  formatTaxaPct,
  gerarCsvFinanceiro,
  type LinhaBreakdown,
} from '../_lib/financeiro';
import { prepararModalidades } from '../evento/overview/modalidades';
import { formatBRL, formatInt } from '../_lib/format';
import { baixarTexto } from '../_lib/download';

export interface FinanceiroViewProps {
  slug: string;
  financeiro: FinanceiroEvento | null;
  loading: boolean;
  error: Error | null;
}

export function FinanceiroView({ slug, financeiro, loading, error }: FinanceiroViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando financeiro" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-28" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar o financeiro.</p>;
  }
  if (!financeiro) {
    return (
      <EmptyState
        title="Financeiro ainda não disponível"
        description="O agregado financeiro é calculado após a primeira inscrição confirmada."
      />
    );
  }

  const fin = financeiro;
  const semTermo = fin.taxaPct === null;
  const linhas = breakdownFinanceiro(fin);
  // Reusa a derivação do Overview: MESMA cor por modalidade no bar e no donut
  // (a cor segue a entidade, não o rank — regra dataviz). Per-evento, sobre o
  // agregado que JÁ existe (S207-crit2: breakdown por modalidade).
  const { inscricoes, receita } = prepararModalidades(
    fin.inscritos.porModalidade,
    fin.receitaPorModalidade,
  );

  function exportar(): void {
    baixarTexto(gerarCsvFinanceiro(fin), `financeiro-${slug}.csv`);
  }

  const columns: TableColumn<LinhaBreakdown>[] = [
    { key: 'categoria', header: 'Categoria' },
    { key: 'item', header: 'Item' },
    { key: 'valor', header: 'Inscritos', align: 'right', render: (r) => formatInt(r.valor) },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Financeiro
        </h2>
        <Button variant="secondary" onClick={exportar}>
          Exportar CSV
        </Button>
      </div>

      {/* Resumo bruto/taxa/líquido */}
      <section aria-label="Resumo financeiro" className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
        <CardValor rotulo="Receita bruta" valor={formatBRL(fin.receitaBruta)} tom="primary" />
        <CardValor
          rotulo="Taxa Leela"
          valor={fin.taxaValor === null ? '—' : formatBRL(fin.taxaValor)}
          nota={formatTaxaPct(fin.taxaPct)}
          tom="warning"
        />
        <CardValor
          rotulo="Receita líquida"
          valor={fin.receitaLiquida === null ? '—' : formatBRL(fin.receitaLiquida)}
          tom="success"
        />
      </section>

      {semTermo && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-4)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
            Sem termos comerciais para este tenant — taxa e líquido ficam indisponíveis
            (RN-406, sem taxa padrão presumida).
          </p>
        </div>
      )}

      {/* Gráficos de breakdown por modalidade (reuso dos charts do DS —
          Recharts/ADR-010). Per-evento, sobre o agregado existente. */}
      <section
        aria-label="Distribuição por modalidade"
        className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-[3fr_2fr]"
      >
        <CardGrafico titulo="Inscrições por modalidade" nota={`${formatInt(fin.inscritos.total)} inscritos`}>
          {inscricoes.length > 0 ? (
            <BarChart aria-label="Inscrições por modalidade" data={inscricoes} height={170} />
          ) : (
            <EmptyState
              title="Sem inscrições por modalidade"
              description="O detalhamento aparece após a primeira inscrição confirmada."
            />
          )}
        </CardGrafico>

        <CardGrafico titulo="Receita por modalidade" nota={`${formatBRL(fin.receitaBruta)} total`}>
          {receita && receita.length > 0 ? (
            <DonutChart
              aria-label="Receita por modalidade"
              data={receita}
              centerValue={brlCompacto(fin.receitaBruta)}
              centerLabel="Receita total"
              size={180}
              formatValue={formatBRL}
            />
          ) : (
            <EmptyState
              title="Sem detalhamento de receita"
              description="A receita por modalidade ainda não está disponível para este evento."
            />
          )}
        </CardGrafico>
      </section>

      {/* Breakdown */}
      <section aria-label="Breakdown de inscrições" className="flex flex-col gap-[var(--spacing-3)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Inscrições ({formatInt(fin.inscritos.total)})
        </h3>
        <Table
          columns={columns}
          data={linhas}
          keyExtractor={(r) => `${r.categoria}-${r.item}`}
          caption="Breakdown de inscrições por kit, modalidade e status"
        />
      </section>

      {/* Backend-dependency honesto: NÃO inventamos dado. Estes cortes exigem o
          modelo de pagamento/afiliação (E12), ausente no agregado atual. */}
      <EmptyState
        title="Disponível com o módulo de pagamento"
        description="Inscrições por forma de pagamento, breakdown por lote e status de repasse do organizador dependem dos dados de pagamento (E12) — ainda não computados neste agregado."
      />
    </div>
  );
}

/** "R$ 85,6k" — compacto para o centro do donut. @pure */
function brlCompacto(valor: number): string {
  if (valor >= 1000) {
    const k = valor / 1000;
    return `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(k)}k`;
  }
  return formatBRL(valor);
}

/** Card de gráfico da tela Financeiro (mesmo padrão visual dos KPIs). */
function CardGrafico({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="mb-[var(--spacing-4)] flex items-baseline justify-between gap-[var(--spacing-2)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {titulo}
        </h3>
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] [font-variant-numeric:tabular-nums]">
          {nota}
        </span>
      </div>
      {children}
    </div>
  );
}

function CardValor({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom: 'primary' | 'warning' | 'success';
}): JSX.Element {
  const cor =
    tom === 'success'
      ? 'text-[var(--text-success)]'
      : tom === 'warning'
        ? 'text-[var(--feedback-warning-fg)]'
        : 'text-[var(--text-primary)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{rotulo}</span>
      <span className={`text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] ${cor}`}>{valor}</span>
      {nota && <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">{nota}</span>}
    </div>
  );
}

FinanceiroView.displayName = 'FinanceiroView';
