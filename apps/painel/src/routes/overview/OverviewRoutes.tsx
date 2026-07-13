// =============================================================================
// OverviewRoutes — subárvore de rotas da Visão Geral (E02), montada em App.tsx
// como rota-raiz autenticada do painel (`/`). Traduz o grupo `(overview)` da
// spec (Next App Router) para a rota-raiz Vite/React-Router (decisão nº 1 da
// Onda 1). ToastProvider escopado para o feedback das ações rápidas.
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { OverviewPage } from './OverviewPage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function OverviewRoutes(): JSX.Element {
  return (
    <ToastProvider>
      {/* Boundary de segmento (mantém o RootShell) — 500 no shell. E07 · S502-T1. */}
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route index element={<OverviewPage />} />
          {/* 404 dentro do shell — captura qualquer caminho raiz sem rota
              (App.tsx monta OverviewRoutes em `/*`, greedy). LEELA-E07 · S500-T2. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

OverviewRoutes.displayName = 'OverviewRoutes';
