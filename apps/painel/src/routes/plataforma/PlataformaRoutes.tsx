// =============================================================================
// PlataformaRoutes — subárvore `/plataforma/*` (E16 · super-admin). Montada uma
// única vez em App.tsx, o que confina TODO o roteamento de plataforma aqui e
// mantém App.tsx com um só ponto de contato (baixo atrito entre os 4 agentes
// em paralelo).
//
// PlatformShell provê a sidebar própria + o guard de platform_admin (403).
// ToastProvider é escopado a este módulo (feedback das ações de plataforma).
//
// Rotas de tenant (detalhe, termos) e macro entram como <Route> aqui conforme
// os lotes S1601-T4 / S1602-T2 / S1605-T3.
// =============================================================================

import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { PlatformShell } from './_components/PlatformShell';
import { TenantsListRoute } from './tenants/TenantsListRoute';
import { TenantDetailRoute } from './tenants/TenantDetailRoute';
import { TermsEditorRoute } from './tenants/termos/TermsEditorRoute';
import { MacroDashboardRoute } from './macro/MacroDashboardRoute';
import { RepassesAdminRoute } from './repasses/RepassesAdminRoute';
import { PlanosRoute } from './planos/PlanosRoute';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function PlataformaRoutes(): JSX.Element {
  return (
    <ToastProvider>
      {/* Boundary de segmento (mantém o PlatformShell) — 500 no shell. E07 · S502-T1. */}
      <AppErrorBoundary layout="shell">
      <Routes>
        <Route element={<PlatformShell />}>
          <Route index element={<Navigate to="tenants" replace />} />
          <Route path="tenants" element={<TenantsListRoute />} />
          <Route path="tenants/:tenantId" element={<TenantDetailRoute />} />
          <Route path="tenants/:tenantId/termos" element={<TermsEditorRoute />} />
          <Route path="planos" element={<PlanosRoute />} />
          <Route path="repasses" element={<RepassesAdminRoute />} />
          <Route path="macro" element={<MacroDashboardRoute />} />
          {/* 404 dentro do PlatformShell (sidebar de plataforma preservada). S500-T2. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

PlataformaRoutes.displayName = 'PlataformaRoutes';
