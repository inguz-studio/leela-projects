// =============================================================================
// functions/src/eventos/vincularChip.ts
//
// Cloud Function callable: vincula `chipNumero` ao inscrito no balcão
// (LEELA-S204-T2 · E03 · RN-203/206/207).
//
// Contrato:
//   vincularChip({ eventoId, inscritoId, chip, sobrescrever? })
//     -> { ok: true, jaVinculado?, reatribuido? }
//      | { ok: false, conflito: { inscritoId, atletaNome } }
//
// Invariantes (aplicadas DENTRO de uma transação — chip é recurso exclusivo):
//   - RN-207: evento com usaChip=false NÃO vincula chip (failed-precondition;
//     a UI suprime o passo — chamada direta é erro de programação, não no-op
//     silencioso);
//   - RN-206: chip já em OUTRO inscrito → retorna `conflito` SEM sobrescrever;
//     com `sobrescrever=true` reatribui atomicamente (limpa o ocupante e
//     grava no alvo na MESMA transação — o chip nunca fica em dois atletas);
//   - idempotente: chip já vinculado ao PRÓPRIO inscrito → { ok, jaVinculado }
//     sem escrita (retry de rede não muda estado);
//   - só inscrito `confirmado` é atendido (pendente/cancelado → erro);
//   - escrita de `chipNumero` é EXCLUSIVA desta Function: a Security Rule
//     nega chip no create (só null) e no update do cliente — sem isso a
//     detecção de conflito seria contornável por escrita direta.
//
// A transação usa query `where('chipNumero','==',chip)` DENTRO do tx.get —
// duas tentativas concorrentes do mesmo chip serializam (a perdedora retenta
// e enxerga o vínculo da vencedora).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  classificarVinculoChip,
  normalizarChip,
  podeAtender,
  type StatusInscrito,
} from '@leela/core';
import type { AuthClaims } from '@leela/core';
import { assertTenantAtivo, assertTenantWriter, type EventoCaller } from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface VincularChipInput {
  eventoId: string;
  inscritoId: string;
  chip: string;
  /** RN-206 — reatribui chip em conflito (após ConfirmModal na UI) */
  sobrescrever?: boolean;
}

export type VincularChipResult =
  | { ok: true; chip: string; jaVinculado?: boolean; reatribuido?: boolean }
  | { ok: false; conflito: { inscritoId: string; atletaNome: string } };

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function vincularChipCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<VincularChipResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<VincularChipInput> | null;
  const eventoId = input?.eventoId;
  const inscritoId = input?.inscritoId;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }
  if (typeof inscritoId !== 'string' || inscritoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"inscritoId" é obrigatório.');
  }
  const chip = normalizarChip(input?.chip);
  if (chip === null) {
    throw new https.HttpsError(
      'invalid-argument',
      '"chip" inválido — alfanumérico/hífen, até 32 caracteres (RN-203).'
    );
  }
  const sobrescrever = input?.sobrescrever === true;

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(eventoId);
  const inscritosCol = eventoRef.collection('inscritos');
  const alvoRef = inscritosCol.doc(inscritoId);

  const resultado = await db.runTransaction<VincularChipResult>(async (tx) => {
    const [eventoSnap, alvoSnap, ocupantesSnap] = await Promise.all([
      tx.get(eventoRef),
      tx.get(alvoRef),
      tx.get(inscritosCol.where('chipNumero', '==', chip).limit(2)),
    ]);

    if (!eventoSnap.exists) {
      throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
    }
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }
    if (eventoSnap.get('usaChip') !== true) {
      throw new https.HttpsError(
        'failed-precondition',
        'Evento não usa chip — passo de chip suprimido (RN-207).'
      );
    }

    if (!alvoSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Inscrito '${inscritoId}' não existe no evento '${eventoId}'.`
      );
    }
    const statusAlvo = alvoSnap.get('status') as StatusInscrito;
    if (!podeAtender({ status: statusAlvo })) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${inscritoId}' está '${statusAlvo}' — só confirmado é atendido no balcão.`
      );
    }

    const ocupante = ocupantesSnap.docs[0] ?? null;
    const vinculo = classificarVinculoChip(ocupante?.id ?? null, inscritoId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (vinculo.tipo === 'ja_do_inscrito') {
      return { ok: true, chip, jaVinculado: true }; // idempotente — sem escrita
    }

    if (vinculo.tipo === 'conflito') {
      if (!sobrescrever) {
        // RN-206: não sobrescreve sem confirmação — devolve o ocupante
        const atletaNome = (ocupante?.get('atletaNome') as string) ?? '';
        return {
          ok: false,
          conflito: { inscritoId: vinculo.ocupanteId, atletaNome },
        };
      }
      // Reatribuição confirmada: limpa o ocupante e grava no alvo — atômico
      tx.update(inscritosCol.doc(vinculo.ocupanteId), {
        chipNumero: null,
        atualizadoEm: now,
      });
      tx.update(alvoRef, { chipNumero: chip, atualizadoEm: now });
      return { ok: true, chip, reatribuido: true };
    }

    // Chip livre
    tx.update(alvoRef, { chipNumero: chip, atualizadoEm: now });
    return { ok: true, chip };
  });

  // Sem PII no log — só ids (LGPD)
  logger.info('chip_vinculo', {
    tenantId,
    eventoId,
    inscritoId,
    ok: resultado.ok,
    reatribuido: resultado.ok ? resultado.reatribuido === true : false,
    conflito: !resultado.ok,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `vincularChip` — callable do balcão (S204-T1 consome). */
export const vincularChip = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return vincularChipCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
