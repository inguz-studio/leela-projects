// =============================================================================
// AtividadeFeed — "Atividade recente" do Overview (LEELA-FID-EVT-T3) como FEED
// TIPADO (não lista de nomes): avatar + texto por tipo + carimbo relativo +
// badge de estado. Fiel ao mockup `Overview do Evento.html`. Presentational.
//
// Reuso-first: Avatar, Badge, Skeleton do DS; itens vêm prontos de derivaAtividade.
// =============================================================================

import { Avatar, Badge, Skeleton } from '@leela/design-system';
import type { AtividadeItem } from './atividade';

export interface AtividadeFeedProps {
  itens: AtividadeItem[];
  loading: boolean;
}

function textoDe(item: AtividadeItem): JSX.Element {
  const strong = (t: string): JSX.Element => (
    <strong className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{t}</strong>
  );
  const mut = (t: string): JSX.Element => <span className="text-[var(--text-tertiary)]">{t}</span>;
  if (item.tipo === 'confirmado') {
    return (
      <>
        Pagamento confirmado {mut('·')} {strong(item.nome)} {mut('·')} {item.modalidade}
      </>
    );
  }
  if (item.tipo === 'pendente') {
    return (
      <>
        {strong(item.nome)} aguarda pagamento {mut('·')} {item.modalidade}
      </>
    );
  }
  return (
    <>
      Pagamento falhou {mut('·')} {strong(item.nome)} {mut('·')} {item.modalidade}
    </>
  );
}

export function AtividadeFeed({ itens, loading }: AtividadeFeedProps): JSX.Element {
  return (
    <section aria-label="Atividade recente" className="rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="mb-[var(--spacing-4)] flex items-baseline justify-between">
        <h3 className="font-display italic font-[var(--font-weight-bold)] text-[length:var(--font-size-md)] text-[var(--text-primary)]">
          Atividade recente
        </h3>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando atividade" className="flex flex-col gap-[var(--spacing-3)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhuma atividade recente.
        </p>
      ) : (
        <ul role="list" className="flex flex-col">
          {itens.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-[var(--spacing-3)] border-b border-[var(--border-subtle)] py-[var(--spacing-3)] last:border-b-0"
            >
              <Avatar size="sm" name={item.nome} />
              <p className="min-w-0 flex-1 text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                {textoDe(item)}
                {item.badge ? (
                  <Badge variant={item.badge.variant} className="ml-[var(--spacing-2)]">
                    {item.badge.label}
                  </Badge>
                ) : null}
              </p>
              <span className="shrink-0 text-[length:var(--font-size-xs)] tabular-nums text-[var(--text-tertiary)]">
                {item.quando}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

AtividadeFeed.displayName = 'AtividadeFeed';
