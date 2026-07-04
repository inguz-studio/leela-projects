// =============================================================================
// EventoShell — layout compartilhado das rotas de um evento (S202-T1):
// header 96px (§2.1) + sub-nav do evento (§2.14) com a aba ativa marcada.
// Presentational puro (props) — testável sem router nem dados.
// =============================================================================

import * as React from 'react';
import { Badge, PageHeader, SubNav } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { statusEventoBadge } from '../_lib/status';
import { formatDataEvento, formatInt } from '../_lib/format';
import { eventoSubNavTabs, type EventoAbaId } from '../_lib/subnav';

export interface EventoShellProps {
  evento: Evento;
  ativa: EventoAbaId;
  children: React.ReactNode;
}

export function EventoShell({ evento, ativa, children }: EventoShellProps): JSX.Element {
  const status = statusEventoBadge(evento.status);
  const tabs = eventoSubNavTabs(evento.slug, ativa, { inscritos: evento.qtdInscritos });

  const subtitleParts = [formatDataEvento(evento.data), evento.local].filter(Boolean);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={evento.nome}
        subtitle={subtitleParts.join(' · ')}
        badges={<Badge variant={status.variant}>{status.label}</Badge>}
        metadata={<span>{formatInt(evento.qtdInscritos)} inscritos</span>}
      />
      <SubNav tabs={tabs} aria-label="Seções do evento" />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </div>
  );
}

EventoShell.displayName = 'EventoShell';
