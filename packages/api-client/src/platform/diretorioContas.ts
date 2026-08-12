// =============================================================================
// packages/api-client/src/platform/diretorioContas.ts
//
// Leitura ADMIN do DIRETÓRIO DE CONTAS do painel master — `profissionais` e
// `atletas`, paginados por cursor, com os campos mínimos (ADMIN-VISAO onda 5 ·
// S1615-T1 · RN-540).
//
// NENHUMA RULE NOVA. As duas coleções já cruzam a fronteira para o
// administrador: `profissionais` (`firestore.rules:2957` — `allow read: … ||
// isPlatformAdmin()`) e `atletas` (`:2848`, mesma perna). O que faltava era o
// reader; a Rule não é tocada por esta lane.
//
// ⛔ NENHUM `collectionGroup`. Não existe Rule de CG no arquivo, e uma query de
// CG negada volta com uma mensagem que PARECE falta de índice — a armadilha
// nomeada na spec (03-spec.md · S1614/S1615). As duas leituras são de coleção
// RAIZ, doc a doc.
//
// DISCIPLINA DE QUERY (a mesma de `tenantVendas.ts` e `listasGlobais.ts`):
// `where` de igualdade sobre UM campo + `limit`, sem `orderBy` — a ordenação
// implícita por `__name__` já é estável para `startAfter(snapshot)`, e um
// `orderBy` cruzando outro campo exigiria índice composto novo, que esta lane
// não pode declarar (`firestore.indexes.json` está fora do território).
// `statusOnboarding` é igualdade de campo único: índice automático.
//
// MINIMIZAÇÃO (RN-540 · "alcance mínimo"). O retorno é exatamente o que o
// trabalho de olhar e liberar exige — nome, e-mail, organização, telefone,
// quando se cadastrou e o `statusOnboarding` que separa os dois modos da tela.
// CPF NÃO SAI DAQUI: `pessoas` continua fechada nas Rules (`:2724` — `read,
// write: if false`) e o único caminho até o documento de identificação é o
// callable auditado `consultarDocumentoDaConta` (V-4 · S1615-T3), uma conta
// por chamada, com registro de cada consulta.
//
// SEM SAÍDA EM MASSA (RN-540): não existe aqui — nem em consumidor algum —
// export, CSV ou download. A paginação serve a tela; extração de base é outra
// conversa, e é do dono.
//
// TIPOS PRÓPRIOS, e não `Profissional` do core: o doc GRAVA `telefone`,
// `organizacao` e `statusOnboarding` (`profissionais.ts:113` — auto-cadastro
// da RN-411) sem que a interface `Profissional` os declare. Tipá-los no core é
// tarefa da S1612 (V-3), em outra lane e em `packages/core/src/index.ts`, que
// esta lane não toca. As views abaixo declaram o que a TELA consome, do jeito
// que o doc realmente guarda — mesma escolha que `ClienteTenantView` já fez.
// =============================================================================

import {
  collection,
  getDocs,
  limit as firestoreLimit,
  query,
  startAfter,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { StatusOnboarding, Timestamp } from '@leela/core';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Página canônica do diretório (§2.5 — mesma densidade das listas globais). */
export const DIRETORIO_CONTAS_PAGE_SIZE = 20;

/** Teto do pageSize — mesma disciplina de `LISTA_GLOBAL_PAGE_SIZE_MAX`. */
export const DIRETORIO_CONTAS_PAGE_SIZE_MAX = 100;

/** Cursor opaco de paginação — snapshot do último doc da página anterior. */
export type DiretorioContasCursor = QueryDocumentSnapshot;

/**
 * O papel que a linha do diretório mostra. Não é claim: é a COLEÇÃO de onde a
 * conta veio, que é o que o diretório sabe sem ler o Auth. A claim continua
 * sendo a fonte de papel (RN-401) e não é lida por tela.
 */
export type PapelDaConta = 'organizador' | 'atleta';

/** Conta de `profissionais/{id}` — a origem que tem fila (RN-547). */
export interface ContaProfissionalView {
  id: string;
  papel: 'organizador';
  nome: string;
  email: string;
  /** '' quando o doc não guarda (conta criada antes do auto-cadastro). */
  organizacao: string;
  /** Só dígitos, como o auto-cadastro normaliza. '' = não coletado. */
  telefone: string;
  /**
   * `undefined` = doc sem o campo (owner provisionado pela porta manual antes
   * da S030-T2). Ausência NÃO é `'ativo'` — quem não declara não entra na
   * fila, mas também não é apresentado como liberado.
   */
  statusOnboarding: StatusOnboarding | undefined;
  /** null quando o doc não carimbou (legado). */
  criadoEm: Timestamp | null;
}

/** Conta de `atletas/{id}` — identidade global, sem fila e sem organização. */
export interface ContaAtletaView {
  id: string;
  papel: 'atleta';
  nome: string;
  email: string;
  criadoEm: Timestamp | null;
}

/** Uma linha do diretório, das duas origens. */
export type ContaDoDiretorio = ContaProfissionalView | ContaAtletaView;

export interface DiretorioContasOptions {
  cursor?: DiretorioContasCursor;
  /** Default 20 (DIRETORIO_CONTAS_PAGE_SIZE); clamp em [1, 100]. */
  pageSize?: number;
}

export interface ListarProfissionaisOptions extends DiretorioContasOptions {
  /**
   * Recorte do modo Fila (RN-547): `'aguardando_convite'` traz só quem espera
   * liberação. Ausente = sem `where`, o modo Diretório.
   */
  statusOnboarding?: StatusOnboarding;
}

export interface ListarContasResult<T> {
  itens: T[];
  /** null quando não há próxima página — NUNCA um total inventado. */
  proxCursor: DiretorioContasCursor | null;
}

// ---------------------------------------------------------------------------
// Leitura defensiva do doc
// ---------------------------------------------------------------------------

function clampPageSize(pageSize: number | undefined): number {
  return Math.min(
    Math.max(1, pageSize ?? DIRETORIO_CONTAS_PAGE_SIZE),
    DIRETORIO_CONTAS_PAGE_SIZE_MAX
  );
}

/** String do doc, ou '' — campo ausente é ausência, nunca `undefined` na tela. */
function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/** `Timestamp` portátil do core, ou null quando o doc não carimbou. */
function carimbo(valor: unknown): Timestamp | null {
  return valor !== null &&
    typeof valor === 'object' &&
    typeof (valor as Timestamp).toDate === 'function'
    ? (valor as Timestamp)
    : null;
}

/** `statusOnboarding` do doc, só se for um dos dois valores do domínio. */
function status(valor: unknown): StatusOnboarding | undefined {
  return valor === 'aguardando_convite' || valor === 'ativo' ? valor : undefined;
}

function paraProfissional(
  id: string,
  data: DocumentData
): ContaProfissionalView {
  return {
    id,
    papel: 'organizador',
    nome: texto(data['nome']),
    email: texto(data['email']),
    organizacao: texto(data['organizacao']),
    telefone: texto(data['telefone']),
    statusOnboarding: status(data['statusOnboarding']),
    criadoEm: carimbo(data['criadoEm']),
  };
}

function paraAtleta(id: string, data: DocumentData): ContaAtletaView {
  return {
    id,
    papel: 'atleta',
    nome: texto(data['nome']),
    email: texto(data['email']),
    criadoEm: carimbo(data['criadoEm']),
  };
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/**
 * Contas de `profissionais`, paginadas. Com `statusOnboarding` é o modo Fila
 * (só quem aguarda liberação — RN-547); sem ele é a metade de organizadores do
 * modo Diretório.
 *
 * O `platform_admin` já cruza a Rule (`firestore.rules:2957`) — sem Rule nova.
 */
export async function listarProfissionaisPaginado(
  db: Firestore,
  options: ListarProfissionaisOptions = {}
): Promise<ListarContasResult<ContaProfissionalView>> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [];
  if (options.statusOnboarding !== undefined) {
    constraints.push(where('statusOnboarding', '==', options.statusOnboarding));
  }
  constraints.push(firestoreLimit(pageSize));
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'profissionais'), ...constraints));
  const itens = snap.docs.map((d) => paraProfissional(d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}

/**
 * Contas de `atletas`, paginadas — a outra metade do modo Diretório. Não há
 * recorte de status: `atletas` não guarda onboarding, e a tela não finge que
 * guarda.
 *
 * O `platform_admin` já cruza a Rule (`firestore.rules:2848`) — sem Rule nova.
 */
export async function listarAtletasPaginado(
  db: Firestore,
  options: DiretorioContasOptions = {}
): Promise<ListarContasResult<ContaAtletaView>> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [firestoreLimit(pageSize)];
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'atletas'), ...constraints));
  const itens = snap.docs.map((d) => paraAtleta(d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}
