// =============================================================================
// PlatformShell — guard + contexto das telas de super-admin (§Shell + RN-401).
//
// A moldura (AppShell + Sidebar de plataforma) agora é do layout RAIZ
// (shell/RootShell + shell/sidebar, Lote B3) — aqui fica o que é do domínio:
// PlatformGuard (403 sem claim platform_admin) + Outlet com a sessão.
// Container: liga sessão + router; RTL cobre o comportamento sem Firebase
// real (session mockada).
// =============================================================================

import { Outlet } from 'react-router-dom';
import type { Role } from '@leela/core';
import { PlatformGuard } from './PlatformGuard';
import { usePlatformSession } from '../_data/session';

export function PlatformShell(): JSX.Element {
  const session = usePlatformSession();

  return (
    <PlatformGuard status={session.status} isAdmin={session.isAdmin}>
      <Outlet context={{ isAdmin: session.isAdmin, uid: session.uid, role: session.role }} />
    </PlatformGuard>
  );
}

PlatformShell.displayName = 'PlatformShell';

/** Contexto exposto às telas-filhas via Outlet (sessão do super-admin). */
export interface PlatformOutletContext {
  isAdmin: boolean;
  uid: string | null;
  role: Role | null;
}
