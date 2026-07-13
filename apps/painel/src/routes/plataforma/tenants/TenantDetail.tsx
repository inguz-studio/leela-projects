// =============================================================================
// TenantDetail — tela `/plataforma/tenants/:tenantId` (S1601-T4). Presentational:
// recebe o tenant + estado async + callbacks. Header de contexto (§2.1) com
// status/saúde, KPIs, atalho para os termos comerciais e a ÚNICA ação de ciclo
// de vida disponível (RN-402). Tenant suspenso → card crítico border-left
// Vulcão (§2.15) + ação "Reativar". Erro de callable (ex.: failed-precondition
// da guarda de papel) vira alerta inline com mensagem clara.
// =============================================================================

import { KpiCard, Badge, Button, PageHeader, Skeleton } from '@leela/design-system';
import type { Tenant } from '@leela/core';
import { deriveTenantHealth } from '@leela/core';
import { statusTenantBadge, healthTenantBadge } from '../_lib/health';
import { formatBRL, formatInt, formatDataHora } from '../_lib/format';
import { lifecycleActionFor, type LifecycleAction } from '../_lib/lifecycle';
import { platformErrorMessage } from '../_lib/errors';

export interface TenantDetailProps {
  tenant: Tenant | null;
  loading: boolean;
  error: Error | null;
  /** Mutation em andamento (aprovar/suspender/reativar). */
  running: boolean;
  /** Erro da última ação de callable (traduzido para mensagem clara). */
  actionError: Error | null;
  /** Dispara a ação de ciclo de vida (o container decide confirmar ou não). */
  onAction: (action: LifecycleAction) => void;
  onEditarTermos: () => void;
  onVoltar: () => void;
}

export function TenantDetail({
  tenant,
  loading,
  error,
  running,
  actionError,
  onAction,
  onEditarTermos,
  onVoltar,
}: TenantDetailProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando tenant" className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <Skeleton variant="rect" className="h-[var(--header-height)]" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <div
          role="alert"
          className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
        >
          {error ? 'Não foi possível carregar o tenant. Tente novamente.' : 'Tenant não encontrado.'}
        </div>
        <div>
          <Button variant="ghost" onClick={onVoltar}>
            ← Voltar para tenants
          </Button>
        </div>
      </div>
    );
  }

  const status = statusTenantBadge(tenant.status);
  const health = healthTenantBadge(deriveTenantHealth(tenant.status, tenant.eventosAtivos ?? 0));
  const action = lifecycleActionFor(tenant.status);
  const critico = tenant.status === 'suspenso';

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title={tenant.nome}
        subtitle={tenant.slug}
        badges={
          <>
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={health.variant}>{health.label}</Badge>
          </>
        }
        metadata={
          <span title={`UID do owner: ${tenant.ownerUid}`}>
            Owner{' '}
            <span className="font-[var(--font-weight-semibold)] text-[var(--text-secondary)]">
              {tenant.ownerUid}
            </span>
          </span>
        }
        actions={
          <Button variant="secondary" onClick={onEditarTermos}>
            Editar termos
          </Button>
        }
      />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        <div>
          <Button variant="ghost" size="sm" onClick={onVoltar}>
            ← Voltar para tenants
          </Button>
        </div>

        {/* Tenant suspenso: card crítico border-left Vulcão (§2.15/§2.16 exceção) */}
        {critico && (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-[length:var(--card-critical-border)] border-l-[color:var(--feedback-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
          >
            <p className="font-[var(--font-weight-semibold)] text-[var(--text-danger)]">Tenant suspenso</p>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Vendas e publicações estão bloqueadas. Os dados, membros e o histórico foram preservados. Reative para
              retomar a operação.
            </p>
          </div>
        )}

        {/* Erro de ação (failed-precondition da guarda de papel etc.) */}
        {actionError && (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
          >
            {platformErrorMessage(actionError)}
          </div>
        )}

        {/* KPIs de saúde — cards flat (§2.16) */}
        <section
          aria-label="Saúde do tenant"
          className="grid grid-cols-2 gap-[var(--spacing-4)] sm:grid-cols-4"
        >
          <KpiCard label="Tipo" value={tenant.tipo === 'produtor' ? 'Produtor' : 'Promotor'} />
          <KpiCard label="Eventos ativos" value={formatInt(tenant.eventosAtivos ?? 0)} />
          <KpiCard label="GMV acumulado" value={formatBRL(tenant.gmvAcumulado ?? 0)} />
          <KpiCard label="Criado em" value={formatDataHora(tenant.criadoEm)} />
        </section>

        {/* Ação de ciclo de vida (RN-402 — sempre via Function) */}
        {action && (
          <div className="flex items-center gap-[var(--spacing-3)] border-t border-t-[color:var(--border-default)] pt-[var(--spacing-5)]">
            <Button variant={action.variant} disabled={running} onClick={() => onAction(action)}>
              {running ? 'Processando…' : action.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

TenantDetail.displayName = 'TenantDetail';
