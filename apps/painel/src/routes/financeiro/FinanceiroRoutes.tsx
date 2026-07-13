// =============================================================================
// FinanceiroRoutes — subárvore de `/financeiro/*` (E09-slim · repasse do
// organizador). Montada uma única vez em App.tsx (`/financeiro/*`), confinando
// TODO o roteamento de repasses aqui — App.tsx mantém um só ponto de contato
// (baixo atrito com os agentes que tocam outras superfícies em paralelo).
//
// ToastProvider escopado ao módulo (feedback das ações de repasse — salvar
// dados/solicitar saque). AppErrorBoundary de segmento mantém o RootShell (500
// no shell, padrão E07). `/financeiro` → `/financeiro/repasses` (a única tela
// do organizador nesta onda; o back-office admin vive em `/plataforma/repasses`).
// =============================================================================

import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { RepassesPage } from './repasses/RepassesPage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function FinanceiroRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route index element={<Navigate to="repasses" replace />} />
          <Route path="repasses" element={<RepassesPage />} />
          {/* Caminho de financeiro sem rota → 404 no shell. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

FinanceiroRoutes.displayName = 'FinanceiroRoutes';
