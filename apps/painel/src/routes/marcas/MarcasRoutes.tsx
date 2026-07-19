// =============================================================================
// MarcasRoutes — subárvore `/marcas/*` (E10 · S811 seed · RN-171). Módulo
// "Marcas" no menu principal (item `marcas` da sidebar deixa de ser inerte).
// Montada uma única vez em App.tsx, confinando o roteamento aqui (baixo atrito
// entre agentes, espelho de CrmRoutes). ToastProvider escopado ao módulo;
// AppErrorBoundary mantém o RootShell no 500.
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { MarcasPage } from './MarcasPage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function MarcasRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route index element={<MarcasPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

MarcasRoutes.displayName = 'MarcasRoutes';
