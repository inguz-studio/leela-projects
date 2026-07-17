// =============================================================================
// packages/api-client/src/perfil.ts
//
// Wrappers do PERFIL público / link-in-bio do organizador (E17 · DN-1 · S1700).
//
//   - `salvarPerfil` — wrapper FINO da Cloud Function homônima (registry). A
//     escrita de `perfis/{handle}` é EXCLUSIVA da Function (Rules dizem
//     `write: if false`): unicidade global case-insensitive, imutabilidade do
//     handle e lista de reservados são invariantes de REGISTRO. O cliente só
//     tipa o contrato e transporta; erros (`invalid-argument`, `already-exists`,
//     `failed-precondition`) sobem INTACTOS para a UI traduzir.
//   - `getMeuPerfil` — leitura do perfil do PRÓPRIO tenant (editor do painel).
//     As Rules de `perfis/{handle}` liberam leitura a `isTenantMember` — o
//     organizador lê o próprio perfil para saber se está em modo criar (sem
//     perfil) ou editar (handle já registrado, IMUTÁVEL). Query por `tenantId`
//     (DN-1: no máximo 1 perfil por tenant nesta onda), limit 1.
// =============================================================================

import {
  collection,
  getDocs,
  limit as firestoreLimit,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import type { Perfil, PerfilInput } from '@leela/core';
import { COLECAO_PERFIS } from '@leela/core';

/**
 * Resultado do registry `salvarPerfil` — espelha o contrato da Function
 * (`functions/src/perfil/salvarPerfil.ts`). `criado` distingue o CREATE (1ª
 * gravação do handle) do UPDATE do perfil existente — a UI decide a copy.
 */
export interface SalvarPerfilResult {
  ok: true;
  /** Handle normalizado efetivamente gravado (docId de `perfis/{handle}`). */
  handle: string;
  /** true = perfil criado agora; false = update do perfil existente. */
  criado: boolean;
}

/**
 * Cria/atualiza o perfil do organizador (callable `salvarPerfil`). No CREATE o
 * `handle` do input vira o docId (imutável); no UPDATE ele é ignorado pelo
 * servidor (o perfil do tenant já tem handle). Validação de forma acontece nos
 * DOIS lados (core `validarPerfilInput` no formulário + na fronteira da
 * Function); aqui é só o transporte tipado.
 */
export async function salvarPerfil(
  functions: Functions,
  input: PerfilInput
): Promise<SalvarPerfilResult> {
  const callable = httpsCallable<PerfilInput, SalvarPerfilResult>(
    functions,
    'salvarPerfil'
  );
  const { data } = await callable(input);
  return data;
}

/**
 * Lê o perfil do tenant logado — `null` quando ainda não existe (modo criar).
 * Rules liberam a leitura a membros do tenant (o organizador lê o próprio).
 * DN-1: no máximo 1 perfil por tenant nesta onda → `limit(1)` é suficiente.
 */
export async function getMeuPerfil(
  db: Firestore,
  tenantId: string
): Promise<Perfil | null> {
  const snap = await getDocs(
    query(
      collection(db, COLECAO_PERFIS),
      where('tenantId', '==', tenantId),
      firestoreLimit(1)
    )
  );
  const doc = snap.docs[0];
  if (!doc) return null;
  return doc.data() as Perfil;
}
