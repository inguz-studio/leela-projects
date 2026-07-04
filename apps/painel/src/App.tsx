import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HealthRoute } from './routes/health';
import { EventosRoutes } from './routes/eventos/EventosRoutes';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-4 text-foreground">Leela Painel</div>} />
        <Route path="/health" element={<HealthRoute />} />
        {/* E03 · Operação do evento (hub, criação, layout + Overview) */}
        <Route path="/eventos/*" element={<EventosRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
