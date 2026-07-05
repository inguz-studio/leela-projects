// =============================================================================
// ComunicadosList — lista de comunicados do clube (S108-T2). 4 KPIs + filter
// bar com 3 grupos (status × canal × origem = interseção) + lista com borda
// esquerda colorida por status e popover contextual por status (RN-130).
// Filtro que zera → EmptyState. Stateful de UI; dados/ações vêm por props.
// =============================================================================

import { useMemo, useState } from 'react';
import { Badge, Button, Chip, EmptyState, Popover, Skeleton } from '@leela/design-system';
import type {
  CanalComunicado,
  Comunicado,
  OrigemComunicado,
  StatusComunicado,
} from '@leela/core';
import { KpiCard } from '../../_components/KpiCard';
import { formatInt } from '../../_lib/format';
import {
  acoesComunicado,
  canalLabel,
  filtrarComunicados,
  kpisComunicados,
  origemLabel,
  statusComunicadoBadge,
  type AcaoComunicadoId,
} from '../../_lib/comunicados';

export interface ComunicadosListProps {
  comunicados: Comunicado[] | null;
  loading: boolean;
  error: Error | null;
  onNova: () => void;
  onAcao?: (comunicado: Comunicado, acao: AcaoComunicadoId) => void;
}

const STATUS_OPCOES: { id: StatusComunicado; label: string }[] = [
  { id: 'enviado', label: 'Enviados' },
  { id: 'agendado', label: 'Agendados' },
  { id: 'rascunho', label: 'Rascunhos' },
];
const CANAL_OPCOES: CanalComunicado[] = ['push', 'email'];
const ORIGEM_OPCOES: OrigemComunicado[] = ['manual', 'automatizada'];

function ComunicadoCard({
  c,
  aberto,
  onAbrir,
  onAcao,
}: {
  c: Comunicado;
  aberto: boolean;
  onAbrir: (open: boolean) => void;
  onAcao: ((c: Comunicado, a: AcaoComunicadoId) => void) | undefined;
}): JSX.Element {
  const badge = statusComunicadoBadge(c.status);
  const acoes = acoesComunicado(c.status);
  return (
    <article
      className="flex items-start justify-between gap-[var(--spacing-4)] rounded-[var(--card-radius)] border-l-4 bg-[var(--surface-raised)] p-[var(--spacing-5)]"
      style={{ borderLeftColor: `var(${badge.borderVar})` }}
    >
      <div className="flex min-w-0 flex-col gap-[var(--spacing-2)]">
        <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {c.titulo}
          </h3>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="line-clamp-2 text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{c.conteudo}</p>
        <p className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          <span>{c.canal.map(canalLabel).join(' + ')}</span>
          <span aria-hidden>·</span>
          <span>{origemLabel(c.origem)}</span>
          {c.status === 'enviado' ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatInt(c.alcance)} alcançados</span>
            </>
          ) : null}
        </p>
      </div>
      <Popover
        open={aberto}
        onOpenChange={onAbrir}
        align="right"
        actions={acoes.map((a) => ({
          id: a.id,
          label: a.label,
          ...(a.destructive ? { destructive: true } : {}),
          onClick: () => onAcao?.(c, a.id),
        }))}
        trigger={
          <button
            type="button"
            aria-label={`Ações de ${c.titulo}`}
            className="rounded-[var(--radius-sm)] px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)]"
          >
            <span aria-hidden>⋯</span>
          </button>
        }
      />
    </article>
  );
}

export function ComunicadosList({
  comunicados,
  loading,
  error,
  onNova,
  onAcao,
}: ComunicadosListProps): JSX.Element {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusComunicado | null>(null);
  const [canais, setCanais] = useState<CanalComunicado[]>([]);
  const [origem, setOrigem] = useState<OrigemComunicado | null>(null);
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);

  const todos = comunicados ?? [];
  const kpis = useMemo(() => kpisComunicados(todos), [todos]);
  const filtrados = useMemo(
    () => filtrarComunicados(todos, { busca, status, canais, origem }),
    [todos, busca, status, canais, origem],
  );

  function toggleCanal(c: CanalComunicado): void {
    setCanais((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando comunicados" className="flex flex-col gap-[var(--spacing-4)]">
        <div className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-24" />
          ))}
        </div>
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
      >
        Não foi possível carregar os comunicados. Tente novamente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <section
        aria-label="Indicadores de comunicados"
        className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
      >
        <KpiCard label="Total" value={formatInt(kpis.total)} />
        <KpiCard label="Enviados" value={formatInt(kpis.enviados)} />
        <KpiCard label="Agendados" value={formatInt(kpis.agendados)} />
        <KpiCard label="Alcance total" value={formatInt(kpis.alcanceTotal)} hint="destinatários alcançados" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-4)]">
        <div>
          <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Comunicados
          </h2>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {formatInt(kpis.total)} comunicados · {formatInt(kpis.enviados)} enviados
          </p>
        </div>
        <Button variant="primary" onClick={onNova}>
          + Nova campanha
        </Button>
      </div>

      <div className="flex flex-col gap-[var(--spacing-3)]">
        <input
          type="search"
          aria-label="Buscar comunicado por título"
          placeholder="Buscar por título"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-md rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
        />
        <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-[var(--spacing-2)]">
            <Chip active={status === null} onClick={() => setStatus(null)}>
              Todos
            </Chip>
            {STATUS_OPCOES.map((s) => (
              <Chip key={s.id} active={status === s.id} onClick={() => setStatus(status === s.id ? null : s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
          <div role="group" aria-label="Filtrar por canal" className="flex flex-wrap gap-[var(--spacing-2)]">
            {CANAL_OPCOES.map((c) => (
              <Chip key={c} active={canais.includes(c)} onClick={() => toggleCanal(c)}>
                {canalLabel(c)}
              </Chip>
            ))}
          </div>
          <div role="group" aria-label="Filtrar por origem" className="flex flex-wrap gap-[var(--spacing-2)]">
            {ORIGEM_OPCOES.map((o) => (
              <Chip key={o} active={origem === o} onClick={() => setOrigem(origem === o ? null : o)}>
                {origemLabel(o)}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
        Mostrando {formatInt(filtrados.length)} de {formatInt(kpis.total)} comunicados
      </p>

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum comunicado encontrado"
          description="Nenhum comunicado casa com os filtros aplicados."
        />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          {filtrados.map((c) => (
            <ComunicadoCard
              key={c.id}
              c={c}
              aberto={popoverAberto === c.id}
              onAbrir={(open) => setPopoverAberto(open ? c.id : null)}
              onAcao={onAcao}
            />
          ))}
        </div>
      )}
    </div>
  );
}

ComunicadosList.displayName = 'ComunicadosList';
