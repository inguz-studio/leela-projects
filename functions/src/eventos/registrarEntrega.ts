// =============================================================================
// functions/src/eventos/registrarEntrega.ts
//
// Cloud Function callable: fecha o atendimento do balcão — entrega o kit e
// registra presença (LEELA-S204-T2 · E03 · RN-205/207/222).
//
// Contrato: registrarEntrega({ eventoId, inscritoId }) -> { ok, jaRegistrado }
//
// RN-205: retirar o kit EQUIVALE a check-in — no balcão padrão os dois
// carimbos (`kitEntregueEm` + `checkinEm`) são setados JUNTOS, na mesma
// transação. Não existe check-in separado no fluxo do balcão (o caminho
// "kit antecipado → QR na largada seta só checkinEm" é S208/RN-222).
//
// Invariantes:
//   - IDEMPOTENTE: presença já registrada (`checkinEm` setado) → retorna
//     { ok, jaRegistrado: true } SEM tocar nos carimbos (reprocessar não
//     duplica nem altera timestamps — aceite explícito do lote);
//   - `sem_kit`: não há kit a retirar — grava SÓ `checkinEm` (presença);
//     `kitEntregueEm` fica ausente (semântica: nenhum kit foi entregue);
//   - RN-207 aplicada por omissão: o passo de chip não participa quando
//     `usaChip=false`; quando `usaChip=true`, fechar SEM chip vinculado é
//     failed-precondition (o stepper vincula chip ANTES de fechar — fechar
//     sem chip seria atleta correndo sem cronometragem, silenciosamente);
//   - só inscrito `confirmado` é atendido;
//   - carimbos são de escrita EXCLUSIVA de Function (Rules negam cliente).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { exigeChipParaFechar, podeAtender } from '@leela/core';
import type { AuthClaims, KitInscrito, StatusInscrito } from '@leela/core';
import { assertTenantAtivo, assertTenantWriter, type EventoCaller } from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface RegistrarEntregaInput {
  eventoId: string;
  inscritoId: string;
}

export interface RegistrarEntregaResult {
  ok: true;
  /** true quando a presença já estava registrada (retry idempotente) */
  jaRegistrado: boolean;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function registrarEntregaCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<RegistrarEntregaResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<RegistrarEntregaInput> | null;
  const eventoId = input?.eventoId;
  const inscritoId = input?.inscritoId;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }
  if (typeof inscritoId !== 'string' || inscritoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"inscritoId" é obrigatório.');
  }

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(eventoId);
  const inscritoRef = eventoRef.collection('inscritos').doc(inscritoId);

  const jaRegistrado = await db.runTransaction<boolean>(async (tx) => {
    const [eventoSnap, inscritoSnap] = await Promise.all([
      tx.get(eventoRef),
      tx.get(inscritoRef),
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
    if (!inscritoSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Inscrito '${inscritoId}' não existe no evento '${eventoId}'.`
      );
    }

    const status = inscritoSnap.get('status') as StatusInscrito;
    if (!podeAtender({ status })) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${inscritoId}' está '${status}' — só confirmado retira kit.`
      );
    }

    // Idempotência: presença registrada = atendimento fechado (RN-205)
    if (inscritoSnap.get('checkinEm') != null) {
      return true;
    }

    const usaChip = eventoSnap.get('usaChip') === true;
    const chipNumero = (inscritoSnap.get('chipNumero') as string | null) ?? null;
    if (exigeChipParaFechar(usaChip, { chipNumero })) {
      throw new https.HttpsError(
        'failed-precondition',
        'Evento usa chip — vincule o chip antes de fechar o atendimento (RN-206/207).'
      );
    }

    const kit = inscritoSnap.get('kit') as KitInscrito;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const patch: Record<string, unknown> = {
      checkinEm: now, // presença (RN-205)
      atualizadoEm: now,
    };
    // sem_kit não entrega kit; kit antecipado (S208) já teria o carimbo —
    // nunca sobrescrever carimbo existente (idempotência por carimbo)
    if (kit !== 'sem_kit' && inscritoSnap.get('kitEntregueEm') == null) {
      patch['kitEntregueEm'] = now;
    }
    tx.update(inscritoRef, patch);
    return false;
  });

  // Sem PII no log — só ids (LGPD)
  logger.info('entrega_registrada', { tenantId, eventoId, inscritoId, jaRegistrado });

  return { ok: true, jaRegistrado };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `registrarEntrega` — callable do balcão (S204-T1 consome). */
export const registrarEntrega = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return registrarEntregaCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
