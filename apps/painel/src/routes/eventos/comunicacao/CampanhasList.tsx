// =============================================================================
// CampanhasList — lista de campanhas do evento por ESTADO (S401-T2 · E06-L3).
//
// RN-130: 3 grupos (enviadas → agendadas → rascunhos), cada linha com o dado
// que importa no estado (enviada: alcance; agendada: disparo em; rascunho:
// criado em). Filter bar (busca × canal = interseção) + contador "mostrando
// X de Y" (aria-live) + popover contextual por linha (ações por estado). Filtro
// que zera → EmptyState honesto. Stateful de UI; dados/ações vêm por props.
//
// Reuso-first: DS (Badge, Button, Chip, EmptyState, Popover, Skeleton) + KpiCard
// do evento + helpers PUROS de `_lib/campanhas` (labels feminino/estado, filtro,
// agrupamento, KPIs, ações). Zero hardcode de token; cor de borda por token.
// =============================================================================

import { useMemo, useState } from 'react';
import { KpiCard, Badge, Button, Chip, EmptyState, Popover, Skeleton } from '@leela/design-system';
import type { Campanha, CanalCampanha, StatusCampanha } from '@leela/core';
import { formatDataCurta, formatInt } from '../_lib/format';
import {
  acoesCampanha,
  agruparPorEstado,
  canalCampanhaLabel,
  filtrarCampanhas,
  kpisCampanhas,
  segmentoCampanhaLabel,
  statusCampanhaBadge,
  type AcaoCampanhaId,
} from '../_lib/campanhas';

export interface CampanhasListProps {
  campanhas: Campanha[] | null;
  loading: boolean;
  error: Error | null;
  onNova: () => void;
  onAcao?: (campanha: Campanha, acao: AcaoCampanhaId) => void;
}

const CANAL_OPCOES: CanalCampanha[] = ['push', 'email'];

/** Título de cada grupo por estado (plural feminino da UI). */
const GRUPO_TITULO: Record<StatusCampanha, string> = {
  enviado: 'Enviadas',
  agendado: 'Agendadas',
  rascunho: 'Rascunhos',
};

/** Metadado específico do estado (RN-130): o número/data que importa por grupo. */
function metadadoEstado(c: Campanha): string {
  switch (c.status) {
    case 'enviado':
      return `${formatInt(c.alcance)} alcançados`;
    case 'agendado':
      return `disparo em ${formatDataCurta(c.agendadoPara)}`;
    case 'rascunho':
      return `criado em ${formatDataCurta(c.criadoEm)}`;
    default:
      return '';
  }
}

function CampanhaCard({
  c,
  aberto,
  onAbrir,
  onAcao,
}: {
  c: Campanha;
  aberto: boolean;
  onAbrir: (open: boolean) => void;
  onAcao: ((c: Campanha, a: AcaoCampanhaId) => void) | undefined;
}): JSX.Element {
  const badge = statusCampanhaBadge(c.status);
  const acoes = acoesCampanha(c.status);
  return (
    <article
      className="flex items-start justify-between gap-[var(--spacing-4)] rounded-[var(--card-radius)] border-l-4 bg-[var(--surface-raised)] p-[var(--spacing-5)]"
      style={{ borderLeftColor: `var(${badge.borderVar})` }}
    >
      <div className="flex min-w-0 flex-col gap-[var(--spacing-2)]">
        <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
          <h4 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {c.titulo}
          </h4>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="line-clamp-2 text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          {c.conteudo}
        </p>
        <p className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          <span>{c.canal.map(canalCampanhaLabel).join(' + ')}</span>
          <span aria-hidden>·</span>
          <span>{segmentoCampanhaLabel(c.segmento)}</span>
          <span aria-hidden>·</span>
          <span className="[font-variant-numeric:tabular-nums]">{metadadoEstado(c)}</span>
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

export function CampanhasList({
  campanhas,
  loading,
  error,
  onNova,
  onAcao,
}: CampanhasListProps): JSX.Element {
  const [busca, setBusca] = useState('');
  const [canais, setCanais] = useState<CanalCampanha[]>([]);
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);

  const todas = campanhas ?? [];
  const kpis = useMemo(() => kpisCampanhas(todas), [todas]);
  const filtradas = useMemo(
    () => filtrarCampanhas(todas, { busca, canais }),
    [todas, busca, canais],
  );
  const grupos = useMemo(() => agruparPorEstado(filtradas), [filtradas]);

  function toggleCanal(c: CanalCampanha): void {
    setCanais((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando campanhas" className="flex flex-col gap-[var(--spacing-4)]">
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
        Não foi possível carregar as campanhas. Tente novamente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <section
        aria-label="Indicadores de campanhas"
        className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
      >
        <KpiCard label="Total" value={formatInt(kpis.total)} />
        <KpiCard label="Enviadas" value={formatInt(kpis.enviadas)} />
        <KpiCard label="Agendadas" value={formatInt(kpis.agendadas)} />
        <KpiCard label="Alcance total" value={formatInt(kpis.alcanceTotal)} hint="inscritos alcançados" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-4)]">
        <div>
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Campanhas
          </h3>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Avise seus inscritos por push e e-mail, segmentado por modalidade, kit ou status.
          </p>
        </div>
        <Button variant="primary" onClick={onNova}>
          + Nova campanha
        </Button>
      </div>

      <div className="flex flex-col gap-[var(--spacing-3)]">
        <input
          type="search"
          aria-label="Buscar campanha por título"
          placeholder="Buscar por título"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-md rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
        />
        <div role="group" aria-label="Filtrar por canal" className="flex flex-wrap gap-[var(--spacing-2)]">
          {CANAL_OPCOES.map((c) => (
            <Chip key={c} active={canais.includes(c)} onClick={() => toggleCanal(c)}>
              {canalCampanhaLabel(c)}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
        Mostrando {formatInt(filtradas.length)} de {formatInt(kpis.total)} campanhas
      </p>

      {filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma campanha encontrada"
          description={
            kpis.total === 0
              ? 'Crie a primeira campanha para avisar seus inscritos sem depender do WhatsApp.'
              : 'Nenhuma campanha encontrada com os filtros aplicados.'
          }
        />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-6)]">
          {grupos.map((grupo) => (
            <section
              key={grupo.status}
              aria-label={GRUPO_TITULO[grupo.status]}
              className="flex flex-col gap-[var(--spacing-3)]"
            >
              <h3 className="flex items-baseline gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] uppercase tracking-wide text-[var(--text-tertiary)]">
                {GRUPO_TITULO[grupo.status]}
                <span className="[font-variant-numeric:tabular-nums]">{formatInt(grupo.campanhas.length)}</span>
              </h3>
              <div className="flex flex-col gap-[var(--spacing-3)]">
                {grupo.campanhas.map((c) => (
                  <CampanhaCard
                    key={c.id}
                    c={c}
                    aberto={popoverAberto === c.id}
                    onAbrir={(open) => setPopoverAberto(open ? c.id : null)}
                    onAcao={onAcao}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

CampanhasList.displayName = 'CampanhasList';
