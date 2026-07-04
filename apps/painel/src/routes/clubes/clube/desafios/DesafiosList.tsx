// =============================================================================
// DesafiosList — lista de desafios do clube (S105-T2). 4 KPIs + filtros
// combináveis (busca × status EXCLUSIVO × modelo TOGGLES = interseção) +
// seções "em andamento" / "encerrados" com CardDesafio (DS) e popover de 6
// ações por card (C3: exclusivo, um aberto por vez). Filtro que zera → EmptyState.
// Stateful de UI (filtros/popover); dados e navegação vêm por props.
// =============================================================================

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  CardDesafio,
  Chip,
  EmptyState,
  Popover,
  Skeleton,
} from '@leela/design-system';
import type { Desafio, ModeloDesafio, StatusDesafio } from '@leela/core';
import { copyPreparacao } from '@leela/core';
import { KpiCard } from '../../_components/KpiCard';
import { formatInt } from '../../_lib/format';
import {
  agruparDesafios,
  filtrarDesafios,
  kpisDesafios,
  modeloDesafioLabel,
  recompensaLabel,
  statusDesafioBadge,
} from '../../_lib/desafios';

export type AcaoDesafioId =
  | 'detalhes'
  | 'editar'
  | 'duplicar'
  | 'encerrar'
  | 'compartilhar'
  | 'excluir';

export interface DesafiosListProps {
  desafios: Desafio[] | null;
  loading: boolean;
  error: Error | null;
  /** "+ Criar desafio" → editor sem `?id`. */
  onCriar: () => void;
  /** Ação do popover de um card (navegação/mutação decididas no container). */
  onAcao?: (desafio: Desafio, acao: AcaoDesafioId) => void;
}

const STATUS_OPCOES: { id: StatusDesafio; label: string }[] = [
  { id: 'ativo', label: 'Ativos' },
  { id: 'rascunho', label: 'Rascunhos' },
  { id: 'encerrado', label: 'Encerrados' },
];

const MODELO_OPCOES: ModeloDesafio[] = ['A', 'B', 'C'];

interface AcaoDef {
  id: AcaoDesafioId;
  label: string;
  destructive?: boolean;
}

const ACOES: readonly AcaoDef[] = [
  { id: 'detalhes', label: 'Ver detalhes' },
  { id: 'editar', label: 'Editar desafio' },
  { id: 'duplicar', label: 'Duplicar' },
  { id: 'encerrar', label: 'Encerrar' },
  { id: 'compartilhar', label: 'Compartilhar' },
  { id: 'excluir', label: 'Excluir', destructive: true },
];

function DesafioMeta({ desafio }: { desafio: Desafio }): JSX.Element {
  const badge = statusDesafioBadge(desafio.status);
  const prep = desafio.eventoVinculadoId ? copyPreparacao('evento vinculado') : '';
  return (
    <span className="flex flex-wrap items-center gap-[var(--spacing-2)]">
      <Badge variant={badge.variant}>{badge.label}</Badge>
      <span>{modeloDesafioLabel(desafio.modelo)}</span>
      <span aria-hidden>·</span>
      <span>{formatInt(desafio.qtdParticipantes)} participantes</span>
      <span aria-hidden>·</span>
      <span>{recompensaLabel(desafio.recompensaTipo)}</span>
      {desafio.patrocinioId ? (
        <>
          <span aria-hidden>·</span>
          <Badge variant="heroico">Patrocinado</Badge>
        </>
      ) : null}
      {prep ? <span className="text-[var(--text-tertiary)]">{prep}</span> : null}
    </span>
  );
}

function DesafioCardComActions({
  desafio,
  aberto,
  onAbrir,
  onAcao,
}: {
  desafio: Desafio;
  aberto: boolean;
  onAbrir: (open: boolean) => void;
  onAcao: ((desafio: Desafio, acao: AcaoDesafioId) => void) | undefined;
}): JSX.Element {
  return (
    <div className="relative">
      <CardDesafio
        title={desafio.nome}
        progress={desafio.progressoPct}
        meta={<DesafioMeta desafio={desafio} />}
      />
      <div className="absolute right-[var(--spacing-3)] top-[var(--spacing-3)]">
        <Popover
          open={aberto}
          onOpenChange={onAbrir}
          align="right"
          actions={ACOES.map((a) => ({
            id: a.id,
            label: a.label,
            ...(a.destructive ? { destructive: true } : {}),
            onClick: () => onAcao?.(desafio, a.id),
          }))}
          trigger={
            <button
              type="button"
              aria-label={`Ações de ${desafio.nome}`}
              className="rounded-[var(--radius-sm)] px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)]"
            >
              <span aria-hidden>⋯</span>
            </button>
          }
        />
      </div>
    </div>
  );
}

export function DesafiosList({
  desafios,
  loading,
  error,
  onCriar,
  onAcao,
}: DesafiosListProps): JSX.Element {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusDesafio | null>(null);
  const [modelos, setModelos] = useState<ModeloDesafio[]>([]);
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);

  const todos = desafios ?? [];
  const kpis = useMemo(() => kpisDesafios(todos), [todos]);
  const filtrados = useMemo(
    () => filtrarDesafios(todos, { busca, status, modelos }),
    [todos, busca, status, modelos],
  );
  const { emAndamento, encerrados } = useMemo(
    () => agruparDesafios(filtrados),
    [filtrados],
  );

  function toggleModelo(m: ModeloDesafio): void {
    setModelos((atual) =>
      atual.includes(m) ? atual.filter((x) => x !== m) : [...atual, m],
    );
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando desafios" className="flex flex-col gap-[var(--spacing-4)]">
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
        Não foi possível carregar os desafios. Tente novamente.
      </div>
    );
  }

  const nenhumResultado = filtrados.length === 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <section
        aria-label="Indicadores de desafios"
        className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
      >
        <KpiCard label="Total de desafios" value={formatInt(kpis.total)} />
        <KpiCard label="Ativos" value={formatInt(kpis.ativos)} />
        <KpiCard label="Participantes" value={formatInt(kpis.participantes)} />
        <KpiCard label="Progresso médio" value={`${kpis.progressoMedio}%`} hint="dos desafios ativos" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-4)]">
        <div>
          <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Desafios
          </h2>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {formatInt(kpis.total)} desafios · {formatInt(kpis.ativos)} ativos
          </p>
        </div>
        <Button variant="primary" onClick={onCriar}>
          + Criar desafio
        </Button>
      </div>

      <div className="flex flex-col gap-[var(--spacing-3)]">
        <input
          type="search"
          aria-label="Buscar desafio por nome"
          placeholder="Buscar por nome"
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
          <div role="group" aria-label="Filtrar por modelo" className="flex flex-wrap gap-[var(--spacing-2)]">
            {MODELO_OPCOES.map((m) => (
              <Chip key={m} active={modelos.includes(m)} onClick={() => toggleModelo(m)}>
                {`Modelo ${m}`}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
        Mostrando {formatInt(filtrados.length)} de {formatInt(kpis.total)} desafios
      </p>

      {nenhumResultado ? (
        <EmptyState
          title="Nenhum desafio encontrado"
          description="Nenhum desafio casa com os filtros aplicados."
        />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-6)]">
          {emAndamento.length > 0 ? (
            <section aria-label="Desafios em andamento" className="flex flex-col gap-[var(--spacing-3)]">
              <h3 className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] uppercase tracking-[var(--table-header-spacing)] text-[var(--text-secondary)]">
                Em andamento
              </h3>
              <div className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-2">
                {emAndamento.map((d) => (
                  <DesafioCardComActions
                    key={d.id}
                    desafio={d}
                    aberto={popoverAberto === d.id}
                    onAbrir={(open) => setPopoverAberto(open ? d.id : null)}
                    onAcao={onAcao}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {encerrados.length > 0 ? (
            <section aria-label="Desafios encerrados" className="flex flex-col gap-[var(--spacing-3)]">
              <h3 className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] uppercase tracking-[var(--table-header-spacing)] text-[var(--text-secondary)]">
                Encerrados
              </h3>
              <div className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-3">
                {encerrados.map((d) => (
                  <DesafioCardComActions
                    key={d.id}
                    desafio={d}
                    aberto={popoverAberto === d.id}
                    onAbrir={(open) => setPopoverAberto(open ? d.id : null)}
                    onAcao={onAcao}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

DesafiosList.displayName = 'DesafiosList';
