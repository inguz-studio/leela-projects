// =============================================================================
// OverviewRoutes — subárvore de rotas da Visão Geral (E02), montada em App.tsx
// como rota-raiz autenticada do painel (`/`). Traduz o grupo `(overview)` da
// spec (Next App Router) para a rota-raiz Vite/React-Router (decisão nº 1 da
// Onda 1). ToastProvider escopado para o feedback das ações rápidas.
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { OverviewPage } from './OverviewPage';

export function OverviewRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <Routes>
        <Route index element={<OverviewPage />} />
      </Routes>
    </ToastProvider>
  );
}

OverviewRoutes.displayName = 'OverviewRoutes';
