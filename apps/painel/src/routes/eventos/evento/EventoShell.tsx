// =============================================================================
// EventoShell — layout compartilhado das rotas de um evento (S202-T1 · fidelidade
// LEELA-FID-EVT-T1): breadcrumb "Eventos › {nome}", header rico (§2.1) com tile
// de modalidade, título + status, meta (data · local), linha de contexto com
// contagem regressiva e ações ("Ver página pública" + menu "…"), seguido da
// sub-nav do evento (§2.14). Fiel ao mockup `Detalhe do Evento.html`.
//
// Reuso-first: Breadcrumb, Badge, Button, IconButton, DropdownMenu, SubNav do DS;
// tokens de thumb/gradiente (--thumb-*); heurística `thumbVariantDoEvento` (DRY).
// Presentational puro (props) — testável sem router nem dados.
// =============================================================================

import * as React from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  DropdownMenu,
  IconButton,
  SubNav,
} from '@leela/design-system';
import type { Evento } from '@leela/core';
import {
  Bike,
  Dumbbell,
  ExternalLink,
  Flower2,
  Footprints,
  Monitor,
  MoreHorizontal,
} from 'lucide-react';
import { statusEventoBadge } from '../_lib/status';
import { formatDataEvento, formatInt, diasParaEvento, faltamDiasLabel } from '../_lib/format';
import { eventoSubNavTabs, type EventoAbaId } from '../_lib/subnav';
import { thumbVariantDoEvento } from '../../overview/_lib/activeEvents';
import type { EventThumbVariant } from '@leela/design-system';

export interface EventoShellProps {
  evento: Evento;
  ativa: EventoAbaId;
  children: React.ReactNode;
}

// Ícone central do tile por variante (espelha o EventRow do DS — corrida é o
// caso quente do painel LEELA). Mapa fechado: nada de ícone dinâmico.
const THUMB_ICON: Record<EventThumbVariant, typeof Footprints> = {
  corrida: Footprints,
  ciclismo: Bike,
  yoga: Flower2,
  virtual: Monitor,
  crossfit: Dumbbell,
};

const THUMB_GRADIENT: Record<EventThumbVariant, string> = {
  corrida: 'bg-[image:var(--thumb-corrida)]',
  ciclismo: 'bg-[image:var(--thumb-ciclismo)]',
  yoga: 'bg-[image:var(--thumb-yoga)]',
  virtual: 'bg-[image:var(--thumb-virtual)]',
  crossfit: 'bg-[image:var(--thumb-crossfit)]',
};

function EventoTile({ variant }: { variant: EventThumbVariant }): JSX.Element {
  const Icon = THUMB_ICON[variant];
  return (
    <div
      aria-hidden
      className={
        'relative flex h-[var(--header-tile-size)] w-[var(--header-tile-size)] shrink-0 items-center justify-center ' +
        'overflow-hidden rounded-[var(--radius-md)] ' +
        THUMB_GRADIENT[variant]
      }
    >
      <Icon
        className="h-[var(--header-tile-icon-size)] w-[var(--header-tile-icon-size)] text-[color:var(--thumb-icon-fg)] [stroke-width:var(--icon-stroke)]"
      />
    </div>
  );
}

export function EventoShell({ evento, ativa, children }: EventoShellProps): JSX.Element {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const status = statusEventoBadge(evento.status);
  const tabs = eventoSubNavTabs(evento.slug, ativa, { inscritos: evento.qtdInscritos });
  const thumbVariant = thumbVariantDoEvento(evento.modalidades, evento.nome);

  const dias = diasParaEvento(evento.data);
  const contagem = faltamDiasLabel(dias);
  const metaParts = [formatDataEvento(evento.data), evento.local].filter(Boolean);

  const abrirPaginaPublica = (): void => {
    if (typeof window !== 'undefined') {
      window.open(`${window.location.origin}/e/${evento.slug}`, '_blank', 'noopener');
    }
  };

  const copiarLink = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`${window.location.origin}/e/${evento.slug}`);
    }
    setMenuOpen(false);
  };

  const acoes = [
    { id: 'copiar', label: 'Copiar link do evento', onClick: copiarLink },
    {
      id: 'publica',
      label: 'Ver página pública',
      onClick: () => {
        abrirPaginaPublica();
        setMenuOpen(false);
      },
    },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-[var(--spacing-6)] pt-[var(--spacing-5)]">
        <Breadcrumb
          items={[{ label: 'Eventos', href: '/eventos' }, { label: evento.nome }]}
        />
      </div>

      <header
        aria-label={evento.nome}
        className="flex items-center gap-[var(--spacing-5)] px-[var(--spacing-6)] py-[var(--spacing-4)] min-h-[var(--header-height)]"
      >
        <EventoTile variant={thumbVariant} />

        <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-1)]">
          <div className="flex items-center gap-[var(--spacing-3)] flex-wrap">
            <h1 className="font-display italic font-[var(--font-weight-bold)] text-[length:var(--header-title-size)] tracking-[var(--header-title-spacing)] text-[var(--text-primary)] truncate">
              {evento.nome}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {metaParts.length > 0 && (
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              {metaParts.join(' · ')}
            </p>
          )}
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            <strong className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              {formatInt(evento.qtdInscritos)} inscritos
            </strong>
            {contagem ? (
              <>
                {' · '}
                <span className={dias !== null && dias >= 0 ? 'text-[var(--text-brand)] font-[var(--font-weight-semibold)]' : undefined}>
                  {contagem}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-[var(--spacing-2)] shrink-0 ml-auto">
          <Button variant="ghost" size="sm" onClick={abrirPaginaPublica}>
            Ver página pública
            <ExternalLink className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
          </Button>
          <DropdownMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            actions={acoes}
            trigger={
              <IconButton aria-label="Mais ações do evento">
                <MoreHorizontal />
              </IconButton>
            }
          />
        </div>
      </header>

      <SubNav tabs={tabs} aria-label="Seções do evento" />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </div>
  );
}

EventoShell.displayName = 'EventoShell';
