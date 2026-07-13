import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HealthRoute } from './routes/health';
import { OverviewRoutes } from './routes/overview/OverviewRoutes';
import { EventosRoutes } from './routes/eventos/EventosRoutes';
import { ClubesRoutes } from './routes/clubes/ClubesRoutes';
import { FinanceiroRoutes } from './routes/financeiro/FinanceiroRoutes';
import { PlataformaRoutes } from './routes/plataforma/PlataformaRoutes';
import { RootShell } from './shell/RootShell';
import { AuthLayout } from './routes/conta/auth/AuthLayout';
import { EntrarPage } from './routes/conta/auth/EntrarPage';
import { CadastrarPage } from './routes/conta/auth/CadastrarPage';
import { RecuperarSenhaPage } from './routes/conta/auth/RecuperarSenhaPage';
import { RedefinirSenhaPage } from './routes/conta/auth/RedefinirSenhaPage';
import { createQueryClient } from './lib/query/client';

export function App() {
  // 1 QueryClient por instância do app. useState garante estabilidade entre
  // renders (não recria o cache a cada render — Dan Abramov, lazy initializer).
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* S020 · jornadas de conta SEM shell (tela cheia, dark brasa,
              centrada). Layout route pathless — as páginas entram no Outlet do
              AuthLayout. As rotas são ADITIVAS: o preview mockado ("já logado")
              continua caindo em `/` (branch com shell) intacto. */}
          <Route element={<AuthLayout />}>
            <Route path="/entrar" element={<EntrarPage />} />
            <Route path="/cadastrar" element={<CadastrarPage />} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
          </Route>
          {/* App autenticado — moldura padrão (Lote B3): sidebar fixa em TODAS
              as rotas (item 18 do DoD). Descendant Routes (pathnameBase `/`)
              preserva o roteamento existente sem mudança de comportamento. */}
          <Route
            path="/*"
            element={
              <RootShell>
                <Routes>
                  {/* E02 · Visão Geral do produtor (rota-raiz autenticada) */}
                  <Route path="/*" element={<OverviewRoutes />} />
                  <Route path="/health" element={<HealthRoute />} />
                  {/* E03 · Operação do evento (hub, criação, layout + Overview) */}
                  <Route path="/eventos/*" element={<EventosRoutes />} />
                  {/* E05 · Clubs (hub, shell + overview + membros) */}
                  <Route path="/clubes/*" element={<ClubesRoutes />} />
                  {/* E09-slim · Repasses do organizador (saldo, dados bancários, saque) */}
                  <Route path="/financeiro/*" element={<FinanceiroRoutes />} />
                  {/* E16 · Plataforma & super-admin (tenants, termos, macro) */}
                  <Route path="/plataforma/*" element={<PlataformaRoutes />} />
                </Routes>
              </RootShell>
            }
          />
        </Routes>
      </BrowserRouter>
      {/* Devtools: tree-shaken em produção (o próprio pacote vira no-op no
          build de prod). Só aparece no dev/preview. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
