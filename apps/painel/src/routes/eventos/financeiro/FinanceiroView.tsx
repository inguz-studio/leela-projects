// =============================================================================
// FinanceiroView — financeiro do evento (S207-T1). Lê o agregado (nunca
// recalcula receita): visão de REPASSE do organizador (receita total, repassado,
// disponível, a ser disponibilizado), breakdown por kit/modalidade/status e
// export CSV. Presentational.
//
// A TAXA/MARGEM DA PLATAFORMA NÃO APARECE (RN-404 + decisão do dono,
// fix-tema-clube): sem card de "Taxa Leela", sem % de taxa, sem nota RN-406. O
// que exige o módulo de repasses (E09 — transferências reais) fica em estado
// honesto (repassado R$ 0,00 + hint), NÃO inventamos transferência.
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
  derivarRepasse,
  gerarCsvFinanceiro,
  RETENCAO_MAX_PCT,
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
  const rep = derivarRepasse(fin);
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

      {/* Resumo — visão de REPASSE do organizador (sem taxa/margem da
          plataforma, RN-404). "Repassado" depende do módulo de repasses (E09):
          estado honesto R$ 0,00 + hint, sem inventar transferência. */}
      <section
        aria-label="Resumo financeiro"
        className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-4"
      >
        <CardValor rotulo="Receita total" valor={formatBRL(rep.receitaTotal)} tom="primary" />
        <CardValor
          rotulo="Valor repassado"
          valor={formatBRL(rep.repassado)}
          nota="Disponível com o módulo de repasses"
          tom="primary"
        />
        <CardValor rotulo="Valor disponível" valor={formatBRL(rep.disponivel)} tom="success" />
        <CardValor
          rotulo="Valor a ser disponibilizado"
          valor={formatBRL(rep.aSerDisponibilizado)}
          nota={`Retenção de até ${RETENCAO_MAX_PCT}% do total, liberada pós-evento; negociável por cliente.`}
          tom="warning"
        />
      </section>

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
