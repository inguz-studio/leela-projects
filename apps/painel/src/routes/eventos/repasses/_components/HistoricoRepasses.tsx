// =============================================================================
// HistoricoRepasses — tabela densa (§2.5) do histórico de repasses (T4). Colunas:
// número (comprovante ou —), valor, estado (badge por estado), datas. Um repasse
// `pago` abre o COMPROVANTE (RN-355/356); os demais estados não têm comprovante
// (estado honesto — nada fabricado). Presentational; o modal é UI state local.
// =============================================================================

import * as React from 'react';
import { Badge, RowActions, Skeleton, Table, type TableColumn } from '@leela/design-system';
import type { Repasse } from '@leela/core';
import { formatBRL, formatData } from '../_lib/format';
import { badgeEstado } from '../_lib/estadoRepasse';
import { ComprovanteModal } from './ComprovanteModal';
import { RepasseErro } from './RepasseErro';

export interface HistoricoRepassesProps {
  repasses: Repasse[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function HistoricoRepasses({
  repasses,
  loading,
  error,
  onRetry,
}: HistoricoRepassesProps): JSX.Element {
  const [comprovante, setComprovante] = React.useState<Repasse | null>(null);

  const columns: TableColumn<Repasse>[] = [
    {
      key: 'numero',
      header: 'Número',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">{r.comprovanteNumero ?? '—'}</span>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (r) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBRL(r.valor)}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => {
        const b = badgeEstado(r.estado);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    { key: 'solicitado', header: 'Solicitado em', render: (r) => formatData(r.criadoEm) },
    { key: 'atualizado', header: 'Atualizado em', render: (r) => formatData(r.atualizadoEm) },
  ];

  return (
    <section aria-label="Histórico de repasses" className="flex flex-col gap-[var(--spacing-4)]">
      <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Histórico
      </h2>

      {loading ? (
        <div role="status" aria-label="Carregando histórico de repasses">
          <Skeleton variant="rect" className="h-60" />
        </div>
      ) : error ? (
        <RepasseErro message="Não foi possível carregar o histórico de repasses." onRetry={onRetry} />
      ) : (
        <Table
          columns={columns}
          data={repasses}
          keyExtractor={(r) => r.id}
          caption="Histórico de repasses do organizador"
          emptyTitle="Nenhum repasse solicitado ainda"
          emptyDescription="Quando você solicitar um saque, ele aparece aqui com o status atualizado."
          renderActions={(r) =>
            r.estado === 'pago' ? (
              // Ícone no lugar do escrito (decisão do dono, 17/08). O número do
              // comprovante entra no rótulo; quando ele ainda não veio, o valor
              // identifica a linha em vez de um "Ver comprovante" solto.
              <RowActions
                actions={[
                  {
                    id: 'comprovante',
                    label: `Ver comprovante do repasse ${r.comprovanteNumero ?? formatBRL(r.valor)}`,
                    verbo: 'ver',
                    onClick: () => setComprovante(r),
                  },
                ]}
              />
            ) : null
          }
        />
      )}

      {comprovante && (
        <ComprovanteModal
          open={comprovante !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setComprovante(null);
          }}
          repasse={comprovante}
        />
      )}
    </section>
  );
}

HistoricoRepasses.displayName = 'HistoricoRepasses';
