// =============================================================================
// AuthLayout — moldura das jornadas de conta NÃO autenticadas (LEELA-S020):
// login, cadastro e recuperação de senha. Diferente do RootShell (sidebar do
// app), esta é uma tela CHEIA, centrada, identidade DARK brasa (fundo
// `--surface-base`, o mesmo da sidebar) com o wordmark oficial da Leela no
// topo. Montada como layout route (pathless) em App.tsx; as páginas entram no
// `<Outlet/>`.
//
// ToastProvider próprio: as rotas de conta vivem FORA das subárvores que já
// montam o ToastProvider (Overview/Eventos/…). AppErrorBoundary fullscreen
// pega qualquer erro de render sem depender do shell.
// =============================================================================

import { Outlet } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { AppErrorBoundary } from '../../_system/AppErrorBoundary';

export function AuthLayout(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="fullscreen">
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--surface-base)] px-[var(--spacing-4)] py-[var(--spacing-8)]">
          <div className="flex w-full max-w-sm flex-col items-center gap-[var(--spacing-6)]">
            <img
              src="/leela-logo-brasa.svg"
              alt="Leela"
              className="h-[var(--sidebar-brand-mark-size)] w-auto"
            />
            <Outlet />
          </div>
        </main>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

AuthLayout.displayName = 'AuthLayout';
