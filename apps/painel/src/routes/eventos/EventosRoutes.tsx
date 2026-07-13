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
import { PaginaVendasPage } from './pagina-vendas/PaginaVendasPage';
import { ComunicacaoPage } from './comunicacao/ComunicacaoPage';
import { FinanceiroPage } from './financeiro/FinanceiroPage';
import { ConfiguracoesLayout } from './configuracoes/ConfiguracoesLayout';
import { ConfigGeraisPage } from './configuracoes/ConfigGeraisPage';

export function EventosRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <Routes>
        <Route index element={<HubRoute />} />
        <Route path="novo" element={<NovoEventoRoute />} />
        <Route path=":slug" element={<EventoLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="inscritos" element={<InscritosPage />} />
          <Route path="entrega" element={<BalcaoPage />} />
          <Route path="entrega/estados" element={<GaleriaEstados />} />
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
          <Route path="pagina-vendas" element={<PaginaVendasPage />} />
          {/* Aba Comunicação — log FABLE-G + envio futuro (E06 · L3) */}
          <Route path="comunicacao" element={<ComunicacaoPage />} />
          <Route path="financeiro" element={<FinanceiroPage />} />
          {/* Configurações gerais + Equipe & permissões (E04 · S304-T2/T3) */}
          <Route path="configuracoes" element={<ConfiguracoesLayout />}>
            <Route index element={<ConfigGeraisPage />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
}

EventosRoutes.displayName = 'EventosRoutes';
