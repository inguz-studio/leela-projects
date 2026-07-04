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
