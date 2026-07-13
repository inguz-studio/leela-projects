// =============================================================================
// @leela/api-client — wrapper tipado Firestore/Functions (stub)
// Implementação concreta usa Firebase SDK e é injetada em runtime.
// Writes de estado financeiro/agregados passam por Cloud Functions (ADR-005).
// =============================================================================

import type {
  Atleta,
  Clube,
  Evento,
  Membro,
  Profissional,
} from '@leela/core';

// Re-exporta tipos de domínio para conveniência dos consumidores
export type { Atleta, Clube, Evento, Membro, Profissional };

// ---------------------------------------------------------------------------
// Primitivos de query
// ---------------------------------------------------------------------------

/** Opções genéricas de listagem paginada */
export interface QueryOptions {
  limit?: number;
  /** Campo pelo qual ordenar (nome do campo Firestore) */
  orderBy?: string;
  /** Cursor para paginação — opaque value da SDK Firestore */
  startAfter?: unknown;
}

/** Snapshot de um documento Firestore (interface portável, sem dep da SDK) */
export interface DocumentSnapshot<T> {
  readonly id: string;
  readonly exists: boolean;
  data(): T | undefined;
}

// ---------------------------------------------------------------------------
// Abstrações de coleção (read-only no cliente)
// Writes passam por Cloud Functions via FunctionCallable (ADR-005)
// ---------------------------------------------------------------------------

/**
 * Accessor read-only de uma coleção Firestore tipada.
 * Nenhuma escrita direta do cliente — apenas via FunctionCallable.
 */
export interface CollectionRef<T> {
  /** Lê um documento pelo ID. Retorna null se não existir. */
  doc(id: string): Promise<DocumentSnapshot<T>>;
  /** Lista documentos com opções de paginação/ordenação */
  query(options?: QueryOptions): Promise<T[]>;
}

/**
 * Wrapper tipado de um Cloud Function callable.
 * Cobre tanto `httpsCallable` (client SDK) quanto invocação direta (admin SDK).
 */
export interface FunctionCallable<TInput = unknown, TOutput = unknown> {
  call(params: TInput): Promise<TOutput>;
}

// ---------------------------------------------------------------------------
// Cliente principal — ponto único de acesso ao Firestore
// ---------------------------------------------------------------------------

/**
 * Interface do cliente Leela.
 * A implementação concreta (`createLeelaCoreClient`) instancia o Firebase SDK
 * e aponta ao Emulator em dev (via env `LEELA_USE_EMULATOR`).
 *
 * Segue o princípio ADR-009: toda query de coleção tenant-scoped deve filtrar
 * por `tenantId` na implementação.
 */
export interface LeelaCoreClient {
  /** Atletas — coleção global cross-tenant */
  readonly atletas: CollectionRef<Atleta>;
  /** Profissionais — tenant-scoped */
  readonly profissionais: CollectionRef<Profissional>;
  /** Clubes — tenant-scoped (docId = slug) */
  readonly clubes: CollectionRef<Clube>;
  /** Eventos — tenant-scoped (docId = slug) */
  readonly eventos: CollectionRef<Evento>;
  /** Membros — subcoleção de clube; requer clubeId */
  membros(clubeId: string): CollectionRef<Membro>;
  /** Acesso a Cloud Functions callables tipadas */
  fn<TInput = unknown, TOutput = unknown>(
    name: string
  ): FunctionCallable<TInput, TOutput>;
}

/**
 * Fábrica do cliente — implementação concreta em `packages/api-client/src/firebase.ts`
 * (criada na task LEELA-S000-2-T1 quando o Firebase é inicializado).
 * Declarada aqui como contrato para o DI dos apps.
 */
export type CreateLeelaCoreClient = () => LeelaCoreClient;

// ---------------------------------------------------------------------------
// Firebase SDK — inicialização e acessores (LEELA-S000-2-T1)
// ---------------------------------------------------------------------------
export { initLeela, getLeelaDb, getLeelaAuth, getLeelaFunctions } from './firebase';
export type {
  FirebaseClientConfig,
  LeelaFirebaseConfig,
  LeelaEmulatorPorts,
} from './firebase';

// ---------------------------------------------------------------------------
// Clubs — leitura tipada de `clubes` (S101-T1) + `membros` (S103-T1)
// ---------------------------------------------------------------------------
export { getClube, listClubesByTenant, listClubesByOwner, listMembros } from './clubs';
export type { ListMembrosOptions } from './clubs';

// Clubs — criação do clube (fix #14 — rota /clubes/novo; write direto com
// ∑ zerados, docId = slug).
export { criarClube } from './clubs';

// Clubs — atualização de configurações do clube (S110-T1 — write direto; slug e
// agregados ∑ fora do patch).
export { atualizarClube } from './clubs';
export type { AtualizarClubeInput } from './clubs';

// Clubs — leitura de desafios (S105-T2), parcerias (S107-T2) e comunicados
// (S108-T2). Filtro fino roda no cliente; agregados ∑ vêm das Functions.
export { listDesafios, getDesafio } from './clubs';

// Clubs — criação/edição de desafio via write direto do cliente (editor
// S106-T2 — Rules de desafios permitem create/update do papel de escrita; ∑
// zerados no create, intocados no update).
export { criarDesafio, atualizarDesafio } from './clubs';
export type { CriarDesafioInput, CriarDesafioResult } from './clubs';

// Clubs — parcerias (S107-T2): leitura + transição de status (aceitar/recusar/
// pausar — write direto; comissão/termos read-only pela Function/Rules).
export { listParcerias, transicionarParceria } from './clubs';

// Clubs — cadastro de patrocinador via write direto (modal S107-T3 —
// shapePatrocinadorValido nas Rules).
export { criarPatrocinador } from './clubs';
export type { CriarPatrocinadorInput } from './clubs';

// Clubs — leitura de comunicados (S108-T2). Filtro fino no cliente; carimbo de
// envio + alcance vêm da Function (onComunicadoEnvio).
export { listComunicados } from './clubs';

// Clubs — composição de comunicado: leitura + criar/agendar/editar via write
// direto (editor S109-T2 — Rules permitem rascunho/agendado; 'enviado' é da
// Function). atualizarComunicado é o fluxo EDIT (fix S2 — editar não duplica).
export { getComunicado, criarComunicado, atualizarComunicado } from './clubs';
export type { CriarComunicadoInput, AtualizarComunicadoInput } from './clubs';

// Clubs — mutations via Cloud Function (contrato das telas L3):
// removerMembro/transferirPropriedade (tela de membros, §2.15) e
// enviarConvites (modal S104-T1 — RN-106 revalidada no servidor)
export { removerMembro, transferirPropriedade, enviarConvites } from './clubs';
export type {
  RemoverMembroResult,
  TransferirPropriedadeResult,
  EnviarConvitesResult,
} from './clubs';

// Clubs — exclusão + exportação LGPD (S110-T2). CONTRATO das telas: as
// Functions deleteClube/exportClubeData são do lote Fable (sequenciado após a
// tela) — chamar antes do deploy devolve not-found/unimplemented.
export { deletarClube, exportarDadosClube } from './clubs';
export type { DeletarClubeResult, ExportarDadosClubeResult } from './clubs';

// ---------------------------------------------------------------------------
// Eventos — queries de `eventos` e subcoleções (LEELA-E03 · L1)
// ---------------------------------------------------------------------------
// S200-T1 — eventos por organizador · S201-T2 — leitura direta por slug (L3)
// S207-T1 — leitura do agregado financeiro/current (lê S207-T2)
export {
  listarEventosDoOrganizador,
  getEvento,
  getFinanceiroEvento,
  observarFinanceiroEvento,
} from './eventos/queries';
export type {
  ListarEventosDoOrganizadorParams,
  FinanceiroEvento,
  ContagemInscritos,
  ObservarHandlers,
} from './eventos/queries';

// S201-T2 — mutations via Cloud Function (criar/publicar — ADR-005, RN-201)
// S204-T2 — balcão: vínculo de chip + presença (RN-205/206/207)
export {
  criarEvento,
  publicarEvento,
  vincularChip,
  registrarEntrega,
} from './eventos/mutations';
export type {
  CriarEventoInput,
  CriarEventoPercurso,
  CriarEventoResult,
  PublicarEventoResult,
  VincularChipInput,
  VincularChipResult,
  RegistrarEntregaInput,
  RegistrarEntregaResult,
} from './eventos/mutations';

// LEELA-S304-T2 — configurações gerais do evento (escrita direta, Rules-guarded)
export { atualizarConfiguracoesEvento } from './eventos/configuracoesEvento';
export type { AtualizarConfiguracoesEventoInput } from './eventos/configuracoesEvento';

// FABLE-F-T1 — cronograma de entrega + faixa de chips (leitura p/ balcão F-T2)
export { getCronogramaEntrega } from './eventos/cronograma';
export type { CronogramaEntregaEvento } from './eventos/cronograma';

// FABLE-G-T1 — log de comunicação (agregado único): visão por inscrito
// (S1206-T2 / aba Comunicação do slide-in) + resumo ∑ por evento (E06-L3).
// Só leitura — escrita é EXCLUSIVA de Function (Rules: write false).
export {
  listarComunicacoesDoInscrito,
  getResumoComunicacoes,
  listarComunicacoesDoEvento,
  COMUNICACOES_TIMELINE_LIMITE,
} from './eventos/comunicacoes';

// S203-T1 — inscritos paginados por cursor (18/página — §2.5)
// S204 — balcão: observador realtime do pool inteiro (onSnapshot, UX-DADOS)
export {
  listarInscritos,
  listarInscritosRecentes,
  observarInscritos,
  INSCRITOS_PAGE_SIZE,
  INSCRITOS_BALCAO_CAP,
} from './eventos/inscritos';
export type {
  InscritosCursor,
  ListarInscritosOptions,
  ListarInscritosResult,
  ObservarInscritosHandlers,
} from './eventos/inscritos';

// S205-T1 — kits do evento + catálogo de itens (N:N — RN-215)
export {
  listarKits,
  getKit,
  salvarKit,
  removerKit,
  listarItensKit,
  getItemKit,
  salvarItemKit,
  removerItemKit,
} from './eventos/kits';
export type { SalvarKitInput, SalvarItemKitInput } from './eventos/kits';

// S300 (E04 · ADR-012) — lotes por modalidade (kernel de vendas). CRUD direto
// do organizador; `vendidos` é ∑ de Function (nunca enviado pelo cliente).
export { listarLotes, salvarLote, removerLote } from './eventos/lotes';
export type {
  SalvarLoteInput,
  RenomearLoteVendidoInput,
  EscritaLoteInput,
} from './eventos/lotes';

// S300-T3 (E04) — página de vendas do evento: conteúdo (seções + SEO) por
// escrita direta do organizador; publicação por Cloud Function (seam).
export {
  getPaginaVendas,
  salvarConteudoPaginaVendas,
  publicarPaginaVendas,
  despublicarPaginaVendas,
} from './eventos/paginaVendas';
export type {
  SalvarConteudoPaginaVendasInput,
  PublicarPaginaVendasResult,
} from './eventos/paginaVendas';

// S300-T5 (E04) — cupons simples do evento (kernel S300-T1): CRUD direto do
// organizador; `usos` (∑ de Function/checkout) nunca é enviado pelo cliente.
export { listarCupons, salvarCupom, removerCupom } from './eventos/cupons';
export type { SalvarCupomInput } from './eventos/cupons';

// S210-T2 (FABLE-D) — aprovisionamento de kit por SKU (leitura; ∑ e estado
// são de escrita EXCLUSIVA de Function — RN-224/226)
export { listarAprovisionamento } from './eventos/aprovisionamento';
// S210-T2 (FABLE-D) — transição da máquina de estados do SKU (callable; write
// EXCLUSIVA de Function — Rules negam escrita de cliente na subcoleção — RN-226)
export { transicaoAprovisionamento } from './eventos/mutations';
export type {
  TransicaoAprovisionamentoInput,
  TransicaoAprovisionamentoResult,
} from './eventos/mutations';

// ---------------------------------------------------------------------------
// Pedidos — kernel `pedidos/{id}` + `pagamentos/{id}` (ADR-011 · FABLE-A-T1)
// SÓ leitura: escrita de pedido/pagamento é EXCLUSIVA de Function (Rules).
// ---------------------------------------------------------------------------
export {
  getPedido,
  listarPedidosDoEvento,
  getPedidoDoInscrito,
  getPagamento,
} from './pedidos';
export type {
  ListarPedidosDoEventoParams,
  GetPedidoDoInscritoParams,
} from './pedidos';

// ---------------------------------------------------------------------------
// Auth helpers — sessão, login, logout, claims (LEELA-S000-2-T2)
// ---------------------------------------------------------------------------
export {
  onSessionChange,
  getCurrentUser,
  loginComEmail,
  criarContaComEmail,
  loginAnonimo,
  loginComGoogle,
  loginComApple,
  logout,
  getClaims,
} from './auth';

// Recuperação de senha (LEELA-S020-T2): disparo do e-mail (confirmação neutra
// no chamador) + verificação/efetivação do oobCode na tela de redefinição.
export {
  enviarResetSenha,
  verificarCodigoResetSenha,
  confirmarResetSenha,
} from './auth';

// Perfil do usuário logado (LEELA-S020-T3 cadastro · T4 configurações).
export { atualizarNomeExibicao } from './auth';

// Troca de senha autenticada (LEELA-S020-T4) — reauth OBRIGATÓRIA embutida.
export { trocarSenha } from './auth';

// ---------------------------------------------------------------------------
// Checkout público — callables do fluxo de 5 etapas (LEELA-S1203)
// ---------------------------------------------------------------------------
export {
  cotarInscricaoCheckout,
  createInscricaoCharge,
  confirmarPagamentoSandbox,
} from './checkout';
export type {
  CotarItemInput,
  CotarInscricaoCheckoutInput,
  CotarItemResult,
  CotarParcelaResult,
  CotarInscricaoCheckoutResult,
  KitInscritoInput,
  CheckoutInscritoInput,
  CreateInscricaoChargeInput,
  CreateInscricaoChargeResult,
  ConfirmarPagamentoSandboxInput,
  ConfirmarPagamentoSandboxResult,
} from './checkout';

// ---------------------------------------------------------------------------
// Plataforma — tenants, mutações, termos e rollups (LEELA-E16 · S1601/S1602/S1605)
// ---------------------------------------------------------------------------
export { getTenant, listTenants, getMyTenant } from './platform/tenants';
export {
  provisionTenant,
  transitionTenant,
} from './platform/mutations';
export type {
  ProvisionResult,
  TransitionTenantInput,
  TransitionResult,
} from './platform/mutations';
export { getCommercialTerms, saveCommercialTerms } from './platform/commercialTerms';
export { getPlatformRollups } from './platform/rollups';

// ---------------------------------------------------------------------------
// Overview — dashboard do profissional (LEELA-E02 · S600-T2)
// KPIs + alertas via callable getOverview (contrato único, 1 round-trip).
// ---------------------------------------------------------------------------
export { getOverview } from './overview';
export type { OverviewResult } from './overview';

// ---------------------------------------------------------------------------
// Slide-in [pag] — join inscrito → pedido → pagamento (ADR-011 · FABLE-A-T2)
// ---------------------------------------------------------------------------
export { getPedidoEPagamentoDoInscrito } from './eventos/inscritoPedido';
export type {
  InscritoParaJoin,
  GetPedidoEPagamentoDoInscritoParams,
  PedidoEPagamentoDoInscrito,
} from './eventos/inscritoPedido';

// ---------------------------------------------------------------------------
// Equipe do evento — 4 papéis + claims por evento (LEELA-S304-T1 · E04-L4)
// Papel muda SÓ via Function `setClaimsEquipe` (merge preservador — ADR-008).
// ---------------------------------------------------------------------------
// S304-T3 — convite de membro (escrita direta Rules-guarded; ativação = Function)
export {
  listarEquipe,
  setClaimsEquipe,
  convidarMembroEquipe,
  removerConviteEquipe,
} from './eventos/equipe';
export type {
  SetClaimsEquipeInput,
  SetClaimsEquipeResult,
  ConvidarMembroEquipeInput,
  PapelConvite,
} from './eventos/equipe';

// ---------------------------------------------------------------------------
// Estorno por inscrito — callable do organizador (LEELA-E04 · FABLE-B · ADR-011)
// Só transporte: o VALOR do estorno é decisão EXCLUSIVA do servidor (RN-337).
// ---------------------------------------------------------------------------
export { estornarInscricao } from './checkout';
export type { EstornarInscricaoInput, EstornarInscricaoResult } from './checkout';

// ---------------------------------------------------------------------------
// Repasse do organizador — callables E09-slim (LEELA-E09s-L2 · RN-350..357)
// Wrappers e tipos vivem em ./finance (dados bancários LGPD, solicitação,
// transições admin, comprovante). Wildcard deliberado: o módulo é novo e
// cresce por task do L2 sem reeditar este barrel (coordenação de território).
// ---------------------------------------------------------------------------
export * from './finance';

// ---------------------------------------------------------------------------
// Campanhas do evento (LEELA-S401-T1 · E06) — CRUD rascunho/agendado +
// query por estado. Envio ('enviado' + ∑) é EXCLUSIVO da Function
// `enviarCampanha` (S401-T4); estimativa ao vivo = callable `estimarAlcance`.
// ---------------------------------------------------------------------------
export {
  listarCampanhas,
  getCampanha,
  criarCampanha,
  atualizarCampanha,
  excluirCampanha,
  estimarAlcanceCampanha,
  enviarCampanha,
} from './eventos/campanhas';
export type {
  CriarCampanhaInput,
  AtualizarCampanhaInput,
  EstimarAlcanceCampanhaInput,
  EstimarAlcanceCampanhaResult,
  EnviarCampanhaInput,
  EnviarCampanhaResult,
} from './eventos/campanhas';

// ---------------------------------------------------------------------------
// Plataforma — planos de cobrança (LEELA-T2-L4 · CB-T1/CB-T2 · decisão #15)
// CRUD do plano (Rules: platform_admin em read E write) + aplicarPlano
// (callable — estampa versionada nos commercialTerms; SEM vínculo vivo).
// ---------------------------------------------------------------------------
export {
  listPlanosCobranca,
  getPlanoCobranca,
  savePlanoCobranca,
  aplicarPlano,
} from './platform/planosCobranca';
export type {
  AplicarPlanoInput,
  AplicarPlanoResult,
} from './platform/planosCobranca';

// ---------------------------------------------------------------------------
// Plataforma — profissionais + join tenant → owner (LEELA-CONS-4-T1)
// Nome real do dono do tenant: reader com join (Rules já autorizam a
// leitura para os mesmos leitores do tenant — sem denormalização).
// ---------------------------------------------------------------------------
export { getProfissional, getTenantComOwner } from './platform/profissionais';
export type { TenantComOwner } from './platform/profissionais';
