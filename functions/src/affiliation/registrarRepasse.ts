// =============================================================================
// functions/src/affiliation/registrarRepasse.ts
//
// Cloud Function callable: registra um REPASSE MANUAL de comissão ao
// afiliado/influenciador (LEELA-COMF2 · E08 fase 2 · DECISOES-ABERTAS item 23).
//
// DECISÃO DE DESEMBOLSO (default proposto, pendente ratificação do Vitor):
// o desembolso da fase 2 é REPASSE MANUAL — o organizador paga o afiliado
// FORA da plataforma (Pix/transferência) e REGISTRA aqui o fato, que
// decrementa o saldo (comissaoRepassada ∑). NENHUM dinheiro é movido por
// este código. Split automático do PaymentProvider (Asaas suporta) = FASE 3
// — NÃO integrar sem ratificação explícita.
//
// DIRECTIVE herdada do R9-E (inviolável): NUNCA rotear dinheiro para
// `responsavelUid` sem `emailVerified === true`. Este callable NÃO roteia
// dinheiro (só registra um pagamento off-platform feito pelo organizador a
// quem ele conhece); quando a fase 3 (split/transfer automático) chegar, a
// prova de e-mail é PRÉ-CONDIÇÃO de qualquer rota automática.
//
// CONTABILIDADE (zero paralela): saldo = comissaoAcumulada − comissaoRepassada
// (derivação pura, `saldoComissaoAfiliado` no core). O registro vive em
// `eventos/{id}/afiliados/{id}/repasses/{repasseId}` — ledger no MESMO ramo
// das conversões (R9-E), escrita exclusiva de Function (Rules write:false).
//
// IDEMPOTÊNCIA: `repasseId` é gerado pelo CLIENTE (uuid) e vira o docId —
// replay (double-click/retry de rede) colide na chave dentro da transação e
// volta `duplicado: true` sem segundo débito.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_AFILIADOS,
  REPASSE_ID_RE,
  REPASSE_OBSERVACAO_MAX,
  SUBCOLECAO_REPASSES_AFILIADO,
  isMoneyCentExato,
  saldoComissaoAfiliado,
  roundMoney,
  type AuthClaims,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';

/** Mesma tolerância de comparação monetária do kernel de estorno (ADR-011). */
const TOL = 0.005;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface RegistrarRepasseComissaoInput {
  eventoId: string;
  afiliadoId: string;
  /** Chave de idempotência gerada pelo cliente (8..64 chars URL-safe). */
  repasseId: string;
  /** R$ cent-exato > 0 — não pode exceder o saldo de comissão. */
  valor: number;
  /** Nota livre do organizador (ex.: "Pix 18/07") — opcional, ≤ 200 chars. */
  observacao?: string;
}

export interface RegistrarRepasseComissaoResult {
  ok: true;
  repasseId: string;
  /** true = repasseId já registrado (replay) — NENHUM segundo débito. */
  duplicado: boolean;
  /** Saldo de comissão APÓS o registro (acumulada − repassada). */
  saldoComissao: number;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function registrarRepasseComissaoCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<RegistrarRepasseComissaoResult> {
  const tenantId = assertTenantWriter(caller.claims);

  // ── Validação de fronteira (fail-fast, sem PII nas mensagens) ────────────
  const input = (rawInput ?? {}) as Partial<RegistrarRepasseComissaoInput>;
  if (typeof input.eventoId !== 'string' || input.eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }
  if (typeof input.afiliadoId !== 'string' || input.afiliadoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"afiliadoId" é obrigatório.');
  }
  if (typeof input.repasseId !== 'string' || !REPASSE_ID_RE.test(input.repasseId)) {
    throw new https.HttpsError(
      'invalid-argument',
      '"repasseId" deve ter 8..64 caracteres URL-safe (chave de idempotência).'
    );
  }
  if (!isMoneyCentExato(input.valor) || (input.valor as number) <= 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"valor" deve ser R$ cent-exato maior que zero.'
    );
  }
  const valor = roundMoney(input.valor as number);
  if (
    input.observacao !== undefined &&
    (typeof input.observacao !== 'string' ||
      input.observacao.length > REPASSE_OBSERVACAO_MAX)
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      `"observacao" deve ser texto de até ${REPASSE_OBSERVACAO_MAX} caracteres.`
    );
  }
  const observacao =
    typeof input.observacao === 'string' && input.observacao.trim().length > 0
      ? input.observacao.trim()
      : null;

  await assertTenantAtivo(db, tenantId);

  // ── Evento do PRÓPRIO tenant (RN-400 — escopo da claim, nunca do input) ──
  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists || eventoSnap.get('tenantId') !== tenantId) {
    throw new https.HttpsError(
      'not-found',
      `Evento '${input.eventoId}' não existe neste tenant.`
    );
  }

  const afiliadoRef = eventoRef.collection(COLECAO_AFILIADOS).doc(input.afiliadoId);
  const repasseRef = afiliadoRef
    .collection(SUBCOLECAO_REPASSES_AFILIADO)
    .doc(input.repasseId);

  // ── Transação: guarda de saldo + ledger + ∑ na MESMA tx ──────────────────
  const resultado = await db.runTransaction<RegistrarRepasseComissaoResult>(
    async (tx) => {
      const [afiliadoSnap, repasseSnap] = await Promise.all([
        tx.get(afiliadoRef),
        tx.get(repasseRef),
      ]);
      if (!afiliadoSnap.exists || afiliadoSnap.get('tenantId') !== tenantId) {
        throw new https.HttpsError(
          'not-found',
          `Afiliado '${input.afiliadoId}' não existe neste evento.`
        );
      }

      const acumulada =
        typeof afiliadoSnap.get('comissaoAcumulada') === 'number'
          ? (afiliadoSnap.get('comissaoAcumulada') as number)
          : 0;
      const repassada =
        typeof afiliadoSnap.get('comissaoRepassada') === 'number'
          ? (afiliadoSnap.get('comissaoRepassada') as number)
          : 0;

      // Replay do MESMO registro (chave = repasseId): zero segundo débito.
      if (repasseSnap.exists) {
        return {
          ok: true,
          repasseId: input.repasseId as string,
          duplicado: true,
          saldoComissao: saldoComissaoAfiliado(acumulada, repassada),
        };
      }

      const saldo = saldoComissaoAfiliado(acumulada, repassada);
      if (valor > saldo + TOL) {
        throw new https.HttpsError(
          'failed-precondition',
          `Repasse (${valor.toFixed(2)}) excede o saldo de comissão ` +
            `(${saldo.toFixed(2)}) do afiliado.`
        );
      }

      const agora = FieldValue.serverTimestamp();
      tx.create(repasseRef, {
        id: input.repasseId,
        valor,
        observacao,
        registradoPorUid: caller.uid,
        criadoEm: agora,
      });
      // ∑ read-modify-write + roundMoney na MESMA tx (disciplina R9-E) —
      // nunca FieldValue.increment de float.
      const repassadaNova = roundMoney(repassada + valor);
      tx.update(afiliadoRef, {
        comissaoRepassada: repassadaNova,
        atualizadoEm: agora,
      });
      return {
        ok: true,
        repasseId: input.repasseId as string,
        duplicado: false,
        saldoComissao: saldoComissaoAfiliado(acumulada, repassadaNova),
      };
    }
  );

  logger.info('repasse_comissao_registrado', {
    tenantId,
    eventoId: input.eventoId,
    afiliadoId: input.afiliadoId,
    repasseId: resultado.repasseId,
    duplicado: resultado.duplicado,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

export const registrarRepasseComissao = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return registrarRepasseComissaoCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
