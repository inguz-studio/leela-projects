// =============================================================================
// EventosRoutes — subárvore de rotas de `/eventos/*` (E03). Montada uma única
// vez em App.tsx (`/eventos/*`), o que confina TODO o roteamento de eventos
// aqui e mantém App.tsx com um só ponto de contato (baixo atrito entre os
// agentes que trabalham em outras superfícies em paralelo).
//
// ToastProvider é escopado a este módulo (feedback das telas de evento) para
// não exigir edição de main.tsx/App.tsx compartilhados.
//
// Rotas-filhas de `:slug` (inscritos, kits, entrega, financeiro) são dos lotes
// L4/L5 — quando existirem, entram como <Route> aqui sob EventoLayout.
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { HubRoute } from './hub/HubRoute';
import { NovoEventoRoute } from './novo/NovoEventoRoute';
import { EventoLayout } from './evento/EventoLayout';
import { OverviewPage } from './evento/overview/OverviewPage';

export function EventosRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <Routes>
        <Route index element={<HubRoute />} />
        <Route path="novo" element={<NovoEventoRoute />} />
        <Route path=":slug" element={<EventoLayout />}>
          <Route index element={<OverviewPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

EventosRoutes.displayName = 'EventosRoutes';
