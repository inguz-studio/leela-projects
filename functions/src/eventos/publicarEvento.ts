// =============================================================================
// functions/src/eventos/publicarEvento.ts
//
// Cloud Function callable: publica um rascunho de evento (LEELA-S201-T2 · E03).
//
// RN-201: publicar gera URL pública (`beh.ro/{slug}`) + QR automaticamente.
// Contrato: `publicarEvento({ eventoId }) -> { url, qrUrl, replay }`.
//
//   - `url`   — página pública do evento: https://beh.ro/{slug}
//   - `qrUrl` — data URI (image/png, base64) do QR cuja carga é a `url`.
//     Gerado server-side com a lib `qrcode` (puro JS, offline) — nenhum
//     serviço externo recebe a URL do evento; o painel renderiza direto em
//     <img src={qrUrl}> e pode oferecer download do asset.
//
// Regras aplicadas na transação (nunca confia no cliente):
//   - autorização: papel de escrita do MESMO tenant do evento (claims);
//   - tenant ativo (RN-402);
//   - completude do rascunho: nome, data, local, ≥1 modalidade — publicar
//     rascunho incompleto → failed-precondition com a lista do que falta;
//   - transição: SÓ rascunho → publicado. `ao_vivo`/`encerrado` → erro.
//
// IDEMPOTENTE: publicar um evento JÁ publicado devolve o MESMO { url, qrUrl }
// com `replay: true`, sem regravar nada (retry de rede não muda estado).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import QRCode from 'qrcode';
import type { AuthClaims } from '@leela/core';
import { assertTenantAtivo, assertTenantWriter, type EventoCaller } from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Base pública das páginas de evento (RN-201). */
export const EVENTO_URL_BASE = 'https://beh.ro';

export interface PublicarEventoInput {
  eventoId: string;
}

export interface PublicarEventoResult {
  /** URL pública da página do evento (beh.ro/{slug}) */
  url: string;
  /** Data URI (image/png) do QR com a URL como payload */
  qrUrl: string;
  /** true quando o evento já estava publicado (retry idempotente) */
  replay: boolean;
}

/** URL pública do evento a partir do slug. @pure */
export function urlPublicaDoEvento(slug: string): string {
  return `${EVENTO_URL_BASE}/${slug}`;
}

/**
 * Campos obrigatórios para publicação — devolve a lista do que falta
 * (vazia = rascunho completo). @pure
 */
export function camposFaltantesParaPublicar(
  data: Record<string, unknown>
): string[] {
  const faltam: string[] = [];
  const nome = data['nome'];
  if (typeof nome !== 'string' || nome.trim().length === 0) faltam.push('nome');
  if (!data['data']) faltam.push('data');
  const local = data['local'];
  if (typeof local !== 'string' || local.trim().length === 0) faltam.push('local');
  const modalidades = data['modalidades'];
  if (!Array.isArray(modalidades) || modalidades.length === 0) {
    faltam.push('modalidades');
  }
  return faltam;
}

/** Gera o QR (PNG data URI) cuja carga é a URL pública do evento (RN-201). */
export async function gerarQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function publicarEventoCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<PublicarEventoResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<PublicarEventoInput> | null;
  const eventoId = input?.eventoId;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }

  await assertTenantAtivo(db, tenantId);

  const ref = db.collection('eventos').doc(eventoId);

  const { slug, replay } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
    }
    const data = snap.data() ?? {};

    // Isolamento multi-tenant (ADR-009): só o tenant DONO publica
    if (data['tenantId'] !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).'
      );
    }

    const status = data['status'];
    const slugDoc =
      typeof data['slug'] === 'string' && data['slug'].length > 0
        ? (data['slug'] as string)
        : eventoId;

    if (status === 'publicado') {
      // Idempotência de publicação: retry devolve o mesmo resultado
      return { slug: slugDoc, replay: true };
    }
    if (status !== 'rascunho') {
      throw new https.HttpsError(
        'failed-precondition',
        `Evento '${eventoId}' está '${String(status)}' — só rascunho pode ser publicado.`
      );
    }

    const faltam = camposFaltantesParaPublicar(data);
    if (faltam.length > 0) {
      throw new https.HttpsError(
        'failed-precondition',
        `Rascunho incompleto — preencha: ${faltam.join(', ')}.`
      );
    }

    const now = FieldValue.serverTimestamp();
    tx.update(ref, {
      status: 'publicado',
      publicadoEm: now,
      atualizadoEm: now,
    });
    return { slug: slugDoc, replay: false };
  });

  const url = urlPublicaDoEvento(slug);
  const qrUrl = await gerarQrDataUrl(url);

  // Sem PII no log — só ids (LGPD); erro observável sem dado sensível
  logger.info('evento_publicado', { tenantId, eventoId, replay });

  return { url, qrUrl, replay };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `publicarEvento` — callable do painel (RN-201). */
export const publicarEvento = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return publicarEventoCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
