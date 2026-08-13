// =============================================================================
// EventoShell — layout compartilhado das rotas de um evento (S202-T1 · fidelidade
// LEELA-FID-EVT-T1): breadcrumb "Eventos › {nome}", header rico (§2.1) com tile
// de modalidade, título + status, meta (data · local), linha de contexto com
// contagem regressiva e ações ("Ver página pública" + menu "…"), seguido da
// sub-nav do evento (§2.14). Fiel ao mockup `Detalhe do Evento.html`.
//
// Reuso-first: Breadcrumb, Badge, Button, IconButton, DropdownMenu, SubNav do DS;
// tokens de thumb/gradiente (--thumb-*); heurística `thumbVariantDoEvento` (DRY).
// Dados continuam vindo por props (nenhuma query aqui), mas a casca NAVEGA:
// desde LEELA-NAVFIX-T2 ela fia `preventDefault` + `navigate` nas abas e no
// breadcrumb, então precisa de um Router em volta (os testes montam
// `MemoryRouter`). Antes disso cada aba era um `<a href>` cru e recarregava o
// documento inteiro.
// =============================================================================

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  Button,
  DropdownMenu,
  IconButton,
} from '@leela/design-system';
import { AreaSubNav } from '../../../components/nav/AreaSubNav';
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
import { linkEventoPublico } from '../../../lib/linkPublico';
import { trilhaComNavSpa } from '../../../lib/navSpa';
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
  const navigate = useNavigate();

  const status = statusEventoBadge(evento.status);
  // O construtor `eventoSubNavTabs` é @pure e segue intocado (o teste orientado
  // a tabela em `_lib/__tests__/subnav.test.ts` é o contrato dele). A fiação de
  // SPA saiu daqui na Leva 14 — quem faz é o `AreaSubNav`, uma vez para as onze
  // barras do painel.
  const tabs = eventoSubNavTabs(evento.slug, ativa, { inscritos: evento.qtdInscritos });
  const trilha = trilhaComNavSpa(
    [{ label: 'Eventos', href: '/eventos' }, { label: evento.nome }],
    navigate,
  );
  const thumbVariant = thumbVariantDoEvento(evento.modalidades, evento.nome);

  const dias = diasParaEvento(evento.data);
  const contagem = faltamDiasLabel(dias);
  const metaParts = [formatDataEvento(evento.data), evento.local].filter(Boolean);

  // A landing só serve o evento quando publicado/ao_vivo (gate `statusEhPublico`
  // em apps/landing/lib/estadoVenda.ts); rascunho/encerrado → 404. Espelhamos o
  // gate aqui para não oferecer um link que quebra (comportamento honesto).
  const publico = evento.status === 'publicado' || evento.status === 'ao_vivo';
  const motivoIndisponivel =
    evento.status === 'rascunho'
      ? 'Publique o evento para ver a página pública.'
      : 'Evento encerrado — a página pública não está mais no ar.';
  const urlPublica = linkEventoPublico(evento.slug);

  const abrirPaginaPublica = (): void => {
    if (!publico) return;
    if (typeof window !== 'undefined') {
      window.open(urlPublica, '_blank', 'noopener');
    }
  };

  const copiarLink = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(urlPublica);
    }
    setMenuOpen(false);
  };

  const acoes = [
    { id: 'copiar', label: 'Copiar link do evento', onClick: copiarLink },
    {
      id: 'publica',
      label: 'Ver página pública',
      disabled: !publico,
      onClick: () => {
        abrirPaginaPublica();
        setMenuOpen(false);
      },
    },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-[var(--spacing-6)] pt-[var(--spacing-5)]">
        <Breadcrumb items={trilha} />
      </div>

      <header
        aria-label={evento.nome}
        className="flex flex-wrap items-center gap-[var(--spacing-5)] px-[var(--spacing-6)] py-[var(--spacing-4)] min-h-[var(--header-height)] lg:flex-nowrap"
      >
        <EventoTile variant={thumbVariant} />

        <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-1)]">
          <div className="flex min-w-0 items-center gap-[var(--spacing-3)] flex-wrap">
            <h1 className="font-display italic font-[var(--font-weight-bold)] text-[length:var(--header-title-size)] tracking-[var(--header-title-spacing)] text-[var(--text-primary)] min-w-0 truncate">
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

        <div className="flex items-center gap-[var(--spacing-2)] shrink-0 ml-auto basis-full lg:basis-auto">
          <span title={publico ? undefined : motivoIndisponivel} className="inline-flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={abrirPaginaPublica}
              disabled={!publico}
            >
              Ver página pública
              <ExternalLink className="h-[var(--icon-size)] w-[var(--icon-size)] [stroke-width:var(--icon-stroke)]" />
            </Button>
          </span>
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

      <AreaSubNav tabs={tabs} aria-label="Seções do evento" />
      <div className="p-[var(--spacing-6)]">{children}</div>
    </div>
  );
}

EventoShell.displayName = 'EventoShell';
