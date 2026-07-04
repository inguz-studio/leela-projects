// =============================================================================
// TenantDetailRoute — container de `/plataforma/tenants/:tenantId` (S1601-T4).
// Liga dados (useTenant) + ações de ciclo de vida (useTenantActions) + Toast +
// ConfirmModal. Suspender confirma com preview (§2.15); aprovar/reativar são
// diretos. Toda escrita passa por Cloud Function; sucesso recarrega o tenant.
// =============================================================================

import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal, useToast } from '@leela/design-system';
import type { TenantStatus } from '@leela/core';
import { TenantDetail } from './TenantDetail';
import { useTenant, useTenantActions } from '../_data/tenants';
import { SUSPEND_PREVIEW, type LifecycleAction } from '../_lib/lifecycle';
import { platformErrorMessage } from '../_lib/errors';

/** Mensagem de sucesso da transição, pelo status de destino. */
function successMessage(to: TenantStatus): string {
  switch (to) {
    case 'ativo':
      return 'Tenant ativado';
    case 'suspenso':
      return 'Tenant suspenso';
    default:
      return 'Status atualizado';
  }
}

export function TenantDetailRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: tenant, loading, error } = useTenant(tenantId, reloadKey);
  const actions = useTenantActions();

  const runTransition = useCallback(
    async (to: TenantStatus) => {
      const result = await actions.transition(tenantId, to);
      if (result) {
        setConfirmOpen(false);
        setReloadKey((k) => k + 1);
        toast({ variant: 'success', title: successMessage(to), ...(tenant?.nome ? { description: tenant.nome } : {}) });
      } else {
        setConfirmOpen(false);
        toast({ variant: 'danger', title: 'Ação não concluída', description: platformErrorMessage(actions.error) });
      }
    },
    [actions, tenantId, tenant?.nome, toast],
  );

  const handleAction = useCallback(
    (action: LifecycleAction) => {
      if (action.confirm) {
        setConfirmOpen(true);
      } else {
        void runTransition(action.to);
      }
    },
    [runTransition],
  );

  return (
    <>
      <TenantDetail
        tenant={tenant}
        loading={loading}
        error={error}
        running={actions.running}
        actionError={actions.error}
        onAction={handleAction}
        onEditarTermos={() => navigate(`/plataforma/tenants/${tenantId}/termos`)}
        onVoltar={() => navigate('/plataforma/tenants')}
      />

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Suspender tenant"
        description="A operação do tenant será bloqueada, mas nenhum dado é apagado."
        target={
          tenant ? (
            <div className="flex flex-col">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{tenant.nome}</span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">{tenant.slug}</span>
            </div>
          ) : undefined
        }
        loses={[...SUSPEND_PREVIEW.loses]}
        keeps={[...SUSPEND_PREVIEW.keeps]}
        confirmLabel="Suspender tenant"
        loading={actions.running}
        onConfirm={() => void runTransition('suspenso')}
      />
    </>
  );
}

TenantDetailRoute.displayName = 'TenantDetailRoute';
