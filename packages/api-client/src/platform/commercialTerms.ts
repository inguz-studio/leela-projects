// =============================================================================
// packages/api-client/src/platform/commercialTerms.ts
//
// Leitura/escrita dos termos comerciais do tenant (LEELA-S1602-T1).
//
// Leitura: tenant-membro (read-only) OU platform_admin — Rules enforçam.
// Escrita: SÓ platform_admin (RN-404) — a Rule nega qualquer outro papel.
//
// Versionamento (enforçado pelas Rules):
//   - create de `current` exige versao == 1;
//   - update de `current` exige versao == anterior + 1;
//   - cada save grava snapshot imutável `commercialTerms/v{versao}`.
// =============================================================================

import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  validateCommercialTerms,
  type CommercialTerms,
  type CommercialTermsInput,
} from '@leela/core';

/** Caminho do doc vigente de termos do tenant. */
function currentTermsRef(db: Firestore, tenantId: string) {
  return doc(db, 'tenants', tenantId, 'commercialTerms', 'current');
}

/**
 * Lê os termos comerciais vigentes do tenant.
 * Rules: tenant-membro lê os PRÓPRIOS termos; platform_admin lê qualquer um.
 */
export async function getCommercialTerms(
  db: Firestore,
  tenantId: string
): Promise<CommercialTerms | null> {
  const snap = await getDoc(currentTermsRef(db, tenantId));
  if (!snap.exists()) return null;
  return snap.data() as CommercialTerms;
}

/**
 * Salva os termos comerciais do tenant (SÓ platform_admin — RN-404).
 *
 * Valida localmente (mesma validação pura do core), calcula o bump de versão
 * (anterior + 1) e grava `current` + snapshot `v{versao}` num batch atômico.
 * A Security Rule revalida ranges e o bump no servidor.
 *
 * LOCK OTIMISTA (review antagonista TAXAFLEX F5): quando o chamador informa
 * `expectedVersion` (a versão que ele CARREGOU), o save é recusado se o
 * termo vigente mudou no meio-tempo (2º admin, aplicarPlano) — sem isso um
 * editor com cópias stale dos campos preservados sobrescreveria a mudança
 * concorrente em silêncio (lost-update em doc de dinheiro).
 *
 * @throws Error se o payload for inválido OU se a versão vigente divergir
 *         de `expectedVersion` (conflito de edição concorrente).
 * @returns a versão gravada.
 */
export async function saveCommercialTerms(
  db: Firestore,
  tenantId: string,
  input: CommercialTermsInput,
  adminUid: string,
  expectedVersion?: number
): Promise<number> {
  const errors = validateCommercialTerms(input);
  if (errors.length > 0) {
    throw new Error(`Termos comerciais inválidos: ${errors.join(' ')}`);
  }

  const currentSnap = await getDoc(currentTermsRef(db, tenantId));
  const previousVersion = currentSnap.exists()
    ? ((currentSnap.data() as CommercialTerms).versao ?? 0)
    : 0;
  if (expectedVersion !== undefined && previousVersion !== expectedVersion) {
    throw new Error(
      `Termos mudaram enquanto você editava (vigente v${previousVersion}, ` +
        `carregado v${expectedVersion}) — recarregue e aplique de novo.`
    );
  }
  const versao = previousVersion + 1;

  const payload = {
    ...input,
    versao,
    atualizadoPor: adminUid,
    atualizadoEm: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(currentTermsRef(db, tenantId), payload);
  // Snapshot imutável de auditoria — Rules bloqueiam update/delete de v*
  batch.set(
    doc(db, 'tenants', tenantId, 'commercialTerms', `v${versao}`),
    payload
  );
  await batch.commit();

  return versao;
}
