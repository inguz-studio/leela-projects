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
export { initLeela, getLeelaDb, getLeelaAuth, getLeelaFunctions, getLeelaStorage } from './firebase';
export type {
  FirebaseClientConfig,
  LeelaFirebaseConfig,
  LeelaEmulatorPorts,
} from './firebase';

// ---------------------------------------------------------------------------
// Storage — upload de imagens de perfil/capa (LEELA-R5 · ADR-016).
// Helpers com path CONTRATADO nas storage.rules; devolvem downloadURL que
// alimenta os MESMOS campos de hoje (photoURL/avatarUrl/imagemUrl).
// ---------------------------------------------------------------------------
export {
  IMAGEM_UPLOAD_TIPOS,
  IMAGEM_UPLOAD_MAX_BYTES,
  problemaDoArquivoImagem,
  uploadFotoPerfilConta,
  uploadAvatarPerfilPublico,
  uploadCapaPerfilPublico,
  uploadCapaClube,
  // Logos 1:1 de patrocinador (R9-E · S-R9-12 + adendo do Vitor)
  LOGO_QUADRADA_TOLERANCIA,
  problemaProporcaoQuadrada,
  uploadLogoMarca,
  uploadLogoPatrocinadorClube,
  // Imagem 1:1 do kit (R9-C · RN-227 · gap R13)
  uploadImagemKit,
  // Galeria de três fotos do kit (S212-T2 · RN-427)
  SLOTS_FOTO_KIT,
  caminhoFotoKit,
  slotDaUrlFotoKit,
  slotDeUploadFotoKit,
  // Capa do evento (CEV · RN-228 — fecha a pendência UPSW)
  CAPA_EVENTO_UPLOAD_TIPOS,
  CAPA_EVENTO_MAX_BYTES,
  problemaDoArquivoCapaEvento,
  uploadCapaEvento,
} from './storage';

// ---------------------------------------------------------------------------
// Afiliados/influenciadores (R9-E · S-R9-11 · RN-313..319 — E08 antecipado):
// salvar (modal do organizador), aceite público PF, readers RN-318/319.
// ---------------------------------------------------------------------------
export {
  salvarAfiliado,
  provisionAfiliadoAccount,
  getMinhasAfiliacoes,
  getAfiliadosDoTenant,
  registrarRepasseComissao,
  SENHA_MIN_AFILIADO,
} from './affiliation';
export type {
  SalvarAfiliadoClientInput,
  SalvarAfiliadoClientResult,
  ProvisionAfiliadoClientInput,
  ProvisionAfiliadoClientResult,
  MinhaAfiliacao,
  AfiliadoDoTenant,
  ConversaoProjetada,
  ComissaoAfiliadoClient,
  RepasseProjetado,
  RegistrarRepasseComissaoClientInput,
  RegistrarRepasseComissaoClientResult,
} from './affiliation';

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
  // T4 · back-office: o admin entra pelo TENANT, não pelo organizador.
  listarEventosDoTenant,
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

// CEV — capa do evento pós-create (merge cirúrgico de `imagemUrl`, RN-228)
export { salvarCapaEvento } from './eventos/configuracoesEvento';

// LEELA-S306-T2 — exigências de saúde + regulamento (escrita direta, Rules-guarded)
export { atualizarExigenciasRegulamento } from './eventos/configuracoesEvento';
export type { AtualizarExigenciasRegulamentoInput } from './eventos/configuracoesEvento';

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
export type { SlotFotoKit } from './storage';

// S300 (E04 · ADR-012) — lotes por modalidade (kernel de vendas). CRUD direto
// do organizador; `vendidos` é ∑ de Function (nunca enviado pelo cliente).
export { listarLotes, salvarLote, removerLote } from './eventos/lotes';
export type {
  SalvarLoteInput,
  RenomearLoteVendidoInput,
  EscritaLoteInput,
} from './eventos/lotes';

// S307 (E04 · RN-304) — ajuste de capacidade de lote (reabrir vagas). Escrita
// EXCLUSIVA de Cloud Function (guard + auditoria); o cliente só transporta.
export { ajustarCapacidadeLote } from './eventos/lotes';
export type {
  AjustarCapacidadeLoteInput,
  AjustarCapacidadeLoteResult,
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

// S305-T1 (E04) — política de reembolso/transferência/troca do evento
// (kernel politicaVendas): leitura direta + escrita OWNER-only (Rules).
export { getPoliticaVendas, salvarPoliticaVendas } from './eventos/politicaVendas';
export type { SalvarPoliticaVendasInput } from './eventos/politicaVendas';

// S300-T5 (E04) — cupons simples do evento (kernel S300-T1): CRUD direto do
// organizador; `usos` (∑ de Function/checkout) nunca é enviado pelo cliente.
export { listarCupons, salvarCupom, removerCupom } from './eventos/cupons';
export type { SalvarCupomInput } from './eventos/cupons';

// S210-T2 (FABLE-D) — aprovisionamento de kit por SKU (leitura; ∑ e estado
// são de escrita EXCLUSIVA de Function — RN-224/226)
export { listarAprovisionamento } from './eventos/aprovisionamento';

// LEELA-BEPEND-T1 (E11 §RN-820) — demografia AGREGADA do evento (leitura;
// buckets recomputados EXCLUSIVAMENTE pela Function `agregarDemografia` —
// nenhum dado individual passa por aqui, LGPD)
export { getDemografiaEvento } from './eventos/demografia';
export type { DemografiaEvento } from './eventos/demografia';
// S210-T2 (FABLE-D) — transição da máquina de estados do SKU (callable; write
// EXCLUSIVA de Function — Rules negam escrita de cliente na subcoleção — RN-226)
export { transicaoAprovisionamento } from './eventos/mutations';
export type {
  TransicaoAprovisionamentoInput,
  TransicaoAprovisionamentoResult,
} from './eventos/mutations';
// TAMANHOS-GRADE (RN-232) — encerrar encomendas do item (callable; transiciona
// todos os SKUs em `estimativa` → `encomendado` com a foto vendida; NÃO fecha
// as vendas do kit)
export { encerrarEncomendasItem } from './eventos/mutations';
export type {
  EncerrarEncomendasItemInput,
  EncerrarEncomendasItemResult,
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
// S1223-T2 · RN-453: a origem decide a casa em que o link aterrissa.
export type { OrigemLinkSenha } from './auth';

// Copy honesta de erro de Auth + validação de cliente (S1221-T1). Puro, sem
// SDK: a landing e o painel precisam da MESMA regra anti-enumeração e nenhuma
// das duas apps importa da outra.
export {
  getAuthErrorCode,
  mensagemErroLogin,
  mensagemErroRedefinicao,
  emailValido,
  senhaAtendeMinimo,
  CREDENCIAL_INVALIDA,
  SENHA_MIN,
} from './authMensagens';

// Perfil do usuário logado (LEELA-S020-T3 cadastro · T4 configurações · T5 foto).
export { atualizarNomeExibicao, atualizarFotoPerfil } from './auth';

// Troca de senha autenticada (LEELA-S020-T4) — reauth OBRIGATÓRIA embutida.
export { trocarSenha } from './auth';

// Reenvio do e-mail de VERIFICAÇÃO (S1222-T2 · RN-451): a área do cliente
// exige `email_verified`, e a saída honesta de quem não tem é reenviar.
export { enviarVerificacaoEmail } from './auth';

// Código de seis dígitos das duas portas da landing (S1229/S1230 · RN-476 a
// RN-482). "É meu primeiro acesso" e "Criar conta" são a MESMA máquina: as
// duas chamam estas funções com o mesmo payload, e a divergência só existe
// depois da prova de posse do e-mail.
export {
  solicitarCodigoDeAcesso,
  confirmarCodigoDeAcesso,
  concluirAcessoComProva,
} from './codigoDeAcesso';
export type {
  SolicitarCodigoResultado,
  ConfirmarCodigoResultado,
  ConcluirAcessoInput,
  ConcluirAcessoResultado,
} from './codigoDeAcesso';

// ---------------------------------------------------------------------------
// Checkout público — callables do fluxo de 5 etapas (LEELA-S1203)
// ---------------------------------------------------------------------------
export {
  cotarInscricaoCheckout,
  createInscricaoCharge,
  confirmarPagamentoSandbox,
  getCheckoutPrefill,
  // RN-157 (CK2-T5 · S1209): expiração do PIX pelo relógio do SERVIDOR.
  // S1209-PIXBE-T4: re-export da RAIZ — a ponte temporária por subpath
  // (`@leela/api-client/checkout`, com `paths` no tsconfig e alias no
  // vitest da landing) existia só porque este index estava em edição por
  // outra lane no lote CK2. Com o re-export aqui, a dívida some: a landing
  // importa tudo de um lugar só, como o resto do app.
  expirarPixPendente,
} from './checkout';
export type {
  CotarItemInput,
  CotarInscricaoCheckoutInput,
  CotarItemResult,
  CotarParcelaResult,
  CotarInscricaoCheckoutResult,
  KitInscritoInput,
  CheckoutInscritoInput,
  CheckoutEnderecoInput,
  CheckoutPrefill,
  CheckoutPrefillEndereco,
  CreateInscricaoChargeInput,
  CreateInscricaoChargeResult,
  ConfirmarPagamentoSandboxInput,
  ConfirmarPagamentoSandboxResult,
  GetCheckoutPrefillResult,
  ExpirarPixPendenteInput,
  ExpirarPixPendenteResult,
} from './checkout';

// ---------------------------------------------------------------------------
// Área do cliente — callables do próprio dono da conta (S1222-T1 · RN-451)
// ---------------------------------------------------------------------------
export { getMinhasCompras, getMeusIngressos } from './cliente';
// Meus Clubes e a caixa de convites (S1222-T4): o vínculo de membro e as DUAS
// máquinas de convite (influenciador · RN-316 e promotor · E18). A caixa
// LISTA; o aceite continua sendo o link com token que chegou por e-mail.
export { getMeusClubesEConvites } from './cliente';
// Meus dados do cliente (S1222-T3 · RN-450): SOBRE `atletas/{uid}`, nunca
// sobre `profissionais/{uid}` — quem acumula os dois papéis tem os dois docs,
// e cada tela edita o seu.
export { lerMeusDados, salvarMeusDados } from './atletas';
export type { MeusDadosCliente } from './atletas';
export type {
  EstadoAreaCliente,
  StatusCompraCliente,
  StatusIngressoCliente,
  CompraDaConta,
  IngressoDaConta,
  GetMinhasComprasResult,
  GetMeusIngressosResult,
  PapelNoClube,
  StatusNoClube,
  ClubeDaConta,
  TipoConvite,
  EstadoConvite,
  ConviteDaConta,
  GetMeusClubesEConvitesResult,
} from './cliente';

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
// TAXAFLEX (RN-178/404): tabela GLOBAL de taxa por meio — leitura direta
// (read só platform_admin) + escrita via callable (client nunca grava).
export {
  getTaxaPlataformaGlobal,
  setTaxaPlataformaGlobal,
} from './platform/taxaPlataforma';
export type { SetTaxaPlataformaGlobalResult } from './platform/taxaPlataforma';

// ---------------------------------------------------------------------------
// Plataforma — visão master de tenants: base de leitura, sem pixel
// (ADMIN-VISAO onda 1 · S1612/S1613/S1614 · RN-539). Ficha do tenant
// (eventos/clubs/vendas), listas globais e o callable de clientes —
// tudo consumido pelas ondas de tela (2, 3, 4) que vêm depois desta.
// ---------------------------------------------------------------------------
export {
  listarEventosDoTenantPaginado,
  listarClubesDoTenantPaginado,
  TENANT_DRILLDOWN_PAGE_SIZE,
  TENANT_DRILLDOWN_PAGE_SIZE_MAX,
} from './platform/tenantEventosClubs';
export type {
  TenantDrilldownCursor,
  TenantDrilldownOptions,
  ListarEventosDoTenantPaginadoResult,
  ListarClubesDoTenantPaginadoResult,
} from './platform/tenantEventosClubs';
export {
  listarPedidosDoTenantPaginado,
  listarPagamentosDoTenantPaginado,
  TENANT_VENDAS_PAGE_SIZE,
  TENANT_VENDAS_PAGE_SIZE_MAX,
} from './platform/tenantVendas';
export type {
  TenantVendasCursor,
  TenantVendasOptions,
  ListarPedidosDoTenantPaginadoResult,
  ListarPagamentosDoTenantPaginadoResult,
} from './platform/tenantVendas';
export {
  listarEventosGlobalPaginado,
  listarClubesGlobalPaginado,
  LISTA_GLOBAL_PAGE_SIZE,
  LISTA_GLOBAL_PAGE_SIZE_MAX,
} from './platform/listasGlobais';
export type {
  ListaGlobalCursor,
  ListarEventosGlobalOptions,
  ListarClubesGlobalOptions,
  ListarEventosGlobalResult,
  ListarClubesGlobalResult,
} from './platform/listasGlobais';
export { listarClientesDoTenant } from './platform/clientesTenant';
export type {
  ClienteTenantView,
  ClienteTenantEventoResumo,
  ListarClientesDoTenantInput,
  ListarClientesDoTenantResult,
} from './platform/clientesTenant';

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
// Reembolsos + transferências do evento — leitura de gestão + decisão do
// organizador (LEELA-E09 · S904-T5 · RN-341/342/343/344). Escrita EXCLUSIVA de
// Function; o cliente só LÊ a fila e TRANSPORTA a decisão (valor = servidor).
// ---------------------------------------------------------------------------
export {
  listReembolsos,
  listTransferencias,
  decideRefund,
  // RN-375: a ABERTURA é a porta única do estorno pelo painel (a política
  // decide a rota; o primitivo direto não é chamado da tela).
  requestRefund,
  // T4 · RN-377/378: cancelar SEM devolver dinheiro + a trilha que isso deixa.
  cancelarInscricao,
  listCancelamentos,
  // Prova executável do contrato de leitura (RN-376) — não é API de tela.
  parseReembolso,
} from './eventos/reembolsos';
export type {
  DecideRefundInput,
  DecideRefundResult,
  RequestRefundInput,
  RequestRefundResult,
  CancelarInscricaoInput,
  CancelarInscricaoResult,
  CancelamentoInscricao,
} from './eventos/reembolsos';

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
// Perfil público / link-in-bio do organizador (E17 · DN-1 · S1700)
// `salvarPerfil` = wrapper da Function registry (escrita EXCLUSIVA de Function);
// `getMeuPerfil` = leitura do perfil do próprio tenant (editor do painel).
// ---------------------------------------------------------------------------
export { salvarPerfil, getMeuPerfil } from './perfil';
export type { SalvarPerfilResult } from './perfil';

// ---------------------------------------------------------------------------
// Assessorias parceiras (E18 · S1800/S1801/S1802/S1803) — 4 callables + leitor
// tenant-scoped da subcoleção `parceirosAssessoria`. Escrita EXCLUSIVA de
// Function (Rules write:false); a callable pública `provisionAssessoriaAccount`
// serve a página de aceite da landing (token = credencial).
// ---------------------------------------------------------------------------
export {
  cadastrarAssessoriaParceira,
  provisionAssessoriaAccount,
  definirCondicaoDesconto,
  encerrarParceriaAssessoria,
  listParceriasAssessoria,
  SENHA_MIN_ASSESSORIA,
} from './assessorias';
export type {
  CadastrarAssessoriaInput,
  CadastrarAssessoriaResult,
  ProvisionAssessoriaInput,
  ProvisionAssessoriaResult,
  DefinirCondicaoDescontoInput,
  DefinirCondicaoDescontoResult,
  EncerrarParceriaInput,
  EncerrarParceriaResult,
} from './assessorias';

// ---------------------------------------------------------------------------
// Automações do evento (E06 · S402-T1) — comunicação por GATILHO. CRUD/toggle
// por escrita direta Rules-guarded (padrão campanhas); o DISPARO é EXCLUSIVO de
// Function (trigger novo_inscrito + cron), que reusa o pipeline único de envio.
// ∑ `disparos` nunca é enviado pelo cliente.
// ---------------------------------------------------------------------------
export {
  listarAutomacoes,
  salvarAutomacao,
  removerAutomacao,
  alternarAutomacao,
} from './eventos/automacoes';
export type { SalvarAutomacaoInput } from './eventos/automacoes';

// Leitor client-side do perfil público (espelha o reader server-side da landing;
// Rules liberam a leitura a membros do tenant → serve o preview do organizador).
export { getPublicPerfil } from './public/getPublicPerfil';
export type {
  PerfilPublicoCompleto,
  ClubeResumoPublico,
  EventoResumoPublico,
} from './public/getPublicPerfil';

// ---------------------------------------------------------------------------
// Plataforma — profissionais + join tenant → owner (LEELA-CONS-4-T1)
// Nome real do dono do tenant: reader com join (Rules já autorizam a
// leitura para os mesmos leitores do tenant — sem denormalização).
// ---------------------------------------------------------------------------
export { getProfissional, getTenantComOwner } from './platform/profissionais';
export type { TenantComOwner } from './platform/profissionais';
// Auto-cadastro do organizador (S030-T2 · RN-411/412): a única escrita de
// cliente em `profissionais` — o próprio doc, shape fechado pela Rule.
export { criarPerfilOrganizador } from './platform/profissionais';
export type { PerfilOrganizadorInput } from './platform/profissionais';
// A ponte da área do cliente (S1234-T1 · RN-512): promoção da conta que JÁ
// existe. Callable, não escrita de cliente — a área do cliente é servida por
// callables do próprio dono da conta, e nenhuma Rule abre para `athlete`.
export { promoverParaProfissional, motivoDaRecusaDaPromocao } from './platform/profissionais';
export type {
  PromocaoProfissionalResult,
  // O que a porta manda além do aceite: a intenção do CTA apertado
  // (PONTE-CTA-1) e o nome da produtora escolhido ali (PONTE-NOME-1).
  PromocaoProfissionalInput,
  IntencaoDaTravessia,
  // O eco do servidor (PONTE-FIX · B1): o rótulo que ele registrou, com os
  // dois estados de ausência. É o que deixa "gravou" e "ignorou" distinguíveis
  // por quem chamou — tela ou sonda de fumaça.
  IntencaoRegistrada,
  MotivoRecusaPromocao,
} from './platform/profissionais';

// Convites de organizador do super-admin (S1608-T2 · RN-413): listar, gerar e
// revogar pelo client SDK (Rules exigem platform_admin). Resgatar NÃO está
// aqui — é callable, porque quem resgata nunca lê a coleção (RN-414).
export {
  listarConvitesOrganizador,
  gerarConviteOrganizador,
  revogarConviteOrganizador,
} from './platform/convites';
export type { GerarConviteInput } from './platform/convites';

// Onboarding da conta travada (S1609 · RN-414/417): canal do CTA "Falar com o
// time Leela" + resgate do código (callable — o cliente nunca lê os convites).
export { getContatoOnboarding, resgatarConviteOrganizador } from './platform/onboarding';
export type { ResgatarConviteResult } from './platform/onboarding';

// Marcas/patrocinadores reutilizáveis (R9-E · S-R9-12 · RN-171 — seed
// E10-S811): CRUD owner-only + upsert a partir do cadastro de patrocínio.
export {
  listarMarcas,
  salvarMarca,
  definirStatusDaMarca,
  upsertMarcaDoPatrocinio,
  marcaIdDoNome,
} from './brands';

// ---------------------------------------------------------------------------
// CRM do organizador (E19 · S-R9-13 · RN-172): readers da projeção
// `tenants/{tid}/crmClientes` mantida pela Function onInscritoWriteCrm.
// SÓ leitura (Rules negam escrita; leitura só owner/staff do tenant) —
// lista paginada por cursor + busca por prefixo de nome + detalhe 1 read.
// ---------------------------------------------------------------------------
export {
  CRM_CLIENTES_PAGE_SIZE,
  listarCrmClientes,
  buscarCrmClientesPorNome,
  getCrmCliente,
} from './crm';
export type {
  CrmCliente,
  CrmClientesCursor,
  CrmClientesOrdem,
  ListarCrmClientesOptions,
  ListarCrmClientesResult,
} from './crm';
