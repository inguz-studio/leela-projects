// =============================================================================
// EventoLayout — container do layout de `/eventos/:slug/*`. Carrega o evento
// por slug, deriva a aba ativa do pathname e provê o evento às rotas-filhas
// via Outlet context. Skeleton no load; EmptyState distinto para "não existe"
// vs "existe mas é de outro organizador do tenant" (review Onda1 #16 — staff
// não recebe mais 404 seco; decisão E02-L1-SUMMARY §5: painel por uid).
// =============================================================================

import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Skeleton } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { EventoShell } from './EventoShell';
import { abaAtiva } from '../_lib/subnav';
import { useEvento } from '../_data/eventos';

export interface EventoOutletContext {
  evento: Evento;
}

export function EventoLayout(): JSX.Element {
  const { slug = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: evento, loading, error, motivo } = useEvento(slug);

  if (loading) {
    return (
      <div role="status" aria-label="Carregando evento" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-[var(--header-height)]" />
        <Skeleton variant="rect" className="h-[var(--subnav-height)]" />
        <div className="p-[var(--spacing-6)]">
          <Skeleton variant="rect" className="h-60" />
        </div>
      </div>
    );
  }

  if (motivo === 'fora_do_escopo') {
    return (
      <EmptyState
        title="Este evento é de outro organizador"
        description="O evento existe na sua equipe, mas o painel mostra apenas os eventos criados por você. Peça o acompanhamento ao organizador responsável."
        action={
          <Button variant="primary" onClick={() => navigate('/eventos')}>
            Voltar para meus eventos
          </Button>
        }
      />
    );
  }

  if (error || !evento) {
    return (
      <EmptyState
        title="Evento não encontrado"
        description="Ele pode ter sido removido ou você não tem acesso."
        action={
          <Button variant="primary" onClick={() => navigate('/eventos')}>
            Voltar para eventos
          </Button>
        }
      />
    );
  }

  const ativa = abaAtiva(location.pathname, evento.slug);
  const context: EventoOutletContext = { evento };

  return (
    <EventoShell evento={evento} ativa={ativa}>
      <Outlet context={context} />
    </EventoShell>
  );
}

EventoLayout.displayName = 'EventoLayout';
