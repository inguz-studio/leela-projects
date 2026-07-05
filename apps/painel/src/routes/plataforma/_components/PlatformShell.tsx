// =============================================================================
// PlatformShell — layout raiz das telas de super-admin (§Shell + RN-401).
//
// Sidebar própria (Tenants, Termos, Billing, Macro) + PlatformGuard (403 sem
// claim platform_admin) + Outlet das telas. Container: liga sessão + router.
// A montagem de <Sidebar> e o guard são presentacionais/puros o suficiente
// para RTL cobrir o comportamento sem Firebase real (session mockada).
// =============================================================================

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Sidebar } from '@leela/design-system';
import type { SidebarItem, SidebarSection } from '@leela/design-system';
import type { Role } from '@leela/core';
import { PlatformGuard } from './PlatformGuard';
import { usePlatformSession } from '../_data/session';
import { PLATFORM_NAV, activeNavId } from '../_lib/nav';

export function PlatformShell(): JSX.Element {
  const session = usePlatformSession();
  const location = useLocation();
  const navigate = useNavigate();

  const ativo = activeNavId(location.pathname);

  const sections: SidebarSection[] = [
    {
      label: 'PLATAFORMA',
      items: PLATFORM_NAV.map((item): SidebarItem => {
        const base: SidebarItem = {
          id: item.id,
          label: item.label,
          icon: null,
          active: item.id === ativo,
        };
        if (item.badge !== undefined) base.badge = item.badge;
        if (item.href) {
          const href = item.href;
          base.onClick = () => navigate(href);
        }
        return base;
      }),
    },
  ];

  return (
    <AppShell sidebar={<Sidebar sections={sections} />}>
      <div className="flex-1 overflow-y-auto">
        <PlatformGuard status={session.status} isAdmin={session.isAdmin}>
          <Outlet context={{ isAdmin: session.isAdmin, uid: session.uid, role: session.role }} />
        </PlatformGuard>
      </div>
    </AppShell>
  );
}

PlatformShell.displayName = 'PlatformShell';

/** Contexto exposto às telas-filhas via Outlet (sessão do super-admin). */
export interface PlatformOutletContext {
  isAdmin: boolean;
  uid: string | null;
  role: Role | null;
}
