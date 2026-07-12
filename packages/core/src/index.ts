// =============================================================================
// @leela/core — tipos de domínio base + interface de pagamento
// Ref: leela-specs/modelo-de-dados-firestore.md + ADR-006 + ADR-009
// =============================================================================

// ---------------------------------------------------------------------------
// Timestamp
// Interface estruturalmente compatível com firebase/firestore.Timestamp e
// firebase-admin/firestore.Timestamp (structural typing do TypeScript).
// ---------------------------------------------------------------------------

export interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

// ---------------------------------------------------------------------------
// Enums / literal types de domínio
// ---------------------------------------------------------------------------

/** Papéis do profissional na plataforma (via custom claims) */
export type PapelProfissional = 'coordenador' | 'organizador' | 'admin';

/**
 * Papéis de plataforma via Firebase custom claims (ADR-008, ADR-009).
 * Accompanhados de `tenantId` no claim para todos os papéis não-athlete.
 */
export type RolePlataforma =
  | 'platform_admin'
  | 'tenant_owner'
  | 'tenant_staff'
  | 'promoter'
  | 'athlete';

// ---------------------------------------------------------------------------
// Entidades de domínio base
// ADR-009: todo agregado tenant-scoped carrega tenantId.
// Entidades globais (cross-tenant): Atleta, CatalogoAcao.
// ---------------------------------------------------------------------------

/**
 * Atleta — identidade global cross-tenant.
 * Coleção: `atletas/{atletaId}` (docId = Firebase Auth uid).
 */
export interface Atleta {
  id: string;
  nome: string;
  email: string;
  /** Iniciais usadas como avatar fallback */
  avatarInit?: string;
  criadoEm: Timestamp;
}

/**
 * Profissional — produtor/organizador de eventos e clubes.
 * Coleção: `profissionais/{profId}`.
 * Tenant-scoped via custom claim `tenantId` (ADR-009).
 */
export interface Profissional {
  id: string;
  /** Tenant ao qual este profissional pertence (ADR-009) */
  tenantId: string;
  nome: string;
  /** E-mail único na plataforma */
  email: string;
  /** Papéis atribuídos — granularidade via custom claims */
  papeis: PapelProfissional[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ---------------------------------------------------------------------------
// PaymentProvider — interface plugável (ADR-006)
// Movida para src/payments/PaymentProvider.ts; re-exportada aqui para
// manter retrocompatibilidade de imports de '@leela/core'.
// ---------------------------------------------------------------------------
export type {
  PaymentMethod,
  ChargeStatus,
  RefundStatus,
  PayoutStatus,
  CustomerData,
  ChargeItem,
  CreateChargeParams,
  ChargeResult,
  SplitRecipient,
  ResolvedSplitRecipient,
  SplitRulesParams,
  SplitRulesResult,
  RefundParams,
  RefundResult,
  WebhookPayload,
  WebhookResult,
  GetPayoutParams,
  PayoutResult,
  PaymentProvider,
} from './payments/PaymentProvider';

// ---------------------------------------------------------------------------
// Módulo Clubs (LEELA-E05 · S101-T1 / S103-T1)
// Entidades Clube e Membro movidas para src/clubs/; re-exportadas aqui para
// manter retrocompatibilidade de imports de '@leela/core'.
// ---------------------------------------------------------------------------
export type {
  Clube,
  ClubeInput,
  PapelClube,
  VisibilidadeClube,
  ModeloEntradaClube,
  EstadoBR,
  LocalizacaoClube,
  Membro,
  PapelMembro,
  StatusMembro,
  EntradaVia,
  Pilar,
  CatalogoAcao,
  ModeloDesafio,
  StatusDesafio,
  RecompensaTipo,
  VisibilidadeDesafio,
  ProgressoPilar,
  Desafio,
  AcaoDesafio,
  ResultadoConvite,
} from './clubs';
export {
  CLUBE_NOME_MAX,
  CLUBE_DESCRICAO_MAX,
  validarSlugClube,
  validarClube,
  CATEGORIAS_CLUBE,
  MODALIDADES_CLUBE,
  ESTADOS_BR,
  isCategoriaClube,
  isModalidadeClube,
  localizacaoValida,
  formatarLocalizacaoClube,
  ALFABETO_CODIGO_CONVITE,
  TAMANHO_CODIGO_CONVITE,
  gerarCodigoConvite,
  validarCodigoConvite,
  MEMBRO_NOVO_DIAS,
  MEMBRO_INATIVO_DIAS,
  derivarStatus,
  contaComoAtivo,
  PILARES,
  isPilar,
  CATALOGO_ACOES,
  TOTAL_ACOES_CATALOGO,
  ACOES_POR_PILAR,
  getAcaoCatalogo,
  MODELOS_DESAFIO,
  STATUS_DESAFIO,
  RECOMPENSAS_DESAFIO,
  VISIBILIDADES_DESAFIO,
  isModeloDesafio,
  isStatusDesafio,
  isRecompensaTipo,
  isVisibilidadeDesafio,
  CAMPOS_AGREGADOS_DESAFIO,
  contaComoDesafioAtivo,
  CONVITE_MIN_EMAILS,
  CONVITE_MAX_EMAILS,
  validarEmail,
  parseEmails,
  validarConvite,
} from './clubs';

// Motores de domínio do clube (E05-L2 · S106-T1…S109-T1):
// pontuação (RN-115), validação de publicação (RN-110/111), vínculo de
// evento (RN-113), parcerias (RN-120…125), comunicados (RN-130…135) e
// segmentação/validações de formulário (S109-T1).
export type {
  RegistroAcao,
  ResultadoPontuacao,
  DesafioParaPublicar,
  TipoParceria,
  StatusParceria,
  ModeloComercial,
  TermosEspelho,
  Parceria,
  ParceriaEventoAfiliado,
  ParceriaPatrocinador,
  StatusComunicado,
  CanalComunicado,
  OrigemComunicado,
  TipoSegmento,
  Segmento,
  Comunicado,
  ComunicadoInput,
  AgregadosSegmentacao,
} from './clubs';
export {
  BONUS_3_PILARES_DIA,
  BONUS_5_DIAS_SEMANA,
  DIAS_MINIMOS_BONUS_SEMANA,
  chaveDia,
  chaveSemanaIso,
  pontosDoRegistro,
  calcularPontos,
  validarPublicacao,
  podePublicar,
  copyPreparacao,
  TIPOS_PARCERIA,
  STATUS_PARCERIA,
  MODELOS_COMERCIAIS,
  isTipoParceria,
  isStatusParceria,
  isModeloComercial,
  isParceriaEventoAfiliado,
  isParceriaPatrocinador,
  CAMPOS_AGREGADOS_PARCERIA,
  CAMPOS_ESPELHO_PARCERIA,
  dentroDaJanelaAtribuicao,
  STATUS_COMUNICADO,
  CANAIS_COMUNICADO,
  ORIGENS_COMUNICADO,
  TIPOS_SEGMENTO,
  isStatusComunicado,
  isCanalComunicado,
  isOrigemComunicado,
  isTipoSegmento,
  CAMPOS_FUNCTION_COMUNICADO,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  temCanalPush,
  COMUNICADO_TITULO_MIN,
  COMUNICADO_CONTEUDO_MIN,
  validarComunicado,
  truncarPush,
  estimarAlcance,
} from './clubs';

// ---------------------------------------------------------------------------
// Módulo Eventos (LEELA-E03 · S200-T1 / S203-T1 / S205-T1)
// Entidade Evento movida para src/eventos/evento.ts; re-exportada aqui para
// manter retrocompatibilidade de imports de '@leela/core'.
// ---------------------------------------------------------------------------
export type { Evento, StatusEvento, PercursoEvento } from './eventos/evento';
export {
  STATUS_EVENTO,
  isStatusEvento,
  isPercursoEvento,
  CAMPOS_AGREGADOS_EVENTO,
  temVenda,
  eventoPublico,
  parseEvento,
} from './eventos/evento';

// RN-200 — preço bloqueado após 1ª venda (E03 · S201-T3)
export {
  MSG_PRECO_BLOQUEADO,
  precoBloqueado,
  podeAlterarPreco,
} from './eventos/precoBloqueado';

// Data do evento — dia civil no fuso do produto (fix review Onda1 #01/#02).
// Fonte ÚNICA da validação hoje-ou-futuro (form + Function) e da conversão
// date-only → instante; telas formatam pinadas em FUSO_EVENTO.
export {
  FUSO_EVENTO,
  isDataEventoISO,
  dataLocalISO,
  dataEventoNoFuturo,
  dataEventoParaDate,
  diasCivisAte,
} from './eventos/dataEvento';

// Cronograma de entrega do evento (FABLE-F-T1 · S204/FRENTE F) — janelas por
// dia/local/horário embutidas no Evento + derivações puras do banner do
// balcão (janela ativa AGORA com `agora` injetável, "Dia N de M").
export type { JanelaEntrega, DiaEntrega } from './eventos/cronogramaEntrega';
export {
  JANELAS_ENTREGA_MAX,
  isHoraJanela,
  isJanelaEntrega,
  validarJanelasEntrega,
  ordenarJanelasEntrega,
  diasDeEntrega,
  horaLocalHHmm,
  janelaEntregaAtiva,
  diaDaEntrega,
  proximaJanelaEntrega,
} from './eventos/cronogramaEntrega';

// Faixa/estoque de chips do evento (FABLE-F-T1) — faixa numérica do lote +
// derivações de chip órfão/fora-da-faixa/esgotamento (cruza inscrito.chipNumero
// SÓ por leitura de tipo).
export type { FaixaChips, EstoqueChips } from './eventos/faixaChips';
export {
  isFaixaChips,
  tamanhoFaixaChips,
  numeroDoChip,
  chipForaDaFaixa,
  chipOrfao,
  LIMIAR_CHIPS_ESGOTANDO,
  derivarEstoqueChips,
} from './eventos/faixaChips';

// Balcão de entrega/check-in — regras puras (E03 · S204-T2 · RN-205/206/207)
export type { PassoBalcao, PlanoAtendimento, ResultadoChip } from './eventos/entrega';
export {
  derivarPassosBalcao,
  podeAtender,
  presencaRegistrada,
  exigeChipParaFechar,
  CHIP_MAX_LENGTH,
  normalizarChip,
  classificarVinculoChip,
} from './eventos/entrega';

export type { Inscrito, KitInscrito, StatusInscrito } from './eventos/inscrito';
export {
  KITS_INSCRITO,
  isKitInscrito,
  STATUS_INSCRITO,
  isStatusInscrito,
  CAMPOS_FUNCTION_INSCRITO,
  chipVinculado,
  inscritoAtivo,
  // FABLE-A-T2 (ADR-011) — link Inscrito↔Pedido; já constam em inscrito.ts,
  // exportados aqui pelo dono do index neste lote (F-T1, conforme brief).
  inscritoTemPedido,
  pedidoDoInscritoCoerente,
  parseInscrito,
} from './eventos/inscrito';

// Bloco [reg] do Inscrito (ADR-011 · FABLE-A-T2)
export type {
  DadosPessoaisInscrito,
  ContatoEmergencia,
  GeneroInscrito,
} from './eventos/dadosPessoais';
export {
  GENEROS_INSCRITO,
  isGeneroInscrito,
  UFS_BRASIL,
  isUfBrasil,
  cpfValido,
  telefoneValido,
  idadeNaData,
  parseDadosPessoais,
  parseTamanhos,
} from './eventos/dadosPessoais';

export type { Kit, ItemKit, OrigemItem, UsadoEmKit } from './eventos/kit';
export {
  precoKitValido,
  kitEhDesconto,
  parseKit,
  ORIGENS_ITEM,
  isOrigemItem,
  podeExibirLogo,
  exibirLogoCoerente,
  computeUsadoEm,
  parseItemKit,
} from './eventos/kit';

// ---------------------------------------------------------------------------
// Kernel de vendas E04 (LEELA-S300-T1 · ADR-012)
// Lote (pertence à modalidade), Cupom, PaginaVendas. Estado de venda
// (`vendidos`/`usos`/`publicada`) = escrita EXCLUSIVA de Function; preço/lote
// ativo/vigência = derivação pura. Ver S300-T1-REPORT.
// ---------------------------------------------------------------------------
export type { Lote } from './eventos/lote';
export {
  CAMPOS_FUNCTION_LOTE,
  loteShapeValido,
  validarLotesModalidade,
  loteEsgotado,
  loteEncerrado,
  loteVigente,
  loteAtivo,
  precoVigente,
  parseLote,
} from './eventos/lote';

export type { Cupom, TipoCupom } from './eventos/cupom';
export {
  TIPOS_CUPOM,
  isTipoCupom,
  CODIGO_CUPOM_RE,
  normalizarCodigoCupom,
  isCodigoCupomValido,
  CAMPOS_FUNCTION_CUPOM,
  valorCupomValido,
  cupomNoTeto,
  cupomNaJanela,
  cupomVigente,
  descontoDoCupom,
  parseCupom,
} from './eventos/cupom';

export type { PaginaVendas, SecaoVendas, SeoVendas, CanalSecao } from './eventos/paginaVendas';
export {
  CANAIS_SECAO,
  isCanalSecao,
  PAGINA_VENDAS_DOC_ID,
  SECAO_CHECKOUT_ID,
  isSecaoVendas,
  checkoutTravado,
  isSeoVendas,
  CAMPOS_FUNCTION_PAGINA_VENDAS,
  secoesVendasPadrao,
  parsePaginaVendas,
} from './eventos/paginaVendas';

// ---------------------------------------------------------------------------
// Checkout (LEELA-E12 · fundação) — estado de venda puro
// preço vigente → cupom → valorFinal → taxa → parcelamento (reusa lote/cupom/
// finance); validação mínima do inscrito; máquina de etapas. A UI (S1203) e
// createInscricaoCharge consomem — nunca recalculam no cliente.
// ---------------------------------------------------------------------------
export type {
  LoteVenda,
  CupomVenda,
  ItemVendaInput,
  ComputeSaleStateParams,
  ItemVendaState,
  CupomAplicadoVenda,
  SaleState,
} from './checkout/saleState';
export { computeSaleState } from './checkout/saleState';

export type { DadosMinimosInscrito } from './checkout/validarDados';
export {
  INSCRITO_NOME_MIN,
  INSCRITO_NOME_MAX,
  validarDadosMinimosInscrito,
} from './checkout/validarDados';

export type { EtapaCheckout } from './checkout/etapas';
export {
  ETAPAS_CHECKOUT,
  isEtapaCheckout,
  indiceEtapa,
  proximaEtapa,
  etapaAnterior,
} from './checkout/etapas';

// ---------------------------------------------------------------------------
// Módulo Pedidos (ADR-011 · LEELA-FABLE-A-T1)
// Kernel `pedidos/{id}` — pedido em grupo (1 responsável, N inscritos) +
// pagamento/conciliação (`pagamentos/{id}`). Estado financeiro: escrita
// EXCLUSIVA de Function; cliente só lê (Rules).
// ---------------------------------------------------------------------------
export type {
  Pedido,
  ResponsavelPedido,
  StatusPedido,
  ItemPedido,
  ItemPedidoInput,
} from './pedidos/pedido';
export {
  STATUS_PEDIDO,
  isStatusPedido,
  TRANSICOES_STATUS_PEDIDO,
  podeTransicionarStatusPedido,
  CAMPOS_FUNCTION_PEDIDO,
  pedidoDeGrupo,
  pedidoPago,
  pedidoContemInscrito,
  pedidoCoerenteComPagamento,
  montarItensDoPedido,
  parsePedido,
} from './pedidos/pedido';

export type {
  Pagamento,
  Conciliacao,
  CupomAplicado,
  CartaoPagamento,
  FormaPagamento,
  StatusPagamento,
  GatewayPagamento,
} from './pedidos/pagamento';
export {
  FORMAS_PAGAMENTO,
  isFormaPagamento,
  STATUS_PAGAMENTO,
  isStatusPagamento,
  TRANSICOES_STATUS_PAGAMENTO,
  podeTransicionarStatusPagamento,
  GATEWAYS_PAGAMENTO,
  isGatewayPagamento,
  pagamentoConfirmado,
  pagamentoConciliado,
  valorPagoPeloComprador,
  parseConciliacao,
  parsePagamento,
} from './pedidos/pagamento';

// ---------------------------------------------------------------------------
// Plataforma multi-tenant (ADR-009 · E16-S1600)
// ---------------------------------------------------------------------------
export type { TenantStatus, TenantTipo, Tenant, TenantInput } from './platform/tenant';
export { canTransition } from './platform/tenant';

// Papéis e guards puros (E16-S1600-T2)
export type { Role, AuthClaims } from './platform/roles';
export { isPlatformAdmin, belongsToTenant, isTenantMember, canSetClaims } from './platform/roles';

// Termos comerciais por tenant (E16-S1602-T1 · RN-404/405/406/410)
export type {
  InstallmentRules,
  Anticipation,
  CommercialTerms,
  CommercialTermsInput,
} from './platform/commercialTerms';
export {
  DEFAULT_COMMERCIAL_TERMS,
  validateCommercialTerms,
  isValidTermsVersionBump,
} from './platform/commercialTerms';

// Provisionamento de tenant (E16-S1601-T1 · RN-403)
export type { ProvisionInput } from './platform/provisioning';
export { validateProvisionInput, buildInitialTerms } from './platform/provisioning';

// Contrato de consumo dos termos — E04/E09 leem por aqui (E16-S1602-T3 · RN-406)
export type { TermsProvider, TermsReader } from './platform/termsProvider';
export {
  createTermsProvider,
  TermsNotFoundError,
  DEFAULT_TERMS_CACHE_TTL_MS,
} from './platform/termsProvider';

// Cálculo financeiro puro — taxa/split (E09 · RN-330/406) e parcelamento (E04 · RN-311)
export type { InstallmentOption } from './finance/calc';
export {
  roundMoney,
  computeTaxa,
  computeReceitaLiquida,
  buildInstallmentOptions,
} from './finance/calc';

// Rollups macro da plataforma (E16-S1605-T1/T2 · RN-409)
export type { TenantHealth, TenantRollup, PlatformRollups } from './platform/rollups';
export { PLATFORM_ROLLUPS_DOC_PATH, deriveTenantHealth } from './platform/rollups';

// ---------------------------------------------------------------------------
// Overview — Visão Geral do profissional (E02 · S600-T2)
// Derivação PURA de KPIs e alertas: o servidor monta os inputs a partir dos
// agregados ∑ canônicos (E03/E05) e grava dashboard/current; o cliente só
// consome o retorno de getOverview — nunca soma nem infere KPI.
// ---------------------------------------------------------------------------
export type {
  EventoKpiInput,
  ClubeKpiInput,
  JanelaInscricoes,
  OverviewKPIs,
} from './overview/kpis';
export {
  LIMIAR_ESGOTANDO,
  ocupacaoDoEvento,
  vagasRestantesDoEvento,
  emEsgotamento,
  derivarTrendPct,
  derivarTaxaConversao,
  derivarKpis,
} from './overview/kpis';

export type {
  SeveridadeAlerta,
  OverviewAlert,
  EventoAlertaInput,
  PendentesAlertaInput,
} from './overview/alerts';
export {
  PENDENTE_ALERTA_HORAS,
  PRAZO_PUBLICACAO_DIAS,
  formatarRelativo,
  derivarAlertas,
} from './overview/alerts';
