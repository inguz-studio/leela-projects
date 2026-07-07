// =============================================================================
// HubEventos — tela `/eventos` (S200). Decisão HÍBRIDO (FID-EVT-HUB): linhas
// densas (EventRow com thumb de FOTO + métricas inline) no lugar dos cards
// grandes — serve o JOB do Organizador: "abrir RÁPIDO o evento que gerencio".
//
// CORREÇÃO 1 (S200 vence o mockup): a faixa de KPIs globais consolidados FICA
// no topo — a story pede "hub com KPIs globais". CORREÇÃO 2 (L-005): filtro de
// status = faceta única → chips em UMA linha; a lista de eventos domina, o
// chrome não empilha.
//
// Presentational: recebe estado async + callbacks; estado local só de UI
// (filtro selecionado, menu aberto). KPIs consolidam TODOS os eventos (não o
// recorte do filtro). EmptyState com CTA quando zero eventos; skeleton no load;
// bloco de erro no fail (§2.12).
// =============================================================================

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  DropdownMenu,
  EmptyState,
  EventRow,
  IconButton,
  PageHeader,
  Skeleton,
} from '@leela/design-system';
import { MoreVertical } from 'lucide-react';
import type { Evento } from '@leela/core';
import { KpiCard } from '../_components/KpiCard';
import { agregaKpisGlobais } from '../_lib/kpis';
import { formatBRL, formatInt } from '../_lib/format';
import {
  contarPorFiltro,
  derivarHubEventos,
  filtrarHubEventos,
  type HubFiltro,
} from './hubRows';

export interface HubEventosProps {
  eventos: Evento[] | null;
  loading: boolean;
  error: Error | null;
  onNovoEvento: () => void;
  onAbrirEvento: (slug: string) => void;
  /** Deep-link do menu para uma sub-área do evento (inscritos/financeiro/kits). */
  onAbrirSubarea: (slug: string, subarea: 'inscritos' | 'financeiro' | 'kits') => void;
}

const FILTROS: ReadonlyArray<{ id: HubFiltro; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'ativos', label: 'Ativos' },
  { id: 'encerrados', label: 'Encerrados' },
  { id: 'rascunhos', label: 'Rascunhos' },
];

function KpisGlobais({ eventos }: { eventos: Evento[] }): JSX.Element {
  const kpis = agregaKpisGlobais(eventos);
  return (
    <section
      aria-label="Indicadores globais"
      className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4"
    >
      <KpiCard label="Eventos ativos" value={formatInt(kpis.eventosAtivos)} hint={`${formatInt(kpis.totalEventos)} no total`} />
      <KpiCard label="Inscritos" value={formatInt(kpis.totalInscritos)} />
      <KpiCard label="Receita consolidada" value={formatBRL(kpis.receitaConsolidada)} />
      <KpiCard label="Total de eventos" value={formatInt(kpis.totalEventos)} />
    </section>
  );
}

/** Filtro de status compacto (uma linha; L-005 — o chrome não empilha). */
function FiltroStatus({
  filtro,
  onChange,
  contagem,
}: {
  filtro: HubFiltro;
  onChange: (f: HubFiltro) => void;
  contagem: Record<HubFiltro, number>;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Filtrar eventos por status"
      className="flex items-center gap-[var(--spacing-2)] flex-wrap"
    >
      {FILTROS.map((f) => (
        <Chip
          key={f.id}
          active={filtro === f.id}
          aria-label={`${f.label} (${contagem[f.id]})`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
          <span className="tabular-nums opacity-70">{contagem[f.id]}</span>
        </Chip>
      ))}
    </div>
  );
}

function ListaEventos({
  eventos,
  onAbrirEvento,
  onAbrirSubarea,
}: {
  eventos: Evento[];
  onAbrirEvento: (slug: string) => void;
  onAbrirSubarea: HubEventosProps['onAbrirSubarea'];
}): JSX.Element {
  const [filtro, setFiltro] = useState<HubFiltro>('todos');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const views = useMemo(() => derivarHubEventos(eventos), [eventos]);
  const contagem = useMemo(() => contarPorFiltro(views), [views]);
  const visiveis = useMemo(() => filtrarHubEventos(views, filtro), [views, filtro]);

  return (
    <>
      <FiltroStatus filtro={filtro} onChange={setFiltro} contagem={contagem} />

      {visiveis.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] py-[var(--spacing-4)]">
          Nenhum evento neste filtro.
        </p>
      ) : (
        <ul
          role="list"
          aria-label="Meus eventos"
          className="flex flex-col gap-[var(--layout-list-gap)]"
        >
          {visiveis.map((v) => (
            <li key={v.slug}>
              <EventRow
                name={v.nome}
                thumbVariant={v.thumbVariant}
                {...(v.imagemUrl ? { thumbImage: { src: v.imagemUrl } } : {})}
                metaItems={[
                  v.quando,
                  v.modalidade ? <Badge variant="neutro">{v.modalidade}</Badge> : null,
                  v.esgotado ? (
                    <Badge variant="vulcao">Esgotado</Badge>
                  ) : v.esgotando ? (
                    <Badge variant="alerta">Últimas vagas</Badge>
                  ) : null,
                ]}
                metrics={v.metrics}
                badge={<Badge variant={v.statusVariant}>{v.statusLabel}</Badge>}
                onClick={() => onAbrirEvento(v.slug)}
                action={
                  <div className="flex items-center gap-[var(--spacing-1)]">
                    <DropdownMenu
                      open={menuAberto === v.slug}
                      onOpenChange={(o) => setMenuAberto(o ? v.slug : null)}
                      trigger={
                        <IconButton aria-label={`Ações de ${v.nome}`}>
                          <MoreVertical />
                        </IconButton>
                      }
                      actions={[
                        { id: 'inscritos', label: 'Ver inscritos', onClick: () => onAbrirSubarea(v.slug, 'inscritos') },
                        { id: 'financeiro', label: 'Financeiro', onClick: () => onAbrirSubarea(v.slug, 'financeiro') },
                        { id: 'kits', label: 'Kits', onClick: () => onAbrirSubarea(v.slug, 'kits') },
                      ]}
                    />
                    <Button variant="secondary" size="sm" onClick={() => onAbrirEvento(v.slug)}>
                      Gerenciar
                    </Button>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function HubEventos({
  eventos,
  loading,
  error,
  onNovoEvento,
  onAbrirEvento,
  onAbrirSubarea,
}: HubEventosProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Eventos"
        subtitle="Gerencie seus eventos e abra o que quer operar"
        actions={
          <Button variant="primary" onClick={onNovoEvento}>
            + Novo evento
          </Button>
        }
      />

      <div className="flex flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]">
        {loading ? (
          <div
            role="status"
            aria-label="Carregando eventos"
            className="flex flex-col gap-[var(--spacing-6)]"
          >
            <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-24" />
              ))}
            </div>
            <div className="flex flex-col gap-[var(--layout-list-gap)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-16" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar seus eventos. Tente novamente.
          </div>
        ) : !eventos || eventos.length === 0 ? (
          <EmptyState
            title="Você ainda não criou nenhum evento"
            description="Crie seu primeiro evento para vender ingressos e operar no dia da prova."
            action={
              <Button variant="primary" onClick={onNovoEvento}>
                Criar evento
              </Button>
            }
          />
        ) : (
          <>
            <KpisGlobais eventos={eventos} />
            <ListaEventos
              eventos={eventos}
              onAbrirEvento={onAbrirEvento}
              onAbrirSubarea={onAbrirSubarea}
            />
          </>
        )}
      </div>
    </div>
  );
}

HubEventos.displayName = 'HubEventos';
