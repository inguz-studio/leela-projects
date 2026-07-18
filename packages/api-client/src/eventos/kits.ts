// =============================================================================
// packages/api-client/src/eventos/kits.ts
//
// CRUD de `eventos/{eventoId}/kits` e do catálogo `itensKit`
// (LEELA-S205-T1 · E03).
//
// Escrita DIRETA do cliente é permitida pelas Rules (tenant writer) — kits e
// itens são configuração do organizador, não estado financeiro. Exceções:
//   - `usadoEm` (índice inverso N:N — RN-215) é mantido pela Function
//     itemKitIndex; o cliente NUNCA envia esse campo (Rule nega);
//   - bloqueio de preço pós-venda (RN-200) entra em S201-T3 (guard servidor).
// =============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { parseItemKit, parseKit, type ItemKit, type Kit } from '@leela/core';

// ---------------------------------------------------------------------------
// Kits (subcoleção do evento)
// ---------------------------------------------------------------------------

/** Lista os kits de um evento, do mais caro ao desconto ("Sem kit" por último). */
export async function listarKits(db: Firestore, eventoId: string): Promise<Kit[]> {
  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'kits'), orderBy('preco', 'desc'))
  );
  return snap.docs.map((d) => parseKit(d.id, d.data()));
}

/** Lê um kit pelo id. Retorna null se não existir. */
export async function getKit(
  db: Firestore,
  eventoId: string,
  kitId: string
): Promise<Kit | null> {
  const snap = await getDoc(doc(db, 'eventos', eventoId, 'kits', kitId));
  if (!snap.exists()) return null;
  return parseKit(snap.id, snap.data());
}

/** Payload de escrita de kit (sem campos gerenciados) */
export interface SalvarKitInput {
  tenantId: string;
  nome: string;
  /** Aceita negativo — "Sem kit" com desconto (RN-211) */
  preco: number;
  capacidade: number;
  modalidades: string[];
  /**
   * R9-C (RN-229) — frase que posiciona o kit no checkout (≤280).
   * `null` limpa o campo; ausente não toca.
   */
  descricao?: string | null;
  /** R9-C (RN-229) — "o que está incluso" (≤30 itens). Ausente não toca. */
  itens?: string[];
  /**
   * R9-C (RN-227) — URL http(s) da imagem 1:1 (vinda de `uploadImagemKit`
   * ou colada). `null` limpa; ausente não toca. Rules validam http(s) ≤2048.
   */
  imagemUrl?: string | null;
}

/**
 * Cria/atualiza um kit (merge). Rules validam tenant + shape.
 * RN-216: `nome` é sempre "kit" na copy — nunca "tier".
 */
export async function salvarKit(
  db: Firestore,
  eventoId: string,
  kitId: string,
  input: SalvarKitInput
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: kitId,
    tenantId: input.tenantId,
    nome: input.nome,
    preco: input.preco,
    capacidade: input.capacidade,
    modalidades: input.modalidades,
    atualizadoEm: serverTimestamp(),
  };
  // Visão de compra (R9-C): só entram no payload quando fornecidos —
  // merge não apaga o que o organizador já preencheu.
  if (input.descricao !== undefined) payload['descricao'] = input.descricao;
  if (input.itens !== undefined) payload['itens'] = input.itens;
  if (input.imagemUrl !== undefined) payload['imagemUrl'] = input.imagemUrl;
  await setDoc(doc(db, 'eventos', eventoId, 'kits', kitId), payload, { merge: true });
}

/** Remove um kit do evento. */
export async function removerKit(
  db: Firestore,
  eventoId: string,
  kitId: string
): Promise<void> {
  await deleteDoc(doc(db, 'eventos', eventoId, 'kits', kitId));
}

// ---------------------------------------------------------------------------
// Itens do catálogo (top-level `itensKit`)
// ---------------------------------------------------------------------------

/**
 * Lista o catálogo de itens de um evento.
 * Filtra por tenantId (obrigatório — Rules exigem prova de tenant na query)
 * e eventoId; ordena no cliente por nome (equality-only → sem índice composto).
 */
export async function listarItensKit(
  db: Firestore,
  params: { tenantId: string; eventoId: string }
): Promise<ItemKit[]> {
  const snap = await getDocs(
    query(
      collection(db, 'itensKit'),
      where('tenantId', '==', params.tenantId),
      where('eventoId', '==', params.eventoId)
    )
  );
  return snap.docs
    .map((d) => parseItemKit(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Lê um item pelo id. Retorna null se não existir. */
export async function getItemKit(
  db: Firestore,
  itemId: string
): Promise<ItemKit | null> {
  const snap = await getDoc(doc(db, 'itensKit', itemId));
  if (!snap.exists()) return null;
  return parseItemKit(snap.id, snap.data());
}

/** Payload de escrita de item (sem `usadoEm` — índice é da Function) */
export interface SalvarItemKitInput {
  tenantId: string;
  eventoId: string;
  nome: string;
  /** RN-212 */
  tamanhado: boolean;
  /** RN-213 */
  origem: 'organizador' | 'patrocinador';
  /** Só quando origem = patrocinador */
  marca?: string;
  /** RN-214 — organizador é sempre false (Rule nega incoerência) */
  exibirLogo: boolean;
  /**
   * RN-225 (S210-T1) — modelo de estoque; opcional no payload (doc legado
   * normaliza para `sob_encomenda` no parse do core).
   */
  modeloEstoque?: 'sob_encomenda' | 'estoque_proprio';
  /** RN-223 (S210-T1) — tamanhos válidos do item tamanhado (ex.: P/M/G/GG) */
  tamanhosDisponiveis?: string[];
  /** N:N — ids dos kits que usam o item (RN-215) */
  kits: string[];
}

/**
 * Cria/atualiza um item do catálogo (merge). NUNCA envia `usadoEm` —
 * o índice inverso é recomputado pela Function itemKitIndex no onWrite.
 */
export async function salvarItemKit(
  db: Firestore,
  itemId: string,
  input: SalvarItemKitInput
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: itemId,
    tenantId: input.tenantId,
    eventoId: input.eventoId,
    nome: input.nome,
    tamanhado: input.tamanhado,
    origem: input.origem,
    exibirLogo: input.exibirLogo,
    kits: input.kits,
    atualizadoEm: serverTimestamp(),
  };
  if (input.marca !== undefined) {
    payload['marca'] = input.marca;
  }
  if (input.modeloEstoque !== undefined) {
    payload['modeloEstoque'] = input.modeloEstoque;
  }
  if (input.tamanhosDisponiveis !== undefined) {
    payload['tamanhosDisponiveis'] = input.tamanhosDisponiveis;
  }
  await setDoc(doc(db, 'itensKit', itemId), payload, { merge: true });
}

/** Remove um item do catálogo. */
export async function removerItemKit(db: Firestore, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'itensKit', itemId));
}
