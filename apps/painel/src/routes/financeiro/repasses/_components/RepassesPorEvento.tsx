// =============================================================================
// RepassesPorEvento — seção "Por evento" da tela de Repasses (RN-349). Tabela
// densa: evento · vendido · retido · disponível estimado. Presentational puro.
//
// HONESTIDADE DO DINHEIRO (§2.12): o "disponível estimado" é por-evento e NÃO é
// o saldo autoritativo (não abate repasses já solicitados nem a janela D+N) —
// uma nota explícita aponta o card "Disponível" agregado como número oficial.
// Evento sem termo comercial mostra "—" em retido/disponível (líquido
// indeterminado — nunca fabrica um valor). Sem eventos com movimento → EmptyState.
// =============================================================================

import { Badge, Skeleton, Table, type TableColumn } from '@leela/design-system';
import { formatBRL } from '../_lib/format';
import type { LinhaRepasseEvento } from '../_lib/repassesPorEvento';
import { RepasseErro } from './RepasseErro';

export interface RepassesPorEventoProps {
  linhas: LinhaRepasseEvento[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/** Valor com centavos ou "—" honesto (evento sem termo comercial). */
function valorOuTraco(v: number | null): string {
  return v === null ? '—' : formatBRL(v);
}

export function RepassesPorEvento({
  linhas,
  loading,
  error,
  onRetry,
}: RepassesPorEventoProps): JSX.Element {
  const columns: TableColumn<LinhaRepasseEvento>[] = [
    {
      key: 'nome',
      header: 'Evento',
      render: (l) => (
        <span className="flex items-center gap-[var(--spacing-2)]">
          <span className="text-[var(--text-primary)]">{l.nome}</span>
          {l.encerrado && <Badge variant="neutro">Encerrado</Badge>}
        </span>
      ),
    },
    {
      key: 'vendido',
      header: 'Vendido',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBRL(l.vendido)}</span>
      ),
    },
    {
      key: 'retido',
      header: 'Retido',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--feedback-warning-fg)]">
          {valorOuTraco(l.retido)}
        </span>
      ),
    },
    {
      key: 'disponivelEstimado',
      header: 'Disponível estimado',
      align: 'right',
      render: (l) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-success)]">
          {valorOuTraco(l.disponivelEstimado)}
        </span>
      ),
    },
  ];

  return (
    <section aria-label="Repasse por evento" className="flex flex-col gap-[var(--spacing-3)]">
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Por evento
        </h2>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Estimativa por evento. O <strong>disponível</strong> oficial — que já desconta os repasses
          solicitados e a janela de liberação — é o card &ldquo;Disponível&rdquo; acima.
        </p>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando repasse por evento">
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : error ? (
        <RepasseErro
          message="Não foi possível carregar o repasse por evento."
          onRetry={onRetry}
        />
      ) : (
        <Table
          columns={columns}
          data={linhas}
          keyExtractor={(l) => l.eventoId}
          caption="Vendido, retido e disponível estimado por evento"
          emptyTitle="Nenhum evento com movimento"
          emptyDescription="Os valores por evento aparecem após a primeira inscrição confirmada em um evento seu."
        />
      )}
    </section>
  );
}

RepassesPorEvento.displayName = 'RepassesPorEvento';
