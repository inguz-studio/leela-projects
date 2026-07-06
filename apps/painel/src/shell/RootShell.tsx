// =============================================================================
// RootShell — moldura padrão do painel montada UMA vez no layout raiz
// (App.tsx), envolvendo TODAS as rotas (item 18 do DoD do Be Hero: toda tela
// aplica o shell padrão). Sidebar fixa 240px sempre visível; só o conteúdo
// troca e rola. Substitui as montagens locais de AppShell que existiam em
// OverviewShell e PlatformShell (bug do diagnóstico 2026-07-05: /eventos e
// /clubes renderizavam sem menu).
// =============================================================================

import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Avatar, Sidebar, SidebarBrand, SidebarFooter } from '@leela/design-system';
import { shellSidebarSections } from './sidebar';
import { useEventosAtivosBadge } from './eventosBadge';
import { useShellSession } from './session';

export interface RootShellProps {
  children: React.ReactNode;
}

export function RootShell({ children }: RootShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { nome } = useShellSession();
  const eventosAtivos = useEventosAtivosBadge();

  const sections = shellSidebarSections(location.pathname, (href) => navigate(href), eventosAtivos);

  // Bloco de marca (T2): a ESTRUTURA (anatomia .brand do mockup) é do DS; o
  // texto "LEELA / Painel do Organizador" é do consumidor — a marca final do
  // painel é decisão pendente do Vitor.
  const brand = <SidebarBrand mark="LEELA" sub="Painel do Organizador" />;

  // Rodapé só com sessão nomeada — sem usuário hardcoded (B4).
  const footer = nome ? (
    <SidebarFooter
      avatar={<Avatar size="sm" name={nome} />}
      name={nome}
      subtitle="Ver perfil"
    />
  ) : undefined;

  return (
    <AppShell sidebar={<Sidebar brand={brand} sections={sections} footer={footer} />}>
      {/* Área principal: único contêiner de rolagem — a sidebar não rola junto. */}
      <div className="flex flex-col flex-1 overflow-y-auto">{children}</div>
    </AppShell>
  );
}

RootShell.displayName = 'RootShell';
