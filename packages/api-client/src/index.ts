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
