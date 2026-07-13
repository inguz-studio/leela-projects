// =============================================================================
// SaldoCards — os 3 cards do painel-slim de repasse (E09s-L3-T1). Flat (§2.16):
// vendido / disponível / retido. Leem SÓ `saldo/current` (∑ do servidor —
// RN-350/351); o cliente NUNCA varre eventos nem soma. Presentational puro.
//
// Retido: enquanto `retido > 0` exibe o badge "Liberado após o encerramento do
// evento" (RN-350 — a retenção libera quando o evento é encerrado, automático
// por data no cron L2-T6; o organizador NÃO encerra o próprio evento).
//
// EmptyState honesto (§2.12): sem venda (saldo null OU vendidoBruto === 0) a
// tela mostra "Nenhuma movimentação", não três zeros ambíguos.
// =============================================================================

import { Badge, EmptyState, Skeleton } from '@leela/design-system';
import type { SaldoRepasse } from '@leela/core';
import { formatBRL } from '../_lib/format';

export interface SaldoCardsProps {
  saldo: SaldoRepasse | null;
  loading: boolean;
}

export function SaldoCards({ saldo, loading }: SaldoCardsProps): JSX.Element {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando saldo de repasse"
        className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-3"
      >
        <Skeleton variant="rect" className="h-28" />
        <Skeleton variant="rect" className="h-28" />
        <Skeleton variant="rect" className="h-28" />
      </div>
    );
  }

  // Sem venda: estado honesto (§2.12) — não fabricamos três zeros que parecem
  // "saldo disponível 0" de um produtor que já vendeu.
  if (!saldo || saldo.vendidoBruto === 0) {
    return (
      <EmptyState
        title="Nenhuma movimentação"
        description="Os valores de repasse aparecem após a primeira inscrição confirmada em um evento seu."
      />
    );
  }

  const retido = saldo.retido;

  return (
    <section
      aria-label="Saldo de repasse"
      className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-3"
    >
      <CardValor rotulo="Vendido" valor={formatBRL(saldo.vendidoBruto)} tom="primary" />
      <CardValor rotulo="Disponível" valor={formatBRL(saldo.disponivel)} tom="success" />
      <CardValor
        rotulo="Retido"
        valor={formatBRL(retido)}
        tom="warning"
        badge={
          retido > 0 ? (
            <Badge variant="alerta">Liberado após o encerramento do evento</Badge>
          ) : undefined
        }
      />
    </section>
  );
}

/** Card flat (§2.16) de valor — rótulo, valor destacado e badge opcional. */
function CardValor({
  rotulo,
  valor,
  tom,
  badge,
}: {
  rotulo: string;
  valor: string;
  tom: 'primary' | 'warning' | 'success';
  badge?: JSX.Element | undefined;
}): JSX.Element {
  const cor =
    tom === 'success'
      ? 'text-[var(--text-success)]'
      : tom === 'warning'
        ? 'text-[var(--feedback-warning-fg)]'
        : 'text-[var(--text-primary)]';
  return (
    <div className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </span>
      <span
        className={`text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] [font-variant-numeric:tabular-nums] ${cor}`}
      >
        {valor}
      </span>
      {badge && <div className="flex flex-wrap">{badge}</div>}
    </div>
  );
}

SaldoCards.displayName = 'SaldoCards';
