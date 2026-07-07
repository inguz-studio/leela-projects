// =============================================================================
// Gateway de queries — narrow-waist (Fowler) sobre @leela/api-client.
//
// Cada fábrica devolve um `queryOptions` (chave + queryFn) tipado, REUSANDO as
// funções de leitura já provadas do api-client (getOverview, listarEventos…,
// getEvento, listarInscritos) e os tipos de domínio (@leela/core). Nada de
// fetch reescrito: o api-client continua a fonte única de acesso ao Firestore;
// este módulo só o embrulha em cache/revalidação (ADR-010).
//
// Consistência (Kleppmann): estas superfícies (Visão Geral, Hub, Inscritos)
// vivem com BOUNDED STALENESS — cache-then-revalidate é suficiente, não
// exigem tempo-real. O realtime via `onSnapshot` fica reservado às SUPERFÍCIES
// VIVAS (balcão S204, financeiro S207), num lote futuro — não aqui, para não
// pagar o custo de listeners onde ninguém precisa deles.
// =============================================================================

import { queryOptions } from '@tanstack/react-query';
import {
  getEvento,
  getFinanceiroEvento,
  getLeelaDb,
  getOverview,
  listarEventosDoOrganizador,
  listarInscritos,
  listarInscritosRecentes,
  INSCRITOS_PAGE_SIZE,
  type FinanceiroEvento,
  type InscritosCursor,
  type OverviewResult,
} from '@leela/api-client';
import type { Evento, Inscrito } from '@leela/core';
import { queryKeys } from './keys';

/** KPIs + alertas do produtor (contrato único getOverview — 1 round-trip). */
export function overviewQuery() {
  return queryOptions({
    queryKey: queryKeys.overview,
    queryFn: (): Promise<OverviewResult> => getOverview(),
  });
}

/** Eventos do organizador logado — chave partilhada Visão Geral ↔ Hub. */
export function eventosDoOrganizadorQuery(params: {
  tenantId: string;
  organizadorId: string;
}) {
  return queryOptions({
    queryKey: queryKeys.eventos.doOrganizador(params.tenantId, params.organizadorId),
    queryFn: (): Promise<Evento[]> =>
      listarEventosDoOrganizador(getLeelaDb(), {
        tenantId: params.tenantId,
        organizadorId: params.organizadorId,
      }),
  });
}

/** Detalhe de um evento pelo slug (fallback tenant-wide — distingue escopo). */
export function eventoDetalheQuery(slug: string) {
  return queryOptions({
    queryKey: queryKeys.eventos.detalhe(slug),
    queryFn: (): Promise<Evento | null> => getEvento(getLeelaDb(), slug),
  });
}

/** Teto de segurança do acúmulo por cursor (453 → 26 páginas; 200 é folga). */
const MAX_PAGINAS_INSCRITOS = 200;

/**
 * Percorre TODOS os inscritos do evento pelos cursores (§2.5, 18/página) e
 * acumula em memória. Reusa `listarInscritos` — a paginação provada do
 * api-client, não uma reimplementação. A tela filtra/pagina client-side.
 */
async function carregarTodosInscritos(eventoId: string): Promise<Inscrito[]> {
  const db = getLeelaDb();
  const acc: Inscrito[] = [];
  let cursor: InscritosCursor | undefined;
  for (let i = 0; i < MAX_PAGINAS_INSCRITOS; i += 1) {
    const options = cursor
      ? { cursor, pageSize: INSCRITOS_PAGE_SIZE }
      : { pageSize: INSCRITOS_PAGE_SIZE };
    const { itens, proxCursor } = await listarInscritos(db, eventoId, options);
    acc.push(...itens);
    if (!proxCursor) break;
    cursor = proxCursor;
  }
  return acc;
}

/** Todos os inscritos de um evento (fonte da tabela densa + balcão + kits). */
export function todosInscritosQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.inscritos.todos(eventoId),
    queryFn: (): Promise<Inscrito[]> => carregarTodosInscritos(eventoId),
  });
}

/**
 * Os `limite` inscritos MAIS RECENTES de um evento (atividade recente do
 * detalhe). Usa `listarInscritosRecentes` (orderBy `criadoEm` desc) — NÃO
 * `listarInscritos` (orderBy `atletaNome`): sob `atletaNome` o LIMIT traz os
 * primeiros do alfabeto, e reordenar no cliente não recupera os recentes que a
 * query nunca trouxe. `derivaAtividade` recebe já o conjunto certo.
 */
export function inscritosRecentesQuery(eventoId: string, limite: number) {
  return queryOptions({
    queryKey: queryKeys.inscritos.recentes(eventoId, limite),
    queryFn: (): Promise<Inscrito[]> =>
      listarInscritosRecentes(getLeelaDb(), eventoId, limite),
  });
}

/**
 * Agregado financeiro do evento (`financeiro/current`) — chave partilhada
 * Overview ↔ Financeiro (leem o MESMO doc; navegar entre elas reidrata do
 * cache). Reusa `getFinanceiroEvento` do api-client; NUNCA recalcula receita —
 * só LÊ o agregado (null quando o gatilho ainda não computou). Bounded staleness
 * (o realtime via onSnapshot fica p/ o lote de superfície viva — ADR-010).
 */
export function financeiroCurrentQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.financeiro.current(eventoId),
    queryFn: (): Promise<FinanceiroEvento | null> =>
      getFinanceiroEvento(getLeelaDb(), eventoId),
  });
}
