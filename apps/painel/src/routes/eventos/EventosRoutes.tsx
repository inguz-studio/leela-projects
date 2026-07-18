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
import { InscritosPage } from './inscritos/InscritosPage';
import { BalcaoPage } from './entrega/BalcaoPage';
import { GaleriaEstados } from './entrega/estados/GaleriaEstados';
import { KitsLayout } from './kits/KitsLayout';
import { KitsCadastroPage } from './kits/KitsCadastroPage';
import { DistribuicaoPage } from './kits/DistribuicaoPage';
import { EstoquePage } from './kits/EstoquePage';
import { KitEditorPage } from './kits/KitEditorPage';
import { LotesPage } from './lotes/LotesPage';
import { AfiliadosPage } from './afiliados/AfiliadosPage';
import { PaginaVendasPage } from './pagina-vendas/PaginaVendasPage';
import { ComunicacaoPage } from './comunicacao/ComunicacaoPage';
import { CampanhaEditorPage } from './comunicacao/CampanhaEditorPage';
import { AutomacoesPage } from './comunicacao/AutomacoesPage';
import { FinanceiroLayout } from './financeiro/FinanceiroLayout';
import { FinanceiroPage } from './financeiro/FinanceiroPage';
import { ReembolsosPage } from './financeiro/ReembolsosPage';
import { ConfiguracoesLayout } from './configuracoes/ConfiguracoesLayout';
import { ConfigGeraisPage } from './configuracoes/ConfigGeraisPage';
import { PoliticaVendasPage } from './configuracoes/PoliticaVendasPage';
import { SaudeRegulamentoPage } from './configuracoes/SaudeRegulamentoPage';
import { EquipePage } from './configuracoes/equipe/EquipePage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';
import { RequirePapel } from '../_system/RequirePapel';

export function EventosRoutes(): JSX.Element {
  return (
    <ToastProvider>
      {/* Boundary de segmento (mantém o RootShell) — 500 no shell. E07 · S502-T1. */}
      <AppErrorBoundary layout="shell">
      <Routes>
        <Route index element={<HubRoute />} />
        <Route path="novo" element={<NovoEventoRoute />} />
        <Route path=":slug" element={<EventoLayout />}>
          <Route index element={<OverviewPage />} />
          {/* Rotas de ÁREA guardadas pela matriz de papéis (RN-320 · E04-S304):
              papel que não acessa a área → 403 no shell (RequirePapel). E07·T6. */}
          <Route
            path="inscritos"
            element={
              <RequirePapel area="inscritos">
                <InscritosPage />
              </RequirePapel>
            }
          />
          <Route
            path="entrega"
            element={
              <RequirePapel area="entrega">
                <BalcaoPage />
              </RequirePapel>
            }
          />
          <Route
            path="entrega/estados"
            element={
              <RequirePapel area="entrega">
                <GaleriaEstados />
              </RequirePapel>
            }
          />
          <Route path="kits" element={<KitsLayout />}>
            <Route index element={<KitsCadastroPage />} />
            <Route path="distribuicao" element={<DistribuicaoPage />} />
            <Route path="estoque" element={<EstoquePage />} />
          </Route>
          {/* Editor de kit em tela cheia (RN-217, 2 pontos de entrada) — fora da sub-nav de Kits */}
          <Route path="kits/novo" element={<KitEditorPage />} />
          <Route path="kits/editar/:kitId" element={<KitEditorPage />} />
          {/* Config de lotes por modalidade (E04 · S300 · ADR-012) */}
          <Route path="lotes" element={<LotesPage />} />
          {/* Editor de conteúdo da página de vendas (E04 · S300-T3) */}
          <Route
            path="pagina-vendas"
            element={
              <RequirePapel area="pagina_vendas">
                <PaginaVendasPage />
              </RequirePapel>
            }
          />
          {/* Aba Comunicação — campanhas (S401-T2) + histórico FABLE-G (E06 · L3) */}
          <Route
            path="comunicacao"
            element={
              <RequirePapel area="comunicacao">
                <ComunicacaoPage />
              </RequirePapel>
            }
          />
          {/* Editor "Nova campanha" em tela cheia (S401-T3) — entra pela lista */}
          <Route
            path="comunicacao/nova"
            element={
              <RequirePapel area="comunicacao">
                <CampanhaEditorPage />
              </RequirePapel>
            }
          />
          {/* Automações por gatilho (S402 · E06) — CRUD/toggle */}
          <Route
            path="comunicacao/automacoes"
            element={
              <RequirePapel area="comunicacao">
                <AutomacoesPage />
              </RequirePapel>
            }
          />
          {/* Afiliados/influenciadores do evento (R9-E · S-R9-11-T4 · E08
              antecipado): lista + modal RN-317. Reader server-side exige
              tenant writer (RN-319) — sem célula própria na matriz de papéis
              de evento; papel sem claim de escrita recebe erro do reader. */}
          <Route path="afiliados" element={<AfiliadosPage />} />
          <Route
            path="financeiro"
            element={
              <RequirePapel area="financeiro">
                <FinanceiroLayout />
              </RequirePapel>
            }
          >
            <Route index element={<FinanceiroPage />} />
            <Route path="reembolsos" element={<ReembolsosPage />} />
          </Route>
          {/* Configurações gerais + Equipe & permissões (E04 · S304-T2/T3).
              area="configuracoes" cobre o subtree (equipe tem o MESMO veredito
              na matriz p/ os 4 papéis). */}
          <Route
            path="configuracoes"
            element={
              <RequirePapel area="configuracoes">
                <ConfiguracoesLayout />
              </RequirePapel>
            }
          >
            <Route index element={<ConfigGeraisPage />} />
            <Route path="politica" element={<PoliticaVendasPage />} />
            <Route path="saude" element={<SaudeRegulamentoPage />} />
            <Route path="equipe" element={<EquipePage />} />
          </Route>
          {/* Aba inexistente sob um evento válido → 404 dentro do shell do evento. */}
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Caminho de eventos sem rota (fora de :slug) → 404 no shell. S500-T2. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

EventosRoutes.displayName = 'EventosRoutes';
