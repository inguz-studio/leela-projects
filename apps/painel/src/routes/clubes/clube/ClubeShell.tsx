// =============================================================================
// ClubeShell — layout compartilhado das rotas de um clube (S102-T1):
// header 96px (SPEC §1.2) + sub-nav do club com 6 tabs (SPEC §1.3) e a aba
// ativa marcada. Header traz o código de convite copiável (RN-101).
// Presentational puro (props) — testável sem router nem dados. A ação de
// copiar (clipboard + toast) é injetada por prop para manter a pureza.
// =============================================================================

import * as React from 'react';
import { Avatar, Badge, PageHeader, SubNav } from '@leela/design-system';
import type { Clube } from '@leela/core';
import { anoDe, formatInt } from '../_lib/format';
import { clubeSubNavTabs, type ClubeAbaId } from '../_lib/subnav';

export interface ClubeShellProps {
  clube: Clube;
  ativa: ClubeAbaId;
  /** Copia o código de convite (clipboard + toast) — injetado pelo container. */
  onCopiarCodigo: () => void;
  children: React.ReactNode;
}

function CodigoConvite({
  codigo,
  slug,
  onCopiar,
}: {
  codigo: string;
  slug: string;
  onCopiar: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
      <span className="flex items-center gap-[var(--spacing-2)]">
        Código de convite:{' '}
        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {codigo}
        </span>
        <button
          type="button"
          aria-label="Copiar código de convite"
          onClick={onCopiar}
          className="rounded-[var(--radius-sm)] px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]"
        >
          <span aria-hidden>⧉</span>
        </button>
      </span>
      <span aria-hidden>·</span>
      <span>
        Página: <span className="text-[var(--text-primary)]">be-hero.com.br/c/{slug}</span>
      </span>
    </div>
  );
}

export function ClubeShell({ clube, ativa, onCopiarCodigo, children }: ClubeShellProps): JSX.Element {
  const desde = anoDe(clube.criadoEm);
  const subtitleParts = [
    clube.localizacao,
    `${formatInt(clube.qtdMembrosAtivos)} membros`,
    desde ? `desde ${desde}` : null,
  ].filter(Boolean) as string[];

  const tabs = clubeSubNavTabs(clube.slug, ativa, {
    membros: clube.qtdMembrosAtivos,
    desafios: clube.qtdDesafiosAtivos,
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title={clube.nome}
        subtitle={subtitleParts.join(' · ')}
        avatar={<Avatar name={clube.nome} size="lg" />}
        badges={<Badge variant="brand">{clube.categoria}</Badge>}
        metadata={
          <CodigoConvite codigo={clube.codigoConvite} slug={clube.slug} onCopiar={onCopiarCodigo} />
        }
      />
      <SubNav tabs={tabs} aria-label="Seções do club" />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </div>
  );
}

ClubeShell.displayName = 'ClubeShell';
