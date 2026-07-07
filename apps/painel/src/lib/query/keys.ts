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

  financeiro: {
    /** Agregado `financeiro/current` de um evento — partilhado Overview ↔ Financeiro. */
    current: (eventoId: string) => ['financeiro', 'current', eventoId] as const,
  },
} as const;
