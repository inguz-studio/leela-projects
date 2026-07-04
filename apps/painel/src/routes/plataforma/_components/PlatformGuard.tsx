// =============================================================================
// PlatformGuard — porta de acesso das telas de super-admin (RN-401).
//
// Sem claim `platform_admin` → 403 (não a lista de tenants). Presentational:
// recebe o estado de sessão por props para ser testável sem Firebase.
// O container (PlatformShell) injeta usePlatformSession().
// =============================================================================

import type * as React from 'react';
import { EmptyState, Skeleton } from '@leela/design-system';
import type { SessionStatus } from '../_data/session';

export interface PlatformGuardProps {
  status: SessionStatus;
  isAdmin: boolean;
  children: React.ReactNode;
}

export function PlatformGuard({ status, isAdmin, children }: PlatformGuardProps): JSX.Element {
  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-label="Verificando acesso"
        className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]"
      >
        <Skeleton variant="rect" className="h-[var(--header-height)]" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div role="alert" className="p-[var(--spacing-6)]">
        <EmptyState
          title="403 — acesso restrito"
          description="Esta área é exclusiva de administradores da plataforma. Sua conta não tem permissão para vê-la."
        />
      </div>
    );
  }

  return <>{children}</>;
}

PlatformGuard.displayName = 'PlatformGuard';
