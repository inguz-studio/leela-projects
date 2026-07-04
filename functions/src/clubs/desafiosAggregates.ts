// =============================================================================
// functions/src/clubs/desafiosAggregates.ts
//
// Lógica de agregados/consistência de `clubes/{clubId}/desafios` (S105-T1).
// Fecha a pendência herdada do E05-L1: `clubes.qtdDesafiosAtivos` existia nas
// Rules/seed desde S101-T1 mas não tinha Function mantenedora.
//
// Invariantes (RN-110 + modelo-de-dados):
//   - `clubes.qtdDesafiosAtivos` = nº de desafios com status == 'ativo'.
//     Mantido por RECONTAGEM (count()), nunca por increment: reprocessar o
//     mesmo evento (retry de trigger at-least-once) produz o MESMO resultado
//     — idempotente por construção (mesmo padrão de membrosAggregates).
//   - `desafios.tenantId` é propagado do clube pai (ADR-009): divergência é
//     corrigida aqui (o pai é a fonte de verdade).
//   - Agregados ∑ do desafio (qtdParticipantes, progressoPct,
//     progressoPorPilar) NÃO nascem aqui: dependem de registros de ação
//     (E13 — App do Atleta). Rules já os protegem do cliente.
// =============================================================================

import type { firestore } from 'firebase-admin';

// ---------------------------------------------------------------------------
// Sincronização de UM desafio (usada pelo trigger onWrite)
// ---------------------------------------------------------------------------

/**
 * Garante `tenantId` propagado do clube pai num desafio (ADR-009).
 * Retorna true se corrigiu (o write re-dispara o trigger, que na 2ª passada
 * não encontra nada a corrigir — término garantido).
 */
export async function sincronizarDesafio(
  db: firestore.Firestore,
  clubId: string,
  desafioId: string
): Promise<boolean> {
  const clubeRef = db.collection('clubes').doc(clubId);
  const desafioRef = clubeRef.collection('desafios').doc(desafioId);

  const [clubeSnap, desafioSnap] = await Promise.all([
    clubeRef.get(),
    desafioRef.get(),
  ]);

  if (!desafioSnap.exists || !clubeSnap.exists) return false;

  const tenantDoClube = clubeSnap.get('tenantId') as string | undefined;
  if (!tenantDoClube || desafioSnap.get('tenantId') === tenantDoClube) {
    return false;
  }

  await desafioRef.update({ tenantId: tenantDoClube });
  return true;
}

// ---------------------------------------------------------------------------
// Recontagem do agregado ∑ qtdDesafiosAtivos
// ---------------------------------------------------------------------------

/**
 * Reconta desafios com status 'ativo' e grava `qtdDesafiosAtivos` se mudou.
 * Idempotente: recontar N vezes produz o mesmo valor (nada de increment).
 * Retorna true se o agregado foi corrigido.
 */
export async function recontarDesafiosAtivos(
  db: firestore.Firestore,
  clubId: string
): Promise<boolean> {
  const clubeRef = db.collection('clubes').doc(clubId);
  const clubeSnap = await clubeRef.get();
  if (!clubeSnap.exists) return false; // clube deletado — nada a agregar

  const countSnap = await clubeRef
    .collection('desafios')
    .where('status', '==', 'ativo')
    .count()
    .get();
  const total = countSnap.data().count;

  if (clubeSnap.get('qtdDesafiosAtivos') === total) return false;

  await clubeRef.update({ qtdDesafiosAtivos: total });
  return true;
}
