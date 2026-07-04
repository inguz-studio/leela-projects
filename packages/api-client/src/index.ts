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
export type { FirebaseClientConfig, LeelaFirebaseConfig } from './firebase';

// ---------------------------------------------------------------------------
// Clubs — leitura tipada de `clubes` (S101-T1) + `membros` (S103-T1)
// ---------------------------------------------------------------------------
export { getClube, listClubesByTenant, listClubesByOwner, listMembros } from './clubs';
export type { ListMembrosOptions } from './clubs';

// Clubs — leitura de desafios (S105-T2), parcerias (S107-T2) e comunicados
// (S108-T2). Filtro fino roda no cliente; agregados ∑ vêm das Functions.
export { listDesafios } from './clubs';

// Clubs — mutations via Cloud Function (contrato das telas L3):
// removerMembro/transferirPropriedade (tela de membros, §2.15) e
// enviarConvites (modal S104-T1 — RN-106 revalidada no servidor)
export { removerMembro, transferirPropriedade, enviarConvites } from './clubs';
export type {
  RemoverMembroResult,
  TransferirPropriedadeResult,
  EnviarConvitesResult,
} from './clubs';

// ---------------------------------------------------------------------------
// Eventos — queries de `eventos` e subcoleções (LEELA-E03 · L1)
// ---------------------------------------------------------------------------
// S200-T1 — eventos por organizador · S201-T2 — leitura direta por slug (L3)
// S207-T1 — leitura do agregado financeiro/current (lê S207-T2)
export {
  listarEventosDoOrganizador,
  getEvento,
  getFinanceiroEvento,
} from './eventos/queries';
export type {
  ListarEventosDoOrganizadorParams,
  FinanceiroEvento,
  ContagemInscritos,
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

// S203-T1 — inscritos paginados por cursor (18/página — §2.5)
export { listarInscritos, INSCRITOS_PAGE_SIZE } from './eventos/inscritos';
export type {
  InscritosCursor,
  ListarInscritosOptions,
  ListarInscritosResult,
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

// ---------------------------------------------------------------------------
// Auth helpers — sessão, login, logout, claims (LEELA-S000-2-T2)
// ---------------------------------------------------------------------------
export {
  onSessionChange,
  getCurrentUser,
  loginComEmail,
  criarContaComEmail,
  loginComGoogle,
  loginComApple,
  logout,
  getClaims,
} from './auth';

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
