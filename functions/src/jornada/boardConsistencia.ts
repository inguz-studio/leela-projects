// =============================================================================
// functions/src/jornada/boardConsistencia.ts
//
// Materialização do BOARD DE CONSISTÊNCIA (LEELA-S1308-T3 · E13 adiantado ·
// Onda 2 T2-L2 — decisão 2: board ético anti-streak, NUNCA ranking por
// volume bruto).
//
// Doc: `clubes/{c}/desafios/{d}/board/current` — top-N (BOARD_TOP_N) por
// RECONTAGEM sobre `participantes` (ordem: dias ativos DESC → pontos DESC →
// atletaId ASC — @leela/core ordenarPorConsistencia é a fonte única).
//
// Atualizado no fan-out de onRegistroWrite (recomputarParticipacao chama
// AQUI depois de agregar) — registrar ação nova recomputa o board no mesmo
// ciclo. Idempotente: recompute total, substituição total do doc.
//
// Rules: leitura por membro/visibilidade (espelha participantes); escrita
// de cliente NEGADA (board forjado = fraude de reconhecimento social).
// =============================================================================

import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  BOARD_TOP_N,
  montarBoardConsistencia,
  type ParticipanteBoard,
} from '@leela/core';

type Db = admin.firestore.Firestore;

/** Shape do doc `board/current` (contrato das telas E13 — Onda 3). */
export interface BoardConsistenciaDoc {
  clubeId: string;
  desafioId: string;
  /** Top-N ordenado por consistência (posições 1-based). */
  entradas: ReturnType<typeof montarBoardConsistencia>;
  /** Nº total de participantes considerados (inclusive fora do top-N). */
  totalParticipantes: number;
  topN: number;
}

/**
 * Recompute total do board a partir de `participantes` (recontagem —
 * idempotente). Substituição total do doc `board/current`.
 */
export async function recomputarBoardConsistencia(
  db: Db,
  clubeId: string,
  desafioId: string
): Promise<void> {
  const desafioRef = db
    .collection('clubes').doc(clubeId)
    .collection('desafios').doc(desafioId);

  const participantesSnap = await desafioRef.collection('participantes').get();

  const participantes: ParticipanteBoard[] = participantesSnap.docs.map((d) => ({
    atletaId: (d.get('atletaId') as string) ?? d.id,
    diasAtivos:
      typeof d.get('diasAtivos') === 'number' ? (d.get('diasAtivos') as number) : 0,
    pontos: typeof d.get('pontos') === 'number' ? (d.get('pontos') as number) : 0,
  }));

  const doc: BoardConsistenciaDoc = {
    clubeId,
    desafioId,
    entradas: montarBoardConsistencia(participantes),
    totalParticipantes: participantes.length,
    topN: BOARD_TOP_N,
  };

  // Substituição total (set sem merge) + carimbo de auditoria
  await desafioRef.collection('board').doc('current').set({
    ...doc,
    atualizadoEm: FieldValue.serverTimestamp(),
  });
}
