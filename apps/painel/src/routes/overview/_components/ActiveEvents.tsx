// =============================================================================
// ActiveEvents — bloco "Seus eventos ativos" (S601-T1, recomposto no Lote
// FIDELIDADE T5 como event-rows do mockup). Cada linha é um EventRow do DS:
// thumb por modalidade (heurística de apresentação em _lib/activeEvents),
// nome + meta ("27 Abr · Local" + badge "Últimas vagas"), contagem x/y,
// badge de status e "Gerenciar" (secondary sm, como o mockup).
// Section-head do mockup: título display + link "Ver todos os eventos".
// EmptyState com CTA quando não há eventos ativos; skeleton no load.
// =============================================================================

import {
  Badge,
  Button,
  EmptyState,
  EventRow,
  Skeleton,
  cn,
  type BadgeProps,
} from '@leela/design-system';
import { ChevronRight } from 'lucide-react';
import type { StatusEvento } from '@leela/core';
import type { EventoAtivoView } from '../_lib/activeEvents';
import { formatInt } from '../_lib/format';
import { PanelError } from './PanelError';

interface StatusInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const STATUS: Record<StatusEvento, StatusInfo> = {
  rascunho: { label: 'Rascunho', variant: 'neutro' },
  publicado: { label: 'Publicado', variant: 'heroico' },
  ao_vivo: { label: 'Ao vivo', variant: 'vitoria' },
  encerrado: { label: 'Encerrado', variant: 'neutro' },
};

export interface ActiveEventsProps {
  eventos: EventoAtivoView[] | null;
  loading: boolean;
  /** Falha ao listar eventos — nunca fabricar "crie seu primeiro evento" (#03). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
  /** Staff sem eventos próprios: escopo individual, não "primeiro evento" (#16). */
  contextoStaff?: boolean;
  onGerenciar: (slug: string) => void;
  onNovoEvento: () => void;
  /** Link do section-head "Ver todos os eventos" (mockup `.section-link`). */
  onVerTodos?: (() => void) | undefined;
}

export function ActiveEvents({
  eventos,
  loading,
  error,
  onRetry,
  contextoStaff,
  onGerenciar,
  onNovoEvento,
  onVerTodos,
}: ActiveEventsProps): JSX.Element {
  return (
    <section aria-label="Seus eventos ativos" className="flex flex-col">
      {/* Section head do mockup: baseline, título + link à direita */}
      <div className="flex items-baseline justify-between gap-[var(--spacing-3)] mb-[var(--layout-section-head-mb)]">
        <h2
          className={cn(
            'font-display italic',
            'text-[length:var(--section-title-size)] font-[var(--font-weight-bold)]',
            'tracking-[var(--section-title-spacing)]',
            'text-[var(--text-primary)]',
          )}
        >
          Seus eventos ativos
        </h2>
        {onVerTodos ? (
          <button
            type="button"
            onClick={onVerTodos}
            className={cn(
              'inline-flex items-center gap-[var(--spacing-1)]',
              'text-[length:var(--section-link-size)] text-[var(--text-tertiary)]',
              'transition-colors duration-[var(--motion-duration-fast)]',
              'hover:text-[var(--action-brand-tint-fg)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
            )}
          >
            Ver todos os eventos
            <ChevronRight
              aria-hidden
              className="w-[var(--section-link-icon-size)] h-[var(--section-link-icon-size)]"
            />
          </button>
        ) : null}
      </div>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando eventos"
          className="flex flex-col gap-[var(--layout-list-gap)]"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-16" />
          ))}
        </div>
      ) : error ? (
        <PanelError message="Não foi possível carregar seus eventos." onRetry={onRetry} />
      ) : !eventos || eventos.length === 0 ? (
        contextoStaff ? (
          <EmptyState
            title="Você ainda não organiza eventos"
            description="Este resumo é do seu escopo. Os eventos do tenant aparecem no painel de quem os criou."
          />
        ) : (
          <EmptyState
            title="Você ainda não tem eventos ativos"
            description="Crie seu primeiro evento para vender ingressos e operar no dia da prova."
            action={
              <Button variant="primary" onClick={onNovoEvento}>
                Crie seu primeiro evento
              </Button>
            }
          />
        )
      ) : (
        <ul role="list" className="flex flex-col gap-[var(--layout-list-gap)]">
          {eventos.map((evento) => {
            const status = STATUS[evento.status] ?? STATUS.rascunho;
            return (
              <li key={evento.slug}>
                <EventRow
                  name={evento.nome}
                  thumbVariant={evento.thumbVariant}
                  metaItems={[
                    evento.quando,
                    evento.esgotando ? (
                      <Badge variant="alerta">Últimas vagas</Badge>
                    ) : null,
                  ]}
                  count={{
                    value: formatInt(evento.qtdInscritos),
                    ...(evento.capacidade !== null
                      ? { total: formatInt(evento.capacidade) }
                      : {}),
                    label: 'Inscrições',
                  }}
                  badge={<Badge variant={status.variant}>{status.label}</Badge>}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onGerenciar(evento.slug)}
                    >
                      Gerenciar
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

ActiveEvents.displayName = 'ActiveEvents';
