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
  CancelChargeParams,
  CancelChargeResult,
  SplitRecipient,
  ResolvedSplitRecipient,
  SplitRulesParams,
  SplitRulesResult,
  RefundParams,
  RefundResult,
  WebhookPayload,
  WebhookResult,
  WebhookRefundInfo,
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
  DesafioAnexo,
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
  TIPOS_SEGMENTO_SEM_REFERENCIA,
  isStatusComunicado,
  isCanalComunicado,
  isOrigemComunicado,
  isTipoSegmento,
  segmentoDispensaReferencia,
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
  // RN-153/RN-347 (EVENTO-CAMPOS): capa http(s), regulamento e modo da taxa
  IMAGEM_URL_MAX,
  REGULAMENTO_MAX,
  isUrlCapaValida,
  modoTaxaDoEvento,
  // RN-303 (S1804): modo cupom-only (evento fechado)
  vendaSomentePorCupomAtiva,
  MSG_EVENTO_FECHADO_SEM_CUPOM,
} from './eventos/evento';

// RN-304 (S307) — capacidade de lote editável (reabrir vagas)
export type { CapacidadeLote } from './eventos/capacidadeLote';
export {
  CAPACIDADE_LOTE_MAX,
  capacidadeDoLote,
  validarAjusteCapacidade,
} from './eventos/capacidadeLote';

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
  isDataHoraLocalISO,
  dataHoraLocalParaDate,
  dataHoraLocalISO,
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

export type {
  Inscrito,
  KitInscrito,
  StatusInscrito,
  // S904-T4 (RN-345) — trilha append-only de titularidade
  TitularHistoricoEntry,
} from './eventos/inscrito';
export {
  KITS_INSCRITO,
  isKitInscrito,
  STATUS_INSCRITO,
  isStatusInscrito,
  // FABLE-B (RN-341) — máquina de transição do inscrito ('estornado' é
  // terminal; consultada por estornarInscricao, nunca re-derivada local)
  TRANSICOES_STATUS_INSCRITO,
  podeTransicionarStatusInscrito,
  CAMPOS_FUNCTION_INSCRITO,
  chipVinculado,
  inscritoAtivo,
  // FABLE-A-T2 (ADR-011) — link Inscrito↔Pedido; já constam em inscrito.ts,
  // exportados aqui pelo dono do index neste lote (F-T1, conforme brief).
  inscritoTemPedido,
  pedidoDoInscritoCoerente,
  parseInscrito,
} from './eventos/inscrito';

// Código identificador do ingresso (S1206-T5 · RN-396) — fonte única do
// alfabeto e do tamanho; a unicidade por evento é do servidor, não daqui.
export {
  ALFABETO_CODIGO_INGRESSO,
  TAMANHO_CODIGO_INGRESSO,
  CARACTERES_AMBIGUOS_INGRESSO,
  isCodigoIngressoValido,
  normalizarCodigoIngresso,
  gerarCodigoIngresso,
} from './tickets/codigoIngresso';

// Token do LINK da página do ingresso (S1214-T1 · RN-419/RN-421) — parte pura.
// A verificação criptográfica vive nas Functions; aqui só formato, parse e a
// matriz de estados que a página renderiza.
export {
  VERSAO_LINK_INGRESSO,
  LINK_INGRESSO_MAX_CHARS,
  LINK_INGRESSO_ASSINATURA_BYTES,
  codificarPayloadLinkIngresso,
  conteudoVisivelLinkIngresso,
  montarLinkIngressoToken,
  parseLinkIngressoToken,
  dominiosDeTokenSeparados,
  estadoMostraQr,
} from './tickets/linkIngresso';
export type {
  LinkIngressoPayload,
  ParseLinkIngressoResult,
  EstadoIngressoPagina,
} from './tickets/linkIngresso';

// Exigências de saúde + regulamento (E04 · LEELA-S306 · RN-146/147/149)
export type { ExigenciasSaude } from './eventos/exigenciasSaude';
export {
  exigenciasSaudePadrao,
  isExigenciasSaude,
  exigeDadoDeSaude,
} from './eventos/exigenciasSaude';
export type { SaudeInscrito, BaseLegalSaude } from './eventos/saudeInscrito';
export {
  SAUDE_DOC_ID,
  SAUDE_SUBCOL,
  RETENCAO_SAUDE_DIAS_POS_EVENTO,
  parseSaudeInscrito,
} from './eventos/saudeInscrito';
export {
  versaoRegulamento,
  precisaNovoAceite,
  regulamentoMudou,
} from './eventos/regulamento';

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
  normalizarCpf,
  normalizarTelefone,
  idadeNaData,
  parseDadosPessoais,
  parseTamanhos,
} from './eventos/dadosPessoais';

export type {
  Kit,
  ItemKit,
  OrigemItem,
  UsadoEmKit,
  ModeloEstoque,
  CorteItem,
  GradeCorte,
  GaleriaKit,
} from './eventos/kit';
export {
  precoKitValido,
  kitEhDesconto,
  parseKit,
  KIT_DESCRICAO_MAX,
  KIT_ITENS_MAX,
  KIT_ITEM_MAX,
  normalizarItensKit,
  isUrlImagemKitValida,
  // Galeria do kit (S212-T1 · RN-425/427) — `fotosDoKit` é o acessor canônico
  // e `promoverFotoPrincipal` é a única operação que pode violar a forma.
  KIT_FOTOS_SECUNDARIAS_MAX,
  normalizarFotosSecundarias,
  fotosDoKit,
  promoverFotoPrincipal,
  removerFotoPrincipal,
  ORIGENS_ITEM,
  isOrigemItem,
  MODELOS_ESTOQUE,
  isModeloEstoque,
  CORTES_ITEM,
  isCorteItem,
  isTamanhoItemValido,
  validarGradeItem,
  gradeEfetivaDoItem,
  tamanhosDoCorte,
  gradeDoDocItemKit,
  podeExibirLogo,
  exibirLogoCoerente,
  computeUsadoEm,
  parseItemKit,
} from './eventos/kit';

// ---------------------------------------------------------------------------
// Aprovisionamento de kit por SKU (LEELA-S210 · FABLE-D · RN-224/225/226)
// `eventos/{id}/aprovisionamento/{itemId__tamanho}` — ∑ e estado de escrita
// EXCLUSIVA de Function (agregarEstoque/transicaoAprovisionamento).
// ---------------------------------------------------------------------------
export type {
  Aprovisionamento,
  EstadoAprovisionamento,
  TransicaoAprovisionamento,
  AlertaEstoqueSku,
} from './eventos/aprovisionamento';
export {
  COLECAO_APROVISIONAMENTO,
  SEPARADOR_SKU,
  skuId,
  parseSkuId,
  sufixoSku,
  parseSufixoTamanho,
  skusDeclaradosDoItem,
  ESTADOS_APROVISIONAMENTO,
  isEstadoAprovisionamento,
  TRANSICOES_APROVISIONAMENTO,
  podeTransicionarAprovisionamento,
  computeAEncomendar,
  saldoFisicoSku,
  LIMIAR_BAIXA_SKU_DEFAULT,
  alertaAprovisionamento,
  qtdEstoqueValida,
  parseAprovisionamento,
} from './eventos/aprovisionamento';

// ---------------------------------------------------------------------------
// Kernel de vendas E04 (LEELA-S300-T1 · ADR-012)
// Lote (pertence à modalidade), Cupom, PaginaVendas. Estado de venda
// (`vendidos`/`usos`/`publicada`) = escrita EXCLUSIVA de Function; preço/lote
// ativo/vigência = derivação pura. Ver S300-T1-REPORT.
// ---------------------------------------------------------------------------
export type { Lote, MotivoEncerramentoLote } from './eventos/lote';
export {
  CAMPOS_FUNCTION_LOTE,
  MOTIVOS_ENCERRAMENTO_LOTE,
  loteShapeValido,
  validarLotesModalidade,
  loteEsgotado,
  loteEncerrado,
  loteVigente,
  loteAtivo,
  motivoEncerramento,
  precoVigente,
  parseLote,
} from './eventos/lote';

export type { Cupom, TipoCupom, EscopoCupom } from './eventos/cupom';
export {
  TIPOS_CUPOM,
  isTipoCupom,
  ESCOPOS_CUPOM,
  isEscopoCupom,
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

export type {
  PoliticaVendas,
  PoliticaReembolso,
  PoliticaTransferencia,
  PoliticaTrocaIngresso,
  RoteamentoReembolso,
  DevolucaoEstorno,
} from './eventos/politicaVendas';
export {
  POLITICA_VENDAS_DOC_ID,
  JANELA_ARREPENDIMENTO_DIAS_DEFAULT,
  CORTE_HORAS_DEFAULT,
  SLA_ANALISE_DIAS_DEFAULT,
  TRANSFERENCIA_JANELA_HORAS_DEFAULT,
  TROCA_JANELA_HORAS_DEFAULT,
  politicaVendasPadrao,
  validarPoliticaVendas,
  parsePoliticaVendas,
  rotearReembolso,
  // RN-373/374 — o que volta e o que fica no estorno (decisão 42)
  dentroDaJanelaArrependimento,
  calcularDevolucaoEstorno,
  transferenciaAberta,
  trocaIngressoAberta,
  // CKMOD — versão vigente da política (paralelo RN-149)
  CAMPOS_FUNCTION_POLITICA_VENDAS,
  versaoPoliticaVendas,
  materialPoliticaVendas,
  precisaNovoAceiteTermos,
} from './eventos/politicaVendas';

// ---------------------------------------------------------------------------
// CKMOD — extensão de modelo do checkout (spec CHECKOUT-UX §5, ratificada
// 2026-07-18): endereço do pedido + aceites versionados no pagar.
// ---------------------------------------------------------------------------
export type { EnderecoPedido } from './pedidos/endereco';
export {
  ENDERECO_LOGRADOURO_MAX,
  ENDERECO_CAMPO_MAX,
  ENDERECO_NUMERO_MAX,
  normalizarCep,
  cepValido,
  validarEnderecoPedido,
  parseEnderecoPedido,
} from './pedidos/endereco';
export type {
  AceiteVersionado,
  AceitesPedido,
  OrigemAceite,
  VersoesAceiteExibidas,
} from './pedidos/aceites';
export {
  TERMO_SAUDE_VERSAO_VIGENTE,
  MOTIVO_ACEITE_VERSAO_DIVERGENTE,
  ACEITE_USER_AGENT_MAX,
  validarAceitesCheckoutInput,
  parseAceitesPedido,
} from './pedidos/aceites';

// CK2-T4 — RN-156: termo de saúde CUSTOM do organizador (aditivo ao base;
// versionado como a politicaVendas; fence server-side no pagar).
export type { TermoSaudeCustom } from './eventos/termoSaude';
export {
  TERMO_SAUDE_CUSTOM_DOC_ID,
  TERMO_SAUDE_CUSTOM_TEXTO_MAX,
  CAMPOS_FUNCTION_TERMO_SAUDE,
  materialTermoSaude,
  termoSaudeCustomAtivo,
  versaoTermoSaude,
  validarTermoSaudeCustom,
  parseTermoSaudeCustom,
} from './eventos/termoSaude';

// ---------------------------------------------------------------------------
// CK2 — RN-173: registro global de pessoa por CPF (unicidade estrutural pela
// chave; colisão = mesma pessoa, linka, nunca duplica). Base do linking da
// conta (RN-155), do prefill (RN-154) e do CRM (RN-172).
// ---------------------------------------------------------------------------
export type { Pessoa, DadosConhecidosPessoa } from './pedidos/pessoa';
export {
  COLECAO_PESSOAS,
  PESSOA_ID_PREFIXO_CPF,
  mesclarDadosConhecidosPessoa,
  parsePessoa,
} from './pedidos/pessoa';

// ---------------------------------------------------------------------------
// Checkout (LEELA-E12 · fundação) — estado de venda puro
// preço vigente → cupom → valorFinal → taxa → parcelamento (reusa lote/cupom/
// finance); validação mínima do inscrito; máquina de etapas. A UI (S1203) e
// createInscricaoCharge consomem — nunca recalculam no cliente.
// ---------------------------------------------------------------------------
export type {
  LoteVenda,
  CupomVenda,
  KitVenda,
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
  NASCIMENTO_MIN_ISO,
  validarDadosMinimosInscrito,
} from './checkout/validarDados';

// Validação de TAMANHOS do kit na ORIGEM (S209-T2 · RN-223/212 · ratificação
// 3d — LEELA-BEPEND-T4): fecha o vetor "tamanho forjado no payload" no
// produtor de escrita do checkout; reutilizável web (E12) + mobile (E13).
export type {
  ItemKitParaTamanhos,
  ValidarTamanhosParams,
} from './checkout/validarTamanhos';
export {
  TAMANHOS_MAX_ENTRADAS,
  validarTamanhosInscrito,
} from './checkout/validarTamanhos';

export type { EtapaCheckout } from './checkout/etapas';
export {
  ETAPAS_CHECKOUT,
  isEtapaCheckout,
  indiceEtapa,
  proximaEtapa,
  etapaAnterior,
} from './checkout/etapas';

// PRAZO DO CARRINHO (RN-158 · PIX-CARRINHO-T2) — 15 min da abertura até
// concluir. Vizinho declarado da RN-157: os dois relógios compõem em
// sequência (ver o cabeçalho de checkout/carrinho.ts).
export type { StatusCarrinho } from './checkout/carrinho';
export {
  CARRINHO_PRAZO_SEGUNDOS,
  STATUS_CARRINHO,
  isStatusCarrinho,
  STATUS_CARRINHO_EXPIRADO,
  MOTIVO_CARRINHO_EXPIRADO,
  CARRINHO_CRON_INTERVALO_MIN,
  CARRINHO_CARIMBO_TOLERANCIA_MS,
  carrinhoNoPrazo,
} from './checkout/carrinho';

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
  TaxaCongelada,
  CupomAplicado,
  CartaoPagamento,
  FormaPagamento,
  StatusPagamento,
  GatewayPagamento,
} from './pedidos/pagamento';
export {
  FORMAS_PAGAMENTO,
  isFormaPagamento,
  PIX_EXPIRACAO_SEGUNDOS,
  MOTIVO_PIX_PENDENTE_ATIVO,
  MOTIVO_PIX_ANTERIOR_NAO_ENCERRADO,
  MOTIVO_GATEWAY_SEM_RESPOSTA,
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
export type { Role, AuthClaims, TrilhaOperacao } from './platform/roles';
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

// Convite de ORGANIZADOR para a plataforma (E16 · S1608 · RN-413/414/415).
// Distinto do convite de atleta→clube (RN-101) e do convite por e-mail de
// clube (S104): entidade, coleção e Rules próprias. Alfabeto compartilhado
// com o RN-101 (constante única); tamanho 8 porque é porta de plataforma.
export type {
  StatusConviteOrganizador,
  ConviteOrganizador,
} from './platform/conviteOrganizador';
export {
  COLECAO_CONVITES_ORGANIZADOR,
  ALFABETO_CODIGO_ORGANIZADOR,
  TAMANHO_CODIGO_ORGANIZADOR,
  LIMITE_RESGATE_CONVITE,
  JANELA_RESGATE_CONVITE_MS,
  ERRO_RESGATE_CONVITE,
  NOTA_CONVITE_MAX,
  normalizarCodigoOrganizador,
  validarCodigoOrganizador,
  gerarCodigoOrganizador,
  conviteExpirado,
  conviteResgatavel,
} from './platform/conviteOrganizador';

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

// Taxa-flex da plataforma — tabela por meio de pagamento (TAXAFLEX ·
// RN-178/179/180/182/183): global + override, resolução e cálculo half-up
// em centavos inteiros (fonte única — nunca constante).
export type {
  MeioTaxa,
  TaxaMeio,
  TabelaTaxaPlataforma,
  TaxaTabelaOverride,
  OrigemTaxaMeio,
  TaxaMeioResolvida,
} from './finance/taxaPlataforma';
export {
  MEIOS_TAXA,
  isMeioTaxa,
  ORIGENS_TAXA_MEIO,
  isOrigemTaxaMeio,
  meioDaForma,
  TAXA_FIXO_CENTAVOS_MAX,
  isTaxaMeioValida,
  taxaMeioValoresValidos,
  validarTabelaTaxaPlataforma,
  validarTaxaTabelaOverride,
  resolverTaxaMeio,
  computeTaxaPlataforma,
  taxaMeioParaBp,
  computeTaxaPlataformaReais,
  PLATFORM_CONFIG_DOC_PATH,
  CAMPO_TAXA_PLATAFORMA,
} from './finance/taxaPlataforma';

// ---------------------------------------------------------------------------
// Repasse do organizador — E09-slim (LEELA-E09s-L1 · RN-347/348/350..357)
// Shapes das coleções tenant-scoped `dadosBancarios[Secret]`, `repasses`,
// `saldo` (escrita SÓ por Function — RN-357). dadosBancariosSecret é
// read:false nas Rules até para o owner (RN-354).
// ---------------------------------------------------------------------------
export type {
  EstadoRepasse,
  ModoTaxa,
  TipoContaBancaria,
  DadosBancarios,
  DadosBancariosSecret,
  DadosBancariosSnapshot,
  AtorRepasse,
  TransicaoRepasse,
  Repasse,
  SaldoRepasse,
  EventoSaldoInput,
  RepasseSaldoInput,
  TransacaoJanelaInput,
} from './finance/repasse-types';
export {
  ESTADOS_REPASSE,
  isEstadoRepasse,
  MODOS_TAXA,
  isModoTaxa,
  TIPOS_CONTA_BANCARIA,
  isTipoContaBancaria,
} from './finance/repasse-types';

// Núcleo puro do repasse (E09s-L1-T3): retenção RN-372, saldo RN-373,
// solicitação RN-374, máquina RN-375, comprovante RN-355, líquido com modo
// de taxa RN-347 e janela D+N em dias úteis RN-370. O disponível POR EVENTO
// abate os repasses vivos daquele evento (DEC-0727 · computeDisponivelPorEvento)
// e sai da base ÚNICA do saque — líquido, retenção que libera no encerramento
// (RN-367 · DEC-0727C · computeDisponivelDoEvento), a mesma da Caixa, da coluna
// por evento e do guard por evento do requestRepasse (RN-368).
export type {
  ComputeSaldoRepasseParams,
  SaldoRepasseComputado,
  DisponivelDoEventoParams,
  DisponivelDoEvento,
  ResultadoValidacaoSolicitacao,
  EventoRepasseMaquina,
  ResultadoTransicaoRepasse,
} from './finance/repasse';
export {
  RETENCAO_REPASSE_PCT_DEFAULT,
  DISPONIBILIZACAO_DIAS_UTEIS_DEFAULT,
  MODO_TAXA_DEFAULT,
  COMPROVANTE_PREFIXO,
  computeLiquidoProdutor,
  computeRetido,
  computeLiberadoPorEvento,
  computeDisponivelPorEvento,
  computeDisponivelDoEvento,
  ESTADOS_REPASSE_COMPROMETIDOS,
  comprometeSaldo,
  computeSaldoRepasse,
  validarSolicitacao,
  TRANSICOES_REPASSE,
  podeTransicionarRepasse,
  EVENTOS_REPASSE_MAQUINA,
  ATOR_DO_EVENTO_REPASSE,
  transitionRepasse,
  formatarNumeroComprovante,
  isDiaUtil,
  diasUteisDecorridos,
  transacaoDentroJanelaDN,
  computeDentroJanelaDN,
} from './finance/repasse';

// Reembolso — máquina de estados pura (E09 · LEELA-S904-T1 · RN-341).
// A execução (estorno via PaymentProvider) é da S904-T2 e REUSA FABLE-B.
export type {
  EstadoReembolso,
  OrigemReembolso,
  Reembolso,
  TransicaoReembolso,
  ResultadoTransicaoReembolso,
} from './finance/refund-machine';
export {
  ESTADOS_REEMBOLSO,
  ESTADOS_REEMBOLSO_TERMINAIS,
  ESTADOS_REEMBOLSO_EXECUTAVEIS,
  isEstadoReembolso,
  transicaoReembolsoValida,
  transitionReembolso,
} from './finance/refund-machine';

// Notificações da máquina de reembolso (E09 · LEELA-S904-T3 · RN-342) —
// mapeamento puro estado→destinatários; registro idempotente via log de
// comunicação (FABLE-G).
export type { NotificacaoReembolso } from './finance/refund-notifications';
export {
  chaveTransicaoReembolso,
  notificacoesAberturaReembolso,
  notificacoesTransicaoReembolso,
} from './finance/refund-notifications';

// Transferência de titularidade / troca de ingresso (E09 · LEELA-S904-T4 ·
// RN-343/344/345) — guardas puras; execução no requestTransfer (Function).
export type {
  TipoTransferencia,
  EstadoTransferencia,
  NovoTitularDados,
  Transferencia,
  ResultadoGuardaTransferencia,
} from './finance/transfer';
export {
  TIPOS_TRANSFERENCIA,
  isTipoTransferencia,
  podeTransferirTitularidade,
  podeTrocarIngresso,
  exigeRecoletaTamanhos,
  diffTrocaIngresso,
} from './finance/transfer';

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

// ---------------------------------------------------------------------------
// Comms — LOG DE COMUNICAÇÃO, agregado único (FABLE-G-T1 · Onda 2)
// Fonte de E06-L3 (aba Comunicação/campanhas) e S1206-T2 (log de envio do
// ingresso — RN-219). Log flat `eventos/{id}/comunicacoes` com docId
// determinístico + resumo ∑ `comunicacoesResumo/current` por Function.
// ---------------------------------------------------------------------------
export type {
  CanalLogComunicacao,
  TipoLogComunicacao,
  StatusLogComunicacao,
  TipoDestinatarioComunicacao,
  DestinatarioComunicacao,
  LogComunicacao,
  ResumoComunicacoes,
  TipoEventoProvedor,
  EventoProvedor,
  MudancasLogComunicacao,
} from './comms/logComunicacao';
export {
  CANAIS_LOG_COMUNICACAO,
  TIPOS_LOG_COMUNICACAO,
  STATUS_LOG_COMUNICACAO,
  TIPOS_DESTINATARIO_COMUNICACAO,
  TIPOS_EVENTO_PROVEDOR,
  TRANSICOES_STATUS_LOG_COMUNICACAO,
  CHAVE_LOG_COMUNICACAO_RE,
  CAMPOS_PROIBIDOS_LOG_COMUNICACAO,
  COLECAO_LOG_COMUNICACAO,
  COLECAO_RESUMO_COMUNICACOES,
  DOC_RESUMO_COMUNICACOES,
  isCanalLogComunicacao,
  isTipoLogComunicacao,
  isStatusLogComunicacao,
  isTipoDestinatarioComunicacao,
  isTipoEventoProvedor,
  podeTransicionarStatusLogComunicacao,
  chaveLogComunicacao,
  logComunicacaoDocId,
  aplicarEventoProvedor,
  parseLogComunicacao,
  parseResumoComunicacoes,
} from './comms/logComunicacao';

// ---------------------------------------------------------------------------
// Equipe do evento — 4 papéis + matriz de acesso 4×7 (RN-320 · S304-T1 · E04-L4)
// `podeAcessar` é API PÚBLICA: E07-web (403 por papel) e E05 importam daqui.
// ---------------------------------------------------------------------------
export type {
  PapelEvento,
  AreaEvento,
  ClaimsEquipeEventos,
  StatusMembroEquipe,
  MembroEquipe,
} from './eventos/equipe';
export {
  PAPEIS_EVENTO,
  AREAS_EVENTO,
  MATRIZ_ACESSO_EVENTO,
  STATUS_MEMBRO_EQUIPE,
  CAMPOS_FUNCTION_MEMBRO_EQUIPE,
  isPapelEvento,
  isAreaEvento,
  isStatusMembroEquipe,
  podeAcessar,
  papeisComAcesso,
  papelNoEvento,
  parseMembroEquipe,
} from './eventos/equipe';

// ---------------------------------------------------------------------------
// Comunicação — primitivas agnósticas compartilhadas clube/evento
// (E06-L1-T1 · Camada A). Canal/status/origem + PUSH_MAX_CHARS/
// PUSH_SEMANA_MAX + truncarPush JÁ são exportados acima via './clubs'
// (re-export estável — mesma fonte). Aqui entram SÓ os símbolos NOVOS da
// extração; NÃO duplicar os nomes já exportados (conflito de barrel).
// ---------------------------------------------------------------------------
export type { ComunicacaoBaseInput } from './comunicacao';
export {
  contarChars,
  COMUNICACAO_TITULO_MIN,
  COMUNICACAO_CONTEUDO_MIN,
  validarComunicacaoBase,
} from './comunicacao';

// ---------------------------------------------------------------------------
// Campanha do evento (LEELA-S401-T1 · E06) — Camada C sobre core/comunicacao.
// Taxonomia de segmento V1 = todos_inscritos|por_modalidade|por_kit|por_status
// (corte 5: sem por_engajamento); SEM aberturasPct (corte 4). Status usa os
// códigos masculinos compartilhados (item 9) — label feminino é da UI.
// ---------------------------------------------------------------------------
export type {
  CanalCampanha,
  StatusCampanha,
  StatusCampanhaPersistido,
  OrigemCampanha,
  TipoSegmentoCampanha,
  SegmentoCampanha,
  Campanha,
  CampanhaInput,
} from './eventos/campanha';
export {
  COLECAO_CAMPANHAS,
  TIPOS_SEGMENTO_CAMPANHA,
  isTipoSegmentoCampanha,
  validarSegmentoCampanha,
  CAMPOS_FUNCTION_CAMPANHA,
  validarCampanha,
  parseCampanha,
  // RN-136 · decisão 17 (agendada vencida NÃO dispara — estado terminal)
  STATUS_CAMPANHA_VENCIDO,
  isStatusCampanhaPersistido,
  DISPARO_CRON_INTERVALO_MIN,
  DISPARO_VENCIMENTO_CICLOS,
  DISPARO_VENCIMENTO_TOLERANCIA_MS,
  disparoVencido,
} from './eventos/campanha';

// ---------------------------------------------------------------------------
// Analytics — snapshot diário de KPIs (LEELA-S821-T1a · E11 · Onda 2 T2-L1)
// Cópia campo a campo de OverviewKPIs (zero recálculo, sem alerts); doc
// `profissionais/{profId}/analyticsSnapshots/{YYYY-MM-DD}` — só Function
// escreve; passado imutável. Coletado pelo cron coletaDiaria (ADR-015).
// ---------------------------------------------------------------------------
export type { AnalyticsSnapshot } from './analytics/snapshot';
export {
  CAMPOS_KPI_SNAPSHOT,
  isDataSnapshotValida,
  montarSnapshot,
} from './analytics/snapshot';

// ---------------------------------------------------------------------------
// Analytics — demografia AGREGADA do evento (LEELA-BEPEND-T1 · E11 §RN-820).
// Doc `eventos/{id}/demografia/current` = SÓ buckets (faixa etária × idade na
// prova + gênero); nenhum dado individual sai do servidor (LGPD). Recontagem
// determinística (referência = data civil do evento); escrita exclusiva da
// Function `agregarDemografia`.
// ---------------------------------------------------------------------------
export type {
  DemografiaContagens,
  FaixaEtaria,
  InscritoDemografiaInput,
  MatrizFaixaGenero,
} from './analytics/demografia';
export {
  FAIXAS_ETARIAS,
  computeDemografia,
  demografiaInalterada,
  demografiaVazia,
  faixaEtariaDaIdade,
  idadeCivil,
  matrizFaixaGeneroVazia,
} from './analytics/demografia';

// Salvaguarda de k-anonimato do cohort idade×sexo (RN-822 · minimização
// LGPD): a matriz bruta vive no doc; a EXPOSIÇÃO passa por suprimirCohortPorK
// (reader-side, pós-soma). Ver cabeçalho de cohortPrivacidade.ts.
export type { CohortFaixaVisivel } from './analytics/cohortPrivacidade';
export {
  K_MIN_COHORT,
  somarMatrizes,
  suprimirCohortPorK,
} from './analytics/cohortPrivacidade';

// ---------------------------------------------------------------------------
// Atleta — registro de ação da jornada (LEELA-S1307-T1 · E13 adiantado ·
// Onda 2 T2-L2). Pontos NÃO moram no registro: ∑ com bônus RN-115 é da
// Function (onRegistroWrite) em participantes/{uid}. Validação sempre
// contra o catálogo (RN-114); path do desafio = aninhado ADR-009.
// ---------------------------------------------------------------------------
export type {
  OrigemRegistro,
  Registro,
  RegistroInput,
  ParticipanteAgregado,
} from './atleta/registro';
export {
  ORIGENS_REGISTRO,
  isOrigemRegistro,
  validarRegistro,
  paraRegistroAcao,
  dentroDaJanelaDesafio,
  agregarParticipante,
  metaTotalEmPontos,
  derivarProgressoDesafio,
  derivarProgressoPorPilar,
} from './atleta/registro';

// Clubs — participação em desafio (LEELA-S1308-T1 · RN-117): decisão PURA
// de entrada (publico/membros/convite); a fronteira real é o callable
// entrarNoDesafio (Rules não checam membro por uid).
export type {
  ContextoParticipacao,
  DecisaoParticipacao,
} from './clubs/participacao';
export { podeParticipar } from './clubs/participacao';

// Clubs — board de consistência (LEELA-S1308-T3 · decisão 2): ordena por
// dias ativos DESC (anti-streak ético), pontos só desempatam; top-N
// materializado em board/current pela Function (fan-out onRegistroWrite).
export type { ParticipanteBoard, EntradaBoard } from './clubs/consistencia';
export {
  BOARD_TOP_N,
  ordenarPorConsistencia,
  montarBoardConsistencia,
} from './clubs/consistencia';

// ---------------------------------------------------------------------------
// Plataforma — plano de cobrança nomeado (LEELA-T2-L4 · CB-T1 · decisão #15)
// Aplicar = ESTAMPAR snapshot versionado nos commercialTerms do tenant
// (mecanismo S1602-T1) — SEM vínculo vivo. Coleção top-level
// planosCobranca/{planoId}, read+write SÓ platform_admin.
// ---------------------------------------------------------------------------
export type {
  TaxaPorMetodo,
  TabelaTaxasParcela,
} from './platform/commercialTerms';
export {
  CHAVES_TABELA_PARCELAS,
  isTabelaTaxasParcelaValida,
} from './platform/commercialTerms';
export type {
  PlanoCobranca,
  PlanoCobrancaInput,
  TermosDoPlanoCobranca,
} from './platform/planoCobranca';
export {
  PLANOS_COBRANCA_COLLECTION,
  PLANO_PADRAO_ID,
  PLANO_PADRAO,
  validarPlanoCobranca,
  planoParaTerms,
} from './platform/planoCobranca';

// ---------------------------------------------------------------------------
// Perfil público / link-in-bio (E17 · S1700 · Onda 3, DN-1 organizador-only)
// Registry `perfis/{handle}` — docId = handle normalizado (unicidade global
// case-insensitive RN-160); escrita EXCLUSIVA da Function `salvarPerfil`.
// ---------------------------------------------------------------------------
export type {
  TipoPerfil,
  VisibilidadePerfil,
  LinkExternoPerfil,
  Perfil,
  PerfilInput,
  PerfilPublico,
} from './perfil/perfil';
export {
  COLECAO_PERFIS,
  HANDLE_MIN,
  HANDLE_MAX,
  HANDLE_RE,
  HANDLES_RESERVADOS,
  VISIBILIDADES_PERFIL,
  CAMPOS_PRIVADOS_PERFIL,
  PERFIL_NOME_MAX,
  PERFIL_BIO_MAX,
  PERFIL_LINKS_MAX,
  PERFIL_LINK_LABEL_MAX,
  normalizarHandle,
  validarHandle,
  handleProblema,
  validarPerfilInput,
  projetarPerfilPublico,
} from './perfil/perfil';

// ---------------------------------------------------------------------------
// Assessorias parceiras (E18 · Onda 3 Lote 3 · RN-360..365)
// Documento CNPJ/CPF (RN-361) + vínculo organizador↔club parceiro. A
// assessoria é um CLUBE (E05); o desconto é CUPOM escopado (E04, ADR-012).
// ---------------------------------------------------------------------------
export type {
  TipoDocumento,
  DocumentoAssessoria,
  ResultadoDocumento,
  StatusParceriaAssessoria,
  CondicaoDesconto,
  ParceriaAssessoria,
} from './assessoria';
export {
  TIPOS_DOCUMENTO,
  isTipoDocumento,
  normalizarDocumento,
  tipoDoDocumento,
  isCpfValido,
  isCnpjValido,
  validarDocumento,
  formatarDocumento,
  COLECAO_PARCEIROS_ASSESSORIA,
  STATUS_PARCERIA_ASSESSORIA,
  isStatusParceriaAssessoria,
  podeTransicionarParceria,
  parseParceriaAssessoria,
} from './assessoria';

// ---------------------------------------------------------------------------
// Automações do evento (E06 · S402-T1 · Onda 3 Lote 3 · RN-132)
// Gatilho → template (campanha origem='automatizada'); disparo reusa o
// pipeline único de envio (executarDisparoCampanha — DIRECTIVE dos boards).
// ---------------------------------------------------------------------------
export type {
  GatilhoAutomacao,
  Automacao,
  AutomacaoInput,
} from './eventos/automacao';
export {
  COLECAO_AUTOMACOES,
  GATILHOS_AUTOMACAO,
  isGatilhoAutomacao,
  AUTOMACAO_OFFSET_HORAS_DEFAULT,
  AUTOMACAO_OFFSET_HORAS_MAX,
  CAMPOS_FUNCTION_AUTOMACAO,
  validarAutomacao,
  momentoDoGatilho,
  parseAutomacao,
} from './eventos/automacao';

// ---------------------------------------------------------------------------
// Afiliados/influenciadores do evento (E08 recorte antecipado · R9-E ·
// RN-313..319). Organizador dono; docId == refCodigo (unicidade por chave);
// atribuição reusa dentroDaJanelaAtribuicao (E05) + costura do checkout.
// ---------------------------------------------------------------------------
export type {
  TipoAfiliado,
  StatusAfiliado,
  Afiliado,
  SalvarAfiliadoInput,
  TipoComissaoAfiliado,
  ComissaoAfiliado,
} from './affiliation/afiliado';
// Marco de comissão (RN-386 · S706-T1) — a régua do aviso ao afiliado.
export {
  PASSO_MARCO_COMISSAO,
  MARCO_PRIMEIRA_COMISSAO,
  faixaDoAcumulado,
  faixaCruzada,
  chaveAvisoMarco,
} from './affiliation/marcoComissao';
export {
  COLECAO_AFILIADOS,
  SUBCOLECAO_CONVERSOES_AFILIADO,
  SUBCOLECAO_REPASSES_AFILIADO,
  TIPOS_COMISSAO_AFILIADO,
  COMISSAO_VALOR_POR_INSCRICAO_MAX,
  REPASSE_ID_RE,
  REPASSE_OBSERVACAO_MAX,
  isMoneyCentExato,
  isComissaoAfiliadoValida,
  computeComissaoConversao,
  saldoComissaoAfiliado,
  TIPOS_AFILIADO,
  isTipoAfiliado,
  STATUS_AFILIADO,
  isStatusAfiliado,
  REF_CODIGO_RE,
  normalizarRefCodigo,
  isRefCodigoValido,
  ALFABETO_REF_CODIGO,
  REF_CODIGO_TAMANHO,
  gerarRefCodigo,
  JANELA_ATRIBUICAO_AFILIADO_DEFAULT_DIAS,
  JANELA_ATRIBUICAO_AFILIADO_MAX_DIAS,
  isJanelaAtribuicaoValida,
  AFILIADO_NOME_MAX,
  AFILIADO_CANAL_MAX,
  CAMPOS_FUNCTION_AFILIADO,
  descontoAfiliadoAtivo,
  validarSalvarAfiliadoInput,
  parseAfiliado,
} from './affiliation/afiliado';

// Link compartilhável de afiliado e de assessoria (S1215-T1 · RN-429):
// gerador ÚNICO — base pública + ref + cupom, `c` aceito na entrada e nunca
// gerado, e `null` quando não dá para montar um link honesto.
export type { LinkPromocionalInput } from './affiliation/linkPromocional';
export {
  CHAVE_CUPOM_URL,
  CHAVE_CUPOM_URL_APELIDO,
  normalizarBasePublica,
  montarLinkPromocional,
  cupomDaEntrada,
} from './affiliation/linkPromocional';

// ---------------------------------------------------------------------------
// E-mail transacional (S-R9-14 · RN-137 · padrão ADR-006): port plugável;
// impl de referência BrevoProvider em functions/src/email/. Fail-closed sem
// BREVO_API_KEY (selectEmailProvider → null).
// ---------------------------------------------------------------------------
export type {
  EmailDestinatario,
  SendTransactionalParams,
  SendTransactionalResult,
  EmailProvider,
} from './email/EmailProvider';

// ---------------------------------------------------------------------------
// Marcas/patrocinadores reutilizáveis (S-R9-12 · RN-171 — seed E10-S811):
// registro owner-only do profissional; reusa o modelo comercial RN-123.
// ---------------------------------------------------------------------------
export type { StatusMarca, Marca, MarcaInput } from './brands/marca';
export {
  SUBCOLECAO_MARCAS,
  STATUS_MARCA,
  isStatusMarca,
  MARCA_NOME_MAX,
  MARCA_CONTRAPARTIDA_MIN,
  MARCA_CONTRAPARTIDA_MAX,
  validarMarcaInput,
  parseMarca,
} from './brands/marca';

// ---------------------------------------------------------------------------
// CRM do organizador (E19 · S-R9-13-T1 · RN-172): cliente consolidado
// cross-evento com LTV — identidade INDIVIDUAL (PII, categoria distinta do
// RN-820). Doc mantido por Function; leitura só isTenantWriter; o valor da
// chave (CPF/e-mail) NUNCA é persistido (docId por hash — minimização).
// ---------------------------------------------------------------------------
export type {
  TipoChaveCliente,
  IdentidadeCliente,
  IdentidadeClienteInput,
  StatusInscricaoCrm,
  CrmInscricaoEntry,
  CrmEventoResumo,
  CrmClienteAgregado,
  CrmClienteDoc,
} from './crm/cliente';
export {
  SUBCOLECAO_CRM_CLIENTES,
  TIPOS_CHAVE_CLIENTE,
  isTipoChaveCliente,
  STATUS_INSCRICAO_CRM,
  isStatusInscricaoCrm,
  derivarIdentidadeCliente,
  computeCrmCliente,
  crmClienteInalterado,
  parseCrmCliente,
} from './crm/cliente';
