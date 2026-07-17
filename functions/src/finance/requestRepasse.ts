// =============================================================================
// functions/src/finance/requestRepasse.ts
//
// Callables `requestRepasse` e `cancelRepasse` do organizador
// (LEELA-E09s-L2-T3 · RN-351/352/353/354/357 · decisões #7/#11).
//
// requestRepasse (tenant_owner):
//   1. exige `dadosBancarios/current` (failed-precondition sem cadastro);
//   2. RELÊ o disponível NO SERVIDOR dentro da transação — recompute
//      integral via lerInputsSaldoRepasse + computeSaldoRepasse (core),
//      nunca o número que o cliente mandou;
//   3. aplica `validarSolicitacao` (RN-352) — valor ≤ 0, não cent-exato ou
//      > disponível ⇒ REJEITA sem criar NADA;
//   4. cria `repasses/{id}` em 'solicitado' com `dadosBancariosSnapshot`
//      MASCARADO congelado (RN-354) + 1ª entrada de `transicoes[]`;
//   5. grava o saldo RECOMPUTADO (com o novo repasse em comprometido) na
//      MESMA transação.
//
// PROVA DA CORRIDA (aceite T3): o write de `saldo/current` é COMPARTILHADO
// entre solicitações concorrentes — dois requestRepasse simultâneos
// conflitam nesse doc, o perdedor RETENTA, relê os repasses (agora com o
// vencedor), o disponível cai e a validação FALHA. Sem esse write
// compartilhado, duas criações em docs distintos nem se enxergariam.
// O trigger onRepasseWrite (T1) recomputa em seguida e NO-OPA (mesmos
// valores) — idempotência do T1 reconfirmada em produção.
//
// PAYLOAD NUNCA DITA ESTADO (postura antagonista): o doc nasce SEMPRE
// 'solicitado', sem comprovante — campos `estado`/`comprovanteNumero` do
// input são ignorados por construção (o servidor monta o doc inteiro).
//
// cancelRepasse (tenant_owner — decisão #11): SÓ enquanto 'solicitado',
// via `transitionRepasse` (matriz + ator do core). Cancelamento devolve o
// valor ao disponível no recompute (mesma transação). Retry idempotente:
// já 'cancelado' ⇒ replay, sem append duplicado na trilha.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeSaldoRepasse,
  transitionRepasse,
  validarSolicitacao,
  type AuthClaims,
  type DadosBancariosSnapshot,
  type EstadoRepasse,
  type SaldoRepasseComputado,
  type TransicaoRepasse,
} from '@leela/core';
import { assertTenantAtivo } from '../eventos/criarEvento';
import { assertTenantOwner, type FinanceCaller } from './atores';
import {
  lerInputsSaldoRepasse,
  type SaldoRepasseInputs,
} from './updateSaldoRepasse';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface RequestRepasseInput {
  /** Valor solicitado (R$, 2 casas) — o servidor valida contra RN-352. */
  valor: number;
  /**
   * RN-349 (LEELA-BEPEND-T2) — associação EXATA repasse↔evento. OPCIONAL:
   * ausente = repasse do saldo geral (sem associação). Presente, o SERVIDOR
   * valida (fail-closed): evento inexistente ou de OUTRO tenant ⇒ rejeita
   * sem criar nada — associação forjada nunca entra no doc.
   */
  eventoId?: string;
}

export interface RequestRepasseResult {
  repasseId: string;
  estado: 'solicitado';
  valor: number;
  /** Disponível APÓS comprometer esta solicitação (RN-351). */
  disponivel: number;
  /** Evento associado (RN-349) — null quando o repasse é do saldo geral. */
  eventoId: string | null;
}

export interface CancelRepasseInput {
  repasseId: string;
}

export interface CancelRepasseResult {
  repasseId: string;
  estado: 'cancelado';
  /** true quando o repasse JÁ estava cancelado (retry idempotente). */
  replay: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recompute + persistência do saldo dentro da transação do caller. */
function gravarSaldo(
  tx: admin.firestore.Transaction,
  db: Db,
  tenantId: string,
  inputs: SaldoRepasseInputs,
  repasses: SaldoRepasseInputs['repasses']
): SaldoRepasseComputado {
  const computado = computeSaldoRepasse({
    eventos: inputs.eventos,
    repasses,
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
  return computado;
}

/** Projeta o snapshot MASCARADO congelado no repasse (RN-354). */
function snapshotDadosBancarios(
  tenantId: string,
  doc: FirebaseFirestore.DocumentSnapshot
): DadosBancariosSnapshot {
  return {
    tenantId,
    banco: (doc.get('banco') as string) ?? '',
    agencia: (doc.get('agencia') as string) ?? '',
    contaMascarada: (doc.get('contaMascarada') as string) ?? '',
    tipo: (doc.get('tipo') as DadosBancariosSnapshot['tipo']) ?? 'corrente',
    pixMascarado: (doc.get('pixMascarado') as string | null) ?? null,
    titular: (doc.get('titular') as string) ?? '',
    cpfCnpjMascarado: (doc.get('cpfCnpjMascarado') as string) ?? '',
  };
}

// ---------------------------------------------------------------------------
// requestRepasse — núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export async function requestRepasseCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  agora: Date = new Date()
): Promise<RequestRepasseResult> {
  const tenantId = assertTenantOwner(caller.claims);

  const input = rawInput as Partial<RequestRepasseInput> | null;
  const valor = input?.valor;
  if (typeof valor !== 'number') {
    throw new https.HttpsError('invalid-argument', '"valor" (número) é obrigatório.');
  }
  // RN-349 — eventoId OPCIONAL, mas quando presente precisa ser string não
  // vazia (payload malformado é rejeitado, nunca silenciosamente descartado:
  // o organizador que PEDIU associação não pode receber um repasse "geral").
  const eventoId = input?.eventoId;
  if (
    eventoId !== undefined &&
    (typeof eventoId !== 'string' || eventoId.length === 0)
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"eventoId" deve ser string não vazia quando presente (RN-349).'
    );
  }

  await assertTenantAtivo(db, tenantId);

  return db.runTransaction(async (tx) => {
    // Pré-condição: dados bancários cadastrados (aceite T3)
    const dadosSnap = await tx.get(
      db.doc(`tenants/${tenantId}/dadosBancarios/current`)
    );
    if (!dadosSnap.exists) {
      throw new https.HttpsError(
        'failed-precondition',
        'Cadastre os dados bancários antes de solicitar repasse (RN-354).'
      );
    }

    // RN-349 — associação exata repasse↔evento, validada FAIL-CLOSED dentro
    // da transação: evento inexistente ou de OUTRO tenant ⇒ rejeita sem
    // criar NADA (cross-tenant não vira associação; o claim decide o tenant,
    // nunca o payload).
    if (eventoId !== undefined) {
      const eventoSnap = await tx.get(db.doc(`eventos/${eventoId}`));
      if (!eventoSnap.exists) {
        throw new https.HttpsError(
          'failed-precondition',
          `Evento '${eventoId}' não existe — associação de repasse rejeitada (RN-349).`
        );
      }
      if (eventoSnap.get('tenantId') !== tenantId) {
        throw new https.HttpsError(
          'permission-denied',
          'Evento pertence a outro tenant — associação de repasse rejeitada (RN-349/RN-400).'
        );
      }
    }

    const inputs = await lerInputsSaldoRepasse(tx, db, tenantId, agora);

    // Decisão #7: sem termo comercial, repasse BLOQUEADO — nada libera e
    // nenhuma solicitação é aceita até o platform_admin criar o termo.
    const previa = computeSaldoRepasse({
      eventos: inputs.eventos,
      repasses: inputs.repasses,
      dentroJanelaDN: inputs.dentroJanelaDN,
      ...(inputs.retencaoPct !== undefined
        ? { retencaoPct: inputs.retencaoPct }
        : {}),
    });
    if (!inputs.temTermo || previa.eventosSemTermo > 0) {
      throw new https.HttpsError(
        'failed-precondition',
        'Tenant sem termo comercial — repasse bloqueado até existir termo (decisão #7).'
      );
    }

    // RN-352 — o SERVIDOR valida contra o disponível RELIDO na transação
    const validacao = validarSolicitacao(valor, previa.disponivel);
    if (!validacao.ok) {
      throw new https.HttpsError(
        'failed-precondition',
        `Solicitação rejeitada: ${validacao.erros.join(' ')}`
      );
    }

    // Cria o repasse — SEMPRE 'solicitado', snapshot mascarado congelado.
    // Nenhum campo do payload entra no doc além do `valor` validado.
    const repasseRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('repasses')
      .doc();
    const transicaoInicial: TransicaoRepasse = {
      de: null,
      para: 'solicitado',
      em: Timestamp.now(),
      por: caller.uid,
      papel: 'tenant_owner',
    };
    tx.create(repasseRef, {
      id: repasseRef.id,
      tenantId,
      // RN-349: eventoId SÓ quando validado acima (docs sem associação ficam
      // idênticos ao vigente — schema evolution; a listagem trata ausência
      // como "sem associação", honesto).
      ...(eventoId !== undefined ? { eventoId } : {}),
      valor,
      estado: 'solicitado',
      dadosBancariosSnapshot: snapshotDadosBancarios(tenantId, dadosSnap),
      transicoes: [transicaoInicial],
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // Saldo recomputado COM o novo repasse (comprometido sobe, disponível
    // cai — RN-351) na MESMA transação: é este write compartilhado que faz
    // a 2ª solicitação concorrente falhar na releitura (aceite T3).
    const saldo = gravarSaldo(tx, db, tenantId, inputs, [
      ...inputs.repasses,
      { id: repasseRef.id, valor, estado: 'solicitado' },
    ]);

    logger.info('repasse_solicitado', {
      tenantId,
      repasseId: repasseRef.id,
      valor,
      eventoId: eventoId ?? null,
      disponivelRestante: saldo.disponivel,
    });

    return {
      repasseId: repasseRef.id,
      estado: 'solicitado' as const,
      valor,
      disponivel: saldo.disponivel,
      eventoId: eventoId ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// cancelRepasse — núcleo (decisão #11: SÓ o owner, SÓ enquanto 'solicitado')
// ---------------------------------------------------------------------------

export async function cancelRepasseCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  agora: Date = new Date()
): Promise<CancelRepasseResult> {
  const tenantId = assertTenantOwner(caller.claims);

  const input = rawInput as Partial<CancelRepasseInput> | null;
  const repasseId = input?.repasseId;
  if (typeof repasseId !== 'string' || repasseId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"repasseId" é obrigatório.');
  }

  await assertTenantAtivo(db, tenantId);

  return db.runTransaction(async (tx) => {
    // O caminho JÁ é tenant-scoped pelo claim (nunca pelo payload) — um
    // owner não alcança repasse de outro tenant por construção.
    const repasseRef = db.doc(`tenants/${tenantId}/repasses/${repasseId}`);
    const repasseSnap = await tx.get(repasseRef);
    if (!repasseSnap.exists) {
      throw new https.HttpsError('not-found', `Repasse '${repasseId}' não existe.`);
    }
    const estado = repasseSnap.get('estado') as EstadoRepasse;

    // Retry idempotente: já cancelado ⇒ replay sem novo append na trilha
    if (estado === 'cancelado') {
      return { repasseId, estado: 'cancelado' as const, replay: true };
    }

    // RN-353 + decisão #11 — matriz e ator do CORE decidem, não este código
    const transicao = transitionRepasse(estado, 'cancelar', 'tenant_owner');
    if (!transicao.ok) {
      throw new https.HttpsError('failed-precondition', transicao.motivo);
    }

    const inputs = await lerInputsSaldoRepasse(tx, db, tenantId, agora);

    const novaTransicao: TransicaoRepasse = {
      de: estado,
      para: 'cancelado',
      em: Timestamp.now(),
      por: caller.uid,
      papel: 'tenant_owner',
    };
    tx.update(repasseRef, {
      estado: 'cancelado',
      transicoes: FieldValue.arrayUnion(novaTransicao),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // Devolução ao disponível (RN-351/353) na MESMA transação
    gravarSaldo(
      tx,
      db,
      tenantId,
      inputs,
      inputs.repasses.map((r) =>
        r.id === repasseId ? { ...r, estado: 'cancelado' as const } : r
      )
    );

    logger.info('repasse_cancelado', { tenantId, repasseId });
    return { repasseId, estado: 'cancelado' as const, replay: false };
  });
}

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

export const requestRepasse = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return requestRepasseCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});

export const cancelRepasse = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return cancelRepasseCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
