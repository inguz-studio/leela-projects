// =============================================================================
// MembrosTable — tabela densa de membros (§2.5 / RN-005). Reutilizada pelo
// Overview (novos membros) e pela tela de Membros (lista completa com ações).
// NUNCA um grid de avatares — sempre linha densa. Presentational puro.
// =============================================================================

import type { ReactNode } from 'react';
import { Avatar, Badge, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type { Membro } from '@leela/core';
import { statusMembroBadge, papelMembroLabel } from '../_lib/membros';
import { tempoRelativo } from '../_lib/format';

export interface MembrosTableProps {
  membros: Membro[];
  /** Ações por linha (popover) — usado na tela de Membros; ausente no Overview. */
  renderActions?: ((membro: Membro) => ReactNode) | undefined;
  caption: string;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  /** "Agora" injetável para tempo relativo determinístico em teste. */
  agora?: Date | undefined;
}

export function MembrosTable({
  membros,
  renderActions,
  caption,
  emptyTitle,
  emptyDescription,
  agora,
}: MembrosTableProps): JSX.Element {
  const columns: TableColumn<Membro>[] = [
    {
      key: 'membro',
      header: 'Membro',
      render: (m) => (
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Avatar name={m.atletaNome} size="sm" />
          <span className="min-w-0 truncate text-[var(--text-primary)]">{m.atletaNome}</span>
        </div>
      ),
    },
    {
      key: 'papel',
      header: 'Papel',
      render: (m) => papelMembroLabel(m.papel),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => {
        const s = statusMembroBadge(m.status);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'entrouEm',
      header: 'Entrou em',
      render: (m) => tempoRelativo(m.entrouEm, agora),
    },
    {
      key: 'ultimoRegistro',
      header: 'Último registro',
      render: (m) => tempoRelativo(m.ultimaAtividadeEm, agora),
    },
  ];

  // exactOptionalPropertyTypes: só encaminha os opcionais quando definidos —
  // a Table do DS declara-os como opcionais exatos (sem `| undefined`).
  return (
    <Table
      columns={columns}
      data={membros}
      keyExtractor={(m) => m.id}
      caption={caption}
      {...(emptyTitle !== undefined ? { emptyTitle } : {})}
      {...(emptyDescription !== undefined ? { emptyDescription } : {})}
      {...(renderActions !== undefined ? { renderActions } : {})}
    />
  );
}

MembrosTable.displayName = 'MembrosTable';
