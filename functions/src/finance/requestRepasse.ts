// =============================================================================
// functions/src/finance/requestRepasse.ts
//
// Callables `requestRepasse` e `cancelRepasse` do organizador
// (LEELA-E09s-L2-T3 · RN-351/352/353/354/357 · decisões #7/#11).
//
// requestRepasse (tenant_owner):
//   1. exige `dadosBancarios/current` (failed-precondition sem cadastro);
//   2. exige `eventoId` (RN-369 · DEC-0727C — "repasse SEMPRE amarrado a um
//      evento"); o evento é validado fail-closed (existe + é do tenant);
//   3. RELÊ o disponível NO SERVIDOR dentro da transação — recompute
//      integral via lerInputsSaldoRepasse + computeSaldoRepasse (core),
//      nunca o número que o cliente mandou;
//   4. aplica DUAS validações que COMPÕEM: `validarSolicitacao` contra o
//      disponível do TENANT (RN-352) e o teto DAQUELE evento (RN-368 —
//      liberado − comprometido do evento). Qualquer uma REJEITA sem criar
//      nada;
//   5. cria `repasses/{id}` em 'solicitado' com `dadosBancariosSnapshot`
//      MASCARADO congelado (RN-354) + 1ª entrada de `transicoes[]`;
//   6. grava o saldo RECOMPUTADO (com o novo repasse em comprometido) na
//      MESMA transação.
//
// POR QUE O TETO POR EVENTO (RN-368): até a DEC-0727C a única validação era
// contra o saldo do TENANT, então um evento com R$ 8.500 liberados aceitava um
// repasse de R$ 9.000 desde que OUTRO evento tivesse saldo — o furo do clamp
// que a review CAIXADISP-REV mediu (vetor 1). Verbatim do dono: *"Evento nao
// pode repassar mais do que tá liberado."* As duas validações compõem: a do
// tenant continua sendo a que protege o caixa consolidado (ela carrega a
// janela D+N, que é grandeza do tenant), a do evento impede que um evento
// consuma o liberado de outro.
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
  comprometeSaldo,
  computeDisponivelDoEvento,
  computeSaldoRepasse,
  roundMoney,
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
   * RN-349 (LEELA-BEPEND-T2) + RN-369 (DEC-0727C) — associação EXATA
   * repasse↔evento, agora OBRIGATÓRIA: "repasse SEMPRE amarrado a um evento".
   * O SERVIDOR valida fail-closed — ausente, inexistente ou de OUTRO tenant ⇒
   * rejeita sem criar nada. Docs ANTIGOS sem o campo continuam válidos como
   * dado (legado); o que morreu foi o caminho de CRIAÇÃO sem evento, que era
   * o default do modal e devolvia inteiro o repasse-fantasma do §P-IAMENU-2.
   */
  eventoId: string;
}

export interface RequestRepasseResult {
  repasseId: string;
  estado: 'solicitado';
  valor: number;
  /** Disponível APÓS comprometer esta solicitação (RN-351). */
  disponivel: number;
  /** Evento associado (RN-349/369) — sempre presente em repasses novos. */
  eventoId: string;
  /** Disponível DAQUELE evento após esta solicitação (RN-368). */
  disponivelDoEvento: number;
}

/**
 * Payload do `details` quando o teto POR EVENTO barra a solicitação (RN-368).
 * Erro TIPADO de propósito: o painel precisa dizer ao organizador QUANTO
 * aquele evento comporta, e uma frase genérica ("o valor excede o disponível")
 * mandaria ele adivinhar entre dois números diferentes.
 */
export interface RepasseExcedeEventoDetails {
  motivo: 'repasse_excede_evento';
  eventoId: string;
  /** Liberado − comprometido daquele evento, no instante da tentativa. */
  disponivelDoEvento: number;
  valorSolicitado: number;
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

/**
 * Disponível DAQUELE evento (RN-368) na base ÚNICA do saque — a MESMA função
 * do core que a Caixa do evento usa para pintar o card (RN-367). `null` =
 * evento sem termo comercial ou sem agregado financeiro: indeterminado, nunca
 * zero por conveniência.
 *
 * O comprometido do evento é a Σ dos repasses VIVOS com este `eventoId`, pela
 * definição do core (`comprometeSaldo` — cancelado/recusado devolvem, RN-353).
 * Repasses LEGADOS sem `eventoId` não entram: eles comprometem o saldo do
 * tenant (e a validação de tenant acima já os viu), mas nunca foram atribuídos
 * a evento nenhum e atribuí-los agora seria adivinhação.
 */
function calcularDisponivelDoEvento(
  inputs: SaldoRepasseInputs,
  eventoId: string
): number | null {
  const evento = inputs.eventos.find((e) => e.eventoId === eventoId);
  if (evento === undefined) {
    // Evento sem `financeiro/current` — nenhuma receita confirmada ainda.
    // Zero é o número CERTO aqui (não há dinheiro), não uma aproximação.
    return 0;
  }
  let repassadoVivo = 0;
  for (const rep of inputs.repasses) {
    if (rep.eventoId !== eventoId) continue;
    if (!comprometeSaldo(rep.estado)) continue;
    repassadoVivo = roundMoney(repassadoVivo + rep.valor);
  }
  return computeDisponivelDoEvento({
    receitaLiquida: evento.receitaLiquida,
    encerrado: evento.encerrado,
    repassadoVivo,
    ...(inputs.retencaoPct !== undefined
      ? { retencaoPct: inputs.retencaoPct }
      : {}),
  }).disponivel;
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
  // RN-369 (DEC-0727C) — eventoId OBRIGATÓRIO. Ausente já não significa
  // "saldo geral": significa payload incompleto, e aceitar seria recriar pelo
  // callable o caminho que o modal acabou de perder.
  const eventoId = input?.eventoId;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"eventoId" é obrigatório: todo repasse é associado a um evento (RN-369).'
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

    // RN-368 — teto DAQUELE evento, na MESMA base da Caixa (RN-367). Compõe
    // com a validação de tenant acima: passar no consolidado não autoriza
    // consumir o liberado de outro evento.
    const disponivelDoEvento = calcularDisponivelDoEvento(inputs, eventoId);
    if (disponivelDoEvento === null) {
      // Evento sem termo comercial: o líquido é indeterminado, então não há
      // teto para comparar. Rejeitar é a resposta honesta (o caminho da
      // decisão #7 acima já cobre o tenant inteiro; este cobre o evento).
      throw new https.HttpsError(
        'failed-precondition',
        `Evento '${eventoId}' sem termo comercial — repasse bloqueado (RN-368/decisão #7).`
      );
    }
    if (valor > disponivelDoEvento) {
      const details: RepasseExcedeEventoDetails = {
        motivo: 'repasse_excede_evento',
        eventoId,
        disponivelDoEvento,
        valorSolicitado: valor,
      };
      throw new https.HttpsError(
        'failed-precondition',
        `Este evento tem R$ ${disponivelDoEvento.toFixed(2)} disponíveis para repasse — o valor pedido excede o liberado dele (RN-368).`,
        details
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
      // RN-349/RN-369: o evento validado acima entra SEMPRE. Docs antigos sem
      // o campo continuam existindo como legado; nenhum doc NOVO nasce assim.
      eventoId,
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
      { id: repasseRef.id, valor, estado: 'solicitado', eventoId },
    ]);

    logger.info('repasse_solicitado', {
      tenantId,
      repasseId: repasseRef.id,
      valor,
      eventoId,
      disponivelRestante: saldo.disponivel,
      disponivelDoEventoRestante: roundMoney(disponivelDoEvento - valor),
    });

    return {
      repasseId: repasseRef.id,
      estado: 'solicitado' as const,
      valor,
      disponivel: saldo.disponivel,
      eventoId,
      // O teto DAQUELE evento DEPOIS desta solicitação (RN-368) — o painel
      // reflete sem um segundo round-trip, pelo mesmo número que autorizou.
      disponivelDoEvento: roundMoney(disponivelDoEvento - valor),
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
