// =============================================================================
// Puros das LISTAS GLOBAIS do painel master (ADMIN-VISAO onda 4 · S1614-T2/T3).
//
// O que mora aqui é a regra que a tela não pode inventar na hora de renderizar:
// qual recorte a lista está mostrando e o que o contador tem direito de dizer.
//
// CONTAGEM HONESTA — o gate da onda. A leitura da onda 1
// (`listarEventosGlobalPaginado`) NUNCA devolve total: o único sinal de fim é
// `proxCursor === null`. Enquanto houver próxima página, a tela diz quantos
// está MOSTRANDO e nada mais; só quando o cursor acaba é que o número carregado
// vira o total do recorte. Um "de N" antes disso seria um total truncado
// apresentado como total do sistema, que é exatamente o que o gate proíbe.
//
// UM RECORTE POR VEZ (tenant OU status), e a razão é de leitura, não de UI: a
// onda 1 decidiu por escrito que o filtro por tenant reusa
// `listarEventosDoTenantPaginado` em vez de um segundo parâmetro no reader
// global (`listasGlobais.ts:62-68`). Combinar os dois exigiria um reader que
// ninguém escreveu — e filtrar status no cliente sobre uma página faria o
// contador mentir na primeira paginação.
// =============================================================================

import type { StatusEvento, Tenant } from '@leela/core';

// ---------------------------------------------------------------------------
// Recorte por status (só eventos — `Clube` não tem campo de status)
// ---------------------------------------------------------------------------

/** `todos` = sem filtro; os demais casam 1:1 com `StatusEvento`. */
export type FiltroStatusEvento = 'todos' | StatusEvento;

export interface OpcaoDeFiltro {
  id: FiltroStatusEvento;
  label: string;
}

/**
 * Os cinco recortes da lista global de eventos, na ordem do ciclo de vida.
 * Rótulos idênticos aos de `routes/eventos/_lib/status.ts` — o admin lê o
 * mesmo vocabulário que o organizador vê na casa dele.
 */
export const FILTROS_STATUS_EVENTO: readonly OpcaoDeFiltro[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'publicado', label: 'Publicado' },
  { id: 'ao_vivo', label: 'Ao vivo' },
  { id: 'encerrado', label: 'Encerrado' },
];

/**
 * O `status` que vai ao reader. `todos` vira `undefined` (sem `where`), não
 * uma string vazia — o reader trata ausência como "sem filtro".
 * @pure
 */
export function statusDoFiltro(filtro: FiltroStatusEvento): StatusEvento | undefined {
  return filtro === 'todos' ? undefined : filtro;
}

// ---------------------------------------------------------------------------
// Coluna Tenant
// ---------------------------------------------------------------------------

/** Opção do seletor de tenant (o valor vazio é o recorte "todos"). */
export interface OpcaoDeTenant {
  value: string;
  label: string;
}

/** O valor do seletor quando nenhum tenant está escolhido. */
export const TENANT_TODOS = '';

/**
 * Nome do tenant dono da linha. O doc de evento/clube carrega `tenantId` e não
 * o nome, então o nome vem do join com a lista de tenants que o painel já
 * carrega (`useTenants`).
 *
 * Sem correspondência, devolve o próprio id — o mesmo fallback honesto que
 * `useTenantComOwner` já usa quando o doc do owner não existe. Inventar
 * "Desconhecido" esconderia um dado que existe e é útil para investigar.
 * @pure
 */
export function nomeDoTenant(tenants: Tenant[] | null, tenantId: string): string {
  if (tenantId.trim() === '') return '—';
  const achado = tenants?.find((t) => t.id === tenantId);
  return achado ? achado.nome : tenantId;
}

/**
 * Opções do seletor de tenant, em ordem alfabética, com o recorte "todos"
 * na frente. Lista vazia/nula devolve só o "todos" — o seletor existe, mas
 * não promete tenant nenhum.
 * @pure
 */
export function opcoesDeTenant(tenants: Tenant[] | null): OpcaoDeTenant[] {
  const ordenados = [...(tenants ?? [])].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );
  return [
    { value: TENANT_TODOS, label: 'Todos os tenants' },
    ...ordenados.map((t) => ({ value: t.id, label: t.nome })),
  ];
}

// ---------------------------------------------------------------------------
// Contador
// ---------------------------------------------------------------------------

export interface Substantivo {
  singular: string;
  plural: string;
}

/**
 * O rótulo do contador, e ele muda de natureza conforme o cursor:
 *
 *   temMais  → "Mostrando 20 eventos · há mais para carregar"
 *   fim      → "37 eventos · fim da lista"
 *
 * A primeira forma declara que o número é do que está na tela; a segunda é a
 * única em que o número carregado É o total do recorte, porque a paginação
 * acabou. Em nenhuma das duas aparece "de N": a query nunca computou um total.
 * @pure
 */
export function rotuloContagem(
  quantidade: number,
  temMais: boolean,
  substantivo: Substantivo
): string {
  const palavra = quantidade === 1 ? substantivo.singular : substantivo.plural;
  const numero = new Intl.NumberFormat('pt-BR').format(quantidade);
  return temMais
    ? `Mostrando ${numero} ${palavra} · há mais para carregar`
    : `${numero} ${palavra} · fim da lista`;
}
