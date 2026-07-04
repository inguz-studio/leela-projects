// =============================================================================
// Filtro puro da lista de tenants (S1601-T3). Testável sem React.
// =============================================================================

import type { Tenant, TenantStatus } from '@leela/core';

/** Filtro de status: um TenantStatus específico ou 'todos'. */
export type TenantFilter = TenantStatus | 'todos';

export interface FilterOption {
  id: TenantFilter;
  label: string;
}

/** Chips de filtro na ordem de exibição (§2.5). */
export const TENANT_FILTERS: FilterOption[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending', label: 'Aguardando' },
  { id: 'ativo', label: 'Ativos' },
  { id: 'suspenso', label: 'Suspensos' },
];

/** Aplica o filtro de status sobre a lista carregada (client-side). */
export function filterTenants(tenants: Tenant[], filter: TenantFilter): Tenant[] {
  if (filter === 'todos') return tenants;
  return tenants.filter((t) => t.status === filter);
}
