// =============================================================================
// packages/api-client/src/eventos/cronograma.ts
//
// Leitura do cronograma de entrega + faixa de chips do evento
// (LEELA-FABLE-F-T1 · S204/FRENTE F). SÓ leitura — os campos são editados
// pelo organizador via write direto no doc do evento (Rules validam shape)
// e vivem EMBUTIDOS no doc: uma leitura O(1) serve o banner do balcão.
//
// `parseEvento` (core) já valida fail-fast e devolve as janelas na ordem
// canônica (dia, horaInicio) — este helper apenas projeta o recorte que a
// tela do balcão (F-T2) consome.
// =============================================================================

import { doc, getDoc, type Firestore } from 'firebase/firestore';
import {
  parseEvento,
  type FaixaChips,
  type JanelaEntrega,
} from '@leela/core';

/** Recorte do evento consumido pelo balcão (F-T2): cronograma + faixa. */
export interface CronogramaEntregaEvento {
  /** Janelas na ordem canônica (dia, horaInicio) — [] quando não configurado */
  janelas: JanelaEntrega[];
  /** Faixa do lote de chips — null quando não configurada */
  faixaChips: FaixaChips | null;
}

/**
 * Lê o cronograma de entrega do evento pelo slug (docId = slug — O(1)).
 * Retorna null quando o EVENTO não existe; evento sem cronograma retorna
 * `{ janelas: [], faixaChips: null }` (estado honesto — a UI decide o
 * EmptyState). A Security Rule garante leitura só do tenant dono/admin.
 */
export async function getCronogramaEntrega(
  db: Firestore,
  slug: string
): Promise<CronogramaEntregaEvento | null> {
  const snap = await getDoc(doc(db, 'eventos', slug));
  if (!snap.exists()) return null;
  const evento = parseEvento(snap.id, snap.data());
  return {
    janelas: evento.janelasEntrega ?? [],
    faixaChips: evento.faixaChips ?? null,
  };
}
