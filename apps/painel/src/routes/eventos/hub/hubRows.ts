// =============================================================================
// Derivação pura das LINHAS DENSAS do hub de eventos (FID-EVT-HUB — decisão
// HÍBRIDO do Vitor). Transforma `Evento[]` em `HubEventoView[]` prontas para o
// EventRow híbrido (thumb de foto + métricas inline) e resolve o filtro de
// status (faceta única de baixa cardinalidade → chips em UMA linha; L-005).
//
// Reuso-first: `thumbVariantDoEvento`/`quandoDoEvento` (heurística de
// apresentação da Visão geral), `statusEventoBadge` (mapa status→Badge),
// `emEsgotamento`/`vagasRestantesDoEvento` do core (fonte única do limiar) e
// `formatInt`/`formatBRL`. Nada de valor cru, nada de recálculo de agregado.
// =============================================================================

import {
  diasCivisAte,
  emEsgotamento,
  vagasRestantesDoEvento,
  type Evento,
  type Timestamp,
} from '@leela/core';
import type { BadgeProps, EventRowMetric, EventThumbVariant } from '@leela/design-system';
import { thumbVariantDoEvento, quandoDoEvento } from '../../overview/_lib/activeEvents';
import { statusEventoBadge } from '../_lib/status';
import { formatBRL, formatInt } from '../_lib/format';

/** Faceta única do filtro de status do hub (mockup `.filter-tabs`). */
export type HubFiltro = 'todos' | 'ativos' | 'encerrados' | 'rascunhos';

/** Linha renderizável do hub (EventRow híbrido). */
export interface HubEventoView {
  slug: string;
  nome: string;
  /** Fallback do thumb quando não há foto. */
  thumbVariant: EventThumbVariant;
  /** Capa real do evento (thumb híbrido) — undefined quando o evento não tem. */
  imagemUrl?: string;
  /** "14 jul 2026 · Florianópolis/SC" (null sem data nem local). */
  quando: string | null;
  /** Primeira modalidade (badge neutro na meta) — null quando não há. */
  modalidade: string | null;
  statusLabel: string;
  statusVariant: NonNullable<BadgeProps['variant']>;
  /** Capacidade conhecida e zero vagas → badge "Esgotado" (vulcão). */
  esgotado: boolean;
  /** Ocupação ≥ limiar (com capacidade) → badge "Últimas vagas" (alerta). */
  esgotando: boolean;
  /** Inscritos / Receita / Vagas — grupo `.stats-inline` do EventRow. */
  metrics: EventRowMetric[];
  /** Categoria para o filtro de status (ativos/encerrados/rascunhos). */
  categoria: Exclude<HubFiltro, 'todos'>;
}

/** Categoria do filtro a partir do status do evento. @pure */
function categoriaDoEvento(status: Evento['status']): Exclude<HubFiltro, 'todos'> {
  if (status === 'encerrado') return 'encerrados';
  if (status === 'rascunho') return 'rascunhos';
  return 'ativos'; // publicado | ao_vivo
}

/** Métrica "Vagas": livre (capacidade − inscritos), ou "∞" sem capacidade. @pure */
function vagasMetric(evento: Evento): string {
  const restantes = vagasRestantesDoEvento({
    qtdInscritos: evento.qtdInscritos,
    capacidade: evento.capacidade ?? null,
  });
  return restantes === null ? '∞' : formatInt(restantes);
}

/** Mapeia um evento para a linha densa híbrida do hub. @pure */
export function toHubEventoView(evento: Evento): HubEventoView {
  const status = statusEventoBadge(evento.status);
  const restantes = vagasRestantesDoEvento({
    qtdInscritos: evento.qtdInscritos,
    capacidade: evento.capacidade ?? null,
  });
  return {
    slug: evento.slug,
    nome: evento.nome,
    thumbVariant: thumbVariantDoEvento(evento.modalidades, evento.nome),
    ...(evento.imagemUrl ? { imagemUrl: evento.imagemUrl } : {}),
    quando: quandoDoEvento(evento.data, evento.local),
    modalidade: evento.modalidades[0] ?? null,
    statusLabel: status.label,
    statusVariant: status.variant,
    esgotado: evento.capacidade != null && restantes === 0,
    esgotando: emEsgotamento({
      status: evento.status,
      qtdInscritos: evento.qtdInscritos,
      capacidade: evento.capacidade ?? null,
    }),
    metrics: [
      { value: formatInt(evento.qtdInscritos), label: 'Inscritos' },
      { value: formatBRL(evento.receitaConfirmada), label: 'Receita' },
      { value: vagasMetric(evento), label: 'Vagas' },
    ],
    categoria: categoriaDoEvento(evento.status),
  };
}

/** Instante (ms) da data do evento, ou null sem data (rascunho). @pure */
function dataMsDoEvento(evento: Evento): number | null {
  const t = evento.data as Timestamp | null | undefined;
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return null;
}

/**
 * Ordena os eventos por PROXIMIDADE TEMPORAL do organizador:
 * 1. FUTUROS (inclui HOJE) primeiro, ASCENDENTE — o próximo a acontecer no topo;
 * 2. depois PASSADOS/encerrados, do mais RECENTE ao mais antigo;
 * 3. eventos SEM data (rascunho sem data marcada) ao FIM da lista.
 *
 * Futuro × passado é decidido por DIA CIVIL no fuso do produto
 * (`diasCivisAte` do core, fonte única — DST-safe): `dias >= 0` = hoje/futuro.
 * `agora` é INJETÁVEL (determinismo em teste; a UI passa `new Date()`). `sort`
 * é estável (V8) → empates preservam a ordem recebida.
 * @pure
 */
export function ordenarEventosHub(
  eventos: readonly Evento[],
  agora: Date,
): Evento[] {
  return [...eventos].sort((a, b) => {
    const ma = dataMsDoEvento(a);
    const mb = dataMsDoEvento(b);
    // Sem data vai para o fim (mas mantém ordem relativa entre si).
    if (ma === null || mb === null) {
      if (ma === null && mb === null) return 0;
      return ma === null ? 1 : -1;
    }
    const aFuturo = diasCivisAte(new Date(ma), agora) >= 0;
    const bFuturo = diasCivisAte(new Date(mb), agora) >= 0;
    if (aFuturo !== bFuturo) return aFuturo ? -1 : 1; // futuros antes dos passados
    return aFuturo ? ma - mb : mb - ma; // futuros asc; passados desc
  });
}

/**
 * Deriva todas as linhas do hub em ORDEM TEMPORAL (próximo → distante).
 * `agora` injetável (a UI passa `new Date()`). @pure
 */
export function derivarHubEventos(
  eventos: readonly Evento[],
  agora: Date,
): HubEventoView[] {
  return ordenarEventosHub(eventos, agora).map(toHubEventoView);
}

/** Contagem por faceta do filtro (para os números dos chips). @pure */
export function contarPorFiltro(
  views: readonly HubEventoView[],
): Record<HubFiltro, number> {
  const contagem: Record<HubFiltro, number> = {
    todos: views.length,
    ativos: 0,
    encerrados: 0,
    rascunhos: 0,
  };
  for (const v of views) contagem[v.categoria] += 1;
  return contagem;
}

/** Aplica o filtro de status às linhas. `todos` não filtra. @pure */
export function filtrarHubEventos(
  views: readonly HubEventoView[],
  filtro: HubFiltro,
): HubEventoView[] {
  if (filtro === 'todos') return [...views];
  return views.filter((v) => v.categoria === filtro);
}
