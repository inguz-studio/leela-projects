// =============================================================================
// ClubesRoutes — subárvore de rotas de `/clubes/*` (E05). Montada uma única vez
// em App.tsx (`/clubes/*`), confinando TODO o roteamento de clubes aqui e
// mantendo App.tsx com um só ponto de contato (baixo atrito entre agentes que
// trabalham em superfícies distintas em paralelo).
//
// ToastProvider é escopado a este módulo (feedback das telas de clube) para não
// exigir edição de main.tsx/App.tsx compartilhados.
//
// D-1008-R17: a área de clubs ficou com o que é COMUNIDADE (hub + engajamento).
// Assessorias parceiras e afiliações/influenciadores migraram para a área
// Parcerias ("faz mas sentido do que deixar em clubs" — dono). As rotas
// antigas NÃO morrem (RN-234): viram redirects SPA, declarados AQUI porque
// precisam de precedência sobre o coringa `:slug` — fora daqui, um link salvo
// de `/clubes/assessorias` cairia no detalhe de club e renderizaria "Club não
// encontrado" (a MESMA armadilha do fix #14).
// =============================================================================

import { Route, Routes, useParams } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { ClubesAreaLayout } from './ClubesAreaLayout';
import { HubRoute } from './hub/HubRoute';
import { NovoClubePage } from './novo/NovoClubePage';
import { EngajamentoPage } from './engajamento/EngajamentoPage';
import { ClubeLayout } from './clube/ClubeLayout';
import { OverviewPage } from './clube/overview/OverviewPage';
import { MembrosPage } from './clube/membros/MembrosPage';
import { DesafiosPage } from './clube/desafios/DesafiosPage';
import { DesafioEditorPage } from './clube/desafios/DesafioEditorPage';
import { ParceriasPage } from './clube/parcerias/ParceriasPage';
import { ComunicadosPage } from './clube/comunicacao/ComunicadosPage';
import { ComunicadoEditorPage } from './clube/comunicacao/ComunicadoEditorPage';
import { ConfiguracoesPage } from './clube/configuracoes/ConfiguracoesPage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';
import { RedirectLegado } from '../_system/RotasLegadas';

/**
 * Redirect legado do detalhe de assessoria (D-1008-R17): o destino depende do
 * `:parceriaId` da URL, que só existe dentro desta subárvore — mesmo motivo do
 * `/crm/:clienteKey` viver no CrmRoutes. Preserva querystring e fragmento
 * (contrato do RedirectLegado, achado A-3).
 */
function RedirectParceriaLegada(): JSX.Element {
  const { parceriaId } = useParams<{ parceriaId: string }>();
  return (
    <RedirectLegado para={`/parcerias/assessorias/${encodeURIComponent(parceriaId ?? '')}`} />
  );
}

export function ClubesRoutes(): JSX.Element {
  return (
    <ToastProvider>
      {/* Boundary de segmento (mantém o RootShell) — 500 no shell. E07 · S502-T1. */}
      <AppErrorBoundary layout="shell">
      <Routes>
        {/* MOLDURA da área (D-1008-R16): o layout route é o único dono do menu
            secundário — toda aba da área o herda, com a ativa derivada do
            pathname. Menu colado página a página foi a causa das abas órfãs. */}
        <Route element={<ClubesAreaLayout />}>
          <Route index element={<HubRoute />} />
          {/* Engajamento (REDESIGN-DS): a análise da comunidade inteira,
              cross-club. Vive na área Clubs porque a análise mora com o
              assunto — a mesma razão que levou a análise de vendas para dentro
              do CRM (RN-823). Rota ESTÁTICA antes do coringa `:slug`, senão
              "engajamento" cairia no detalhe de club e renderizaria "Club não
              encontrado". */}
          <Route path="engajamento" element={<EngajamentoPage />} />
        </Route>
        {/* FORA da moldura por design (veredito R16, afirmado em teste): fluxo
            de criação em tela cheia com retorno próprio — precedente
            `/eventos/novo`. Rota estática ANTES do coringa :slug (fix #14). */}
        <Route path="novo" element={<NovoClubePage />} />
        {/* Redirects legados da migração para Parcerias (D-1008-R17 · RN-234):
            estáticos ANTES do :slug, senão o link salvo cai em "Club não
            encontrado". `replace` — o Voltar não devolve à URL morta. */}
        <Route path="assessorias" element={<RedirectLegado para="/parcerias/assessorias" />} />
        <Route
          path="assessorias/nova"
          element={<RedirectLegado para="/parcerias/assessorias/nova" />}
        />
        <Route path="assessorias/:parceriaId" element={<RedirectParceriaLegada />} />
        <Route path="influenciadores" element={<RedirectLegado para="/parcerias/afiliacoes" />} />
        <Route
          path="minhas-afiliacoes"
          element={<RedirectLegado para="/parcerias/afiliacoes/minhas" />}
        />
        <Route path=":slug" element={<ClubeLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="membros" element={<MembrosPage />} />
          <Route path="desafios" element={<DesafiosPage />} />
          <Route path="desafios/novo" element={<DesafioEditorPage />} />
          <Route path="parcerias" element={<ParceriasPage />} />
          <Route path="comunicacao" element={<ComunicadosPage />} />
          <Route path="comunicacao/nova" element={<ComunicadoEditorPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
          {/* Aba inexistente sob um clube válido → 404 dentro do shell do clube. */}
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Caminho de clubes sem rota (fora de :slug) → 404 no shell. S500-T2. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

ClubesRoutes.displayName = 'ClubesRoutes';
