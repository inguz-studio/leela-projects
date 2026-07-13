// =============================================================================
// Query keys — fábrica keyed POR RECURSO (narrow-waist, Fowler). Uma única
// fonte para toda chave de cache do painel: telas diferentes que leem o MESMO
// recurso partilham a MESMA chave e, portanto, a MESMA entrada de cache.
//
// Consequência direta do lote (L-001): a Visão Geral e o Hub de Eventos leem
// `eventos.doOrganizador(tenant, uid)` com a chave IDÊNTICA — navegar entre
// elas reidrata do cache, sem refetch cego. A chave É o contrato de partilha.
//
// Convenção: array hierárquico [recurso, escopo, ...ids]. Prefixos estáveis
// permitem invalidação por família (invalidateQueries({ queryKey: ['eventos'] })
// atinge lista + detalhe de eventos de uma vez).
// =============================================================================

export const queryKeys = {
  /** KPIs + alertas consolidados do produtor (callable getOverview). */
  overview: ['overview'] as const,

  eventos: {
    /** Lista de eventos do organizador — partilhada Visão Geral ↔ Hub. */
    doOrganizador: (tenantId: string, organizadorId: string) =>
      ['eventos', 'do-organizador', tenantId, organizadorId] as const,
    /** Detalhe de um evento pelo slug (fallback tenant-wide). */
    detalhe: (slug: string) => ['eventos', 'detalhe', slug] as const,
  },

  inscritos: {
    /** Todos os inscritos de um evento (acúmulo por cursor — tabela densa). */
    todos: (eventoId: string) => ['inscritos', 'todos', eventoId] as const,
    /** Primeiros N inscritos de um evento (atividade recente). */
    recentes: (eventoId: string, limite: number) =>
      ['inscritos', 'recentes', eventoId, limite] as const,
  },

  pedidos: {
    /**
     * Bloco `[pag]` do slide-in (S203-T3): join inscrito → pedido → pagamento
     * (2 point reads O(1), ADR-011). Keyed por inscrito — cada linha abre a
     * SUA compra; reabrir o mesmo inscrito reidrata do cache (bounded staleness).
     */
    ePagamentoDoInscrito: (eventoId: string, inscritoId: string) =>
      ['pedidos', 'e-pagamento-do-inscrito', eventoId, inscritoId] as const,
  },

  financeiro: {
    /** Agregado `financeiro/current` de um evento — partilhado Overview ↔ Financeiro. */
    current: (eventoId: string) => ['financeiro', 'current', eventoId] as const,
  },

  kits: {
    /**
     * Kits de um evento — chave partilhada Cadastro ↔ Estoque (navegar entre as
     * sub-abas reidrata do cache). `reloadKey` entra na chave para preservar o
     * "refetch pós-save" do Cadastro (que incrementa um contador) sem mudar os
     * callers — ponte pragmática do strangler-fig (ADR-010).
     */
    doEvento: (eventoId: string, reloadKey = 0) =>
      ['kits', 'do-evento', eventoId, reloadKey] as const,
  },

  aprovisionamento: {
    /**
     * Aprovisionamento por SKU de um evento (subcoleção
     * `eventos/{id}/aprovisionamento` — FABLE-D · S210-T2). A tela de Estoque lê
     * esta chave; a transição de estado (callable `transicaoAprovisionamento`) a
     * invalida no onSuccess → read-your-writes (ADR-010): estado/∑ do SKU
     * refletem sem reload manual.
     */
    doEvento: (eventoId: string) => ['aprovisionamento', 'do-evento', eventoId] as const,
  },

  lotes: {
    /**
     * Lotes de um evento (todas as modalidades — ADR-012). A tela de config
     * lê esta chave e a agrupa por modalidade; salvar/remover um lote invalida
     * o prefixo `['lotes','do-evento',eventoId]` → read-your-writes (ADR-010).
     */
    doEvento: (eventoId: string) => ['lotes', 'do-evento', eventoId] as const,
  },

  paginaVendas: {
    /**
     * Página de vendas (config) de um evento — S300-T3. O editor lê esta chave;
     * salvar conteúdo (seções/SEO) e publicar/despublicar a invalidam →
     * read-your-writes (ADR-010): o toggle/save reflete sem reload manual.
     */
    doEvento: (eventoId: string) => ['pagina-vendas', 'do-evento', eventoId] as const,
  },

  // ---------------------------------------------------------------------------
  // Clubes (E05) — mesma convenção de eventos. Lista por tenant + detalhe por
  // slug partilham prefixo `['clubes']`; recursos-filhos (membros, comunicados,
  // desafios, parcerias) têm prefixo próprio, keyed por clubeId, para invalidação
  // cirúrgica pós-mutação (read-your-writes, ADR-010).
  // ---------------------------------------------------------------------------
  clubes: {
    /** Clubes do tenant do profissional logado (hub). */
    doTenant: (tenantId: string) => ['clubes', 'do-tenant', tenantId] as const,
    /** Um clube pelo slug (docId = slug). */
    detalhe: (slug: string) => ['clubes', 'detalhe', slug] as const,
  },

  membros: {
    /** Membros de um clube (página densa ordenada por nome). */
    doClube: (clubeId: string) => ['membros', 'do-clube', clubeId] as const,
  },

  comunicados: {
    /** Comunicados de um clube, mais recentes primeiro. */
    doClube: (clubeId: string) => ['comunicados', 'do-clube', clubeId] as const,
    /** Um comunicado pelo id (modo edição). */
    detalhe: (clubeId: string, comunicadoId: string) =>
      ['comunicados', 'detalhe', clubeId, comunicadoId] as const,
  },

  desafios: {
    /** Desafios de um clube, mais recentes primeiro. */
    doClube: (clubeId: string) => ['desafios', 'do-clube', clubeId] as const,
    /** Um desafio pelo id (modo edição). */
    detalhe: (clubeId: string, desafioId: string) =>
      ['desafios', 'detalhe', clubeId, desafioId] as const,
  },

  parcerias: {
    /** Parcerias de um clube (union evento_afiliado | patrocinador). */
    doClube: (clubeId: string) => ['parcerias', 'do-clube', clubeId] as const,
  },

  // ---------------------------------------------------------------------------
  // Plataforma (E16) — super-admin. `reloadKey` entra na chave (mesma ponte
  // pragmática de `kits`): os containers já incrementam um contador pós-mutação;
  // mantê-lo na chave preserva o refetch SEM tocar as telas (strangler-fig).
  // ---------------------------------------------------------------------------
  plataforma: {
    /** Rollups macro (`platform/rollups`). */
    rollups: (reloadKey = 0) => ['plataforma', 'rollups', reloadKey] as const,
    /** Lista de todos os tenants. */
    tenants: (reloadKey = 0) => ['plataforma', 'tenants', reloadKey] as const,
    /** Um tenant pelo id (detalhe). */
    tenant: (tenantId: string, reloadKey = 0) =>
      ['plataforma', 'tenant', tenantId, reloadKey] as const,
    /** Termos comerciais vigentes de um tenant. */
    termos: (tenantId: string, reloadKey = 0) =>
      ['plataforma', 'termos', tenantId, reloadKey] as const,
  },
} as const;
