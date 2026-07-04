// =============================================================================
// EstoqueView — saldo por kit (S205-T4). Saldo = capacidade − retiradas; card
// crítico Vulcão (border-left) quando esgotado. Capacidade ausente no modelo →
// "—" (degradação graciosa, sem número fabricado). Presentational.
// =============================================================================

import { Badge, EmptyState, Skeleton, Table, type TableColumn } from '@leela/design-system';
import type { Inscrito, Kit } from '@leela/core';
import { estoquePorKit, type EstoqueKit } from '../_lib/distribuicao';
import { formatInt } from '../_lib/format';

export interface EstoqueViewProps {
  kits: Kit[];
  inscritos: Inscrito[];
  loading: boolean;
  error: Error | null;
}

export function EstoqueView({ kits, inscritos, loading, error }: EstoqueViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando estoque">
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar o estoque.</p>;
  }

  const linhas = estoquePorKit(kits, inscritos);
  const esgotados = linhas.filter((l) => l.esgotado);

  const columns: TableColumn<EstoqueKit>[] = [
    { key: 'nome', header: 'Kit' },
    {
      key: 'capacidade',
      header: 'Capacidade',
      align: 'right',
      render: (r) => (r.capacidade === null ? '—' : formatInt(r.capacidade)),
    },
    { key: 'retirados', header: 'Retirados', align: 'right', render: (r) => formatInt(r.retirados) },
    {
      key: 'saldo',
      header: 'Saldo',
      align: 'right',
      render: (r) => (r.saldo === null ? '—' : formatInt(r.saldo)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.capacidade === null ? (
          <Badge variant="neutro">Sem capacidade</Badge>
        ) : r.esgotado ? (
          <Badge variant="vulcao">Esgotado</Badge>
        ) : (
          <Badge variant="vitoria">Disponível</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      {esgotados.length > 0 && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-danger-surface)] p-[var(--spacing-4)]"
        >
          <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            {esgotados.length} kit(s) sem saldo: {esgotados.map((e) => e.nome).join(', ')}.
          </p>
        </div>
      )}

      {kits.length === 0 ? (
        <EmptyState
          title="Nenhum kit para controlar"
          description="Cadastre kits para acompanhar o estoque."
        />
      ) : (
        <Table
          columns={columns}
          data={linhas}
          keyExtractor={(r) => r.id}
          caption="Saldo de estoque por kit"
        />
      )}
    </div>
  );
}

EstoqueView.displayName = 'EstoqueView';
