// =============================================================================
// TenantsListRoute — container de `/plataforma/tenants` (S1601-T3 + S1601-T4).
// Liga o hook de dados, o estado de filtro e a navegação; delega a renderização
// à TenantsList (presentational). O launcher "+ Provisionar tenant" (S1601-T4)
// abre a ProvisionTenantModal; sucesso recarrega a lista + Toast.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { ProvisionInput } from '@leela/core';
import { TenantsList } from './TenantsList';
import { ProvisionTenantModal } from './ProvisionTenantModal';
import { useTenants, useTenantActions } from '../_data/tenants';
import type { TenantFilter } from '../_lib/filter';
import { platformErrorMessage } from '../_lib/errors';

export function TenantsListRoute(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<TenantFilter>('todos');
  const [reloadKey, setReloadKey] = useState(0);
  const [provisionOpen, setProvisionOpen] = useState(false);

  const { data: tenants, loading, error } = useTenants(reloadKey);
  const actions = useTenantActions();

  async function handleProvision(input: ProvisionInput) {
    const result = await actions.provision(input);
    if (result) {
      setProvisionOpen(false);
      setReloadKey((k) => k + 1);
      toast({ variant: 'success', title: 'Tenant provisionado', description: input.nome });
    }
    // Falha: erro fica em actions.error → a modal exibe a mensagem clara.
  }

  return (
    <>
      <TenantsList
        tenants={tenants}
        loading={loading}
        error={error}
        filter={filter}
        onFilterChange={setFilter}
        onOpenTenant={(id) => navigate(`/plataforma/tenants/${id}`)}
        onProvisionar={() => setProvisionOpen(true)}
      />

      <ProvisionTenantModal
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
        running={actions.running}
        errorMessage={actions.error ? platformErrorMessage(actions.error) : undefined}
        onProvision={handleProvision}
      />
    </>
  );
}

TenantsListRoute.displayName = 'TenantsListRoute';
