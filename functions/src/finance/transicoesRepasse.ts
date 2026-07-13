// =============================================================================
// functions/src/finance/transicoesRepasse.ts
//
// Callables ADMIN da máquina do repasse (LEELA-E09s-L2-T4 ·
// RN-350/351/353/355/356 · decisão #4):
//
//   approveRepasse    solicitado → aprovado
//   rejectRepasse     solicitado → recusado  (devolve ao disponível)
//   markRepassePago   aprovado   → pago      (comprovante GAPLESS RN-355)
//   setRetencaoRepasse             grava retencaoRepassePct no termo
//
// SÓ platform_admin (permission-denied p/ qualquer outro papel — staff e
// owner tentando transição admin morrem AQUI, e a matriz do core seria a
// 2ª trincheira). Transição inválida (ex.: solicitado→pago pulando
// aprovação, saída de terminal) é decidida por `transitionRepasse`
// (@leela/core) — NUNCA re-derivada neste arquivo.
//
// COMPROVANTE GAPLESS (RN-355): `tenants/{tid}/repasseSeq/current` guarda
// `ultimaSeq`; o incremento e a atribuição do número acontecem na MESMA
// transação do flip p/ 'pago' — abortou, não consome número (sem buraco).
// Dois markRepassePago CONCORRENTES (repasses distintos) conflitam no doc
// do contador ⇒ serializam ⇒ ...0007 e ...0008, sem colisão. Retry do
// MESMO repasse já pago ⇒ replay com o MESMO número (não incrementa).
// O contador não tem match nas Rules ⇒ deny-by-default p/ cliente.
//
// "PAGO" É REGISTRO MANUAL (RN-356): nenhuma transferência bancária real —
// o PaymentProvider mock não é sequer chamado; a UI (L4) avisa explícito.
//
// Cada transição faz APPEND em `transicoes[]` (de→para, quando, quem —
// trilha de auditoria, RN-353). `setRetencaoRepasse` segue a convenção
// E16 de versionamento (RN-404): bump de `versao` + snapshot imutável
// `v{versao}`, e dispara o recompute do saldo (o novo % vale já).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeSaldoRepasse,
  dataLocalISO,
  formatarNumeroComprovante,
  FUSO_EVENTO,
  transitionRepasse,
  type AuthClaims,
  type EstadoRepasse,
  type EventoRepasseMaquina,
  type TransicaoRepasse,
} from '@leela/core';
import { assertPlatformAdmin, type FinanceCaller } from './atores';
import {
  lerInputsSaldoRepasse,
  recomputarSaldoRepasse,
} from './updateSaldoRepasse';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface TransicaoRepasseInput {
  tenantId: string;
  repasseId: string;
}

export interface TransicaoRepasseResult {
  repasseId: string;
  estado: EstadoRepasse;
  /** true = repasse já estava no estado-destino (retry idempotente). */
  replay: boolean;
}

export interface MarkRepassePagoResult extends TransicaoRepasseResult {
  estado: 'pago';
  /** Número GAPLESS do comprovante (RN-355) — ex.: REP-2026-0007. */
  comprovanteNumero: string;
}

export interface SetRetencaoRepasseInput {
  tenantId: string;
  retencaoRepassePct: number;
}

export interface SetRetencaoRepasseResult {
  tenantId: string;
  retencaoRepassePct: number;
  /** Versão nova do termo (RN-404 — bump + snapshot imutável). */
  versao: number;
}

function validarInputTransicao(rawInput: unknown): TransicaoRepasseInput {
  const input = rawInput as Partial<TransicaoRepasseInput> | null;
  if (
    typeof input?.tenantId !== 'string' || input.tenantId.length === 0 ||
    typeof input.repasseId !== 'string' || input.repasseId.length === 0
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"tenantId" e "repasseId" são obrigatórios.'
    );
  }
  return { tenantId: input.tenantId, repasseId: input.repasseId };
}

// ---------------------------------------------------------------------------
// approve / reject — núcleo compartilhado
// ---------------------------------------------------------------------------

async function transicionarAdmin(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  comando: Extract<EventoRepasseMaquina, 'aprovar' | 'recusar'>,
  agora: Date
): Promise<TransicaoRepasseResult> {
  assertPlatformAdmin(caller.claims);
  const { tenantId, repasseId } = validarInputTransicao(rawInput);
  const destino: EstadoRepasse = comando === 'aprovar' ? 'aprovado' : 'recusado';

  return db.runTransaction(async (tx) => {
    const repasseRef = db.doc(`tenants/${tenantId}/repasses/${repasseId}`);
    const snap = await tx.get(repasseRef);
    if (!snap.exists) {
      throw new https.HttpsError('not-found', `Repasse '${repasseId}' não existe.`);
    }
    const estado = snap.get('estado') as EstadoRepasse;

    if (estado === destino) {
      return { repasseId, estado, replay: true }; // retry idempotente
    }

    // RN-353 — matriz + ator decididos pelo CORE
    const transicao = transitionRepasse(estado, comando, 'platform_admin');
    if (!transicao.ok) {
      throw new https.HttpsError('failed-precondition', transicao.motivo);
    }

    // Recusa DEVOLVE o valor ao disponível (RN-351) — recompute na mesma tx
    // (aprovação não muda comprometido: solicitado e aprovado comprometem).
    let inputs = null;
    if (comando === 'recusar') {
      inputs = await lerInputsSaldoRepasse(tx, db, tenantId, agora);
    }

    const novaTransicao: TransicaoRepasse = {
      de: estado,
      para: destino,
      em: Timestamp.now(),
      por: caller.uid,
      papel: 'platform_admin',
    };
    tx.update(repasseRef, {
      estado: destino,
      transicoes: FieldValue.arrayUnion(novaTransicao),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    if (inputs !== null) {
      const computado = computeSaldoRepasse({
        eventos: inputs.eventos,
        repasses: inputs.repasses.map((r) =>
          r.id === repasseId ? { ...r, estado: destino } : r
        ),
        dentroJanelaDN: inputs.dentroJanelaDN,
        ...(inputs.retencaoPct !== undefined
          ? { retencaoPct: inputs.retencaoPct }
          : {}),
      });
      tx.set(db.doc(`tenants/${tenantId}/saldo/current`), {
        tenantId,
        ...computado,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    logger.info('repasse_transicao_admin', {
      tenantId, repasseId, de: estado, para: destino,
    });
    return { repasseId, estado: destino, replay: false };
  });
}

export async function approveRepasseCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  agora: Date = new Date()
): Promise<TransicaoRepasseResult> {
  return transicionarAdmin(db, rawInput, caller, 'aprovar', agora);
}

export async function rejectRepasseCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  agora: Date = new Date()
): Promise<TransicaoRepasseResult> {
  return transicionarAdmin(db, rawInput, caller, 'recusar', agora);
}

// ---------------------------------------------------------------------------
// markRepassePago — comprovante GAPLESS transacional (RN-355/356)
// ---------------------------------------------------------------------------

export async function markRepassePagoCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  agora: Date = new Date()
): Promise<MarkRepassePagoResult> {
  assertPlatformAdmin(caller.claims);
  const { tenantId, repasseId } = validarInputTransicao(rawInput);

  return db.runTransaction(async (tx) => {
    const repasseRef = db.doc(`tenants/${tenantId}/repasses/${repasseId}`);
    const seqRef = db.doc(`tenants/${tenantId}/repasseSeq/current`);

    const snap = await tx.get(repasseRef);
    if (!snap.exists) {
      throw new https.HttpsError('not-found', `Repasse '${repasseId}' não existe.`);
    }
    const estado = snap.get('estado') as EstadoRepasse;

    // Retry do MESMO repasse já pago ⇒ replay com o MESMO número — o
    // contador NÃO incrementa (gapless sobrevive a retry de rede).
    if (estado === 'pago') {
      const numero = snap.get('comprovanteNumero') as string | undefined;
      if (typeof numero !== 'string' || numero.length === 0) {
        throw new https.HttpsError(
          'internal',
          `Repasse '${repasseId}' pago sem comprovante — dado corrompido (RN-355).`
        );
      }
      return {
        repasseId, estado: 'pago' as const, comprovanteNumero: numero, replay: true,
      };
    }

    // RN-353: SÓ aprovado→pago (solicitado→pago direto morre no core)
    const transicao = transitionRepasse(estado, 'pagar', 'platform_admin');
    if (!transicao.ok) {
      throw new https.HttpsError('failed-precondition', transicao.motivo);
    }

    // Contador GAPLESS por tenant (RN-355): incremento + atribuição na
    // MESMA transação — concorrência serializa neste doc (prova no teste).
    const seqSnap = await tx.get(seqRef);
    const ultimaSeq =
      seqSnap.exists && typeof seqSnap.get('ultimaSeq') === 'number'
        ? (seqSnap.get('ultimaSeq') as number)
        : 0;
    const seq = ultimaSeq + 1;
    const ano = Number(dataLocalISO(agora, FUSO_EVENTO).slice(0, 4));
    const comprovanteNumero = formatarNumeroComprovante(tenantId, seq, ano);

    const novaTransicao: TransicaoRepasse = {
      de: estado,
      para: 'pago',
      em: Timestamp.now(),
      por: caller.uid,
      papel: 'platform_admin',
    };
    tx.set(seqRef, {
      tenantId,
      ultimaSeq: seq,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    tx.update(repasseRef, {
      estado: 'pago',
      comprovanteNumero,
      transicoes: FieldValue.arrayUnion(novaTransicao),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // RN-356: NENHUMA transferência real — registro manual (mock). O
    // PaymentProvider não é chamado; o log deixa isso auditável.
    logger.info('repasse_pago_registro_manual', {
      tenantId, repasseId, comprovanteNumero, transferenciaReal: false,
    });

    return {
      repasseId, estado: 'pago' as const, comprovanteNumero, replay: false,
    };
  });
}

// ---------------------------------------------------------------------------
// setRetencaoRepasse — % de retenção no termo do tenant (decisão #4 · RN-404)
// ---------------------------------------------------------------------------

export async function setRetencaoRepasseCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller
): Promise<SetRetencaoRepasseResult> {
  assertPlatformAdmin(caller.claims);

  const input = rawInput as Partial<SetRetencaoRepasseInput> | null;
  const tenantId = input?.tenantId;
  const pct = input?.retencaoRepassePct;
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"tenantId" é obrigatório.');
  }
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new https.HttpsError(
      'invalid-argument',
      '"retencaoRepassePct" deve estar entre 0 e 100 (RN-350).'
    );
  }

  const versao = await db.runTransaction(async (tx) => {
    const termsRef = db.doc(`tenants/${tenantId}/commercialTerms/current`);
    const snap = await tx.get(termsRef);
    if (!snap.exists) {
      // Coerente com a decisão #7: sem termo não há repasse — criar termo
      // é fluxo do E16 (shape completo), não daqui.
      throw new https.HttpsError(
        'failed-precondition',
        `Tenant '${tenantId}' sem termo comercial — crie o termo (E16) antes de configurar a retenção.`
      );
    }
    const atual = snap.data() ?? {};
    const versaoAtual =
      typeof atual['versao'] === 'number' ? (atual['versao'] as number) : 0;
    const novaVersao = versaoAtual + 1;

    const novoTermo = {
      ...atual,
      retencaoRepassePct: pct,
      versao: novaVersao,
      atualizadoPor: caller.uid,
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    // Convenção E16 (RN-404): current com bump + snapshot IMUTÁVEL v{n}
    tx.set(termsRef, novoTermo);
    tx.set(
      db.doc(`tenants/${tenantId}/commercialTerms/v${novaVersao}`),
      novoTermo
    );
    return novaVersao;
  });

  logger.info('retencao_repasse_configurada', {
    tenantId, retencaoRepassePct: pct, versao,
  });

  // O novo % vale nos próximos recomputes — e JÁ neste (write do termo não
  // é gatilho do T1, então o refresh é disparado aqui; consome o core T1).
  await recomputarSaldoRepasse(db, tenantId);

  return { tenantId, retencaoRepassePct: pct, versao };
}

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

function callerDe(context: https.CallableContext): FinanceCaller {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  };
}

export const approveRepasse = https.onCall(async (data: unknown, context) =>
  approveRepasseCore(admin.firestore(), data, callerDe(context))
);

export const rejectRepasse = https.onCall(async (data: unknown, context) =>
  rejectRepasseCore(admin.firestore(), data, callerDe(context))
);

export const markRepassePago = https.onCall(async (data: unknown, context) =>
  markRepassePagoCore(admin.firestore(), data, callerDe(context))
);

export const setRetencaoRepasse = https.onCall(async (data: unknown, context) =>
  setRetencaoRepasseCore(admin.firestore(), data, callerDe(context))
);
