// =============================================================================
// functions/src/finance/cancelarInscricao.ts
//
// CANCELAR SEM ESTORNAR (decisão 45 do dono · T4 · RN-377/378).
//
// "sim, o admin pode cancelar qualquer coisa. e o organizador também, se
// estiver dentro da regra de cancelamento."
//
// O que existia até aqui: o ÚNICO jeito de tirar uma inscrição paga do evento
// era estornar (L7 do inventário). Cortesia, no-show e fraude não tinham
// caminho — ou se devolvia o dinheiro, ou se deixava o atleta na lista.
//
// O que esta ação é, e o que ela NÃO é:
//   É   — transição auditada `confirmado|pendente → cancelado` do inscrito,
//         com motivo obrigatório e doc de trilha próprio.
//   NÃO — não toca no gateway, não toca no pagamento, não reverte receita,
//         não mexe em comissão de afiliado. O dinheiro FICA. Quem quer
//         devolver dinheiro usa a máquina de reembolso, que é outra porta.
//
// EFEITOS "como no estorno", por CONSTRUÇÃO (nenhum código novo de agregação):
//   kit      — `agregarEstoque` filtra `status == 'confirmado'`, então o SKU
//              volta ao aprovisionamento, igual ao estorno;
//   balcão   — as guardas de kit/chip/check-in usam `podeAtender`, que já
//              recusa `cancelado`;
//   vaga     — `virarLote` mantém `vendidos` MONOTÔNICO (ratchet), então a
//              vaga NÃO volta e o degrau de preço não regride (RN-304);
//   receita  — `agregarFinanceiro` deriva de PAGAMENTOS confirmados menos
//              `estornadoTotal`; nada aqui toca nisso, logo a receita fica
//              exatamente onde estava. É o "dinheiro fica" verificável.
//
// GUARDS: admin da plataforma cancela qualquer coisa (decisão 45);
// organizador só DENTRO da regra — a mesma `rotearReembolso` que governa o
// reembolso, isto é, fora do corte de véspera (RN-339). Não confundir com a
// janela de arrependimento: o corte é o que protege a operação do dia.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  rotearReembolso,
  type AuthClaims,
  type StatusInscrito,
  type TrilhaOperacao,
} from '@leela/core';
import { type EventoCaller } from '../eventos/criarEvento';
import { lerPoliticaReembolsoTx } from '../eventos/lerPoliticaVendas';
import {
  assertPapelDeEscritaOuAdmin,
  assertTenantAtivoSeOrganizador,
  resolverOperador,
} from './operador';

type Db = admin.firestore.Firestore;

/** Trilha de cancelamento sem dinheiro (write só Function; docId = inscritoId). */
export const CANCELAMENTOS_SUBCOL = 'cancelamentos';

export const MOTIVO_CANCELAMENTO_MIN = 3;
export const MOTIVO_CANCELAMENTO_MAX = 500;

export interface CancelarInscricaoInput {
  pedidoId: string;
  inscritoId: string;
  /** Motivo (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

export interface CancelarInscricaoResult {
  eventoId: string;
  inscritoId: string;
  estado: 'cancelado';
  /** true = a chamada não produziu efeito novo (replay idempotente). */
  replay: boolean;
  /** Por qual porta entrou — organizador do tenant ou admin da plataforma. */
  trilha: TrilhaOperacao;
  /** Status do inscrito ANTES do cancelamento (trilha honesta na tela). */
  statusAnterior: StatusInscrito;
}

/** Valida o input bruto. @pure */
export function validarCancelarInscricaoInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];
  if (typeof input['pedidoId'] !== 'string' || input['pedidoId'].length === 0) {
    erros.push('"pedidoId" é obrigatório.');
  }
  if (typeof input['inscritoId'] !== 'string' || input['inscritoId'].length === 0) {
    erros.push('"inscritoId" é obrigatório.');
  }
  const motivo = input['motivo'];
  if (typeof motivo !== 'string' || motivo.trim().length < MOTIVO_CANCELAMENTO_MIN) {
    erros.push(`"motivo" é obrigatório (mínimo ${MOTIVO_CANCELAMENTO_MIN} caracteres).`);
  } else if (motivo.trim().length > MOTIVO_CANCELAMENTO_MAX) {
    erros.push(`"motivo" excede ${MOTIVO_CANCELAMENTO_MAX} caracteres.`);
  }
  return erros;
}

/**
 * Cancela UM inscrito do pedido SEM devolver dinheiro (RN-377). Idempotente
 * por (eventoId, inscritoId): a segunda chamada devolve replay sem escrita.
 */
export async function cancelarInscricaoCore(
  db: Db,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<CancelarInscricaoResult> {
  assertPapelDeEscritaOuAdmin(caller.claims);

  const erros = validarCancelarInscricaoInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `CancelarInscricaoInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as CancelarInscricaoInput;
  const motivo = input.motivo.trim();

  const operador = await resolverOperador(db, caller, {
    colecao: 'pedidos',
    docId: input.pedidoId,
  });
  await assertTenantAtivoSeOrganizador(db, operador);

  const pedidoRef = db.collection('pedidos').doc(input.pedidoId);

  const resultado = await db.runTransaction(async (tx) => {
    // ── LEITURAS ───────────────────────────────────────────────────────────
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists) {
      throw new https.HttpsError('not-found', `Pedido '${input.pedidoId}' não existe.`);
    }
    if (pedidoSnap.get('tenantId') !== operador.tenantId) {
      throw new https.HttpsError('permission-denied', 'Pedido pertence a outro tenant (RN-400).');
    }
    const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[]) ?? [];
    if (!inscritoRefs.includes(input.inscritoId)) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' não pertence ao pedido '${input.pedidoId}' (ADR-011).`
      );
    }
    const eventoId = pedidoSnap.get('eventoId') as string;
    const compradoEm = pedidoSnap.get('criadoEm') as Timestamp | undefined;

    const eventoRef = db.collection('eventos').doc(eventoId);
    const inscritoRef = eventoRef.collection('inscritos').doc(input.inscritoId);
    const trilhaRef = eventoRef.collection(CANCELAMENTOS_SUBCOL).doc(input.inscritoId);

    const [eventoSnap, inscritoSnap, trilhaSnap] = await Promise.all([
      tx.get(eventoRef),
      tx.get(inscritoRef),
      tx.get(trilhaRef),
    ]);
    if (!inscritoSnap.exists) {
      throw new https.HttpsError('not-found', `Inscrito '${input.inscritoId}' não existe.`);
    }
    const status = inscritoSnap.get('status') as StatusInscrito;

    // REPLAY: a trilha já existe ⇒ este cancelamento já aconteceu. Devolve o
    // que está gravado, sem segunda escrita e sem erro (retry do operador em
    // rede ruim não pode virar mensagem de falha).
    if (trilhaSnap.exists) {
      return {
        eventoId,
        inscritoId: input.inscritoId,
        estado: 'cancelado' as const,
        replay: true,
        trilha: operador.trilha,
        statusAnterior: (trilhaSnap.get('statusAnterior') as StatusInscrito) ?? status,
      };
    }

    // ESTORNADO é terminal e tem dinheiro atrás: cancelar depois não é ação,
    // é apagar a trilha do que foi devolvido.
    if (status === 'estornado') {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' já foi ESTORNADO — o dinheiro voltou ao pagador. ` +
          'Não há o que cancelar.'
      );
    }
    if (status === 'cancelado') {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' já está cancelado por outro caminho ` +
          '(carrinho expirado, por exemplo) — sem trilha para registrar.'
      );
    }
    if (status !== 'confirmado' && status !== 'pendente') {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' está '${String(status)}' — transição não permitida.`
      );
    }

    // ── REGRA DE CANCELAMENTO (decisão 45) ─────────────────────────────────
    // Admin cancela qualquer coisa. Organizador, só dentro da regra: o corte
    // de véspera (RN-339) da política do evento. Sem data do evento ou de
    // compra não dá para afirmar que está dentro — falha fechada.
    if (operador.trilha === 'organizador') {
      const dataEvento = eventoSnap.get('data') as Timestamp | undefined;
      if (!dataEvento || !compradoEm) {
        throw new https.HttpsError(
          'internal',
          'Pedido/evento sem datas — a regra de cancelamento não pode ser avaliada.'
        );
      }
      const politica = await lerPoliticaReembolsoTx(tx, db, eventoId, operador.tenantId);
      if (rotearReembolso(politica, compradoEm, dataEvento, agora) === 'bloqueado_corte') {
        throw new https.HttpsError(
          'failed-precondition',
          `Faltam ${politica.corteHoras}h ou menos para o evento (RN-339): o organizador ` +
            'não cancela nesta janela. Cancelar aqui é ação do admin da plataforma.'
        );
      }
    }

    // ── ESCRITA ────────────────────────────────────────────────────────────
    const agoraTs = FieldValue.serverTimestamp();
    tx.update(inscritoRef, {
      status: 'cancelado',
      canceladoEm: agoraTs,
      atualizadoEm: agoraTs,
    });
    tx.create(trilhaRef, {
      id: input.inscritoId,
      tenantId: operador.tenantId,
      eventoId,
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      motivo,
      statusAnterior: status,
      // O nome do campo é a promessa: esta ação nunca move dinheiro.
      dinheiroDevolvido: false,
      trilha: operador.trilha,
      por: caller.uid,
      papel: caller.claims.role ?? 'desconhecido',
      criadoEm: agoraTs,
    });

    return {
      eventoId,
      inscritoId: input.inscritoId,
      estado: 'cancelado' as const,
      replay: false,
      trilha: operador.trilha,
      statusAnterior: status,
    };
  });

  if (!resultado.replay) {
    logger.info('inscricao_cancelada_sem_estorno', {
      eventoId: resultado.eventoId,
      inscritoId: resultado.inscritoId,
      pedidoId: input.pedidoId,
      trilha: resultado.trilha,
      statusAnterior: resultado.statusAnterior,
      por: caller.uid,
    });
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

function callerDe(context: https.CallableContext): EventoCaller {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return { uid: context.auth.uid, claims: context.auth.token as unknown as AuthClaims };
}

export const cancelarInscricao = https.onCall(async (data: unknown, context) =>
  cancelarInscricaoCore(admin.firestore(), data, callerDe(context))
);
