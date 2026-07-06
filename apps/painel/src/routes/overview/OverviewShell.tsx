// =============================================================================
// OverviewShell — cabeçalho + contêiner da Visão Geral (S600-T1). Presentational.
// A moldura (AppShell + Sidebar) agora é do layout RAIZ (shell/RootShell, Lote
// B3) — aqui fica só o que é da tela: PageHeader com a saudação + date-badge
// do mockup (`.date-badge`, T6 — snapshot do momento do render, sem relógio
// vivo) e o padding do conteúdo. Testável sem router: recebe `nome` por prop.
//
// Registrado p/ T7: o `.h1` do mockup é display italic 40px; o PageHeader do
// DS usa a tipografia padrão em TODAS as telas — reestilizá-lo é decisão
// global, fora do escopo T6.
// =============================================================================

import * as React from 'react';
import { DateBadge, PageHeader } from '@leela/design-system';
import { saudacaoProfissional } from './_lib/greeting';
import { formatAgoraExtenso } from './_lib/format';

export interface OverviewShellProps {
  nome: string | null;
  children: React.ReactNode;
  /** Injetável nos testes; default = momento do render. */
  agora?: Date;
}

export function OverviewShell({ nome, children, agora }: OverviewShellProps): JSX.Element {
  // Snapshot único por montagem (o mockup mostra o instante, não um relógio).
  const [momento] = React.useState<Date>(() => agora ?? new Date());

  return (
    <>
      <PageHeader
        title="Visão Geral"
        subtitle={saudacaoProfissional(nome)}
        actions={<DateBadge>{formatAgoraExtenso(momento)}</DateBadge>}
      />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </>
  );
}

OverviewShell.displayName = 'OverviewShell';
