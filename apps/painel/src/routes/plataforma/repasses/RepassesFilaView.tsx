// =============================================================================
// RepassesFilaView — fila de aprovação/pagamento do platform_admin (E09s-L4-T1).
// Presentational: recebe estado async + filtros + callbacks. Tabela densa (§2.5)
// com tenant, valor, estado (badge) e data; chips de filtro por ESTADO com
// contador + seletor por TENANT; contador "Mostrando X de Y"; skeleton no load,
// bloco de erro com "Tentar novamente" no fail (§2.12), EmptyState honesto sem
// pendência (§2.12) — nunca zeros ambíguos.
//
// Ações por linha seguem a máquina do repasse (RN-353): `solicitado` → Aprovar /
// Recusar; `aprovado` → Registrar pagamento. TODAS disparam callbacks que o
// container converte em Cloud Function (nunca estado direto no cliente — RN-357).
//
// Reuso: os helpers PUROS do repasse do organizador (badge por estado, dinheiro
// com centavos, data curta) são a MESMA fonte da tela L3 — repasse é um só
// domínio; a back-office não redefine a semântica de estado/moeda.
// =============================================================================

import { Badge, Button, Chip, Combobox, PageHeader, Skeleton, Table } from '@leela/design-system';
import type { SelectOption, TableColumn } from '@leela/design-system';
import { badgeEstado } from '../../eventos/repasses/_lib/estadoRepasse';
import { formatBRL, formatData } from '../../eventos/repasses/_lib/format';
import type { RepasseFilaItem } from '../../../lib/query/queries';
import {
  ESTADO_FILA_FILTERS,
  contarPorEstado,
  filtrarFila,
  tenantsNaFila,
  type EstadoFilaFilter,
  type TenantFilaFilter,
} from './_lib/fila';

export interface RepassesFilaViewProps {
  itens: RepasseFilaItem[];
  loading: boolean;
  error: Error | null;
  estadoFilter: EstadoFilaFilter;
  tenantFilter: TenantFilaFilter;
  onEstadoFilterChange: (f: EstadoFilaFilter) => void;
  onTenantFilterChange: (t: TenantFilaFilter) => void;
  onRetry: () => void;
  onAprovar: (item: RepasseFilaItem) => void;
  onRecusar: (item: RepasseFilaItem) => void;
  /**
   * Abre o fluxo de pagamento de um repasse `aprovado` (E09s-L4-T2). Opcional:
   * ausente ⇒ o item aprovado é listado SEM ação de pagar (o fluxo auditado de
   * dado bancário + registro manual chega no T2). Nunca marca pago no cliente.
   */
  onRegistrarPagamento?: (item: RepasseFilaItem) => void;
}

function EstadoChips({
  filter,
  counts,
  onChange,
}: {
  filter: EstadoFilaFilter;
  counts: Record<EstadoFilaFilter, number>;
  onChange: (f: EstadoFilaFilter) => void;
}): JSX.Element {
  return (
    <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-[var(--spacing-2)]">
      {ESTADO_FILA_FILTERS.map((opt) => {
        const ativo = opt.id === filter;
        return (
          <Chip key={opt.id} active={ativo} onClick={() => onChange(opt.id)}>
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

export function RepassesFilaView({
  itens,
  loading,
  error,
  estadoFilter,
  tenantFilter,
  onEstadoFilterChange,
  onTenantFilterChange,
  onRetry,
  onAprovar,
  onRecusar,
  onRegistrarPagamento,
}: RepassesFilaViewProps): JSX.Element {
  const counts = contarPorEstado(itens);
  const visiveis = filtrarFila(itens, estadoFilter, tenantFilter);
  const tenantOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos os tenants' },
    ...tenantsNaFila(itens).map((t) => ({ value: t.id, label: t.nome })),
  ];

  const columns: TableColumn<RepasseFilaItem>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      render: (it) => (
        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {it.tenantNome}
        </span>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (it) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBRL(it.repasse.valor)}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (it) => {
        const b = badgeEstado(it.repasse.estado);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    { key: 'solicitado', header: 'Solicitado em', render: (it) => formatData(it.repasse.criadoEm) },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader title="Repasses" subtitle="Fila de aprovação e pagamento dos saques dos produtores" />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {loading ? (
          <div role="status" aria-label="Carregando fila de repasses" className="flex flex-col gap-[var(--spacing-4)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-16" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            <p>Não foi possível carregar a fila de repasses.</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-[var(--spacing-4)] flex-wrap">
              <div className="flex flex-wrap items-end gap-[var(--spacing-4)]">
                <EstadoChips filter={estadoFilter} counts={counts} onChange={onEstadoFilterChange} />
                <label className="flex min-w-56 flex-col gap-[var(--spacing-1)]">
                  <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                    Tenant
                  </span>
                  <Combobox
                    id="fila-tenant-filter"
                    options={tenantOptions}
                    value={tenantFilter}
                    onValueChange={(v) => onTenantFilterChange(Array.isArray(v) ? (v[0] ?? '') : v)}
                    aria-label="Tenant"
                    searchPlaceholder="Buscar tenant…"
                    emptyText="Nenhum tenant encontrado"
                  />
                </label>
              </div>
              <p aria-live="polite" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Mostrando {visiveis.length} de {itens.length} repasses
              </p>
            </div>

            <Table
              columns={columns}
              data={visiveis}
              keyExtractor={(it) => `${it.repasse.tenantId}:${it.repasse.id}`}
              caption="Fila de repasses solicitados e aprovados"
              emptyTitle="Nenhum repasse na fila"
              emptyDescription="Quando um produtor solicitar um saque, a solicitação aparece aqui para aprovação e pagamento."
              renderActions={(it) => {
                if (it.repasse.estado === 'solicitado') {
                  return (
                    <div className="flex items-center justify-end gap-[var(--spacing-2)]">
                      <Button variant="ghost" size="sm" onClick={() => onRecusar(it)}>
                        Recusar
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => onAprovar(it)}>
                        Aprovar
                      </Button>
                    </div>
                  );
                }
                // Aprovado: o pagamento auditado (T2) só aparece quando o
                // container passa o callback; sem ele, o item fica listado.
                return onRegistrarPagamento ? (
                  <Button variant="primary" size="sm" onClick={() => onRegistrarPagamento(it)}>
                    Registrar pagamento
                  </Button>
                ) : null;
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

RepassesFilaView.displayName = 'RepassesFilaView';
