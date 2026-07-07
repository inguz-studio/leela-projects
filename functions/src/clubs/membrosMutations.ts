// =============================================================================
// functions/src/clubs/membrosMutations.ts
//
// Mutations de membros do clube (LEELA-E05 · contrato das telas L3):
//   - removerMembro(clubeId, membroId)          — tela de membros, §2.15
//   - transferirPropriedade(clubeId, membroId)  — tela de membros, §2.15
//
// Por que Function (e não write direto do cliente):
//   - removerMembro: guarda "owner não é removível" + recontagem imediata do
//     agregado ∑ qtdMembrosAtivos (o cliente não escreve agregado — WIKI §4);
//   - transferirPropriedade: troca ATÔMICA de 3 docs (clube.ownerId, papel do
//     novo owner, rebaixamento do owner anterior) — impossível de garantir
//     com writes soltos do cliente sob Rules.
//
// Segurança (nunca confia no cliente):
//   - papel de escrita do tenant (tenant_owner | tenant_staff) via claims;
//   - clube precisa pertencer ao tenant do caller (cross-tenant nega);
//   - tenant suspenso não opera (RN-402 — Admin SDK bypassa Rules, então a
//     Function reverifica, mesmo padrão de criarEvento).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import type { AuthClaims } from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { recontarMembrosAtivos } from './membrosAggregates';

/** Caller autenticado (uid + claims) — mesmo shape das Functions de evento. */
export type ClubsCaller = EventoCaller;

// ---------------------------------------------------------------------------
// Contratos (espelhados em packages/api-client/src/clubs.ts)
// ---------------------------------------------------------------------------

export interface RemoverMembroInput {
  clubeId: string;
  membroId: string;
}

export interface RemoverMembroResult {
  removido: true;
}

export interface TransferirPropriedadeInput {
  clubeId: string;
  membroId: string;
}

export interface TransferirPropriedadeResult {
  /** uid (atletaId) do novo owner do clube */
  novoOwnerUid: string;
  /** membroId do owner anterior rebaixado para admin — null se não havia */
  ownerAnteriorMembroId: string | null;
}

// ---------------------------------------------------------------------------
// Guardas compartilhadas
// ---------------------------------------------------------------------------

function assertInputMembros(raw: unknown): RemoverMembroInput {
  const input = raw as Partial<RemoverMembroInput> | null | undefined;
  if (
    !input ||
    typeof input.clubeId !== 'string' ||
    input.clubeId.length === 0 ||
    typeof input.membroId !== 'string' ||
    input.membroId.length === 0
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      'Input inválido: clubeId e membroId são obrigatórios.'
    );
  }
  return { clubeId: input.clubeId, membroId: input.membroId };
}

/**
 * Clube existe e pertence ao tenant do caller. Retorna a ref do clube.
 * Cross-tenant devolve permission-denied (não vaza existência de docs).
 */
export async function assertClubeDoTenant(
  db: admin.firestore.Firestore,
  clubeId: string,
  tenantId: string
): Promise<admin.firestore.DocumentReference> {
  const clubeRef = db.collection('clubes').doc(clubeId);
  const snap = await clubeRef.get();
  if (!snap.exists || snap.get('tenantId') !== tenantId) {
    throw new https.HttpsError(
      'permission-denied',
      `Clube '${clubeId}' não pertence ao seu tenant.`
    );
  }
  return clubeRef;
}

// ---------------------------------------------------------------------------
// removerMembro
// ---------------------------------------------------------------------------

/**
 * Remove um membro do clube e reconta o agregado ∑ qtdMembrosAtivos.
 * O OWNER nunca é removível — transfira a propriedade antes.
 *
 * TRANSACIONAL (fix #09 do review Onda1): o check "não é owner" e o delete
 * rodam na MESMA runTransaction — o read-then-delete antigo corria contra
 * `transferirPropriedade` (o membro podia virar owner entre o check e o
 * delete, deixando o clube com ownerId dangling e zero owners, em
 * silêncio). Promoção concorrente invalida a tx; o retry revê o papel e
 * devolve failed-precondition.
 */
export async function removerMembroCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: ClubsCaller
): Promise<RemoverMembroResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const input = assertInputMembros(rawInput);
  await assertTenantAtivo(db, tenantId);
  const clubeRef = await assertClubeDoTenant(db, input.clubeId, tenantId);

  const membroRef = clubeRef.collection('membros').doc(input.membroId);

  await db.runTransaction(async (tx) => {
    const membroSnap = await tx.get(membroRef);
    if (!membroSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Membro '${input.membroId}' não existe no clube '${input.clubeId}'.`
      );
    }
    if (membroSnap.get('papel') === 'owner') {
      throw new https.HttpsError(
        'failed-precondition',
        'O owner do clube não pode ser removido — transfira a propriedade antes.'
      );
    }
    tx.delete(membroRef);
  });

  await recontarMembrosAtivos(db, input.clubeId);

  return { removido: true };
}

// ---------------------------------------------------------------------------
// transferirPropriedade
// ---------------------------------------------------------------------------

/**
 * Transfere a propriedade do clube para um membro existente, em transação:
 * clube.ownerId ← membro.atletaId; membro.papel ← 'owner'; owner(s)
 * anterior(es) rebaixados para 'admin'. Idempotência: transferir para quem
 * já é owner devolve failed-precondition (nada muda).
 */
export async function transferirPropriedadeCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: ClubsCaller
): Promise<TransferirPropriedadeResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const input = assertInputMembros(rawInput);
  await assertTenantAtivo(db, tenantId);
  const clubeRef = await assertClubeDoTenant(db, input.clubeId, tenantId);

  const novoOwnerRef = clubeRef.collection('membros').doc(input.membroId);

  return db.runTransaction(async (tx) => {
    // Leituras ANTES das escritas (contrato de transação Firestore)
    const novoOwnerSnap = await tx.get(novoOwnerRef);
    if (!novoOwnerSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Membro '${input.membroId}' não existe no clube '${input.clubeId}'.`
      );
    }
    if (novoOwnerSnap.get('papel') === 'owner') {
      throw new https.HttpsError(
        'failed-precondition',
        'Este membro já é o owner do clube.'
      );
    }
    const atletaId = novoOwnerSnap.get('atletaId') as string | undefined;
    if (!atletaId) {
      throw new https.HttpsError(
        'failed-precondition',
        `Membro '${input.membroId}' não tem atletaId — dado inconsistente.`
      );
    }

    const ownersAtuais = await tx.get(
      clubeRef.collection('membros').where('papel', '==', 'owner')
    );

    const now = FieldValue.serverTimestamp();
    tx.update(clubeRef, { ownerId: atletaId, atualizadoEm: now });
    tx.update(novoOwnerRef, { papel: 'owner', atualizadoEm: now });

    let ownerAnteriorMembroId: string | null = null;
    for (const doc of ownersAtuais.docs) {
      if (doc.id === input.membroId) continue;
      ownerAnteriorMembroId = doc.id;
      tx.update(doc.ref, { papel: 'admin', atualizadoEm: now });
    }

    return { novoOwnerUid: atletaId, ownerAnteriorMembroId };
  });
}

// ---------------------------------------------------------------------------
// Callables (wrappers finos — padrão criarEvento)
// ---------------------------------------------------------------------------

export const removerMembro = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return removerMembroCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});

export const transferirPropriedade = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return transferirPropriedadeCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
