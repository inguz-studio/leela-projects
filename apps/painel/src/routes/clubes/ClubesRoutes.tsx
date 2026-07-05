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
import { NovoClubePage } from './novo/NovoClubePage';
import { ClubeLayout } from './clube/ClubeLayout';
import { OverviewPage } from './clube/overview/OverviewPage';
import { MembrosPage } from './clube/membros/MembrosPage';
import { DesafiosPage } from './clube/desafios/DesafiosPage';
import { DesafioEditorPage } from './clube/desafios/DesafioEditorPage';
import { ParceriasPage } from './clube/parcerias/ParceriasPage';
import { ComunicadosPage } from './clube/comunicacao/ComunicadosPage';
import { ComunicadoEditorPage } from './clube/comunicacao/ComunicadoEditorPage';
import { ConfiguracoesPage } from './clube/configuracoes/ConfiguracoesPage';

export function ClubesRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <Routes>
        <Route index element={<HubRoute />} />
        {/* Rota estática ANTES do coringa :slug (fix #14 — o CTA do hub caía
            no :slug e renderizava "Clube não encontrado"). */}
        <Route path="novo" element={<NovoClubePage />} />
        <Route path=":slug" element={<ClubeLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="membros" element={<MembrosPage />} />
          <Route path="desafios" element={<DesafiosPage />} />
          <Route path="desafios/novo" element={<DesafioEditorPage />} />
          <Route path="parcerias" element={<ParceriasPage />} />
          <Route path="comunicacao" element={<ComunicadosPage />} />
          <Route path="comunicacao/nova" element={<ComunicadoEditorPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

ClubesRoutes.displayName = 'ClubesRoutes';
