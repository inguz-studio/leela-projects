// =============================================================================
// OverviewShell — cabeçalho + contêiner da Visão Geral (S600-T1). Presentational.
// A moldura (AppShell + Sidebar) agora é do layout RAIZ (shell/RootShell, Lote
// B3) — aqui fica só o que é da tela: PageHeader com a saudação e o padding do
// conteúdo. Testável sem router: recebe `nome` por prop.
// =============================================================================

import * as React from 'react';
import { PageHeader } from '@leela/design-system';
import { saudacaoProfissional } from './_lib/greeting';

export interface OverviewShellProps {
  nome: string | null;
  children: React.ReactNode;
}

export function OverviewShell({ nome, children }: OverviewShellProps): JSX.Element {
  return (
    <>
      <PageHeader title="Visão Geral" subtitle={saudacaoProfissional(nome)} />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </>
  );
}

OverviewShell.displayName = 'OverviewShell';
