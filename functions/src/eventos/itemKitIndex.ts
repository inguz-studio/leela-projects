// =============================================================================
// functions/src/eventos/itemKitIndex.ts
//
// Mantém o índice inverso desnormalizado "usado em: [kits]" dos itens de kit
// (LEELA-S205-T1 · RN-215).
//
// Fonte de verdade do N:N Kit↔Item: `itensKit/{itemId}.kits[]` (ids de kit).
// Este módulo recomputa `usadoEm` (kitId + nome desnormalizado) a partir da
// fonte, em dois gatilhos:
//   1. onWrite de `itensKit/{itemId}`      — item mudou seus kits;
//   2. onWrite de `eventos/{e}/kits/{k}`   — kit renomeado/criado/deletado.
//
// IDEMPOTENTE: o sync recomputa do zero e SÓ escreve quando o valor difere
// (comparação profunda) — reprocessar não duplica nem oscila. O write do
// próprio sync redispara o gatilho 1, que converge no passo seguinte (no-op).
// =============================================================================

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { computeUsadoEm, type UsadoEmKit } from '@leela/core';

type Db = admin.firestore.Firestore;

/** Igualdade profunda de índices (ordem importa — ordem de `kits[]`). */
function usadoEmIgual(a: UsadoEmKit[] | undefined, b: UsadoEmKit[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every(
    (entry, i) => entry.kitId === b[i]?.kitId && entry.nome === b[i]?.nome
  );
}

/**
 * Recomputa e persiste `usadoEm` de UM item.
 * @returns true se escreveu (valor mudou); false se já estava correto (no-op).
 */
export async function syncItemUsadoEm(db: Db, itemId: string): Promise<boolean> {
  const itemRef = db.collection('itensKit').doc(itemId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) return false; // item deletado — nada a manter

  const item = itemSnap.data() ?? {};
  const eventoId = typeof item['eventoId'] === 'string' ? item['eventoId'] : '';
  const kitsIds = Array.isArray(item['kits'])
    ? (item['kits'] as unknown[]).filter((k): k is string => typeof k === 'string')
    : [];

  // Resolve nomes dos kits referenciados (kits deletados são omitidos)
  const nomesPorKitId: Record<string, string> = {};
  if (eventoId && kitsIds.length > 0) {
    const refs = kitsIds.map((kitId) =>
      db.collection('eventos').doc(eventoId).collection('kits').doc(kitId)
    );
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      const nome = snap.data()?.['nome'];
      if (snap.exists && typeof nome === 'string' && nome.length > 0) {
        nomesPorKitId[snap.id] = nome;
      }
    }
  }

  const usadoEm = computeUsadoEm(kitsIds, nomesPorKitId);
  const atual = item['usadoEm'] as UsadoEmKit[] | undefined;

  if (usadoEmIgual(atual, usadoEm)) return false; // idempotência — nada a fazer

  await itemRef.update({ usadoEm });
  return true;
}

/**
 * Ressincroniza TODOS os itens de um evento que referenciam um kit
 * (chamado quando o kit muda de nome, nasce ou morre).
 */
export async function syncItensDoKit(
  db: Db,
  eventoId: string,
  kitId: string
): Promise<number> {
  const itens = await db
    .collection('itensKit')
    .where('eventoId', '==', eventoId)
    .where('kits', 'array-contains', kitId)
    .get();

  let escritos = 0;
  for (const itemDoc of itens.docs) {
    if (await syncItemUsadoEm(db, itemDoc.id)) escritos++;
  }
  return escritos;
}

// ---------------------------------------------------------------------------
// Gatilhos (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/** Gatilho 1: item mudou → recomputa o próprio índice. */
export const onItemKitWrite = functions.firestore
  .document('itensKit/{itemId}')
  .onWrite(async (_change, context) => {
    const itemId = context.params['itemId'] as string;
    try {
      const escreveu = await syncItemUsadoEm(admin.firestore(), itemId);
      if (escreveu) {
        logger.info('itemKitIndex: usadoEm atualizado', { itemId });
      }
    } catch (err) {
      // Sem PII no log — só o id do item (LGPD)
      logger.error('itemKitIndex: falha ao sincronizar item', { itemId, err });
      throw err;
    }
  });

/** Gatilho 2: kit mudou (nome/criação/deleção) → ressincroniza itens que o usam. */
export const onKitWrite = functions.firestore
  .document('eventos/{eventoId}/kits/{kitId}')
  .onWrite(async (change, context) => {
    const eventoId = context.params['eventoId'] as string;
    const kitId = context.params['kitId'] as string;

    // Nome inalterado em update → índice não muda; evita varredura à toa.
    const antes = change.before.exists ? change.before.data() : undefined;
    const depois = change.after.exists ? change.after.data() : undefined;
    if (antes && depois && antes['nome'] === depois['nome']) return;

    try {
      const n = await syncItensDoKit(admin.firestore(), eventoId, kitId);
      if (n > 0) {
        logger.info('itemKitIndex: itens ressincronizados pós-kit', {
          eventoId,
          kitId,
          itens: n,
        });
      }
    } catch (err) {
      logger.error('itemKitIndex: falha ao ressincronizar kit', {
        eventoId,
        kitId,
        err,
      });
      throw err;
    }
  });
