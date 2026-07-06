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
import { Bell, CircleHelp, Plus } from 'lucide-react';
import {
  AppShell,
  Avatar,
  Button,
  IconButton,
  SearchInput,
  Sidebar,
  SidebarBrand,
  SidebarFooter,
  Toolbar,
} from '@leela/design-system';
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

  // Toolbar global (T3) — só nas rotas do PRODUTOR (a /plataforma tem nav
  // própria e nenhuma busca de operação). Mesma condição do sidebar.ts.
  const produtor = !location.pathname.startsWith('/plataforma');
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K foca a busca (visual + foco do mockup). A BUSCA REAL é stub:
  // não existe rota/índice de busca no cliente — Enter não navega (honesto).
  React.useEffect(() => {
    if (!produtor) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [produtor]);

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
      <div className="flex flex-col flex-1 overflow-y-auto">
        {produtor && (
          // A toolbar vive dentro da moldura da página do mockup (`.main`
          // 32px 40px) — o conteúdo abaixo mantém o padding próprio de cada
          // tela (a recomposição da Visão Geral é T4–T6).
          <div className="px-[var(--layout-page-px)] pt-[var(--layout-page-pt)]">
            <Toolbar
              start={
                <SearchInput
                  ref={searchRef}
                  placeholder="Buscar atleta, evento, inscrição…"
                />
              }
              end={
                <>
                  {/* Ajuda: sem destino real ainda — stub registrado (T3). */}
                  <IconButton aria-label="Ajuda">
                    <CircleHelp />
                  </IconButton>
                  {/* Notificações: sem fonte de não-lidas no cliente — pip
                      desligado até existir dado real (stub registrado, T3). */}
                  <IconButton aria-label="Notificações">
                    <Bell />
                  </IconButton>
                  <Button variant="primary" size="sm" onClick={() => navigate('/eventos/novo')}>
                    <Plus aria-hidden className="w-[var(--search-icon-size)] h-[var(--search-icon-size)]" />
                    Novo evento
                  </Button>
                </>
              }
            />
          </div>
        )}
        {children}
      </div>
    </AppShell>
  );
}

RootShell.displayName = 'RootShell';
