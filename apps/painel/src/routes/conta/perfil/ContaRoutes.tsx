// =============================================================================
// ContaRoutes — subárvore de `/conta/*` (LEELA-S020-T4), montada em App.tsx
// DENTRO do RootShell (a tela de conta mantém a sidebar). Espelha o padrão dos
// demais módulos de rota: ToastProvider escopado (feedback de salvar nome /
// trocar senha) + AppErrorBoundary de segmento (500 sem perder o shell).
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { ContaPage } from './ContaPage';
import { NotFound } from '../../_system/NotFound';
import { AppErrorBoundary } from '../../_system/AppErrorBoundary';

export function ContaRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route index element={<ContaPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

ContaRoutes.displayName = 'ContaRoutes';
