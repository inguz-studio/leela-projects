// =============================================================================
// functions/src/eventos/versionarTermoSaude.ts
//
// Versionamento SERVER-SIDE do termo de saúde CUSTOM do organizador
// (LEELA-CK2-T4 · RN-156 · espelho de versionarPoliticaVendas — padrão
// ADR-015: núcleo puro/testável + wrapper v1 fino).
//
// FLUXO: o OWNER edita `eventos/{e}/termoSaude/config` pelo client SDK
// (Rules validam shape e congelam versao/versaoAtualizadaEm/termoTextoHash).
// Este trigger deriva o bump quando o TEXTO muda MATERIALMENTE
// (materialTermoSaude — CR/LF/trim fora). A prova de aceite do pedido
// (`aceites.saudeCustom`) carimba versão + hash lidos na tx do checkout —
// autossuficiente mesmo na janela edição→bump (mesma lição F-1 do CKMOD).
//
// SEMÂNTICA DE VIGÊNCIA (≠ política, = regulamento-ish): o termo custom SÓ
// vige quando há texto (termoSaudeCustomAtivo). Doc nascendo/nunca
// versionado ⇒ carimba versão 1 sem bump; edição material ⇒ bump.
// Idempotente por HASH (redelivery at-least-once não re-bumpa); transação
// com releitura (corrida de updates ⇒ bumps sequenciais, nunca duplicado).
// =============================================================================

import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore as firestoreV1 } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  materialTermoSaude,
  validarTermoSaudeCustom,
  versaoTermoSaude,
  TERMO_SAUDE_CUSTOM_DOC_ID,
} from '@leela/core';

type Db = admin.firestore.Firestore;

/** Hash sha256 do MATERIAL do termo — chave de idempotência do bump. */
export function hashTermoSaude(texto: string): string {
  return createHash('sha256')
    .update(materialTermoSaude(texto), 'utf8')
    .digest('hex');
}

export interface VersionarTermoSaudeResult {
  bumpado: boolean;
  versao: number;
}

/**
 * Núcleo testável: relê `eventos/{eventoId}/termoSaude/config` e bumpa a
 * versão quando o material do DISCO difere do último material versionado.
 * Baseline: `termoTextoHash` gravado > `antesHash` (doc legado sem hash —
 * o texto publicado É a versão vigente) > material do próprio doc (nascendo:
 * carimba versão 1 sem bump). Doc inválido = no-op (versão nunca nasce de
 * termo ilegível).
 */
export async function versionarTermoSaudeCore(
  db: Db,
  eventoId: string,
  antesHash?: string
): Promise<VersionarTermoSaudeResult> {
  const ref = db
    .collection('eventos')
    .doc(eventoId)
    .collection('termoSaude')
    .doc(TERMO_SAUDE_CUSTOM_DOC_ID);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { bumpado: false, versao: 1 };
    const data = snap.data() ?? {};
    if (validarTermoSaudeCustom(data).length > 0) {
      logger.warn('termo_saude_invalido_nao_versionado', { eventoId });
      return {
        bumpado: false,
        versao: versaoTermoSaude(data['versao'] as number | undefined),
      };
    }
    const hashAtual = hashTermoSaude(data['texto'] as string);
    const versaoGravada = data['versao'] as number | undefined;
    const hashGravado = data['termoTextoHash'] as string | undefined;
    const vigente = versaoTermoSaude(versaoGravada);

    const baseline =
      typeof hashGravado === 'string' ? hashGravado : (antesHash ?? hashAtual);

    if (hashAtual === baseline) {
      // Conteúdo vigente idêntico — garante só o CARIMBO em doc nunca
      // versionado (deixa versao/hash explícitos p/ leituras futuras).
      if (typeof versaoGravada !== 'number' || typeof hashGravado !== 'string') {
        tx.update(ref, {
          versao: vigente,
          termoTextoHash: hashAtual,
          versaoAtualizadaEm: FieldValue.serverTimestamp(),
        });
      }
      return { bumpado: false, versao: vigente };
    }

    const nova = vigente + 1;
    tx.update(ref, {
      versao: nova,
      termoTextoHash: hashAtual,
      versaoAtualizadaEm: FieldValue.serverTimestamp(),
    });
    return { bumpado: true, versao: nova };
  });
}

// ---------------------------------------------------------------------------
// Trigger (ADR-015 — wrapper v1 fino)
// ---------------------------------------------------------------------------

export const versionarTermoSaude = firestoreV1
  .document('eventos/{eventoId}/termoSaude/{docId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null; // delete: termo volta a inativo
    if (context.params['docId'] !== TERMO_SAUDE_CUSTOM_DOC_ID) return null;
    const eventoId = context.params['eventoId'] as string;
    let antesHash: string | undefined;
    if (change.before.exists) {
      const antes = change.before.data() ?? {};
      if (validarTermoSaudeCustom(antes).length === 0) {
        antesHash = hashTermoSaude(antes['texto'] as string);
      }
    }
    const r = await versionarTermoSaudeCore(admin.firestore(), eventoId, antesHash);
    if (r.bumpado) {
      logger.info('termo_saude_versionado', { eventoId, versao: r.versao });
    }
    return null;
  });
