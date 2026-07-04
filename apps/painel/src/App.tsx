import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HealthRoute } from './routes/health';
import { EventosRoutes } from './routes/eventos/EventosRoutes';
import { PlataformaRoutes } from './routes/plataforma/PlataformaRoutes';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-4 text-foreground">Leela Painel</div>} />
        <Route path="/health" element={<HealthRoute />} />
        {/* E03 · Operação do evento (hub, criação, layout + Overview) */}
        <Route path="/eventos/*" element={<EventosRoutes />} />
        {/* E16 · Plataforma & super-admin (tenants, termos, macro) */}
        <Route path="/plataforma/*" element={<PlataformaRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
