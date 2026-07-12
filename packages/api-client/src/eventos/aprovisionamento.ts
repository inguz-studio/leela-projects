// =============================================================================
// packages/api-client/src/eventos/aprovisionamento.ts
//
// Leitura de `eventos/{eventoId}/aprovisionamento/{sku}` (LEELA-S210-T2 ·
// FABLE-D). SÓ leitura: os ∑ (RN-224) são recomputados pela Function
// `agregarEstoque` e o estado (RN-226) avança pela callable
// `transicaoAprovisionamento` — as Rules negam TODA escrita de cliente.
// Leitura exige papel de gestão (owner/staff do tenant dono — Rules).
// =============================================================================

import {
  collection,
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_APROVISIONAMENTO,
  parseAprovisionamento,
  type Aprovisionamento,
} from '@leela/core';

/**
 * Lista o aprovisionamento por SKU de um evento, ordenado pelo docId
 * (`itemId__tamanho` — agrupa os tamanhos de cada item). A tela de Estoque
 * (S210-T4) LÊ este agregado — nunca varre inscritos no cliente (RN-224).
 */
export async function listarAprovisionamento(
  db: Firestore,
  eventoId: string
): Promise<Aprovisionamento[]> {
  const snap = await getDocs(
    query(
      collection(db, 'eventos', eventoId, COLECAO_APROVISIONAMENTO),
      orderBy('__name__')
    )
  );
  return snap.docs.map((d) => parseAprovisionamento(d.id, d.data()));
}
