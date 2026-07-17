// =============================================================================
// functions/src/eventos/versionarRegulamento.ts
//
// Versionamento SERVER-SIDE do regulamento (LEELA-S306-T1/T3 · E04 · RN-149).
//
// FLUXO DE ESCRITA vigente: o organizador edita `evento.regulamento` (texto)
// pelo client SDK (Rules validam teto 50k — EVENTO-CAMPOS). A VERSÃO, porém,
// é contrato legal: MONOTÔNICA e de escrita EXCLUSIVA server-side — as Rules
// congelam `regulamentoVersao`/`regulamentoAtualizadoEm` para o cliente, e
// este trigger deriva o bump quando o TEXTO efetivamente muda
// (`regulamentoMudou` do core: publicar onde não havia = v1; texto idêntico
// = no-op; APAGAR o texto NÃO bumpa — remoção não é versão nova a aceitar).
//
// PADRÃO ADR-015 (precedente coletaDiaria/encerrarEventos): núcleo puro/
// testável contra o Emulator via Admin SDK + wrapper v1 fino (onWrite).
// Idempotente: o núcleo compara o doc ATUAL; reprocessar o mesmo par
// (antes==depois de novo) não re-bumpa — o bump grava via transaction com
// releitura (corrida de dois updates de texto ⇒ dois bumps SEQUENCIAIS
// legítimos, nunca bump perdido/duplicado do mesmo texto).
//
// RN-149 ponta-a-ponta: inscritos antigos mantêm `regulamentoAceite.versao`
// (persistido no checkout E12-S1207 — NUNCA tocado aqui); a derivação
// `precisaNovoAceite(inscritoVersao, eventoVersao)` (core) diz quem precisa
// re-aceitar.
// =============================================================================

import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore as firestoreV1 } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { regulamentoMudou, versaoRegulamento } from '@leela/core';

type Db = admin.firestore.Firestore;

/** Hash do texto versionado — chave de idempotência do bump (review F1). */
export function hashRegulamento(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export interface VersionarRegulamentoResult {
  bumpado: boolean;
  versao: number;
}

/**
 * Núcleo testável: dado o texto ANTERIOR e o ATUAL do regulamento, bumpa a
 * versão do evento quando houve mudança real. Transacional: relê o doc — se
 * o texto atual do disco já não é o `depois` visto pelo trigger (corrida),
 * não escreve (o evento posterior do trigger cobre).
 */
export async function versionarRegulamentoCore(
  db: Db,
  eventoId: string,
  antes: string | undefined,
  depois: string | undefined
): Promise<VersionarRegulamentoResult> {
  if (!regulamentoMudou(antes, depois)) {
    const snap = await db.collection('eventos').doc(eventoId).get();
    return {
      bumpado: false,
      versao: versaoRegulamento(snap.get('regulamentoVersao') as number | undefined),
    };
  }
  const ref = db.collection('eventos').doc(eventoId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { bumpado: false, versao: 0 };
    const textoAtual = snap.get('regulamento') as string | undefined;
    const atual = versaoRegulamento(snap.get('regulamentoVersao') as number | undefined);
    if (textoAtual !== depois) {
      // Corrida: o texto já mudou de novo — o processamento DESSA mudança
      // fará o bump correto. Não escrever evita bump fantasma.
      return { bumpado: false, versao: atual };
    }
    // IDEMPOTÊNCIA de redelivery (review antagonista F1): onWrite v1 é
    // at-least-once — o MESMO evento (A→B) pode chegar 2×. O hash do texto
    // JÁ versionado é a chave: se o disco está neste texto E ele já produziu
    // a versão vigente, o bump não repete. (Efeito colateral deliberado:
    // apagar e re-publicar o MESMO texto também vira no-op — conteúdo
    // idêntico não força re-aceite, melhora o F4 da review.)
    const hashDepois = hashRegulamento(depois as string);
    if (atual > 0 && snap.get('regulamentoTextoHash') === hashDepois) {
      return { bumpado: false, versao: atual };
    }
    const nova = atual + 1;
    tx.update(ref, {
      regulamentoVersao: nova,
      regulamentoTextoHash: hashDepois,
      regulamentoAtualizadoEm: FieldValue.serverTimestamp(),
    });
    return { bumpado: true, versao: nova };
  });
}

// ---------------------------------------------------------------------------
// Trigger (ADR-015 — wrapper v1 fino)
// ---------------------------------------------------------------------------

export const versionarRegulamento = firestoreV1
  .document('eventos/{eventoId}')
  .onWrite(async (change, context) => {
    const antes = change.before.exists
      ? (change.before.get('regulamento') as string | undefined)
      : undefined;
    const depois = change.after.exists
      ? (change.after.get('regulamento') as string | undefined)
      : undefined;
    if (!change.after.exists) return null; // delete: nada a versionar
    const eventoId = context.params['eventoId'] as string;
    const r = await versionarRegulamentoCore(admin.firestore(), eventoId, antes, depois);
    if (r.bumpado) {
      logger.info('regulamento_versionado', { eventoId, versao: r.versao });
    }
    return null;
  });
