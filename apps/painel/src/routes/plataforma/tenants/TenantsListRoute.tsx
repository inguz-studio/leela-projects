// =============================================================================
// TenantsListRoute — container de `/plataforma/tenants` (S1601-T3 + S1601-T4).
// Liga o hook de dados, o estado de filtro e a navegação; delega a renderização
// à TenantsList (presentational). O launcher "+ Provisionar tenant" (S1601-T4)
// abre a ProvisionTenantModal; provisionar via `useProvisionTenant` (gateway) —
// no sucesso a lista revalida sozinha (invalidação de chave, ADR-010), sem
// contador de reload.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { ProvisionInput } from '@leela/core';
import { TenantsList } from './TenantsList';
import { ProvisionTenantModal } from './ProvisionTenantModal';
import { useTenants } from '../_data/tenants';
import { useProvisionTenant } from '../../../lib/query/mutations';
import type { TenantFilter } from '../_lib/filter';
import { platformErrorMessage } from '../_lib/errors';

export function TenantsListRoute(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<TenantFilter>('todos');
  const [provisionOpen, setProvisionOpen] = useState(false);

  const { data: tenants, loading, error } = useTenants();
  const provision = useProvisionTenant();

  async function handleProvision(input: ProvisionInput) {
    try {
      await provision.mutateAsync(input);
      // read-your-writes: a família `['plataforma','tenants']` revalida no
      // onSuccess do gateway; a lista mostra o tenant novo sem reload manual.
      setProvisionOpen(false);
      toast({ variant: 'success', title: 'Tenant provisionado', description: input.nome });
    } catch {
      // Erro fica em provision.error → a modal exibe a mensagem clara.
    }
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
        running={provision.isPending}
        errorMessage={provision.error ? platformErrorMessage(provision.error) : undefined}
        onProvision={handleProvision}
      />
    </>
  );
}

TenantsListRoute.displayName = 'TenantsListRoute';
