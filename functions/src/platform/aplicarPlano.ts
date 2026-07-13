// =============================================================================
// functions/src/platform/aplicarPlano.ts
//
// APLICAR PLANO DE COBRANÇA a um tenant (LEELA-T2-L4 · CB-T2 · decisão #15
// — extensão do território E16-S1602).
//
// SEMÂNTICA CANÔNICA (explícita no brief): aplicar = ESTAMPAR SNAPSHOT,
// SEM vínculo vivo. Lê o plano, mapeia via planoParaTerms (@leela/core —
// zero recálculo) e grava o resultado nos
// `tenants/{id}/commercialTerms/current` como NOVO snapshot versionado,
// REUSANDO o mecanismo S1602-T1 (bump versao+1 + snapshot imutável v{n}) —
// exatamente como o editor S1602-T2 e o setRetencaoRepasse (E09s-L2-T4)
// fazem. NÃO existe caminho novo de escrita de termos.
//
//   - editar o plano DEPOIS não retroage em tenants aplicados; só uma nova
//     aplicação re-estampa (o tenant recebe uma CÓPIA, não uma assinatura);
//   - reaplicar o MESMO plano com valores idênticos = NO-OP (sem novo bump
//     — política canônica: não poluir o histórico quando nada mudou);
//   - a edição fina campo-a-campo (S1602-T2) segue funcionando depois:
//     aplicar não trava nada, só gera mais uma versão na mesma cadeia;
//   - `planoAplicadoId`/`planoAplicadoEm` são REFERÊNCIA MORTA (rastro de
//     auditoria de onde os números vieram — nunca um vínculo vivo).
//
// SÓ platform_admin (RN-404). Consumo a jusante NÃO muda: E12 (checkout) e
// E09-slim (repasse) seguem lendo commercialTerms/current.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  planoParaTerms,
  PLANOS_COBRANCA_COLLECTION,
  type AuthClaims,
  type PlanoCobranca,
  type TermosDoPlanoCobranca,
} from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface AplicarPlanoInput {
  tenantId: string;
  planoId: string;
}

export interface AplicarPlanoResult {
  tenantId: string;
  planoId: string;
  /** Versão vigente após aplicar (== anterior quando replay). */
  versao: number;
  /** true = valores idênticos já estampados — SEM novo bump (no-op). */
  replay: boolean;
}

/** Caller (uid + claims do token — padrão FinanceCaller/E09s). */
export interface PlatformCaller {
  uid: string;
  claims: AuthClaims;
}

// ---------------------------------------------------------------------------
// Núcleo (testável no Emulator via Admin SDK — padrão callables v1)
// ---------------------------------------------------------------------------

/** Igualdade rasa de mapas numéricos (tabela por parcela). */
function tabelasIguais(
  a: Record<string, number> | undefined,
  b: Record<string, number>
): boolean {
  if (!a) return false;
  const chavesA = Object.keys(a);
  const chavesB = Object.keys(b);
  if (chavesA.length !== chavesB.length) return false;
  return chavesB.every((chave) => a[chave] === b[chave]);
}

/** Os valores do plano JÁ estão estampados nestes termos? (no-op check) */
function estampaIdentica(
  atual: FirebaseFirestore.DocumentData,
  termosDoPlano: TermosDoPlanoCobranca,
  planoId: string
): boolean {
  const taxa = atual['taxaPorMetodo'] as
    | { credit_card?: number; pix?: number }
    | undefined;
  return (
    atual['planoAplicadoId'] === planoId &&
    taxa !== undefined &&
    taxa.credit_card === termosDoPlano.taxaPorMetodo.credit_card &&
    taxa.pix === termosDoPlano.taxaPorMetodo.pix &&
    tabelasIguais(
      atual['tabelaTaxasParcela'] as Record<string, number> | undefined,
      termosDoPlano.tabelaTaxasParcela
    ) &&
    atual['saasMonthlyFee'] === termosDoPlano.saasMonthlyFee
  );
}

export async function aplicarPlanoCore(
  db: Db,
  rawInput: unknown,
  caller: PlatformCaller,
  agora: Date = new Date()
): Promise<AplicarPlanoResult> {
  if (caller.claims.role !== 'platform_admin') {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin aplica planos de cobrança (RN-404).'
    );
  }

  const input = rawInput as Partial<AplicarPlanoInput> | null;
  const tenantId = input?.tenantId;
  const planoId = input?.planoId;
  if (
    typeof tenantId !== 'string' || tenantId.length === 0 ||
    typeof planoId !== 'string' || planoId.length === 0
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"tenantId" e "planoId" são obrigatórios.'
    );
  }

  const planoSnap = await db
    .collection(PLANOS_COBRANCA_COLLECTION).doc(planoId).get();
  if (!planoSnap.exists) {
    throw new https.HttpsError('not-found', `Plano '${planoId}' não existe.`);
  }
  const plano = planoSnap.data() as PlanoCobranca;
  const termosDoPlano = planoParaTerms(plano);

  const resultado = await db.runTransaction(async (tx) => {
    const termsRef = db.doc(`tenants/${tenantId}/commercialTerms/current`);
    const snap = await tx.get(termsRef);
    if (!snap.exists) {
      // Mesma política do setRetencaoRepasse (decisão #7 E09s): termo nasce
      // no provisionamento/E16 com shape completo — aplicar plano não cria
      // termo do zero (não inventa platformFeePct/installmentRules).
      throw new https.HttpsError(
        'failed-precondition',
        `Tenant '${tenantId}' sem termo comercial — provisione/crie o termo (E16) antes de aplicar plano.`
      );
    }
    const atual = snap.data() ?? {};

    // NO-OP canônico: mesmo plano + valores idênticos ⇒ sem novo bump
    if (estampaIdentica(atual, termosDoPlano, planoId)) {
      const versaoAtual =
        typeof atual['versao'] === 'number' ? (atual['versao'] as number) : 0;
      return { versao: versaoAtual, replay: true };
    }

    const versaoAtual =
      typeof atual['versao'] === 'number' ? (atual['versao'] as number) : 0;
    const novaVersao = versaoAtual + 1;

    const novoTermo = {
      ...atual,
      ...termosDoPlano,
      // Rastro de origem — referência MORTA (sem vínculo vivo)
      planoAplicadoId: planoId,
      planoAplicadoEm: Timestamp.fromDate(agora),
      versao: novaVersao,
      atualizadoPor: caller.uid,
      atualizadoEm: FieldValue.serverTimestamp(),
    };

    // Convenção E16/S1602-T1 (RN-404): current com bump + snapshot IMUTÁVEL
    // v{n} — MESMO mecanismo do editor e do setRetencaoRepasse.
    tx.set(termsRef, novoTermo);
    tx.set(db.doc(`tenants/${tenantId}/commercialTerms/v${novaVersao}`), novoTermo);
    return { versao: novaVersao, replay: false };
  });

  logger.info('plano_cobranca_aplicado', {
    tenantId, planoId, versao: resultado.versao, replay: resultado.replay,
  });

  return { tenantId, planoId, ...resultado };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const aplicarPlano = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return aplicarPlanoCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
