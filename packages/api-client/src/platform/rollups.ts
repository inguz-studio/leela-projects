// =============================================================================
// packages/api-client/src/platform/rollups.ts
//
// Leitura do doc de rollups macro da plataforma (LEELA-S1605-T3 · RN-409).
//
// O dashboard macro LÊ `platform/rollups` (agregação cross-tenant computada
// por Cloud Function); NUNCA varre `tenants/*` no cliente. A Security Rule
// garante que só platform_admin lê este doc.
// =============================================================================

import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import { PLATFORM_ROLLUPS_DOC_PATH, type PlatformRollups } from '@leela/core';

/**
 * Lê o doc de rollups macro (`platform/rollups`).
 * Retorna null quando a Function ainda não rodou (sem agregado computado).
 * Rules: só platform_admin lê (RN-409).
 */
export async function getPlatformRollups(
  db: Firestore
): Promise<PlatformRollups | null> {
  const snap = await getDoc(doc(db, PLATFORM_ROLLUPS_DOC_PATH));
  if (!snap.exists()) return null;
  return snap.data() as PlatformRollups;
}

// ---------------------------------------------------------------------------
// Recompute manual (ADMIN-VISAO onda 2 · S1613-T4 · RN-538)
// ---------------------------------------------------------------------------

/** O que o callable devolve depois de reescrever `platform/rollups`. */
export interface RecomputePlatformRollupsResult {
  success: boolean;
  gmvTotal: number;
  receitaLeelaTotal: number;
  tenantsAtivos: number;
  /** Nº de tenants agregados (todas as linhas de saúde). */
  tenantsTotal: number;
}

/**
 * Dispara o recompute de `platform/rollups` na hora (`recomputePlatformRollups`
 * — a Function existe desde a S1605-T3 e o agendamento horário entrou na onda 1
 * da ADMIN-VISAO).
 *
 * POR QUE O BOTÃO EXISTE mesmo com o cron de hora em hora: a RN-538 tem duas
 * metades, e a segunda é o critério de aceite da S1613 — "dado que o rollup
 * está obsoleto, quando olho a tela, então consigo disparar o recompute dali
 * mesmo e o número atualiza". O agendamento tira a dependência de lembrança; o
 * botão tira a espera de até uma hora quando o retrato já está velho na cara do
 * operador.
 *
 * É recompute INTEGRAL e idempotente por construção (`set()` completo sobre a
 * varredura de `tenants`), então clicar duas vezes não conta nada em dobro.
 *
 * Rules/guarda: só `platform_admin` (RN-409); qualquer outro papel recebe
 * `functions/permission-denied`.
 */
export async function recomputePlatformRollups(
  functions: Functions
): Promise<RecomputePlatformRollupsResult> {
  const call = httpsCallable<void, RecomputePlatformRollupsResult>(
    functions,
    'recomputePlatformRollups'
  );
  return (await call()).data;
}
