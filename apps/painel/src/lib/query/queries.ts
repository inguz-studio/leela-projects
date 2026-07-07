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
  getClube,
  getCommercialTerms,
  getComunicado,
  getDesafio,
  getEvento,
  getFinanceiroEvento,
  getLeelaDb,
  getOverview,
  getPlatformRollups,
  getTenant,
  listarEventosDoOrganizador,
  listarInscritos,
  listarInscritosRecentes,
  listarKits,
  listClubesByTenant,
  listComunicados,
  listDesafios,
  listMembros,
  listParcerias,
  listTenants,
  INSCRITOS_PAGE_SIZE,
  type FinanceiroEvento,
  type InscritosCursor,
  type OverviewResult,
} from '@leela/api-client';
import type {
  Clube,
  CommercialTerms,
  Comunicado,
  Desafio,
  Evento,
  Inscrito,
  Kit,
  Membro,
  Parceria,
  PlatformRollups,
  Tenant,
} from '@leela/core';
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

/**
 * Kits de um evento (do mais caro ao "Sem kit") — chave partilhada Cadastro ↔
 * Estoque. Reusa `listarKits` do api-client (leitura provada, RN-215 `usadoEm`
 * vem da Function). `reloadKey` propaga o refetch pós-save do Cadastro sem
 * reimplementar invalidação nos callers (ADR-010).
 */
export function kitsDoEventoQuery(eventoId: string, reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.kits.doEvento(eventoId, reloadKey),
    queryFn: (): Promise<Kit[]> => listarKits(getLeelaDb(), eventoId),
  });
}

// =============================================================================
// Clubes (E05) — reusam a leitura provada do api-client (listClubesByTenant,
// getClube, listMembros, listComunicados/getComunicado, listDesafios/getDesafio,
// listParcerias). Bounded staleness: cache-then-revalidate basta nestas telas.
// =============================================================================

/** Clubes do tenant do profissional logado (hub — 2 zonas). */
export function clubesDoTenantQuery(tenantId: string) {
  return queryOptions({
    queryKey: queryKeys.clubes.doTenant(tenantId),
    queryFn: (): Promise<Clube[]> => listClubesByTenant(getLeelaDb(), tenantId),
  });
}

/** Um clube pelo slug (leitura O(1) — docId = slug; null quando não existe). */
export function clubeDetalheQuery(slug: string) {
  return queryOptions({
    queryKey: queryKeys.clubes.detalhe(slug),
    queryFn: (): Promise<Clube | null> => getClube(getLeelaDb(), slug),
  });
}

/** Membros de um clube (página densa por nome; filtro fino é client-side). */
export function membrosDoClubeQuery(clubeId: string) {
  return queryOptions({
    queryKey: queryKeys.membros.doClube(clubeId),
    queryFn: (): Promise<Membro[]> => listMembros(getLeelaDb(), clubeId, { pageLimit: 200 }),
  });
}

/** Comunicados de um clube, mais recentes primeiro. */
export function comunicadosDoClubeQuery(clubeId: string) {
  return queryOptions({
    queryKey: queryKeys.comunicados.doClube(clubeId),
    queryFn: (): Promise<Comunicado[]> => listComunicados(getLeelaDb(), clubeId),
  });
}

/** Um comunicado pelo id (modo edição; null quando não existe). */
export function comunicadoDetalheQuery(clubeId: string, comunicadoId: string) {
  return queryOptions({
    queryKey: queryKeys.comunicados.detalhe(clubeId, comunicadoId),
    queryFn: (): Promise<Comunicado | null> =>
      getComunicado(getLeelaDb(), clubeId, comunicadoId),
  });
}

/** Desafios de um clube, mais recentes primeiro. */
export function desafiosDoClubeQuery(clubeId: string) {
  return queryOptions({
    queryKey: queryKeys.desafios.doClube(clubeId),
    queryFn: (): Promise<Desafio[]> => listDesafios(getLeelaDb(), clubeId),
  });
}

/** Um desafio pelo id (modo edição; null quando não existe). */
export function desafioDetalheQuery(clubeId: string, desafioId: string) {
  return queryOptions({
    queryKey: queryKeys.desafios.detalhe(clubeId, desafioId),
    queryFn: (): Promise<Desafio | null> => getDesafio(getLeelaDb(), clubeId, desafioId),
  });
}

/** Parcerias de um clube (union evento_afiliado | patrocinador). */
export function parceriasDoClubeQuery(clubeId: string) {
  return queryOptions({
    queryKey: queryKeys.parcerias.doClube(clubeId),
    queryFn: (): Promise<Parceria[]> => listParcerias(getLeelaDb(), clubeId),
  });
}

// =============================================================================
// Plataforma (E16) — super-admin. Reusam getPlatformRollups/listTenants/
// getTenant/getCommercialTerms. `reloadKey` na chave é a ponte pragmática do
// strangler-fig (os containers já incrementam um contador pós-mutação).
// =============================================================================

/** Rollups macro (`platform/rollups`); null quando a Function ainda não rodou. */
export function platformRollupsQuery(reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.plataforma.rollups(reloadKey),
    queryFn: (): Promise<PlatformRollups | null> => getPlatformRollups(getLeelaDb()),
  });
}

/** Todos os tenants da plataforma (filtro de status é client-side). */
export function tenantsQuery(reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.plataforma.tenants(reloadKey),
    queryFn: (): Promise<Tenant[]> => listTenants(getLeelaDb()),
  });
}

/** Um tenant pelo id (detalhe; null quando não existe). */
export function tenantDetalheQuery(tenantId: string, reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.plataforma.tenant(tenantId, reloadKey),
    queryFn: (): Promise<Tenant | null> => getTenant(getLeelaDb(), tenantId),
  });
}

/** Termos comerciais vigentes de um tenant; null quando ainda não há. */
export function commercialTermsQuery(tenantId: string, reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.plataforma.termos(tenantId, reloadKey),
    queryFn: (): Promise<CommercialTerms | null> =>
      getCommercialTerms(getLeelaDb(), tenantId),
  });
}
