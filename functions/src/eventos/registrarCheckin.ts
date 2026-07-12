// =============================================================================
// functions/src/eventos/registrarCheckin.ts
//
// Cloud Function callable: check-in por QR na largada/portal (LEELA-S208-T3
// · E03 · RN-221/222). Caminho do kit ANTECIPADO: seta APENAS `checkinEm`,
// nunca reabre/toca `kitEntregueEm` (RN-222). O fluxo padrão do balcão
// continua sendo `registrarEntrega` (RN-205 — kit + presença juntos).
//
// Contrato: registrarCheckin({ eventoId, qrToken }) -> { ok, inscritoId,
//           atletaNome, checkinEmMillis }
//
// Segurança (nunca confiar no cliente — DNA Schneier):
//   - `qrToken` só é aceito com assinatura HMAC-SHA256 válida do servidor
//     (ver ./qrToken.ts). Payload NUNCA é lido antes da verificação.
//   - Sem keyring configurado ⇒ FAIL-CLOSED (`failed-precondition`), jamais
//     "aceitar sem verificar".
//   - Caller precisa ser tenant_owner/tenant_staff do tenant do evento
//     (mesma matriz de `registrarEntrega`); o tenant do payload e o do
//     evento são reconciliados com o claim — QR de outro tenant/evento cai
//     em `QR_OUTRO_EVENTO` sem vazar detalhe.
//   - Replay (checkinEm já presente) ⇒ resposta idempotente-NEGATIVA
//     estável: `already-exists` + codigo QR_JA_UTILIZADO, ZERO writes —
//     escanear N vezes produz sempre o mesmo erro e nenhum carimbo muda.
//   - Corrida de 2 check-ins simultâneos: decisão + escrita na MESMA
//     transação Firestore — exatamente um vence; o perdedor relê o doc
//     comprometido e recebe QR_JA_UTILIZADO.
//   - Erros DISTINTOS por causa (aceite S208): details.codigo ∈
//     { QR_ADULTERADO, QR_OUTRO_EVENTO, QR_JA_UTILIZADO, INSCRITO_CANCELADO,
//       INSCRITO_NAO_CONFIRMADO, INSCRITO_NAO_ENCONTRADO, QR_NAO_CONFIGURADO }
//     — o balcão S208-T4 renderiza um estado por código.
//   - LGPD/telemetria: NUNCA logar o token (é credencial); só ids + causa.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { classificarCheckinQr, type CausaCheckinQr } from '../../../packages/core/src/eventos/qrToken';
import type { AuthClaims, StatusInscrito } from '@leela/core';
import { assertTenantAtivo, assertTenantWriter, type EventoCaller } from './criarEvento';
import { obterQrKeyring, verificarQrToken, type QrKeyring } from './qrToken';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface RegistrarCheckinInput {
  /** Evento do balcão/portal onde o QR foi escaneado (contexto, não fonte) */
  eventoId: string;
  /** Token assinado lido do QR — verificado no servidor, nunca confiado */
  qrToken: string;
}

export interface RegistrarCheckinResult {
  ok: true;
  inscritoId: string;
  /** Para o operador confirmar visualmente quem passou (staff autorizado) */
  atletaNome: string;
  /** Carimbo efetivado (millis) — telemetria/estado do balcão */
  checkinEmMillis: number | null;
}

/** Códigos ACIONÁVEIS — um estado de UI por código (aceite S208). */
export type CodigoErroCheckin =
  | 'QR_NAO_CONFIGURADO'
  | 'QR_ADULTERADO'
  | 'QR_OUTRO_EVENTO'
  | 'QR_JA_UTILIZADO'
  | 'INSCRITO_CANCELADO'
  | 'INSCRITO_NAO_CONFIRMADO'
  | 'INSCRITO_NAO_ENCONTRADO';

interface ErroCheckin {
  grpc: 'permission-denied' | 'failed-precondition' | 'already-exists' | 'not-found';
  codigo: CodigoErroCheckin;
  mensagem: string;
}

/**
 * Charset estrito de doc-id para o `eventoId` vindo do CLIENTE — validado
 * ANTES de montar qualquer ref (re-review Fable C-T1 A1). Sem isto:
 *   - `eventoId` com `/` ("x/inscritos/y") monta uma ref VÁLIDA apontando
 *     para um doc de INSCRITO (que também tem `tenantId`) — o gate RN-400
 *     passaria a comparar contra o TIPO ERRADO de documento (fail-closed
 *     hoje, a um refactor de virar bug);
 *   - segmento par ("a/b"), `.`, `..` ou id gigante fazem `.doc()` lançar
 *     Error cru → o callable devolveria `internal` em vez de código acionável.
 * Ids reais de evento (auto-id do Firestore ou slug do criarEvento) casam.
 */
const EVENTO_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Mapa causa (decisão pura do core) → erro do callable.
 * `qr_divergente` colapsa em QR_ADULTERADO de propósito: token assinado
 * porém nunca emitido/revogado/re-emitido é, para o operador, um QR que
 * não vale — sem oráculo sobre o porquê.
 */
const ERRO_POR_CAUSA: Record<CausaCheckinQr, ErroCheckin> = {
  qr_outro_evento: {
    grpc: 'failed-precondition',
    codigo: 'QR_OUTRO_EVENTO',
    mensagem: 'QR inválido para este evento.',
  },
  inscrito_nao_encontrado: {
    grpc: 'not-found',
    codigo: 'INSCRITO_NAO_ENCONTRADO',
    mensagem: 'Inscrito do QR não foi encontrado neste evento.',
  },
  qr_divergente: {
    grpc: 'permission-denied',
    codigo: 'QR_ADULTERADO',
    mensagem: 'QR inválido ou adulterado.',
  },
  inscrito_cancelado: {
    grpc: 'failed-precondition',
    codigo: 'INSCRITO_CANCELADO',
    mensagem: 'Inscrição cancelada — check-in bloqueado.',
  },
  inscrito_nao_confirmado: {
    grpc: 'failed-precondition',
    codigo: 'INSCRITO_NAO_CONFIRMADO',
    mensagem: 'Inscrição não confirmada — check-in bloqueado.',
  },
  qr_ja_utilizado: {
    grpc: 'already-exists',
    codigo: 'QR_JA_UTILIZADO',
    mensagem: 'Check-in já realizado para este inscrito.',
  },
};

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function registrarCheckinCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller,
  keyring: QrKeyring | null = obterQrKeyring()
): Promise<RegistrarCheckinResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<RegistrarCheckinInput> | null;
  const eventoId = input?.eventoId;
  const qrToken = input?.qrToken;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }
  if (!EVENTO_ID_REGEX.test(eventoId)) {
    // Código acionável (nunca `internal`): input do cliente fora do charset
    // de doc-id não chega perto de `db.collection(...).doc(eventoId)`.
    throw new https.HttpsError(
      'invalid-argument',
      '"eventoId" inválido — use apenas [A-Za-z0-9_-], máximo 64 caracteres.'
    );
  }
  if (typeof qrToken !== 'string' || qrToken.length === 0) {
    throw new https.HttpsError('invalid-argument', '"qrToken" é obrigatório.');
  }

  // FAIL-CLOSED: sem segredo configurado NÃO existe check-in "de confiança".
  if (keyring === null) {
    throw new https.HttpsError(
      'failed-precondition',
      'Assinatura de QR não configurada no servidor (QR_TOKEN_KEYS) — check-in bloqueado.',
      { codigo: 'QR_NAO_CONFIGURADO' satisfies CodigoErroCheckin }
    );
  }

  await assertTenantAtivo(db, tenantId);

  // 1) Criptografia PRIMEIRO — o payload só existe após assinatura válida.
  const verificacao = verificarQrToken(qrToken, keyring);
  if (!verificacao.ok) {
    // Sem token no log (é credencial); causa interna só para telemetria.
    logger.warn('checkin_qr_rejeitado', {
      tenantId,
      eventoId,
      causa: verificacao.causa,
    });
    throw new https.HttpsError('permission-denied', 'QR inválido ou adulterado.', {
      codigo: 'QR_ADULTERADO' satisfies CodigoErroCheckin,
    });
  }
  const payload = verificacao.payload;

  const eventoRef = db.collection('eventos').doc(eventoId);
  const inscritoRef = eventoRef.collection('inscritos').doc(payload.inscritoId);

  // 2) Decisão de estado + escrita na MESMA transação (anti-corrida).
  const efetivado = await db.runTransaction(async (tx) => {
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

    const inscrito = inscritoSnap.exists
      ? {
          status: inscritoSnap.get('status') as StatusInscrito,
          jaTemCheckin: inscritoSnap.get('checkinEm') != null,
          qrTokenEmitido: (inscritoSnap.get('qrToken') as string | null) ?? null,
        }
      : null;

    const decisao = classificarCheckinQr({
      payload,
      tokenApresentado: qrToken,
      eventoIdBalcao: eventoId,
      tenantIdCaller: tenantId,
      inscrito,
    });

    if (!decisao.ok) {
      const erro = ERRO_POR_CAUSA[decisao.causa];
      logger.warn('checkin_qr_recusado', {
        tenantId,
        eventoId,
        inscritoId: payload.inscritoId,
        causa: decisao.causa,
      });
      const detalhes: Record<string, unknown> = { codigo: erro.codigo };
      if (decisao.causa === 'qr_ja_utilizado') {
        // Resposta idempotente-negativa CLARA: informa quando foi (RN-222)
        const checkinEm = inscritoSnap.get('checkinEm') as
          | admin.firestore.Timestamp
          | null
          | undefined;
        detalhes['checkinEmMillis'] = checkinEm != null ? checkinEm.toMillis() : null;
      }
      throw new https.HttpsError(erro.grpc, erro.mensagem, detalhes);
    }

    // Caminho válido: APENAS checkinEm (RN-222 — nunca tocar kitEntregueEm)
    const now = FieldValue.serverTimestamp();
    tx.update(inscritoRef, { checkinEm: now, atualizadoEm: now });
    return {
      atletaNome: (inscritoSnap.get('atletaNome') as string | undefined) ?? '',
    };
  });

  // Sem PII além do necessário e sem token no log (LGPD)
  logger.info('checkin_registrado', {
    tenantId,
    eventoId,
    inscritoId: payload.inscritoId,
    kid: verificacao.kid,
  });

  return {
    ok: true,
    inscritoId: payload.inscritoId,
    atletaNome: efetivado.atletaNome,
    checkinEmMillis: null, // serverTimestamp só materializa após o commit
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `registrarCheckin` — callable do portal/largada (S208-T4 consome).
 * `QR_TOKEN_KEYS` vem do Cloud Secret Manager (runWith.secrets);
 * `QR_TOKEN_KID_ATIVO` é config não-sensível (functions/.env).
 */
export const registrarCheckin = runWith({ secrets: ['QR_TOKEN_KEYS'] }).https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return registrarCheckinCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
