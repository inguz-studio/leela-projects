// =============================================================================
// TenantsListRoute — container de `/plataforma/tenants` (S1601-T3). Liga o hook
// de dados, o estado de filtro e a navegação; delega a renderização à
// TenantsList (presentational). A provisão de novo tenant (S1601-T4) entra
// aqui depois, via o launcher de ações.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantsList } from './TenantsList';
import { useTenants } from '../_data/tenants';
import type { TenantFilter } from '../_lib/filter';

export function TenantsListRoute(): JSX.Element {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TenantFilter>('todos');
  const { data: tenants, loading, error } = useTenants();

  return (
    <TenantsList
      tenants={tenants}
      loading={loading}
      error={error}
      filter={filter}
      onFilterChange={setFilter}
      onOpenTenant={(id) => navigate(`/plataforma/tenants/${id}`)}
    />
  );
}

TenantsListRoute.displayName = 'TenantsListRoute';
