// =============================================================================
// PlatformShell — layout raiz das telas de super-admin (§Shell + RN-401).
//
// Sidebar própria (Tenants, Termos, Billing, Macro) + PlatformGuard (403 sem
// claim platform_admin) + Outlet das telas. Container: liga sessão + router.
// A montagem de <Sidebar> e o guard são presentacionais/puros o suficiente
// para RTL cobrir o comportamento sem Firebase real (session mockada).
// =============================================================================

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, CreditCard, FileText, Gauge, type LucideIcon } from 'lucide-react';
import { AppShell, Sidebar, sidebarNavIcon } from '@leela/design-system';
import type { SidebarItem, SidebarSection } from '@leela/design-system';
import type { Role } from '@leela/core';
import { PlatformGuard } from './PlatformGuard';
import { usePlatformSession } from '../_data/session';
import { PLATFORM_NAV, activeNavId } from '../_lib/nav';

/** Ícone Lucide por item da nav de plataforma (a nav do super-admin é própria —
 *  fora da tabela do doc de IA do painel, que cobre só os 8 itens do produtor). */
const PLATFORM_NAV_ICONS: Record<string, LucideIcon> = {
  tenants: Building2,
  termos: FileText,
  billing: CreditCard,
  macro: Gauge,
};

export function PlatformShell(): JSX.Element {
  const session = usePlatformSession();
  const location = useLocation();
  const navigate = useNavigate();

  const ativo = activeNavId(location.pathname);

  const sections: SidebarSection[] = [
    {
      label: 'PLATAFORMA',
      items: PLATFORM_NAV.map((item): SidebarItem => {
        const Icon = PLATFORM_NAV_ICONS[item.id];
        const base: SidebarItem = {
          id: item.id,
          label: item.label,
          icon: Icon ? sidebarNavIcon(Icon) : undefined,
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
