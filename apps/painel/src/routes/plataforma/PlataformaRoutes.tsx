// =============================================================================
// PlataformaRoutes — subárvore `/plataforma/*` (E16 · super-admin). Montada uma
// única vez em App.tsx, o que confina TODO o roteamento de plataforma aqui e
// mantém App.tsx com um só ponto de contato (baixo atrito entre os 4 agentes
// em paralelo).
//
// PlatformShell provê a sidebar própria + o guard de platform_admin (403).
// ToastProvider é escopado a este módulo (feedback das ações de plataforma).
//
// Rotas de tenant (detalhe, termos) e macro entram como <Route> aqui conforme
// os lotes S1601-T4 / S1602-T2 / S1605-T3.
// =============================================================================

import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { PlatformShell } from './_components/PlatformShell';
import { TenantsListRoute } from './tenants/TenantsListRoute';
import { TenantDetailRoute } from './tenants/TenantDetailRoute';
import { TenantFichaLayout } from './tenants/TenantFichaLayout';
import { TermsEditorRoute } from './tenants/termos/TermsEditorRoute';
import { EventosTabRoute } from './tenants/EventosTabRoute';
import { ClubsTabRoute } from './tenants/ClubsTabRoute';
import { VendasTabRoute } from './tenants/VendasTabRoute';
import { FinanceiroTabRoute } from './tenants/FinanceiroTabRoute';
import { ContasRoute } from './contas/ContasRoute';
import { MacroDashboardRoute } from './macro/MacroDashboardRoute';
import { RepassesAdminRoute } from './repasses/RepassesAdminRoute';
import { EstornosAdminRoute } from './estornos/EstornosAdminRoute';
import { PlanosRoute } from './planos/PlanosRoute';
import { ConvitesRoute } from './convites/ConvitesRoute';
import { EventosGlobaisRoute } from './eventos/EventosGlobaisRoute';
import { ClubsGlobaisRoute } from './clubs/ClubsGlobaisRoute';
import { TaxaGlobalRoute } from './taxa/TaxaGlobalRoute';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function PlataformaRoutes(): JSX.Element {
  return (
    <ToastProvider>
      {/* Boundary de segmento (mantém o PlatformShell) — 500 no shell. E07 · S502-T1. */}
      <AppErrorBoundary layout="shell">
      <Routes>
        <Route element={<PlatformShell />}>
          <Route index element={<Navigate to="tenants" replace />} />
          <Route path="tenants" element={<TenantsListRoute />} />
          {/* ADMIN-VISAO onda 2 · S1612-T1: a ficha do tenant vira UMA rota com
              abas (03-spec.md · Parte 1). O Resumo continua sendo a rota índice
              e a tela dele não foi tocada; Termos já existia e entra na barra
              como filha, sem mudar por dentro. */}
          <Route path="tenants/:tenantId" element={<TenantFichaLayout />}>
            <Route index element={<TenantDetailRoute />} />
            {/* Onda 3 · S1612-T3/T4: o que a produtora produz. */}
            <Route path="eventos" element={<EventosTabRoute />} />
            <Route path="clubs" element={<ClubsTabRoute />} />
            {/* Onda 2 · S1613-T2/T4/T5: a economia dela. */}
            <Route path="vendas" element={<VendasTabRoute />} />
            <Route path="financeiro" element={<FinanceiroTabRoute />} />
            <Route path="termos" element={<TermsEditorRoute />} />
          </Route>
          <Route path="planos" element={<PlanosRoute />} />
          {/* ADMIN-VISAO onda 4 · S1614-T2: todos os eventos do sistema, sem
              passar por tenant. Leitura da onda 1, Rule que já existe. */}
          <Route path="eventos" element={<EventosGlobaisRoute />} />
          {/* ADMIN-VISAO onda 4 · S1614-T3: a irmã da lista de eventos. */}
          <Route path="clubs" element={<ClubsGlobaisRoute />} />
          {/* ADMIN-VISAO onda 5 · S1615-T2: uma tela com dois modos, e o mais
              fechado é o padrão — Fila (quem aguarda liberação) e Diretório
              (quem existe). Sem export, sem CSV, sem download (RN-540). */}
          <Route path="contas" element={<ContasRoute />} />
          {/* S1608-T2 · RN-413: gestão dos códigos que abrem a porta da
              plataforma (gerar, ver uso, revogar). */}
          <Route path="convites" element={<ConvitesRoute />} />
          {/* TAXAFLEX (S1606 · RN-178): tabela GLOBAL de taxa por meio */}
          <Route path="taxa" element={<TaxaGlobalRoute />} />
          <Route path="repasses" element={<RepassesAdminRoute />} />
          {/* T4 · decisão 43-b: fila cross-tenant de estornos + a ação direta
              sobre o que nunca chega à fila (corte de véspera, cancelamento
              sem estorno). */}
          <Route path="estornos" element={<EstornosAdminRoute />} />
          <Route path="macro" element={<MacroDashboardRoute />} />
          {/* 404 dentro do PlatformShell (sidebar de plataforma preservada). S500-T2. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

PlataformaRoutes.displayName = 'PlataformaRoutes';
