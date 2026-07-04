// =============================================================================
// packages/api-client/src/clubs.ts
//
// Leitura tipada de `clubes` (S101-T1) e `clubes/{id}/membros` (S103-T1)
// via Firestore client SDK — LEELA-E05.
//
// ADR-009: toda query de coleção tenant-scoped filtra por tenantId; a
// subcoleção `membros` herda o escopo do clube pai (Rules resolvem o tenant
// via get() do pai — a query não precisa repetir o filtro).
// Escrita de agregados ∑ (qtdMembrosAtivos, qtdDesafiosAtivos) e de
// `membros.status` (RN-102) é EXCLUSIVA das Cloud Functions — nenhum write
// desses campos sai deste módulo.
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import type {
  AcaoDesafio,
  Clube,
  Desafio,
  Membro,
  ModeloComercial,
  ModeloDesafio,
  PapelMembro,
  Parceria,
  Pilar,
  RecompensaTipo,
  StatusMembro,
  StatusParceria,
  VisibilidadeDesafio,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Leitura — clubes
// ---------------------------------------------------------------------------

/**
 * Lê um clube pelo slug (docId = slug).
 * Security Rules: membro do tenant, platform_admin ou clube público/indexável.
 */
export async function getClube(
  db: Firestore,
  slug: string
): Promise<Clube | null> {
  const snap = await getDoc(doc(db, 'clubes', slug));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Clube, 'id'>), id: snap.id };
}

/**
 * Lista os clubes do tenant (hub de clubes — zona "próprios" + "parceiros").
 * ADR-009: filtro obrigatório por tenantId.
 */
export async function listClubesByTenant(
  db: Firestore,
  tenantId: string,
  options: { pageLimit?: number } = {}
): Promise<Clube[]> {
  const { pageLimit = 50 } = options;
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    orderBy('criadoEm', 'desc'),
    firestoreLimit(pageLimit),
  ];
  const snap = await getDocs(query(collection(db, 'clubes'), ...constraints));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Clube, 'id'>), id: d.id }));
}

/**
 * Lista os clubes de um owner dentro do tenant (zona "clubes próprios", RN-100).
 */
export async function listClubesByOwner(
  db: Firestore,
  tenantId: string,
  ownerId: string,
  options: { pageLimit?: number } = {}
): Promise<Clube[]> {
  const { pageLimit = 50 } = options;
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    where('ownerId', '==', ownerId),
    firestoreLimit(pageLimit),
  ];
  const snap = await getDocs(query(collection(db, 'clubes'), ...constraints));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Clube, 'id'>), id: d.id }));
}

// ---------------------------------------------------------------------------
// Leitura — membros (subcoleção `clubes/{clubeId}/membros` · S103-T1)
// ---------------------------------------------------------------------------

export interface ListMembrosOptions {
  /** Filtro por status derivado (RN-102). Combinável com `papel` (interseção). */
  status?: StatusMembro;
  /** Filtro por papel no clube (RN-103). Combinável com `status` (interseção). */
  papel?: PapelMembro;
  pageLimit?: number;
}

/**
 * Lista membros do clube, ordenados por nome (lista densa do painel, S103-T2).
 * Filtros status × papel são EQUALITY combináveis — interseção, nunca união.
 * Índices compostos declarados em firestore.indexes.json.
 * Security Rules: leitura só para membros do tenant dono do clube pai.
 */
export async function listMembros(
  db: Firestore,
  clubeId: string,
  options: ListMembrosOptions = {}
): Promise<Membro[]> {
  const { status, papel, pageLimit = 50 } = options;
  const constraints: QueryConstraint[] = [];
  if (status) constraints.push(where('status', '==', status));
  if (papel) constraints.push(where('papel', '==', papel));
  constraints.push(orderBy('atletaNome', 'asc'), firestoreLimit(pageLimit));

  const snap = await getDocs(
    query(collection(db, 'clubes', clubeId, 'membros'), ...constraints)
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Membro, 'id'>), id: d.id }));
}

// ---------------------------------------------------------------------------
// Leitura — desafios (subcoleção `clubes/{clubeId}/desafios` · S105-T1)
// ---------------------------------------------------------------------------

/**
 * Lista os desafios de um clube, mais recentes primeiro (lista S105-T2).
 * Filtro fino (status/modelo/busca) roda no cliente — aqui trazemos a página.
 * Security Rules: leitura só para membros do tenant dono do clube pai.
 * Agregados ∑ (qtdParticipantes, progressoPct) vêm da Function; a tela só lê.
 */
export async function listDesafios(
  db: Firestore,
  clubeId: string,
  options: { pageLimit?: number } = {}
): Promise<Desafio[]> {
  const { pageLimit = 100 } = options;
  const snap = await getDocs(
    query(
      collection(db, 'clubes', clubeId, 'desafios'),
      orderBy('criadoEm', 'desc'),
      firestoreLimit(pageLimit)
    )
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Desafio, 'id'>), id: d.id }));
}

/** Lê um desafio pelo id (edição do editor — S106-T2). Null se não existir. */
export async function getDesafio(
  db: Firestore,
  clubeId: string,
  desafioId: string
): Promise<Desafio | null> {
  const snap = await getDoc(doc(db, 'clubes', clubeId, 'desafios', desafioId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Desafio, 'id'>), id: snap.id };
}

// ---------------------------------------------------------------------------
// Escrita — desafio (S106-T2). Write DIRETO do cliente (não Function): as
// Rules de `clubes/{id}/desafios` (S105-T1, testadas) permitem create pelo
// papel de escrita do tenant, exigindo shape válido + agregados ∑ zerados. A
// recontagem de `qtdDesafiosAtivos` é da Function onDesafioWrite. Não há
// callable de criação (recorte V1 = listar/criar por write client).
// ---------------------------------------------------------------------------

/** Payload de criação de desafio (editor S106-T2). Datas em `Date`. */
export interface CriarDesafioInput {
  /** tenantId do clube pai (Rules exigem coerência — ADR-009). */
  tenantId: string;
  nome: string;
  descricao: string;
  modelo: ModeloDesafio;
  dataInicio: Date;
  dataFim: Date;
  /** 'rascunho' ao salvar; 'ativo' ao publicar (validação no cliente). */
  status: 'rascunho' | 'ativo';
  metaTotalPontos?: number;
  minimoPorPilar?: Partial<Record<Pilar, number>>;
  recompensaTipo: RecompensaTipo;
  visibilidade: VisibilidadeDesafio;
  /** Junção N:N com o catálogo (`acoes/{acaoId}`). */
  acoes: AcaoDesafio[];
}

export interface CriarDesafioResult {
  desafioId: string;
}

/**
 * Cria um desafio (+ junção de ações) via write direto do cliente. Agregados ∑
 * nascem zerados (a Function os mantém). Retorna o id gerado.
 */
export async function criarDesafio(
  db: Firestore,
  clubeId: string,
  input: CriarDesafioInput
): Promise<CriarDesafioResult> {
  const ref = doc(collection(db, 'clubes', clubeId, 'desafios'));
  const data: Record<string, unknown> = {
    tenantId: input.tenantId,
    nome: input.nome,
    descricao: input.descricao,
    modelo: input.modelo,
    status: input.status,
    dataInicio: Timestamp.fromDate(input.dataInicio),
    dataFim: Timestamp.fromDate(input.dataFim),
    recompensaTipo: input.recompensaTipo,
    visibilidade: input.visibilidade,
    qtdParticipantes: 0,
    progressoPct: 0,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };
  if (input.metaTotalPontos !== undefined) data.metaTotalPontos = input.metaTotalPontos;
  if (input.minimoPorPilar && Object.keys(input.minimoPorPilar).length > 0) {
    data.minimoPorPilar = input.minimoPorPilar;
  }
  await setDoc(ref, data);

  await Promise.all(
    input.acoes.map((a) =>
      setDoc(
        doc(db, 'clubes', clubeId, 'desafios', ref.id, 'acoes', a.acaoRef),
        a.meta !== undefined ? { acaoRef: a.acaoRef, meta: a.meta } : { acaoRef: a.acaoRef }
      )
    )
  );

  return { desafioId: ref.id };
}

/**
 * Atualiza um desafio existente (edição — S106-T2). NUNCA toca agregados ∑
 * (Rules negam). A junção `acoes` não é re-sincronizada aqui (recorte V1).
 */
export async function atualizarDesafio(
  db: Firestore,
  clubeId: string,
  desafioId: string,
  input: Omit<CriarDesafioInput, 'tenantId' | 'acoes'>
): Promise<void> {
  const patch: Record<string, unknown> = {
    nome: input.nome,
    descricao: input.descricao,
    modelo: input.modelo,
    status: input.status,
    dataInicio: Timestamp.fromDate(input.dataInicio),
    dataFim: Timestamp.fromDate(input.dataFim),
    recompensaTipo: input.recompensaTipo,
    visibilidade: input.visibilidade,
    atualizadoEm: serverTimestamp(),
  };
  if (input.metaTotalPontos !== undefined) patch.metaTotalPontos = input.metaTotalPontos;
  if (input.minimoPorPilar && Object.keys(input.minimoPorPilar).length > 0) {
    patch.minimoPorPilar = input.minimoPorPilar;
  }
  await updateDoc(doc(db, 'clubes', clubeId, 'desafios', desafioId), patch);
}

// ---------------------------------------------------------------------------
// Parcerias (subcoleção `clubes/{clubeId}/parcerias` · S107-T1)
// ---------------------------------------------------------------------------

/**
 * Lista as parcerias de um clube (union evento_afiliado | patrocinador).
 * Security Rules: leitura só para membros do tenant dono. Campos espelhados
 * (comissão/termos/link/cupom) e ∑ vêm da Function — a tela só lê.
 */
export async function listParcerias(
  db: Firestore,
  clubeId: string,
  options: { pageLimit?: number } = {}
): Promise<Parceria[]> {
  const { pageLimit = 100 } = options;
  const snap = await getDocs(
    query(
      collection(db, 'clubes', clubeId, 'parcerias'),
      orderBy('criadoEm', 'desc'),
      firestoreLimit(pageLimit)
    )
  );
  // `Parceria` é union discriminada por `tipo`; o cast final preserva o shape
  // específico (Omit<Parceria,'id'> colapsaria só as chaves comuns).
  return snap.docs.map((d) => ({ ...(d.data() as Parceria), id: d.id }) as Parceria);
}

/**
 * Transiciona o `status` de uma parceria (aceitar/recusar/pausar — RN-120/122).
 * Write direto: para evento_afiliado as Rules só permitem tocar status +
 * atualizadoEm (comissão/termos são read-only do organizador). Para
 * patrocinador o shape completo permanece válido no doc mesclado.
 */
export async function transicionarParceria(
  db: Firestore,
  clubeId: string,
  parceriaId: string,
  status: StatusParceria
): Promise<void> {
  await updateDoc(doc(db, 'clubes', clubeId, 'parcerias', parceriaId), {
    status,
    atualizadoEm: serverTimestamp(),
  });
}

/** Payload de cadastro de patrocinador (modal S107-T3). */
export interface CriarPatrocinadorInput {
  tenantId: string;
  nome: string;
  modeloComercial: ModeloComercial;
  valorAnual?: number;
  contrapartida: string;
  contratoUrl?: string;
}

/**
 * Cria uma parceria de patrocinador (write direto — Rules
 * shapePatrocinadorValido: contrapartida ≥ 20, financeiro exige valorAnual > 0,
 * nunca nasce com campos de afiliação/∑). Nasce `ativa`.
 */
export async function criarPatrocinador(
  db: Firestore,
  clubeId: string,
  input: CriarPatrocinadorInput
): Promise<{ parceriaId: string }> {
  const ref = doc(collection(db, 'clubes', clubeId, 'parcerias'));
  const data: Record<string, unknown> = {
    tenantId: input.tenantId,
    tipo: 'patrocinador',
    status: 'ativa',
    nome: input.nome,
    modeloComercial: input.modeloComercial,
    contrapartida: input.contrapartida,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };
  if (input.valorAnual !== undefined) data.valorAnual = input.valorAnual;
  if (input.contratoUrl) data.contratoUrl = input.contratoUrl;
  await setDoc(ref, data);
  return { parceriaId: ref.id };
}

// ---------------------------------------------------------------------------
// Mutations — membros e convites via Cloud Function (contrato das telas L3)
// Espelham `functions/src/clubs/{membrosMutations,enviarConvites}.ts`.
// Autorização, guardas (owner não removível, RN-106) e agregados ∑ são do
// SERVIDOR — estes wrappers só tipam o contrato.
// ---------------------------------------------------------------------------

export interface RemoverMembroResult {
  removido: true;
}

/**
 * Remove um membro do clube via Cloud Function `removerMembro` e reconta
 * o agregado ∑ qtdMembrosAtivos no servidor. O owner não é removível
 * (`failed-precondition` — a tela oferece transferir propriedade antes).
 */
export async function removerMembro(
  functions: Functions,
  clubeId: string,
  membroId: string
): Promise<RemoverMembroResult> {
  const call = httpsCallable<
    { clubeId: string; membroId: string },
    RemoverMembroResult
  >(functions, 'removerMembro');
  return (await call({ clubeId, membroId })).data;
}

export interface TransferirPropriedadeResult {
  /** uid (atletaId) do novo owner do clube */
  novoOwnerUid: string;
  /** membroId do owner anterior rebaixado para admin — null se não havia */
  ownerAnteriorMembroId: string | null;
}

/**
 * Transfere a propriedade do clube para um membro via Cloud Function
 * `transferirPropriedade` (atômica: clube.ownerId + papéis dos membros).
 * Transferir para quem já é owner devolve `failed-precondition`.
 */
export async function transferirPropriedade(
  functions: Functions,
  clubeId: string,
  membroId: string
): Promise<TransferirPropriedadeResult> {
  const call = httpsCallable<
    { clubeId: string; membroId: string },
    TransferirPropriedadeResult
  >(functions, 'transferirPropriedade');
  return (await call({ clubeId, membroId })).data;
}

export interface EnviarConvitesResult {
  /** Convites efetivamente gravados (após dedupe case-insensitive) */
  enviados: number;
  /** Total de emails recebidos no input */
  total: number;
}

/**
 * Envia convites por email via Cloud Function `enviarConvites` (modal
 * S104-T1). O servidor revalida RN-106 (1..50 emails, formato) com a mesma
 * `validarConvite` pura que o modal usa como UX; lote inválido devolve
 * `invalid-argument`.
 */
export async function enviarConvites(
  functions: Functions,
  clubeId: string,
  emails: string[]
): Promise<EnviarConvitesResult> {
  const call = httpsCallable<
    { clubeId: string; emails: string[] },
    EnviarConvitesResult
  >(functions, 'enviarConvites');
  return (await call({ clubeId, emails })).data;
}
