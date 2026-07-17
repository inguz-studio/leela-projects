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
  getDadosBancarios,
  getDemografiaEvento,
  getEvento,
  getFinanceiroEvento,
  getLeelaDb,
  getOverview,
  getSaldoRepasse,
  listRepasses,
  getResumoComunicacoes,
  listarComunicacoesDoEvento,
  listarCampanhas,
  getCampanha,
  getPaginaVendas,
  getPoliticaVendas,
  getPedidoEPagamentoDoInscrito,
  getPlatformRollups,
  getTenant,
  getTenantComOwner,
  listarEventosDoOrganizador,
  listarAprovisionamento,
  listarCupons,
  listarEquipe,
  listarInscritos,
  listarInscritosRecentes,
  listarItensKit,
  listarKits,
  listarLotes,
  listClubesByTenant,
  listComunicados,
  listDesafios,
  listMembros,
  listParcerias,
  listPlanosCobranca,
  listTenants,
  INSCRITOS_PAGE_SIZE,
  type DemografiaEvento,
  type FinanceiroEvento,
  type InscritoParaJoin,
  type InscritosCursor,
  type OverviewResult,
  type PedidoEPagamentoDoInscrito,
  type TenantComOwner,
} from '@leela/api-client';
import type {
  Aprovisionamento,
  Campanha,
  Clube,
  CommercialTerms,
  Comunicado,
  Cupom,
  DadosBancarios,
  Desafio,
  EstadoRepasse,
  Evento,
  Inscrito,
  ItemKit,
  Kit,
  LogComunicacao,
  Lote,
  Membro,
  MembroEquipe,
  PaginaVendas,
  Parceria,
  PlanoCobranca,
  PoliticaVendas,
  PlatformRollups,
  Repasse,
  ResumoComunicacoes,
  SaldoRepasse,
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
 * Bloco `[pag]` do slide-in do inscrito (S203-T3): join inscrito → pedido →
 * pagamento. Reusa `getPedidoEPagamentoDoInscrito` do api-client (2 point
 * reads O(1), guarda de coerência ADR-011) — NÃO reimplementa o join. tenantId
 * vem do próprio inscrito (projeção tenant-scoped). Dependência ausente
 * (pedido/pagamento null) é AUSÊNCIA honesta, tratada na tela — nunca fake.
 */
export function pedidoEPagamentoDoInscritoQuery(params: {
  tenantId: string;
  eventoId: string;
  inscrito: InscritoParaJoin;
}) {
  return queryOptions({
    queryKey: queryKeys.pedidos.ePagamentoDoInscrito(params.eventoId, params.inscrito.id),
    queryFn: (): Promise<PedidoEPagamentoDoInscrito> =>
      getPedidoEPagamentoDoInscrito(getLeelaDb(), {
        tenantId: params.tenantId,
        eventoId: params.eventoId,
        inscrito: params.inscrito,
      }),
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

/** Uma linha do fan-out por evento: metadados do evento + agregado financeiro. */
export interface EventoFinanceiroRow {
  evento: Pick<Evento, 'id' | 'nome' | 'slug' | 'status'>;
  /** `financeiro/current` do evento — null quando o gatilho ainda não computou. */
  financeiro: FinanceiroEvento | null;
}

/**
 * Fan-out do `financeiro/current` de TODOS os eventos do organizador (RN-349 ·
 * repasses POR EVENTO; RN-820 · modalidades da análise). Reusa as leituras
 * PROVADAS do api-client — `listarEventosDoOrganizador` + `getFinanceiroEvento`
 * — exatamente como `repassesFilaAdminQuery` compõe `listRepasses` por tenant.
 * É O(eventos) leituras de AGREGADO (nunca varre inscritos — RN-820/§2.12): o
 * organizador tem poucos eventos e cada `financeiro/current` é um point read
 * O(1). NUNCA soma dinheiro aqui — a derivação (retido/disponível estimado por
 * evento) é pura, feita a jusante com os helpers do core. Chave partilhada pelas
 * telas de Repasses (por evento) e Análise (modalidades) → um fan-out, um cache.
 */
export function financeiroPorEventoDoOrganizadorQuery(params: {
  tenantId: string;
  organizadorId: string;
}) {
  return queryOptions({
    queryKey: queryKeys.financeiro.porOrganizador(params.tenantId, params.organizadorId),
    queryFn: async (): Promise<EventoFinanceiroRow[]> => {
      const db = getLeelaDb();
      const eventos = await listarEventosDoOrganizador(db, {
        tenantId: params.tenantId,
        organizadorId: params.organizadorId,
      });
      return Promise.all(
        eventos.map(async (ev): Promise<EventoFinanceiroRow> => ({
          evento: { id: ev.id, nome: ev.nome, slug: ev.slug, status: ev.status },
          financeiro: await getFinanceiroEvento(db, ev.id),
        })),
      );
    },
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

/**
 * Catálogo de itens do kit do evento (top-level `itensKit`, filtrado por tenant
 * — ADR-009). Reusa `listarItensKit` do api-client (leitura provada). Último
 * straggler de fetch cru desta seção → useQuery, consistente com useKits.
 * A chave é partilhada Cadastro ↔ balcão; salvar/remover item invalida (ADR-010).
 */
export function itensKitDoEventoQuery(tenantId: string, eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.kits.itensDoEvento(eventoId),
    queryFn: (): Promise<ItemKit[]> =>
      listarItensKit(getLeelaDb(), { tenantId, eventoId }),
  });
}

/**
 * Aprovisionamento por SKU de um evento (subcoleção — FABLE-D · S210-T2). Reusa
 * `listarAprovisionamento` do api-client (leitura provada; `parseAprovisionamento`
 * fail-fast por doc). Os ∑ (qtdVendida/aEncomendar) e o `alerta` são DERIVADOS
 * pela Function `agregarEstoque` — a tela de Estoque só LÊ os campos ∑ do doc
 * (RN-224), NUNCA os recomputa no cliente. A transição (callable) invalida esta
 * chave → read-your-writes (ADR-010). Lista vazia = evento sem SKU tamanhado.
 */
export function aprovisionamentoDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.aprovisionamento.doEvento(eventoId),
    queryFn: (): Promise<Aprovisionamento[]> =>
      listarAprovisionamento(getLeelaDb(), eventoId),
  });
}

/**
 * Fan-out do aprovisionamento por SKU de TODOS os eventos do organizador
 * (RN-820 · tamanhos mais pedidos da análise). Reusa `listarEventosDoOrganizador`
 * + `listarAprovisionamento` (leituras provadas do api-client) e achata os SKUs
 * de todos os eventos. `qtdVendida` por tamanho já vem pronta do agregado
 * (FABLE-D · `agregarEstoque`) — a tela NUNCA varre inscritos (RN-224/RN-820).
 * O(eventos) leituras; o organizador tem poucos eventos. A agregação por tamanho
 * é pura, feita a jusante.
 */
export function aprovisionamentoDoOrganizadorQuery(params: {
  tenantId: string;
  organizadorId: string;
}) {
  return queryOptions({
    queryKey: queryKeys.aprovisionamento.porOrganizador(params.tenantId, params.organizadorId),
    queryFn: async (): Promise<Aprovisionamento[]> => {
      const db = getLeelaDb();
      const eventos = await listarEventosDoOrganizador(db, {
        tenantId: params.tenantId,
        organizadorId: params.organizadorId,
      });
      const porEvento = await Promise.all(
        eventos.map((ev) => listarAprovisionamento(db, ev.id)),
      );
      return porEvento.flat();
    },
  });
}

/**
 * Fan-out do agregado DEMOGRÁFICO (`demografia/current` — E11 §RN-820 ·
 * LEELA-BEPEND-T1) de TODOS os eventos do organizador. Reusa
 * `listarEventosDoOrganizador` + `getDemografiaEvento` (leituras provadas do
 * api-client) — O(eventos) point reads de AGREGADO mantido pela Function
 * `agregarDemografia`; NUNCA varre inscritos nem toca dado individual (LGPD).
 * Evento sem agregado (sem confirmado/gatilho não rodou) é omitido — a soma a
 * jusante é pura e a tela mostra EmptyState quando nada existe (§2.12).
 */
export function demografiaDoOrganizadorQuery(params: {
  tenantId: string;
  organizadorId: string;
}) {
  return queryOptions({
    queryKey: queryKeys.demografia.porOrganizador(params.tenantId, params.organizadorId),
    queryFn: async (): Promise<DemografiaEvento[]> => {
      const db = getLeelaDb();
      const eventos = await listarEventosDoOrganizador(db, {
        tenantId: params.tenantId,
        organizadorId: params.organizadorId,
      });
      const porEvento = await Promise.all(
        eventos.map((ev) => getDemografiaEvento(db, ev.id)),
      );
      return porEvento.filter((d): d is DemografiaEvento => d !== null);
    },
  });
}

/**
 * Lotes de um evento (todas as modalidades — ADR-012). Reusa `listarLotes` do
 * api-client (leitura provada; `parseLote` fail-fast por doc). A tela agrupa por
 * modalidade e deriva preço vigente/lote ativo pelo core — nunca recalcula
 * preço. Salvar/remover invalida esta chave (read-your-writes, ADR-010).
 */
export function lotesDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.lotes.doEvento(eventoId),
    queryFn: (): Promise<Lote[]> => listarLotes(getLeelaDb(), eventoId),
  });
}

/**
 * Página de vendas (config) de um evento — S300-T3. Reusa `getPaginaVendas` do
 * api-client (leitura direta O(1); parse fail-fast). `null` quando ainda não
 * configurada — o editor parte das seções padrão do kernel (AUSÊNCIA honesta,
 * nunca dado fake). Salvar/publicar invalida esta chave (read-your-writes).
 */
export function paginaVendasDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.paginaVendas.doEvento(eventoId),
    queryFn: (): Promise<PaginaVendas | null> => getPaginaVendas(getLeelaDb(), eventoId),
  });
}

/**
 * Política de vendas do evento (`politicaVendas/config` — S305-T2/T3). Reusa
 * `getPoliticaVendas` do api-client (leitura direta O(1); parse fail-fast).
 * `null` quando o organizador ainda não configurou — o form parte dos defaults
 * legais do kernel (AUSÊNCIA honesta, nunca número inventado). Salvar invalida
 * esta chave (read-your-writes, ADR-010).
 */
export function politicaVendasDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.politicaVendas.doEvento(eventoId),
    queryFn: (): Promise<PoliticaVendas | null> => getPoliticaVendas(getLeelaDb(), eventoId),
  });
}

/**
 * Equipe (membros) de um evento — S304-T3 (tela Equipe & permissões). Reusa
 * `listarEquipe` do api-client (ordena por nome; `parseMembroEquipe` fail-fast).
 * Traz convidados + ativos + removidos — a tela filtra. Convidar/trocar papel/
 * remover invalida esta chave (read-your-writes, ADR-010).
 */
export function equipeDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.equipe.doEvento(eventoId),
    queryFn: (): Promise<MembroEquipe[]> => listarEquipe(getLeelaDb(), eventoId),
  });
}

/**
 * Cupons simples de um evento — S300-T5 (seção na tela da página de vendas).
 * Reusa `listarCupons` do api-client (leitura provada; `parseCupom` fail-fast por
 * doc). A vigência (cupomVigente) e o desconto (descontoDoCupom) são DERIVADOS
 * pelo core — a seção nunca recalcula desconto (isso é do checkout, E12).
 * Salvar/remover invalida esta chave (read-your-writes, ADR-010).
 */
export function cuponsDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.cupons.doEvento(eventoId),
    queryFn: (): Promise<Cupom[]> => listarCupons(getLeelaDb(), eventoId),
  });
}

/**
 * Agregado ∑ de comunicações do evento (`comunicacoesResumo/current`) — os
 * CONTADORES da aba Comunicação (E06-L3). Point read O(1) mantido pela Function
 * (FABLE-G): a aba NUNCA conta logs no cliente. `null` quando ainda não há
 * comunicação (AUSÊNCIA honesta → EmptyState). Bounded staleness (ADR-010).
 */
export function resumoComunicacoesQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.comunicacoes.resumo(eventoId),
    queryFn: (): Promise<ResumoComunicacoes | null> =>
      getResumoComunicacoes(getLeelaDb(), eventoId),
  });
}

/**
 * Timeline do log de comunicação do evento (E06-L3) — recentes primeiro,
 * `limite` docs. Reusa `listarComunicacoesDoEvento` (orderBy single-field +
 * limit, sem índice composto). PII do log é MÍNIMA por construção (FABLE-G:
 * sem corpo/nome/e-mail — só assunto/canal/tipo/status + ref opaca); a tela
 * mascara a ref na superfície densa (LGPD). Bounded staleness (ADR-010).
 */
export function comunicacoesDoEventoQuery(eventoId: string, limite: number) {
  return queryOptions({
    queryKey: queryKeys.comunicacoes.doEvento(eventoId, limite),
    queryFn: (): Promise<LogComunicacao[]> =>
      listarComunicacoesDoEvento(getLeelaDb(), eventoId, { limite }),
  });
}

/**
 * Campanhas do evento (`eventos/{id}/campanhas` — S401-T2). Reusa
 * `listarCampanhas` do api-client (single-field query + sort em memória, sem
 * índice composto); `parseCampanha` é fail-fast por doc. A lista agrupa por
 * estado no cliente (`_lib/campanhas`). Bounded staleness (ADR-010).
 */
export function campanhasDoEventoQuery(eventoId: string) {
  return queryOptions({
    queryKey: queryKeys.campanhas.doEvento(eventoId),
    queryFn: (): Promise<Campanha[]> => listarCampanhas(getLeelaDb(), eventoId),
  });
}

/** Uma campanha pelo id — modo edição do editor (S401-T3). `null` = inexistente. */
export function campanhaDetalheQuery(eventoId: string, campanhaId: string) {
  return queryOptions({
    queryKey: queryKeys.campanhas.detalhe(eventoId, campanhaId),
    queryFn: (): Promise<Campanha | null> =>
      getCampanha(getLeelaDb(), eventoId, campanhaId),
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

/**
 * Tenant + perfil do owner (join `profissionais/{ownerUid}` — CONS-4-T1). Reusa
 * `getTenantComOwner` do api-client (as Rules já autorizam a leitura do owner
 * para os mesmos leitores do tenant; join de 1 salto, nenhuma denormalização).
 * `owner: null` quando o perfil não existe → a UI cai no uid (fallback honesto).
 * `null` total = tenant inexistente.
 */
export function tenantComOwnerQuery(tenantId: string) {
  return queryOptions({
    queryKey: queryKeys.plataforma.tenantComOwner(tenantId),
    queryFn: (): Promise<TenantComOwner | null> => getTenantComOwner(getLeelaDb(), tenantId),
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

/**
 * Catálogo de planos de cobrança nomeados (`planosCobranca` — T2-L4 · CB-T3).
 * Reusa `listPlanosCobranca` do api-client (Rules liberam a leitura só ao
 * platform_admin; ordenado por nome). Lista vazia = catálogo ainda sem plano
 * (EmptyState honesto). `reloadKey` revalida após salvar/aplicar.
 */
export function planosCobrancaQuery(reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.plataforma.planos(reloadKey),
    queryFn: (): Promise<PlanoCobranca[]> => listPlanosCobranca(getLeelaDb()),
  });
}

// =============================================================================
// Repasse do organizador (E09-slim · E09s-L3). Reusam as leituras tenant-scoped
// do api-client (getSaldoRepasse/getDadosBancarios/listRepasses); NUNCA somam
// dinheiro no cliente — o saldo é ∑ do servidor (RN-350/351). Bounded staleness
// (cache-then-revalidate basta; solicitar/salvar invalidam via mutations).
// =============================================================================

/**
 * `saldo/current` do tenant — a ÚNICA fonte dos 3 cards (vendido/disponível/
 * retido). `null` quando a Function ainda não computou (tenant sem venda) → a
 * tela mostra "Nenhuma movimentação", não zeros ambíguos (§2.12).
 */
export function saldoRepasseQuery(tenantId: string) {
  return queryOptions({
    queryKey: queryKeys.repasse.saldo(tenantId),
    queryFn: (): Promise<SaldoRepasse | null> => getSaldoRepasse(getLeelaDb(), tenantId),
  });
}

/**
 * `dadosBancarios/current` MASCARADO do tenant (RN-354) — nunca o número em
 * claro. `null` quando o organizador ainda não cadastrou (a tela abre no form).
 */
export function dadosBancariosQuery(tenantId: string) {
  return queryOptions({
    queryKey: queryKeys.repasse.dadosBancarios(tenantId),
    queryFn: (): Promise<DadosBancarios | null> => getDadosBancarios(getLeelaDb(), tenantId),
  });
}

/** Histórico de repasses do tenant (mais recentes primeiro) — a tabela do T4. */
export function repassesHistoricoQuery(tenantId: string) {
  return queryOptions({
    queryKey: queryKeys.repasse.historico(tenantId),
    queryFn: (): Promise<Repasse[]> => listRepasses(getLeelaDb(), tenantId),
  });
}

// =============================================================================
// Fila de aprovação do platform_admin (E09s-L4). A back-office lista os
// repasses `solicitado`/`aprovado` de TODOS os tenants. As Rules só liberam a
// LEITURA no caminho tenant-scoped (`tenants/{tid}/repasses`, isPlatformAdmin) —
// NÃO há regra de collectionGroup —, então o cross-tenant é um FAN-OUT de
// leituras já provadas do api-client (listTenants + listRepasses por tenant),
// composto aqui como carregarTodosInscritos compõe listarInscritos. Zero índice
// novo, zero mudança de Rules, zero soma de dinheiro no cliente (valor/estado
// vêm dos docs; a máquina é do servidor — RN-353/357).
// =============================================================================

/** Um item da fila cross-tenant: o repasse + o NOME do tenant (para exibição). */
export interface RepasseFilaItem {
  repasse: Repasse;
  tenantNome: string;
}

/** Estados que entram na fila de aprovação/pagamento (§ Lote E09s-L4). */
const ESTADOS_FILA_ADMIN: readonly EstadoRepasse[] = ['solicitado', 'aprovado'];

/**
 * Fila de repasses `solicitado`/`aprovado` de todos os tenants, mais recentes
 * primeiro. Fan-out: lê os tenants e, por tenant, seus repasses (leituras
 * tenant-scoped que as Rules liberam a platform_admin). O filtro por estado é
 * client-side (a fila é pequena; back-office com bounded staleness). `reloadKey`
 * força o refetch pós-ação sem tocar a tela.
 */
export function repassesFilaAdminQuery(reloadKey = 0) {
  return queryOptions({
    queryKey: queryKeys.repasse.filaAdmin(reloadKey),
    queryFn: async (): Promise<RepasseFilaItem[]> => {
      const db = getLeelaDb();
      const tenants = await listTenants(db);
      const porTenant = await Promise.all(
        tenants.map(async (t): Promise<RepasseFilaItem[]> => {
          const repasses = await listRepasses(db, t.id);
          return repasses
            .filter((r) => ESTADOS_FILA_ADMIN.includes(r.estado))
            .map((repasse) => ({ repasse, tenantNome: t.nome }));
        }),
      );
      const itens = porTenant.flat();
      itens.sort((a, b) => b.repasse.criadoEm.toMillis() - a.repasse.criadoEm.toMillis());
      return itens;
    },
  });
}
