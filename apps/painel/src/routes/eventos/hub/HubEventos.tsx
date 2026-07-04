// =============================================================================
// HubEventos — tela `/eventos` (S200-T2). Presentational: recebe estado async
// e callbacks. KPIs globais no topo, grid de EventoCard, EmptyState com CTA
// quando zero eventos, skeleton no load, bloco de erro no fail (§2.12).
// =============================================================================

import { Button, EmptyState, PageHeader, Skeleton } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { KpiCard } from '../_components/KpiCard';
import { EventoCard } from './EventoCard';
import { agregaKpisGlobais } from '../_lib/kpis';
import { formatBRL, formatInt } from '../_lib/format';

export interface HubEventosProps {
  eventos: Evento[] | null;
  loading: boolean;
  error: Error | null;
  onNovoEvento: () => void;
  onAbrirEvento: (slug: string) => void;
}

function KpisGlobais({ eventos }: { eventos: Evento[] }): JSX.Element {
  const kpis = agregaKpisGlobais(eventos);
  return (
    <section
      aria-label="Indicadores globais"
      className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4"
    >
      <KpiCard label="Eventos ativos" value={formatInt(kpis.eventosAtivos)} hint={`${formatInt(kpis.totalEventos)} no total`} />
      <KpiCard label="Inscritos" value={formatInt(kpis.totalInscritos)} />
      <KpiCard label="Receita consolidada" value={formatBRL(kpis.receitaConsolidada)} />
      <KpiCard label="Total de eventos" value={formatInt(kpis.totalEventos)} />
    </section>
  );
}

export function HubEventos({
  eventos,
  loading,
  error,
  onNovoEvento,
  onAbrirEvento,
}: HubEventosProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Eventos"
        subtitle="Gerencie seus eventos e abra o que quer operar"
        actions={
          <Button variant="primary" onClick={onNovoEvento}>
            + Novo evento
          </Button>
        }
      />

      <div className="flex flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]">
        {loading ? (
          <div
            role="status"
            aria-label="Carregando eventos"
            className="flex flex-col gap-[var(--spacing-6)]"
          >
            <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-[var(--spacing-5)] sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-56" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar seus eventos. Tente novamente.
          </div>
        ) : !eventos || eventos.length === 0 ? (
          <EmptyState
            title="Você ainda não criou nenhum evento"
            description="Crie seu primeiro evento para vender ingressos e operar no dia da prova."
            action={
              <Button variant="primary" onClick={onNovoEvento}>
                Criar evento
              </Button>
            }
          />
        ) : (
          <>
            <KpisGlobais eventos={eventos} />
            <section
              aria-label="Meus eventos"
              className="grid grid-cols-1 gap-[var(--spacing-5)] sm:grid-cols-2 lg:grid-cols-3"
            >
              {eventos.map((evento) => (
                <EventoCard
                  key={evento.id}
                  evento={evento}
                  onAbrir={onAbrirEvento}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

HubEventos.displayName = 'HubEventos';
