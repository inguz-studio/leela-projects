// =============================================================================
// packages/api-client/src/eventos/equipe.ts
//
// Equipe do evento — readers + wrapper da Function (LEELA-S304-T1 · E04-L4).
//
// ADR-008/RN-401: papel NUNCA muda por escrita direta do cliente — troca/
// atribuição/revogação passa pela Cloud Function `setClaimsEquipe` (merge
// preservador de claims + âncora no doc). Este módulo só tipa o contrato;
// validação e anti-escalada REAIS acontecem no servidor.
//
// Depois de mudar papel de um membro LOGADO, o app dele deve chamar
// `getIdTokenResult(true)` para o token refletir — a âncora no doc já corta
// o acesso do token velho nas Rules, mas a UI 403 lê o token.
// =============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import { parseMembroEquipe, type MembroEquipe, type PapelEvento } from '@leela/core';

/** Papel convidável — o organizador NUNCA é convidado (é o dono; RN-320 + Rule). */
export type PapelConvite = Exclude<PapelEvento, 'organizador'>;

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/**
 * Lista a equipe do evento (convidados + ativos + removidos — a UI filtra).
 * Rule: platform_admin, writer do tenant dono ou equipe organizador/
 * administrador (célula `equipe` da matriz 4×7 — operador/financeiro NEGADOS).
 */
export async function listarEquipe(
  db: Firestore,
  eventoId: string
): Promise<MembroEquipe[]> {
  const q = query(
    collection(db, 'eventos', eventoId, 'equipe'),
    orderBy('nome')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => parseMembroEquipe(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Mutations (Cloud Function — contrato espelha functions/src/eventos)
// ---------------------------------------------------------------------------

export interface SetClaimsEquipeInput {
  eventoId: string;
  /** uid Firebase Auth do MEMBRO alvo. */
  uid: string;
  /** Papel a atribuir/trocar (RN-320) — `null` revoga (remoção de membro). */
  papel?: PapelEvento | null;
  /** Nome p/ o doc quando o membro ainda não tem doc (opcional). */
  nome?: string;
}

export interface SetClaimsEquipeResult {
  success: true;
  eventoId: string;
  uid: string;
  /** Papel vigente após a operação (null = revogado). */
  papel: PapelEvento | null;
}

/**
 * Atribui/troca/revoga papel de equipe via Cloud Function `setClaimsEquipe`.
 * Servidor valida autoridade (anti-escalada: administrador não concede
 * 'organizador' nem destitui o organizador; ninguém gere o próprio papel)
 * e mantém claims + doc em sincronia com merge preservador.
 */
export async function setClaimsEquipe(
  functions: Functions,
  input: SetClaimsEquipeInput
): Promise<SetClaimsEquipeResult> {
  const callable = httpsCallable<SetClaimsEquipeInput, SetClaimsEquipeResult>(
    functions,
    'setClaimsEquipe'
  );
  const { data } = await callable(input);
  return data;
}

// ---------------------------------------------------------------------------
// Convite (LEELA-S304-T3 · E04-L5) — escrita DIRETA de cliente, ÚNICA permitida
// nesta coleção. A Rule (`shapeConviteValido`) só aceita create com:
//   papel ∈ {administrador, operador, financeiro} (NUNCA organizador),
//   status == 'convidado', SEM `uid`, `nome` não-vazio, tenant do evento pai.
// A ATIVAÇÃO (uid + claims + doc âncora em `equipe/{uid}`) é EXCLUSIVA da
// Function `setClaimsEquipe` — o convite é só o registro pendente. Trocar o
// papel de um convite NÃO existe pelo cliente (Rule `update` = platform_admin):
// a UI mantém o papel do convite read-only até a ativação.
// ---------------------------------------------------------------------------

/** Dados do convite — `nome` obrigatório (exigido pela Rule); `email` opcional. */
export interface ConvidarMembroEquipeInput {
  nome: string;
  email?: string | null;
  papel: PapelConvite;
}

/**
 * Cria um convite de membro (docId auto — a ativação grava o doc definitivo em
 * `equipe/{uid}`). Devolve o id do convite. NUNCA inclui `uid` (a Rule nega o
 * create com `uid`). Erro `permission-denied` (não é gestor / papel inválido)
 * sobe INTACTO para a UI (§2.12).
 */
export async function convidarMembroEquipe(
  db: Firestore,
  eventoId: string,
  tenantId: string,
  input: ConvidarMembroEquipeInput
): Promise<string> {
  const ref = doc(collection(db, 'eventos', eventoId, 'equipe'));
  const data: Record<string, unknown> = {
    tenantId,
    eventoId,
    nome: input.nome,
    papel: input.papel,
    status: 'convidado',
    convidadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };
  if (typeof input.email === 'string' && input.email.length > 0) {
    data['email'] = input.email;
  }
  await setDoc(ref, data);
  return ref.id;
}

/**
 * Remove um CONVITE pendente (a Rule só permite `delete` de docs com
 * `status == 'convidado'`). Membro ATIVO é revogado pela Function
 * `setClaimsEquipe` com `papel: null` (revoga claims + marca o doc), nunca por
 * delete direto — este caminho é só para o convite que ainda não ativou.
 */
export async function removerConviteEquipe(
  db: Firestore,
  eventoId: string,
  membroId: string
): Promise<void> {
  await deleteDoc(doc(db, 'eventos', eventoId, 'equipe', membroId));
}
