import { lazy, Suspense, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Skeleton } from '@leela/design-system';
import { HealthRoute } from './routes/health';
import { OverviewRoutes } from './routes/overview/OverviewRoutes';
import { rotasLegadas } from './routes/_system/RotasLegadas';
import { RootShell } from './shell/RootShell';
import { SuperficieDoPainel } from './shell/SuperficieDoPainel';
import { RequireSessao } from './routes/_system/RequireSessao';
import { ContaTravadaGate } from './routes/onboarding/ContaTravadaGate';
import { AuthLayout } from './routes/conta/auth/AuthLayout';
import { EntrarPage } from './routes/conta/auth/EntrarPage';
import { CadastrarPage } from './routes/conta/auth/CadastrarPage';
import { RecuperarSenhaPage } from './routes/conta/auth/RecuperarSenhaPage';
import { RedefinirSenhaPage } from './routes/conta/auth/RedefinirSenhaPage';
import { createQueryClient } from './lib/query/client';

// Code-split por área: cada rota pesada entra em chunk próprio.
// OverviewRoutes fica no bundle principal — é a primeira tela pós-login.
const EventosRoutes = lazy(() =>
  import('./routes/eventos/EventosRoutes').then((m) => ({ default: m.EventosRoutes }))
);
const ClubesRoutes = lazy(() =>
  import('./routes/clubes/ClubesRoutes').then((m) => ({ default: m.ClubesRoutes }))
);
const CrmRoutes = lazy(() =>
  import('./routes/crm/CrmRoutes').then((m) => ({ default: m.CrmRoutes }))
);
const ParceriasRoutes = lazy(() =>
  import('./routes/parcerias/ParceriasRoutes').then((m) => ({ default: m.ParceriasRoutes }))
);
const PlataformaRoutes = lazy(() =>
  import('./routes/plataforma/PlataformaRoutes').then((m) => ({ default: m.PlataformaRoutes }))
);
const ContaRoutes = lazy(() =>
  import('./routes/conta/perfil/ContaRoutes').then((m) => ({ default: m.ContaRoutes }))
);

/** Fallback de rota: esqueleto neutro enquanto o chunk da área carrega. */
function RotaSkeleton(): JSX.Element {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
      <Skeleton variant="rect" className="h-[var(--header-height)]" />
      <Skeleton variant="rect" className="h-[var(--subnav-height)]" />
      <Skeleton variant="rect" className="h-60" />
    </div>
  );
}

export function App() {
  // 1 QueryClient por instância do app. useState garante estabilidade entre
  // renders (não recria o cache a cada render — Dan Abramov, lazy initializer).
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Fiação da superfície (REDESIGN-DS · decisão do dono de 09/08):
            organizador = brasa com vidro LIGADO, administração da plataforma =
            vidro DESLIGADO sobre preto opaco. Mora aqui, e não no RootShell,
            porque o shell não cobre as jornadas de conta (AuthLayout) — e o
            <html> é um só. Renderiza nada; ver shell/SuperficieDoPainel. */}
        <SuperficieDoPainel />
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
              preserva o roteamento existente sem mudança de comportamento.
              RequireSessao (FIX-AUTHGUARD): em produção, sem sessão → /entrar
              com state.from; em modo Emulator (dev/preview mockado) é INERTE —
              o preview "já logado" continua caindo em `/` intacto. */}
          <Route
            path="/*"
            element={
              <RequireSessao>
                <RootShell>
                  {/* RN-510 (sucede a RN-416) — conta sem código Leela ENTRA,
                      em modo vitrine. A tranca de DADO continua sendo das
                      Rules (sem claim de tenant não há leitura); este gate é a
                      experiência: no lugar da árvore de rotas monta a
                      VitrinePainel, que não tem hook de dados nenhum — nenhuma
                      query tenant-scoped sai daqui. O aviso de boas-vindas
                      sobe na primeira interação. Conta com tenant e
                      administração da plataforma passam reto. */}
                  <ContaTravadaGate>
                    <Routes>
                      {/* E02 · Visão Geral do produtor (rota-raiz autenticada) */}
                      <Route path="/*" element={<OverviewRoutes />} />
                      <Route path="/health" element={<HealthRoute />} />
                      {/* E03 · Operação do evento (hub, criação, layout + Overview) */}
                      <Route path="/eventos/*" element={<Suspense fallback={<RotaSkeleton />}><EventosRoutes /></Suspense>} />
                      {/* E05 · Clubs (hub, shell + overview + membros) */}
                      <Route path="/clubes/*" element={<Suspense fallback={<RotaSkeleton />}><ClubesRoutes /></Suspense>} />
                      {/* RN-233 · área CRM: Visão geral | Clientes | Comunicação */}
                      <Route path="/crm/*" element={<Suspense fallback={<RotaSkeleton />}><CrmRoutes /></Suspense>} />
                      {/* D-1008-R17 · área Parcerias — sucede o módulo Marcas
                          (E10 · S811 seed · RN-171) no rail e absorve
                          assessorias parceiras + afiliações (migradas de
                          clubs). `/marcas` legado redireciona (tabela RN-234
                          abaixo). */}
                      <Route path="/parcerias/*" element={<Suspense fallback={<RotaSkeleton />}><ParceriasRoutes /></Suspense>} />
                      {/* RN-234 · o módulo `financeiro` deixou de existir; as URLs
                          antigas continuam abrindo, agora redirecionando para os
                          endereços novos. Link salvo e favorito seguem vivos. */}
                      {rotasLegadas()}
                      {/* E16 · Plataforma & super-admin (tenants, termos, macro) */}
                      <Route path="/plataforma/*" element={<Suspense fallback={<RotaSkeleton />}><PlataformaRoutes /></Suspense>} />
                      {/* S020-T4 · Configurações da conta do usuário logado (com shell) */}
                      <Route path="/conta/*" element={<Suspense fallback={<RotaSkeleton />}><ContaRoutes /></Suspense>} />
                    </Routes>
                  </ContaTravadaGate>
                </RootShell>
              </RequireSessao>
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
