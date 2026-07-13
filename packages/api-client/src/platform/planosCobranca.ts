// =============================================================================
// packages/api-client/src/platform/planosCobranca.ts
//
// Planos de cobrança da plataforma (LEELA-T2-L4 · CB-T1/CB-T2).
//
// CRUD do plano: write DIRETO do client SDK — as Rules exigem
// platform_admin em READ e WRITE (`planosCobranca/{planoId}` é catálogo
// privado da plataforma; tenant não enxerga).
//
// APLICAR plano: SEMPRE via callable `aplicarPlano` (CB-T2) — a estampa
// nos `commercialTerms/current` do tenant é versionada (bump + snapshot
// v{n}, mecanismo S1602-T1) e NUNCA sai do cliente (RN-404).
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import {
  PLANOS_COBRANCA_COLLECTION,
  validarPlanoCobranca,
  type PlanoCobranca,
  type PlanoCobrancaInput,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Leitura (SÓ platform_admin — Rules negam qualquer outro papel)
// ---------------------------------------------------------------------------

/** Lista os planos nomeados (ordenados por nome). */
export async function listPlanosCobranca(db: Firestore): Promise<PlanoCobranca[]> {
  const snap = await getDocs(
    query(collection(db, PLANOS_COBRANCA_COLLECTION), orderBy('nome'))
  );
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<PlanoCobranca, 'id'>),
    id: d.id,
  }));
}

/** Lê um plano pelo id. */
export async function getPlanoCobranca(
  db: Firestore,
  planoId: string
): Promise<PlanoCobranca | null> {
  const snap = await getDoc(doc(db, PLANOS_COBRANCA_COLLECTION, planoId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<PlanoCobranca, 'id'>), id: snap.id };
}

// ---------------------------------------------------------------------------
// Escrita (SÓ platform_admin)
// ---------------------------------------------------------------------------

/**
 * Cria/edita um plano nomeado. Valida com a MESMA validação pura do core
 * (a Rule revalida shape/ranges no servidor). `criadoEm` só no create.
 * @throws Error com a lista de erros quando o payload é inválido.
 */
export async function savePlanoCobranca(
  db: Firestore,
  planoId: string,
  input: PlanoCobrancaInput
): Promise<void> {
  const erros = validarPlanoCobranca(input);
  if (erros.length > 0) {
    throw new Error(`Plano de cobrança inválido: ${erros.join(' ')}`);
  }

  const ref = doc(db, PLANOS_COBRANCA_COLLECTION, planoId);
  const atual = await getDoc(ref);

  const payload: Record<string, unknown> = {
    id: planoId,
    nome: input.nome,
    tabelaTaxasParcela: input.tabelaTaxasParcela,
    taxaPix: input.taxaPix,
    taxaCartaoAVista: input.taxaCartaoAVista,
    saasMonthlyFee: input.saasMonthlyFee,
    atualizadoEm: serverTimestamp(),
  };
  if (!atual.exists()) payload['criadoEm'] = serverTimestamp();

  await setDoc(ref, payload, { merge: true });
}

// ---------------------------------------------------------------------------
// aplicarPlano — estampa versionada nos termos do tenant (CB-T2)
// ---------------------------------------------------------------------------

export interface AplicarPlanoInput {
  tenantId: string;
  planoId: string;
}

export interface AplicarPlanoResult {
  tenantId: string;
  planoId: string;
  /** Versão dos termos após aplicar (== anterior quando replay). */
  versao: number;
  /** true = valores idênticos já estampados — SEM novo bump (no-op). */
  replay: boolean;
}

/**
 * Aplica um plano ao tenant via Cloud Function `aplicarPlano` (SÓ
 * platform_admin — enforçado no servidor). Aplicar = ESTAMPA snapshot
 * versionado (sem vínculo vivo); reaplicar valores idênticos = no-op.
 */
export async function aplicarPlano(
  functions: Functions,
  input: AplicarPlanoInput
): Promise<AplicarPlanoResult> {
  const call = httpsCallable<AplicarPlanoInput, AplicarPlanoResult>(
    functions,
    'aplicarPlano'
  );
  return (await call(input)).data;
}
