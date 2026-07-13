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
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import { parseMembroEquipe, type MembroEquipe, type PapelEvento } from '@leela/core';

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
