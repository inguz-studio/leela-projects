// =============================================================================
// TenantDetailRoute — container de `/plataforma/tenants/:tenantId` (S1601-T4).
// Liga dados (useTenant) + transição de ciclo de vida (useTransitionTenant do
// gateway) + Toast + ConfirmModal. Suspender confirma com preview (§2.15);
// aprovar/reativar são diretos. Toda escrita passa por Cloud Function; no
// sucesso a lista+detalhe revalidam sozinhos (invalidação de chave, ADR-010).
// =============================================================================

import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal, useToast } from '@leela/design-system';
import type { TenantStatus } from '@leela/core';
import { TenantDetail } from './TenantDetail';
import { useTenantComOwner } from '../_data/tenants';
import { useTransitionTenant } from '../../../lib/query/mutations';
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { tenant, owner, loading, error } = useTenantComOwner(tenantId);
  const transitionMutation = useTransitionTenant(tenantId);

  const runTransition = useCallback(
    async (to: TenantStatus) => {
      try {
        await transitionMutation.mutateAsync(to);
        // read-your-writes: `['plataforma','tenant',id]` + a lista revalidam.
        setConfirmOpen(false);
        toast({ variant: 'success', title: successMessage(to), ...(tenant?.nome ? { description: tenant.nome } : {}) });
      } catch (err) {
        setConfirmOpen(false);
        toast({ variant: 'danger', title: 'Ação não concluída', description: platformErrorMessage(err as Error) });
      }
    },
    [transitionMutation, tenant?.nome, toast],
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
        ownerNome={owner?.nome ?? null}
        loading={loading}
        error={error}
        running={transitionMutation.isPending}
        actionError={transitionMutation.error}
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
        loading={transitionMutation.isPending}
        onConfirm={() => void runTransition('suspenso')}
      />
    </>
  );
}

TenantDetailRoute.displayName = 'TenantDetailRoute';
