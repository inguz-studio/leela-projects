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

  // Bloco de marca (T2): a ANATOMIA `.brand` (padding, hairline, sub) é do DS —
  // reusamos os MESMOS tokens do SidebarBrand para não haver drift. O mark deixa
  // de ser texto e passa a ser o wordmark oficial da Leela (variante brasa /
  // verde-limão, o MESMO `/leela-logo-brasa.svg` do header da landing), que casa
  // com o fundo escuro `--surface-base` da sidebar. `alt` textual garante a11y;
  // altura = `--sidebar-brand-mark-size` (22px), o mesmo espaço vertical que o
  // texto ocupava. Sub "Painel do Organizador" segue como descritor de contexto.
  const brand = (
    <div className="border-b border-b-[var(--border-subtle)] pt-[var(--sidebar-brand-pt)] px-[var(--sidebar-brand-px)] pb-[var(--sidebar-brand-pb)]">
      <img
        src="/leela-logo-brasa.svg"
        alt="Leela"
        data-slot="brand-logo"
        className="h-[var(--sidebar-brand-mark-size)] w-auto"
      />
      <p className="mt-[var(--sidebar-brand-sub-mt)] text-[length:var(--sidebar-brand-sub-size)] font-[var(--font-weight-medium)] uppercase tracking-[var(--sidebar-brand-sub-spacing)] text-[var(--text-tertiary)]">
        Painel do Organizador
      </p>
    </div>
  );

  // Rodapé só com sessão nomeada — sem usuário hardcoded (B4). "Ver perfil"
  // agora navega para as configurações da conta (S020-T4); antes era um rótulo
  // morto.
  const footer = nome ? (
    <SidebarFooter
      avatar={<Avatar size="sm" name={nome} />}
      name={nome}
      subtitle="Ver perfil"
      onClick={() => navigate('/conta')}
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
                  // <lg a Toolbar empilha: a busca ocupa a linha inteira em vez
                  // dos 320px fixos que estouravam o main de ~310px (M2). Em lg+
                  // volta aos 320px do mockup — desktop intocado.
                  className="w-full lg:w-[var(--search-width)]"
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
