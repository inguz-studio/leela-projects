// =============================================================================
// TenantsList — tela `/plataforma/tenants` (S1601-T3). Presentational: recebe
// estado async + callbacks. Tabela densa (§2.5) com saúde por tenant, chips de
// filtro por status com contador, EmptyState do glossário quando sem match,
// skeleton no load, bloco de erro no fail (§2.12).
// =============================================================================

import { Badge, Button, Chip, EmptyState, PageHeader, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type { Tenant } from '@leela/core';
import { deriveTenantHealth } from '@leela/core';
import { statusTenantBadge, healthTenantBadge } from '../_lib/health';
import { TENANT_FILTERS, filterTenants, type TenantFilter } from '../_lib/filter';
import { formatBRL, formatInt } from '../_lib/format';

export interface TenantsListProps {
  tenants: Tenant[] | null;
  loading: boolean;
  error: Error | null;
  filter: TenantFilter;
  onFilterChange: (filter: TenantFilter) => void;
  onOpenTenant: (tenantId: string) => void;
  /** Quando presente, exibe o botão "+ Provisionar tenant" (S1601-T4). */
  onProvisionar?: () => void;
}

function FiltroChips({
  filter,
  onFilterChange,
  counts,
}: {
  filter: TenantFilter;
  onFilterChange: (f: TenantFilter) => void;
  counts: Record<TenantFilter, number>;
}): JSX.Element {
  return (
    <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-[var(--spacing-2)]">
      {TENANT_FILTERS.map((opt) => {
        const ativo = opt.id === filter;
        return (
          <Chip key={opt.id} active={ativo} onClick={() => onFilterChange(opt.id)}>
            {opt.label}
            <span aria-hidden className="opacity-70">
              {counts[opt.id]}
            </span>
          </Chip>
        );
      })}
    </div>
  );
}

const columns: TableColumn<Tenant>[] = [
  {
    key: 'nome',
    header: 'Tenant',
    render: (t) => (
      <div className="flex flex-col">
        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{t.nome}</span>
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">{t.slug}</span>
      </div>
    ),
  },
  {
    key: 'tipo',
    header: 'Tipo',
    render: (t) => <span className="capitalize">{t.tipo}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (t) => {
      const s = statusTenantBadge(t.status);
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  },
  {
    key: 'saude',
    header: 'Saúde',
    render: (t) => {
      const h = healthTenantBadge(deriveTenantHealth(t.status, t.eventosAtivos ?? 0));
      return <Badge variant={h.variant}>{h.label}</Badge>;
    },
  },
  {
    key: 'eventosAtivos',
    header: 'Eventos',
    align: 'right',
    render: (t) => formatInt(t.eventosAtivos ?? 0),
  },
  {
    key: 'gmvAcumulado',
    header: 'GMV',
    align: 'right',
    render: (t) => formatBRL(t.gmvAcumulado ?? 0),
  },
];

export function TenantsList({
  tenants,
  loading,
  error,
  filter,
  onFilterChange,
  onOpenTenant,
  onProvisionar,
}: TenantsListProps): JSX.Element {
  const todos = tenants ?? [];
  const counts = {
    todos: todos.length,
    pending: filterTenants(todos, 'pending').length,
    ativo: filterTenants(todos, 'ativo').length,
    suspenso: filterTenants(todos, 'suspenso').length,
  } as Record<TenantFilter, number>;
  const visiveis = filterTenants(todos, filter);

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Tenants"
        subtitle="Produtores e promotores na plataforma"
        actions={
          onProvisionar ? (
            <Button variant="primary" onClick={onProvisionar}>
              + Provisionar tenant
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {loading ? (
          <div role="status" aria-label="Carregando tenants" className="flex flex-col gap-[var(--spacing-4)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-16" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar os tenants. Tente novamente.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-[var(--spacing-4)] flex-wrap">
              <FiltroChips filter={filter} onFilterChange={onFilterChange} counts={counts} />
              <p aria-live="polite" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Mostrando {formatInt(visiveis.length)} de {formatInt(todos.length)} tenants
              </p>
            </div>

            {visiveis.length === 0 ? (
              <EmptyState
                title="Nenhum tenant com esse status"
                description="Ajuste o filtro para ver outros tenants da plataforma."
              />
            ) : (
              <Table
                columns={columns}
                data={visiveis}
                keyExtractor={(t) => t.id}
                caption="Lista de tenants da plataforma"
                renderActions={(t) => (
                  <Button variant="ghost" size="sm" onClick={() => onOpenTenant(t.id)}>
                    Abrir
                  </Button>
                )}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

TenantsList.displayName = 'TenantsList';
