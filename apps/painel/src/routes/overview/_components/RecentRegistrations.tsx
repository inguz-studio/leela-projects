// =============================================================================
// RecentRegistrations — "Últimas inscrições" cross-evento (S601-T2).
// Presentational puro. Badge RN-204: Pago (confirmado) · Pendente (pendente) ·
// Recusado (cancelado). EmptyState quando vazio; skeleton no load.
//
// Honestidade (#13): a fonte na Onda 1 é a 1ª página de cada evento ordenada
// por atletaNome (api-client `listarInscritos`), reordenada por data DENTRO
// dessa amostra alfabética — logo NÃO é o feed de chegada global. Enquanto o
// helper collection-group por criadoEm não existir, a UI rotula a degradação
// em vez de prometer recência que não entrega.
// =============================================================================

import { Badge, Skeleton } from '@leela/design-system';
import type { InscricaoRecenteView } from '../_lib/recentRegistrations';
import { PanelError } from './PanelError';

export interface RecentRegistrationsProps {
  inscricoes: InscricaoRecenteView[] | null;
  loading: boolean;
  /** Falha ao carregar (própria ou herdada da lista de eventos) — não trava
   *  em skeleton eterno nem finge "nenhuma inscrição" (#03/#39). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
}

export function RecentRegistrations({
  inscricoes,
  loading,
  error,
  onRetry,
}: RecentRegistrationsProps): JSX.Element {
  return (
    <section aria-label="Últimas inscrições" className="flex flex-col gap-[var(--spacing-3)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Últimas inscrições
      </h2>

      {loading ? (
        <div
          role="status"
          aria-label="Carregando inscrições"
          className="flex flex-col gap-[var(--spacing-2)]"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      ) : error ? (
        <PanelError message="Não foi possível carregar as inscrições." onRetry={onRetry} />
      ) : !inscricoes || inscricoes.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhuma inscrição recente.
        </p>
      ) : (
        <>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Amostra por evento, não a ordem de chegada completa.
          </p>
          <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
            {inscricoes.map((inscricao) => (
            <li
              key={inscricao.id}
              className="flex items-center justify-between gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] px-[var(--spacing-4)] py-[var(--spacing-3)]"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[var(--text-primary)]">{inscricao.atletaNome}</span>
                <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                  {[inscricao.modalidade, inscricao.eventoNome].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Badge variant={inscricao.badge.variant}>{inscricao.badge.label}</Badge>
            </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

RecentRegistrations.displayName = 'RecentRegistrations';
