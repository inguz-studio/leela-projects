// =============================================================================
// ClubesRoutes — subárvore de rotas de `/clubes/*` (E05). Montada uma única vez
// em App.tsx (`/clubes/*`), confinando TODO o roteamento de clubes aqui e
// mantendo App.tsx com um só ponto de contato (baixo atrito entre agentes que
// trabalham em superfícies distintas em paralelo).
//
// ToastProvider é escopado a este módulo (feedback das telas de clube) para não
// exigir edição de main.tsx/App.tsx compartilhados.
//
// As rotas de `:slug` (shell + overview + membros) entram nos commits seguintes
// deste lote; as abas de desafios/parcerias/comunicação/configurações vêm dos
// lotes L4/L5.
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { HubRoute } from './hub/HubRoute';

export function ClubesRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <Routes>
        <Route index element={<HubRoute />} />
      </Routes>
    </ToastProvider>
  );
}

ClubesRoutes.displayName = 'ClubesRoutes';
