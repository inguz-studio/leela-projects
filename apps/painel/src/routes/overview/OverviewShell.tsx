// =============================================================================
// OverviewShell — shell do produtor na Visão Geral (S600-T1). Presentational.
// AppShell (Sidebar com "Visão Geral" ativa) + PageHeader com a saudação.
// Testável sem router: recebe `nome` e `onNavigate` por prop.
// =============================================================================

import * as React from 'react';
import { AppShell, PageHeader, Sidebar } from '@leela/design-system';
import { overviewSidebarSections } from './_lib/sidebar';
import { saudacaoProfissional } from './_lib/greeting';

export interface OverviewShellProps {
  nome: string | null;
  onNavigate: (href: string) => void;
  children: React.ReactNode;
}

export function OverviewShell({ nome, onNavigate, children }: OverviewShellProps): JSX.Element {
  const sections = overviewSidebarSections('visao-geral', onNavigate);

  return (
    <AppShell sidebar={<Sidebar sections={sections} />}>
      <PageHeader title="Visão Geral" subtitle={saudacaoProfissional(nome)} />
      <div className="flex-1 overflow-y-auto p-[var(--spacing-6)]">{children}</div>
    </AppShell>
  );
}

OverviewShell.displayName = 'OverviewShell';
