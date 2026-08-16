// =============================================================================
// ComunicadosList — lista de comunicados do club (S108-T2). 4 KPIs + filter
// bar com 3 grupos (status × canal × origem = interseção) + lista com borda
// esquerda colorida por status e popover contextual por status (RN-130).
// Filtro que zera → EmptyState. Stateful de UI; dados/ações vêm por props.
// =============================================================================

import { useMemo, useState } from 'react';
import {
  KpiCard,
  Badge,
  Button,
  EmptyState,
  DropdownMenu,
  FilterBar,
  FilterChips,
  IconButton,
  ResultCount,
  SearchInput,
  Skeleton,
} from '@leela/design-system';
import { MoreVertical } from 'lucide-react';
import type {
  CanalComunicado,
  Comunicado,
  OrigemComunicado,
  StatusComunicado,
} from '@leela/core';
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
      <DropdownMenu
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
          <IconButton aria-label={`Ações de ${c.titulo}`}>
            <MoreVertical />
          </IconButton>
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

      <FilterBar
        label="comunicados"
        search={
          <SearchInput
            aria-label="Buscar comunicado por título"
            placeholder="Buscar por título"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            shortcutLabel={null}
          />
        }
        facets={
          <>
            <FilterChips
              label="Status"
              options={STATUS_OPCOES.map((s) => ({ id: s.id, label: s.label }))}
              selected={status ? [status] : []}
              onChange={(next) => setStatus((next[0] as StatusComunicado | undefined) ?? null)}
            />
            <FilterChips
              label="Canal"
              options={CANAL_OPCOES.map((c) => ({ id: c, label: canalLabel(c) }))}
              selected={canais}
              onChange={(next) => setCanais(next as CanalComunicado[])}
              multiple
            />
            <FilterChips
              label="Origem"
              options={ORIGEM_OPCOES.map((o) => ({ id: o, label: origemLabel(o) }))}
              selected={origem ? [origem] : []}
              onChange={(next) => setOrigem((next[0] as OrigemComunicado | undefined) ?? null)}
            />
          </>
        }
        count={
          <ResultCount
            visiveis={filtrados.length}
            total={kpis.total}
            substantivo={{ singular: 'comunicado', plural: 'comunicados' }}
          />
        }
      />

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
