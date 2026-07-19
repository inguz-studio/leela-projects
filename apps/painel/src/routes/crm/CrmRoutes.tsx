// =============================================================================
// CrmRoutes — subárvore `/crm/*` (E19 · S-R9-13). Hub "Clientes & Comunicação"
// no menu principal (item `comunicacao` da sidebar deixa de ser placeholder).
// Montada uma única vez em App.tsx, confinando o roteamento do CRM aqui (baixo
// atrito entre agentes). ToastProvider escopado ao módulo; AppErrorBoundary
// mantém o RootShell no 500.
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { ClientesPage } from './ClientesPage';
import { ClienteDetailPage } from './ClienteDetailPage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function CrmRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route index element={<ClientesPage />} />
          <Route path=":clienteKey" element={<ClienteDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

CrmRoutes.displayName = 'CrmRoutes';
