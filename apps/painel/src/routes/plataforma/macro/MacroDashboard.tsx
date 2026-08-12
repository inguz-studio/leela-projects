// =============================================================================
// MacroDashboard — dashboard macro da plataforma `/plataforma/macro` (S1605-T3).
// Presentational: recebe os rollups + estado async. KPIs macro (GMV total,
// receita Leela total, tenants ativos) + tabela de saúde por tenant (receita
// Leela com a taxa DO termo de cada tenant — RN-406). Tudo de `platform/rollups`
// (RN-409 — nunca varrido no cliente). Estados §2.12; flat §2.16.
// =============================================================================

import { KpiCard, Badge, Button, EmptyState, PageHeader, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type { PlatformRollups, TenantRollup } from '@leela/core';
import { statusTenantBadge, healthTenantBadge } from '../_lib/health';
import { formatBRL, formatInt, formatPct, formatDataHora } from '../_lib/format';
import { sortTenantsByGmvDesc } from '../_lib/sort';

export interface MacroDashboardProps {
  rollups: PlatformRollups | null;
  loading: boolean;
  error: Error | null;
  onOpenTenant: (tenantId: string) => void;
}

const columns: TableColumn<TenantRollup>[] = [
  {
    key: 'nome',
    header: 'Tenant',
    render: (t) => <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{t.nome}</span>,
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
    key: 'health',
    header: 'Saúde',
    render: (t) => {
      const h = healthTenantBadge(t.health);
      return <Badge variant={h.variant}>{h.label}</Badge>;
    },
  },
  { key: 'gmv', header: 'GMV', align: 'right', render: (t) => formatBRL(t.gmv) },
  { key: 'receitaLeela', header: 'Receita Leela', align: 'right', render: (t) => formatBRL(t.receitaLeela) },
  { key: 'platformFeePct', header: 'Serviço', align: 'right', render: (t) => formatPct(t.platformFeePct) },
  { key: 'eventosAtivos', header: 'Eventos', align: 'right', render: (t) => formatInt(t.eventosAtivos) },
];

export function MacroDashboard({ rollups, loading, error, onOpenTenant }: MacroDashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader title="Macro" subtitle="Visão consolidada da plataforma" />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {loading ? (
          <div role="status" aria-label="Carregando painel macro" className="flex flex-col gap-[var(--spacing-4)]">
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-24" />
              ))}
            </div>
            <Skeleton variant="rect" className="h-60" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar o painel macro. Tente novamente.
          </div>
        ) : !rollups ? (
          <EmptyState
            title="Sem dados agregados ainda"
            description="O painel macro aparece assim que a agregação da plataforma for computada."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
              <KpiCard label="GMV total" value={formatBRL(rollups.gmvTotal)} />
              <KpiCard label="Receita Leela total" value={formatBRL(rollups.receitaLeelaTotal)} />
              <KpiCard label="Tenants ativos" value={formatInt(rollups.tenantsAtivos)} />
            </div>

            <div className="flex items-center justify-between gap-[var(--spacing-3)]">
              <h2 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                Saúde por tenant
              </h2>
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Atualizado em {formatDataHora(rollups.atualizadoEm)}
              </p>
            </div>

            <Table
              columns={columns}
              data={sortTenantsByGmvDesc(Object.values(rollups.tenants))}
              keyExtractor={(t) => t.tenantId}
              caption="Saúde e receita por tenant"
              renderActions={(t) => (
                <Button variant="ghost" size="sm" onClick={() => onOpenTenant(t.tenantId)}>
                  Abrir
                </Button>
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}

MacroDashboard.displayName = 'MacroDashboard';
