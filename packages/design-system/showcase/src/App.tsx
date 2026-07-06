/**
 * App do showroom — AppShell do DS + Sidebar própria + roteamento por hash.
 * Rotas: #/inicio · #/fundacoes · #/componentes · #/icones · #/temas
 */

import * as React from 'react';
import {
  AppShell,
  Avatar,
  Badge,
  PageHeader,
  Sidebar,
  SidebarFooter,
  sidebarNavIcon,
  type SidebarSection,
} from '@leela/design-system';
import { Component, Home, Palette, Shapes, SwatchBook } from 'lucide-react';
import { ShowroomBar } from './ShowroomBar';
import { HomePage } from './sections/HomePage';
import { TokensPage } from './sections/TokensPage';
import { ComponentsPage } from './sections/ComponentsPage';
import { IconsPage } from './sections/IconsPage';
import { ThemesPage } from './sections/ThemesPage';

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

const ROUTES = ['inicio', 'fundacoes', 'componentes', 'icones', 'temas'] as const;
type RouteId = (typeof ROUTES)[number];

interface RouteMeta {
  label: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const ROUTE_META: Record<RouteId, RouteMeta> = {
  inicio: {
    label: 'Início',
    title: 'LEELA Design System',
    subtitle: 'Showroom estático construído com os próprios componentes do DS',
    icon: sidebarNavIcon(Home),
  },
  fundacoes: {
    label: 'Fundações',
    title: 'Fundações e tokens',
    subtitle: 'Cores, tipografia, spacing, radius, elevação e motion — direto dos tokens',
    icon: sidebarNavIcon(Palette),
  },
  componentes: {
    label: 'Componentes',
    title: 'Galeria de componentes',
    subtitle: 'Exemplos vivos e interativos, por categoria',
    icon: sidebarNavIcon(Component),
  },
  icones: {
    label: 'Ícones',
    title: 'Ícones',
    subtitle: 'Lucide em 24px, traço 1.75 — padrão do DS',
    icon: sidebarNavIcon(Shapes),
  },
  temas: {
    label: 'Temas',
    title: 'Temas',
    subtitle: 'brasa e leela lado a lado, com troca ao vivo',
    icon: sidebarNavIcon(SwatchBook),
  },
};

function parseHash(): RouteId {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(raw) ? (raw as RouteId) : 'inicio';
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App(): JSX.Element {
  const [route, setRoute] = React.useState<RouteId>(parseHash);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onHashChange = (): void => {
      setRoute(parseHash());
      contentRef.current?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const sections: SidebarSection[] = [
    {
      label: 'SHOWROOM',
      items: ROUTES.map((id) => ({
        id,
        label: ROUTE_META[id].label,
        icon: ROUTE_META[id].icon,
        href: `#/${id}`,
        active: route === id,
      })),
    },
  ];

  const meta = ROUTE_META[route];

  return (
    <AppShell
      sidebar={
        <Sidebar
          sections={sections}
          footer={
            <SidebarFooter
              avatar={<Avatar size="sm" name="Leela DS" />}
              name="LEELA DS"
              subtitle="v0.0.1 · showroom"
            />
          }
        />
      }
    >
      <ShowroomBar />

      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        badges={<Badge variant="brand">showroom</Badge>}
      />

      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[var(--spacing-8)] p-[var(--spacing-8)]">
          {route === 'inicio' && <HomePage />}
          {route === 'fundacoes' && <TokensPage />}
          {route === 'componentes' && <ComponentsPage />}
          {route === 'icones' && <IconsPage />}
          {route === 'temas' && <ThemesPage />}
        </div>
      </div>
    </AppShell>
  );
}
