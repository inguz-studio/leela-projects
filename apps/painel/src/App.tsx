import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HealthRoute } from './routes/health';
import { OverviewRoutes } from './routes/overview/OverviewRoutes';
import { EventosRoutes } from './routes/eventos/EventosRoutes';
import { ClubesRoutes } from './routes/clubes/ClubesRoutes';
import { PlataformaRoutes } from './routes/plataforma/PlataformaRoutes';
import { RootShell } from './shell/RootShell';

export function App() {
  return (
    <BrowserRouter>
      {/* Shell padrão no layout RAIZ (Lote B3): sidebar fixa em TODAS as
          rotas — item 18 do DoD. Montagens locais de AppShell foram removidas
          de OverviewShell/PlatformShell. */}
      <RootShell>
        <Routes>
          {/* E02 · Visão Geral do produtor (rota-raiz autenticada) */}
          <Route path="/*" element={<OverviewRoutes />} />
          <Route path="/health" element={<HealthRoute />} />
          {/* E03 · Operação do evento (hub, criação, layout + Overview) */}
          <Route path="/eventos/*" element={<EventosRoutes />} />
          {/* E05 · Clubs (hub, shell + overview + membros) */}
          <Route path="/clubes/*" element={<ClubesRoutes />} />
          {/* E16 · Plataforma & super-admin (tenants, termos, macro) */}
          <Route path="/plataforma/*" element={<PlataformaRoutes />} />
        </Routes>
      </RootShell>
    </BrowserRouter>
  );
}
