// =============================================================================
// ActiveEvents — bloco "Seus eventos ativos" (S601-T1). Presentational puro.
// Cada linha: nome, status (badge semântico), inscritos/capacidade, badge
// "Últimas vagas" (esgotando), e "Gerenciar" → detalhe do evento (E03).
// EmptyState com CTA quando não há eventos ativos; skeleton no load.
// =============================================================================

import { Badge, Button, EmptyState, Skeleton, type BadgeProps } from '@leela/design-system';
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
}

function ocupacaoLabel(view: EventoAtivoView): string {
  if (view.capacidade !== null) {
    return `${formatInt(view.qtdInscritos)}/${formatInt(view.capacidade)}`;
  }
  return `${formatInt(view.qtdInscritos)} inscritos`;
}

export function ActiveEvents({
  eventos,
  loading,
  error,
  onRetry,
  contextoStaff,
  onGerenciar,
  onNovoEvento,
}: ActiveEventsProps): JSX.Element {
  return (
    <section aria-label="Seus eventos ativos" className="flex flex-col gap-[var(--spacing-3)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Seus eventos ativos
      </h2>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando eventos"
          className="flex flex-col gap-[var(--spacing-2)]"
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
        <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
          {eventos.map((evento) => {
            const status = STATUS[evento.status] ?? STATUS.rascunho;
            return (
              <li
                key={evento.slug}
                className="flex items-center justify-between gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] px-[var(--spacing-4)] py-[var(--spacing-3)]"
              >
                <div className="flex min-w-0 flex-col gap-[var(--spacing-1)]">
                  <div className="flex items-center gap-[var(--spacing-2)] flex-wrap">
                    <span className="truncate text-[var(--text-primary)] font-[var(--font-weight-medium)]">
                      {evento.nome}
                    </span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {evento.esgotando ? <Badge variant="alerta">Últimas vagas</Badge> : null}
                  </div>
                  <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                    {ocupacaoLabel(evento)}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onGerenciar(evento.slug)}>
                  Gerenciar
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

ActiveEvents.displayName = 'ActiveEvents';
