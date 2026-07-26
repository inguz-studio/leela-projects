// =============================================================================
// FinanceiroRoutes — subárvore de `/financeiro/*`. Montada uma única vez em
// App.tsx (`/financeiro/*`), confinando TODO o roteamento aqui — App.tsx mantém
// um só ponto de contato (baixo atrito com os agentes em paralelo).
//
// Redefinição (RN-820, Vitor 2026-07-13): a entrada "Financeiro" do menu vira
// ANÁLISE de vendas — a rota ÍNDICE `/financeiro` é a análise; os repasses do
// organizador (RN-349) seguem em `/financeiro/repasses`. Um FinanceiroLayout com
// SubNav (Análise | Repasses) envolve as duas telas (padrão §2.14). O back-office
// admin de repasses continua separado em `/plataforma/repasses`.
//
// ToastProvider escopado ao módulo (feedback das ações de repasse — salvar
// dados/solicitar saque). AppErrorBoundary de segmento mantém o RootShell (500
// no shell, padrão E07).
// =============================================================================

import { Outlet, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
// IAM-T2: a tela migrou para `routes/crm/visao-geral/`. Este módulo inteiro é
// deletado no IAM-T6 (que instala os redirects da RN-234); até lá `/financeiro`
// segue respondendo, agora servindo a tela do endereço novo — nenhuma janela
// em que a URL legada quebra.
import { AnaliseVendasPage } from '../crm/visao-geral/AnaliseVendasPage';
import { RepassesPage } from '../eventos/repasses/RepassesPage';
import { FinanceiroSubNav } from './_components/FinanceiroSubNav';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

/** Moldura com a SubNav (Análise | Repasses) sobre o conteúdo da seção. */
function FinanceiroLayout(): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <FinanceiroSubNav />
      <Outlet />
    </div>
  );
}

export function FinanceiroRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route element={<FinanceiroLayout />}>
            {/* Índice `/financeiro` → análise de vendas (RN-820). */}
            <Route index element={<AnaliseVendasPage />} />
            {/* Repasses do organizador (RN-349). */}
            <Route path="repasses" element={<RepassesPage />} />
            {/* Caminho de financeiro sem rota → 404 no shell. */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

FinanceiroRoutes.displayName = 'FinanceiroRoutes';
