// =============================================================================
// Countdown — próximo evento + ações rápidas (S602-T1). Presentational puro.
// Mostra dias restantes ("08 dias restantes"), inscritos/vagas ("453/47") e
// atalhos: Check-in (balcão E03), Gerenciar (detalhe do evento). Abaixo, ações
// rápidas gerais (novo evento, ver todos). EmptyState sem evento futuro.
// =============================================================================

import { Button, Skeleton } from '@leela/design-system';
import type { CountdownView } from '../_lib/countdown';
import { formatInt } from '../_lib/format';

export interface CountdownProps {
  countdown: CountdownView | null;
  loading: boolean;
  onNavigate: (href: string) => void;
  onNovoEvento: () => void;
}

export function Countdown({
  countdown,
  loading,
  onNavigate,
  onNovoEvento,
}: CountdownProps): JSX.Element {
  return (
    <section aria-label="Próximo evento" className="flex flex-col gap-[var(--spacing-4)]">
      <div className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
        <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Próximo evento
        </h2>

        {loading ? (
          <div role="status" aria-label="Carregando próximo evento" className="flex flex-col gap-[var(--spacing-2)]">
            <Skeleton variant="text" />
            <Skeleton variant="rect" className="h-10" />
          </div>
        ) : !countdown ? (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Nenhum evento agendado.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="truncate text-[var(--text-primary)] font-[var(--font-weight-medium)]">
                {countdown.nome}
              </span>
              <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
                {countdown.rotulo}
              </span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                {countdown.vagasRestantes !== null
                  ? `${formatInt(countdown.qtdInscritos)}/${formatInt(countdown.vagasRestantes)} inscritos / vagas`
                  : `${formatInt(countdown.qtdInscritos)} inscritos`}
              </span>
            </div>
            <div className="flex flex-wrap gap-[var(--spacing-2)]">
              <Button variant="primary" size="sm" onClick={() => onNavigate(countdown.checkinHref)}>
                Check-in
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate(countdown.gerenciarHref)}>
                Gerenciar
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-[var(--spacing-2)]">
        <h3 className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] uppercase tracking-widest text-[var(--text-tertiary)]">
          Ações rápidas
        </h3>
        <div className="flex flex-wrap gap-[var(--spacing-2)]">
          <Button variant="secondary" size="sm" onClick={onNovoEvento}>
            + Novo evento
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/eventos')}>
            Ver todos os eventos
          </Button>
        </div>
      </div>
    </section>
  );
}

Countdown.displayName = 'Countdown';
