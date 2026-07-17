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
    /**
     * Fan-out do `financeiro/current` de TODOS os eventos do organizador
     * (RN-349 · repasses POR EVENTO; RN-820 · modalidades da análise). Lê a
     * lista de eventos do organizador e, por evento, o agregado financeiro —
     * O(eventos) leituras de AGREGADO (nunca varre inscritos). Chave partilhada
     * pelas telas de Repasses (por evento) e Análise (modalidades).
     */
    porOrganizador: (tenantId: string, organizadorId: string) =>
      ['financeiro', 'por-organizador', tenantId, organizadorId] as const,
  },

  // ---------------------------------------------------------------------------
  // Repasse do organizador (E09-slim · E09s-L3). Coleções tenant-scoped
  // (`tenants/{tid}/saldo|dadosBancarios|repasses`). Prefixo `['repasse', tid]`
  // permite invalidar a família inteira do tenant pós-mutação: solicitar um
  // repasse invalida saldo (comprometido↑/disponível↓) E histórico numa tacada.
  // ---------------------------------------------------------------------------
  repasse: {
    /** `saldo/current` do tenant — a ÚNICA fonte dos 3 cards (∑ do servidor). */
    saldo: (tenantId: string) => ['repasse', tenantId, 'saldo'] as const,
    /** `dadosBancarios/current` mascarado (RN-354). */
    dadosBancarios: (tenantId: string) => ['repasse', tenantId, 'dados-bancarios'] as const,
    /** `repasses` do tenant — histórico (mais recentes primeiro). */
    historico: (tenantId: string) => ['repasse', tenantId, 'historico'] as const,
    /**
     * Fila de aprovação cross-tenant do platform_admin (E09s-L4). NÃO é
     * tenant-scoped: agrega os repasses `solicitado`/`aprovado` de TODOS os
     * tenants (fan-out de leitura no gateway). `reloadKey` na chave preserva o
     * refetch pós-ação (aprovar/recusar/pagar/retenção) sem tocar a tela.
     */
    filaAdmin: (reloadKey = 0) => ['repasse', 'fila-admin', reloadKey] as const,
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
    /**
     * Catálogo de ITENS do kit do evento (top-level `itensKit`, tenant-scoped).
     * Partilhado Cadastro ↔ balcão (o checklist de entrega lê os itens). Salvar/
     * remover um item invalida esta chave → read-your-writes (ADR-010).
     */
    itensDoEvento: (eventoId: string) => ['kits', 'itens-do-evento', eventoId] as const,
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
    /**
     * Fan-out do aprovisionamento por SKU de TODOS os eventos do organizador
     * (RN-820 · tamanhos mais pedidos da análise). Lê a lista de eventos e, por
     * evento, os SKUs (agregados FABLE-D) — O(eventos) leituras de AGREGADO,
     * nunca varre inscritos. `qtdVendida` por tamanho vem pronta do doc.
     */
    porOrganizador: (tenantId: string, organizadorId: string) =>
      ['aprovisionamento', 'por-organizador', tenantId, organizadorId] as const,
  },

  demografia: {
    /**
     * Fan-out do agregado demográfico (`eventos/{id}/demografia/current` —
     * E11 §RN-820 · LEELA-BEPEND-T1) de TODOS os eventos do organizador. A
     * análise de vendas lê esta chave — O(eventos) point reads de AGREGADO
     * (buckets de idade/gênero mantidos pela Function agregarDemografia);
     * NUNCA varre inscritos nem recebe dado individual.
     */
    porOrganizador: (tenantId: string, organizadorId: string) =>
      ['demografia', 'por-organizador', tenantId, organizadorId] as const,
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

  cupons: {
    /**
     * Cupons simples de um evento — S300-T5 (seção na tela da página de vendas).
     * A seção lê esta chave; salvar/remover um cupom a invalida →
     * read-your-writes (ADR-010): a lista reflete a escrita sem reload manual.
     */
    doEvento: (eventoId: string) => ['cupons', 'do-evento', eventoId] as const,
  },

  comunicacoes: {
    /**
     * Agregado ∑ de comunicações do evento (`comunicacoesResumo/current` —
     * FABLE-G) — os contadores da aba Comunicação (E06-L3). Point read O(1).
     */
    resumo: (eventoId: string) => ['comunicacoes', 'resumo', eventoId] as const,
    /**
     * Timeline do log de comunicação (recentes primeiro, `limite` docs). O
     * limite entra na chave — trocá-lo é uma leitura distinta (mais/menos itens).
     */
    doEvento: (eventoId: string, limite: number) =>
      ['comunicacoes', 'do-evento', eventoId, limite] as const,
  },

  campanhas: {
    /**
     * Campanhas do evento (`eventos/{id}/campanhas` — S401-T2). A lista lê esta
     * chave; criar/editar/duplicar/excluir/enviar a invalidam → read-your-writes
     * (ADR-010): a lista reflete a escrita sem reload manual.
     */
    doEvento: (eventoId: string) => ['campanhas', 'do-evento', eventoId] as const,
    /** Uma campanha pelo id — modo edição do editor (S401-T3). */
    detalhe: (eventoId: string, campanhaId: string) =>
      ['campanhas', 'detalhe', eventoId, campanhaId] as const,
  },

  equipe: {
    /**
     * Equipe (membros) de um evento — S304-T3 (tela Equipe & permissões). A tela
     * lê esta chave; convidar/trocar papel/remover a invalidam → read-your-writes
     * (ADR-010): a lista reflete a escrita sem reload manual.
     */
    doEvento: (eventoId: string) => ['equipe', 'do-evento', eventoId] as const,
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
    /**
     * Tenant + perfil do owner (join `profissionais/{ownerUid}` — CONS-4-T1).
     * Aninhado no prefixo `['plataforma','tenant',id]` de propósito: a
     * invalidação de transição (que usa esse prefixo) revalida também o join,
     * sem chave nova a invalidar à parte.
     */
    tenantComOwner: (tenantId: string) =>
      ['plataforma', 'tenant', tenantId, 'com-owner'] as const,
    /** Termos comerciais vigentes de um tenant. */
    termos: (tenantId: string, reloadKey = 0) =>
      ['plataforma', 'termos', tenantId, reloadKey] as const,
    /**
     * Catálogo de planos de cobrança nomeados (`planosCobranca` — T2-L4). Read
     * SÓ platform_admin (Rules). `reloadKey` preserva o refetch pós-save/aplicar
     * sem tocar a tela (mesma ponte do resto de `plataforma`).
     */
    planos: (reloadKey = 0) => ['plataforma', 'planos', reloadKey] as const,
  },
} as const;
