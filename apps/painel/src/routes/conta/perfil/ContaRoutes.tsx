// =============================================================================
// ContaRoutes — subárvore de `/conta/*` (LEELA-S020-T4), montada em App.tsx
// DENTRO do RootShell (a tela de conta mantém a sidebar). Espelha o padrão dos
// demais módulos de rota: ToastProvider escopado (feedback de salvar nome /
// trocar senha) + AppErrorBoundary de segmento (500 sem perder o shell).
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { ContaPage } from './ContaPage';
import { RecebimentoSection } from '../recebimento/RecebimentoSection';
import { PerfilPublicoEditorPage } from '../perfil-publico/PerfilPublicoEditorPage';
import { NotFound } from '../../_system/NotFound';
import { AppErrorBoundary } from '../../_system/AppErrorBoundary';

export function ContaRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          {/* RN-366 · IAM-T5: os Dados de recebimento entram por COMPOSIÇÃO.
              A `ContaPage` segue sem dependência de react-query; quem carrega
              o container de dados é a rota. */}
          <Route index element={<ContaPage recebimento={<RecebimentoSection />} />} />
          {/* DN-1-T1 · editor de perfil público / link-in-bio do organizador */}
          <Route path="perfil-publico" element={<PerfilPublicoEditorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

ContaRoutes.displayName = 'ContaRoutes';
