import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HealthRoute } from './routes/health';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-4 text-foreground">Leela Painel</div>} />
        <Route path="/health" element={<HealthRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
