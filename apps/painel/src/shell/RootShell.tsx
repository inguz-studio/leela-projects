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
import { AppShell, Sidebar } from '@leela/design-system';
import { shellSidebarSections } from './sidebar';

export interface RootShellProps {
  children: React.ReactNode;
}

export function RootShell({ children }: RootShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const sections = shellSidebarSections(location.pathname, (href) => navigate(href));

  return (
    <AppShell sidebar={<Sidebar sections={sections} />}>
      {/* Área principal: único contêiner de rolagem — a sidebar não rola junto. */}
      <div className="flex flex-col flex-1 overflow-y-auto">{children}</div>
    </AppShell>
  );
}

RootShell.displayName = 'RootShell';
