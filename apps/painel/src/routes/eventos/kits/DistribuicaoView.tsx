// =============================================================================
// DistribuicaoView — progresso de retirada por kit e por modalidade (S205-T4).
// Dado real: presença dos inscritos = retirada. Presentational.
// =============================================================================

import type { ReactNode } from 'react';
import { Skeleton } from '@leela/design-system';
import type { Inscrito } from '@leela/core';
import { ProgressoBarra } from './ProgressoBarra';
import {
  distribuicaoPorKit,
  distribuicaoPorModalidade,
} from '../_lib/distribuicao';
import { formatInt } from '../_lib/format';

export interface DistribuicaoViewProps {
  inscritos: Inscrito[];
  modalidades: string[];
  loading: boolean;
  error: Error | null;
}

export function DistribuicaoView({
  inscritos,
  modalidades,
  loading,
  error,
}: DistribuicaoViewProps): JSX.Element {
  if (loading) {
    return (
      <div role="status" aria-label="Carregando distribuição" className="flex flex-col gap-[var(--spacing-3)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--text-danger)]">Não foi possível carregar a distribuição.</p>;
  }

  const porKit = distribuicaoPorKit(inscritos).filter((k) => k.total > 0);
  const porModalidade = distribuicaoPorModalidade(inscritos, modalidades).filter((m) => m.total > 0);

  return (
    <div className="flex flex-col gap-[var(--spacing-8)]">
      <Secao titulo="Retiradas por kit">
        {porKit.map((k) => (
          <LinhaProgresso
            key={k.kit}
            titulo={k.label}
            retirados={k.retirados}
            total={k.total}
            pct={k.pct}
          />
        ))}
        {porKit.length === 0 && <Vazio />}
      </Secao>

      <Secao titulo="Retiradas por modalidade">
        {porModalidade.map((m) => (
          <LinhaProgresso
            key={m.modalidade}
            titulo={m.modalidade}
            retirados={m.retirados}
            total={m.total}
            pct={m.pct}
          />
        ))}
        {porModalidade.length === 0 && <Vazio />}
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }): JSX.Element {
  return (
    <section aria-label={titulo} className="flex flex-col gap-[var(--spacing-4)]">
      <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {titulo}
      </h2>
      <div className="flex flex-col gap-[var(--spacing-4)]">{children}</div>
    </section>
  );
}

function LinhaProgresso({
  titulo,
  retirados,
  total,
  pct,
}: {
  titulo: string;
  retirados: number;
  total: number;
  pct: number;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <div className="flex items-center justify-between text-[length:var(--font-size-sm)]">
        <span className="text-[var(--text-primary)]">{titulo}</span>
        <span className="text-[var(--text-secondary)]">
          {formatInt(retirados)} / {formatInt(total)} ({pct}%)
        </span>
      </div>
      <ProgressoBarra pct={pct} label={`Retirada de ${titulo}`} />
    </div>
  );
}

function Vazio(): JSX.Element {
  return (
    <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
      Sem inscritos confirmados nesta categoria.
    </p>
  );
}

DistribuicaoView.displayName = 'DistribuicaoView';
