// =============================================================================
// ClubeShell — layout compartilhado das rotas de um clube (S102-T1):
// header 96px (SPEC §1.2) + sub-nav do club com 6 tabs (SPEC §1.3) e a aba
// ativa marcada. Header traz o código de convite copiável (RN-101).
// Dados vêm por props e a ação de copiar (clipboard + toast) é injetada — a
// casca não busca nada. Mas ela NAVEGA: desde LEELA-NAVFIX-T2 fia
// `preventDefault` + `navigate` nas abas, então precisa de um Router em volta
// (os testes montam `MemoryRouter`). Antes disso cada aba era um `<a href>` cru
// e recarregava o documento inteiro.
// =============================================================================

import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Breadcrumb, PageHeader, SubNav } from '@leela/design-system';
import type { Clube } from '@leela/core';
import { formatarLocalizacaoClube } from '@leela/core';
import { anoDe, formatInt } from '../_lib/format';
import { clubeSubNavTabs, type ClubeAbaId } from '../_lib/subnav';
import { tabsComNavSpa, trilhaComNavSpa } from '../../../lib/navSpa';
import { linkClubePublico } from '../../../lib/linkPublico';

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
        Página: <span className="text-[var(--text-primary)]">{linkClubePublico(slug)}</span>
      </span>
    </div>
  );
}

export function ClubeShell({ clube, ativa, onCopiarCodigo, children }: ClubeShellProps): JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const desde = anoDe(clube.criadoEm);
  const subtitleParts = [
    formatarLocalizacaoClube(clube.localizacao),
    `${formatInt(clube.qtdMembrosAtivos)} membros`,
    desde ? `desde ${desde}` : null,
  ].filter(Boolean) as string[];

  // `clubeSubNavTabs` é @pure e segue intocado (teste orientado a tabela em
  // `_lib/__tests__/subnav.test.ts`). A navegação de SPA é fiada AQUI.
  const tabs = tabsComNavSpa(
    clubeSubNavTabs(clube.slug, ativa, {
      membros: clube.qtdMembrosAtivos,
      desafios: clube.qtdDesafiosAtivos,
    }),
    navigate,
    pathname,
  );

  // D-1008-R10 ("os clubs eu posso acessar um painel, mas depois nao consigo
  // retornar a aba geral"): trilha canônica "Clubs › {nome}" — o MESMO padrão
  // do EventoShell. Âncora SPA de verdade (href + preventDefault via
  // trilhaComNavSpa): ctrl+clique, clique do meio e copiar endereço vivem.
  //
  // UXW-FIX (BLQ-20): o degrau de volta dizia "Clubes" e levava a uma tela
  // intitulada "Clubs". A anatomia estava certa; só a grafia mentia.
  const trilha = trilhaComNavSpa(
    [{ label: 'Clubs', href: '/clubes' }, { label: clube.nome }],
    navigate,
  );

  return (
    <div className="flex flex-col">
      <div className="px-[var(--spacing-6)] pt-[var(--spacing-5)]">
        <Breadcrumb items={trilha} />
      </div>
      <PageHeader
        title={clube.nome}
        subtitle={subtitleParts.join(' · ')}
        avatar={<Avatar name={clube.nome} size="lg" />}
        badges={<Badge variant="brand">{clube.categoria}</Badge>}
        metadata={
          <CodigoConvite codigo={clube.codigoConvite} slug={clube.slug} onCopiar={onCopiarCodigo} />
        }
      />
      <SubNav tabs={tabs} aria-label="Seções do club" divider />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </div>
  );
}

ClubeShell.displayName = 'ClubeShell';
