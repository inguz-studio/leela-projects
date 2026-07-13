// =============================================================================
// Filtro e contagem PUROS da fila de repasses do platform_admin (E09s-L4-T1).
// Sem React/DOM — 100% testável. A fonte já vem ordenada (mais recentes
// primeiro) e pré-filtrada nos estados de fila (`solicitado`/`aprovado`) pelo
// gateway; aqui só aplicamos os filtros de tela (estado + tenant) e derivamos
// os contadores + a lista de tenants presentes (para o chip/seletor).
// =============================================================================

import type { RepasseFilaItem } from '../../../../lib/query/queries';

/** Filtro de estado da fila: um estado de fila específico ou 'todos'. */
export type EstadoFilaFilter = 'todos' | 'solicitado' | 'aprovado';

export interface EstadoFilaOption {
  id: EstadoFilaFilter;
  label: string;
}

/** Chips de filtro por estado, na ordem de exibição (§2.5). */
export const ESTADO_FILA_FILTERS: EstadoFilaOption[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'solicitado', label: 'Solicitados' },
  { id: 'aprovado', label: 'Aprovados' },
];

/** Filtro de tenant: um tenantId específico ou 'todos'. */
export type TenantFilaFilter = string;

/**
 * Aplica os filtros de tela (estado + tenant) sobre a fila carregada.
 * `tenantId === 'todos'` não filtra por tenant. @pure
 */
export function filtrarFila(
  itens: RepasseFilaItem[],
  estado: EstadoFilaFilter,
  tenantId: TenantFilaFilter,
): RepasseFilaItem[] {
  return itens.filter(
    (it) =>
      (estado === 'todos' || it.repasse.estado === estado) &&
      (tenantId === 'todos' || it.repasse.tenantId === tenantId),
  );
}

/** Contagem por estado (para os chips) — sempre sobre a fila COMPLETA. @pure */
export function contarPorEstado(itens: RepasseFilaItem[]): Record<EstadoFilaFilter, number> {
  let solicitado = 0;
  let aprovado = 0;
  for (const it of itens) {
    if (it.repasse.estado === 'solicitado') solicitado += 1;
    else if (it.repasse.estado === 'aprovado') aprovado += 1;
  }
  return { todos: itens.length, solicitado, aprovado };
}

/** Tenant presente na fila (id + nome), para o seletor de filtro por tenant. */
export interface TenantNaFila {
  id: string;
  nome: string;
}

/**
 * Tenants distintos presentes na fila, ordenados por nome (pt-BR). O seletor de
 * filtro por tenant lista SÓ quem tem repasse na fila — nunca todos os tenants
 * da plataforma (evita opção morta). @pure
 */
export function tenantsNaFila(itens: RepasseFilaItem[]): TenantNaFila[] {
  const mapa = new Map<string, string>();
  for (const it of itens) {
    if (!mapa.has(it.repasse.tenantId)) mapa.set(it.repasse.tenantId, it.tenantNome);
  }
  return [...mapa.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
