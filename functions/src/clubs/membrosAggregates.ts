// =============================================================================
// functions/src/clubs/membrosAggregates.ts
//
// Lógica de agregados/consistência de `clubes/{clubId}/membros` (S103-T1).
// Separada dos triggers para ser testável no Emulator via Admin SDK direto.
//
// Invariantes (RN-102 + modelo-de-dados):
//   - `membros.status` é DERIVADO por data (derivarStatus em @leela/core);
//     o cliente nunca o escreve (Rules negam) — só estas rotinas (Admin SDK).
//   - `clubes.qtdMembrosAtivos` = nº de membros NÃO-inativos (ativo + novo).
//     Mantido por RECONTAGEM (count()), nunca por increment: reprocessar o
//     mesmo evento (retry de trigger) produz o MESMO resultado — idempotente
//     por construção.
//   - `membros.tenantId` é propagado do clube pai (ADR-009): divergência é
//     corrigida aqui (o pai é a fonte de verdade).
// =============================================================================

import type { firestore } from 'firebase-admin';
import { derivarStatus, type StatusMembro } from '@leela/core';

/** Estatísticas de uma varredura (cron/backfill) — para log e teste. */
export interface RecalculoStats {
  clubesVarridos: number;
  membrosAtualizados: number;
  clubesComAgregadoCorrigido: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateOrNull(value: unknown): Date | null {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate(): Date }).toDate();
  }
  return null;
}

/** Deriva o status de um doc de membro (RN-102). Null se faltar entrouEm. */
function derivarStatusDoDoc(
  data: FirebaseFirestore.DocumentData,
  agora: Date
): StatusMembro | null {
  const entrouEm = toDateOrNull(data['entrouEm']);
  if (!entrouEm) return null; // doc malformado — não inventa status
  const ultimaAtividadeEm = toDateOrNull(data['ultimaAtividadeEm']);
  return derivarStatus(entrouEm, ultimaAtividadeEm, agora);
}

// ---------------------------------------------------------------------------
// Sincronização de UM membro (usada pelo trigger onWrite)
// ---------------------------------------------------------------------------

/**
 * Garante `status` derivado e `tenantId` propagado num membro.
 * Retorna true se algum campo foi corrigido (o write re-dispara o trigger,
 * que na 2ª passada não encontra nada a corrigir — término garantido).
 */
export async function sincronizarMembro(
  db: firestore.Firestore,
  clubId: string,
  membroId: string,
  agora: Date = new Date()
): Promise<boolean> {
  const clubeRef = db.collection('clubes').doc(clubId);
  const membroRef = clubeRef.collection('membros').doc(membroId);

  const [clubeSnap, membroSnap] = await Promise.all([
    clubeRef.get(),
    membroRef.get(),
  ]);

  if (!membroSnap.exists) return false; // deletado entre o trigger e o get

  const data = membroSnap.data() ?? {};
  const patch: Record<string, unknown> = {};

  const statusDerivado = derivarStatusDoDoc(data, agora);
  if (statusDerivado && data['status'] !== statusDerivado) {
    patch['status'] = statusDerivado;
  }

  // tenantId do clube pai é a fonte de verdade (ADR-009)
  const tenantDoClube = clubeSnap.exists
    ? (clubeSnap.get('tenantId') as string | undefined)
    : undefined;
  if (tenantDoClube && data['tenantId'] !== tenantDoClube) {
    patch['tenantId'] = tenantDoClube;
  }

  if (Object.keys(patch).length === 0) return false;

  await membroRef.update(patch);
  return true;
}

// ---------------------------------------------------------------------------
// Recontagem do agregado ∑ qtdMembrosAtivos
// ---------------------------------------------------------------------------

/**
 * Reconta membros NÃO-inativos do clube e grava `qtdMembrosAtivos` se mudou.
 * Idempotente: recontar N vezes produz o mesmo valor (nada de increment).
 * Retorna true se o agregado foi corrigido.
 */
export async function recontarMembrosAtivos(
  db: firestore.Firestore,
  clubId: string
): Promise<boolean> {
  const clubeRef = db.collection('clubes').doc(clubId);
  const clubeSnap = await clubeRef.get();
  if (!clubeSnap.exists) return false; // clube deletado — nada a agregar

  const countSnap = await clubeRef
    .collection('membros')
    .where('status', 'in', ['ativo', 'novo'])
    .count()
    .get();
  const total = countSnap.data().count;

  if (clubeSnap.get('qtdMembrosAtivos') === total) return false;

  await clubeRef.update({ qtdMembrosAtivos: total });
  return true;
}

// ---------------------------------------------------------------------------
// Varredura completa (cron diário / backfill)
// ---------------------------------------------------------------------------

/**
 * Recalcula `status` de TODOS os membros de TODOS os clubes por data
 * (novo→ativo após 7d; ativo→inativo após 30d sem atividade — RN-102)
 * e reconta os agregados. Idempotente: 2ª varredura imediata não muda nada.
 */
export async function recalcularStatusMembrosCore(
  db: firestore.Firestore,
  agora: Date = new Date()
): Promise<RecalculoStats> {
  const stats: RecalculoStats = {
    clubesVarridos: 0,
    membrosAtualizados: 0,
    clubesComAgregadoCorrigido: 0,
  };

  // Itera clubes (evita collectionGroup — dispensa índice de grupo e mantém
  // a recontagem por clube no mesmo passo).
  const clubes = await db.collection('clubes').select().get();

  for (const clubeDoc of clubes.docs) {
    stats.clubesVarridos++;

    const membros = await clubeDoc.ref.collection('membros').get();
    let batch = db.batch();
    let pendentes = 0;

    for (const membroDoc of membros.docs) {
      const statusDerivado = derivarStatusDoDoc(membroDoc.data(), agora);
      if (statusDerivado && membroDoc.get('status') !== statusDerivado) {
        batch.update(membroDoc.ref, { status: statusDerivado });
        pendentes++;
        stats.membrosAtualizados++;
        if (pendentes === 400) {
          // Limite de 500 writes por batch — flush preventivo
          await batch.commit();
          batch = db.batch();
          pendentes = 0;
        }
      }
    }

    if (pendentes > 0) {
      await batch.commit();
    }

    if (await recontarMembrosAtivos(db, clubeDoc.id)) {
      stats.clubesComAgregadoCorrigido++;
    }
  }

  return stats;
}
