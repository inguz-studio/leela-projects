// =============================================================================
// functions/src/finance/notifyRefund.ts
//
// Registro das notificações da máquina de reembolso (LEELA-S904-T3 · E09 ·
// RN-342): organizador na ABERTURA (obrigatório) + atleta/responsável a cada
// transição. REUSA o log de comunicação FABLE-G (`registrarComunicacao`):
// docId determinístico ⇒ reprocessar NÃO renotifica (RN-219) — a idempotência
// por transição vem do próprio log, sem flag paralela.
//
// DESVIO DELIBERADO DA SPEC (T3 previa "trigger onWrite de reembolsos"): o
// disparo é SÍNCRONO a partir das transições do requestRefund/decideRefund —
// mesmo racional do executor (testável no Emulator, menos superfície, sem
// reentrância de trigger). Crash entre transição e registro ⇒ o RETRY da
// mesma chamada (replay idempotente) recompleta o registro.
//
// FALHA DE NOTIFICAÇÃO NUNCA DERRUBA DINHEIRO: o estorno/decisão já
// persistiu; aqui é trilha. Erro vira logger.error (sem PII) e a chamada
// financeira segue — o registro é recuperável por replay.
//
// ENVIO físico (e-mail) = pendência externa (provider transacional não
// configurado — ação do Vitor); o contrato desta task é o REGISTRO
// auditável em `eventos/{id}/comunicacoes` (aba Comunicação/E06 exibe).
// =============================================================================

import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  notificacoesAberturaReembolso,
  notificacoesTransicaoReembolso,
  type EstadoReembolso,
  type NotificacaoReembolso,
} from '@leela/core';
import { registrarComunicacao } from '../eventos/logComunicacao';

type Db = admin.firestore.Firestore;

async function registrarLote(
  db: Db,
  eventoId: string,
  inscritoId: string,
  notificacoes: NotificacaoReembolso[]
): Promise<void> {
  for (const n of notificacoes) {
    try {
      await registrarComunicacao(db, eventoId, {
        destinatario: n.destinatario,
        canal: 'email',
        tipo: 'transacional',
        chaveRef: n.chave,
        assunto: n.assunto,
        templateRef: n.templateRef,
      });
    } catch (err) {
      // Trilha, não dinheiro: registra a falha (sem PII) e segue — o replay
      // idempotente da chamada financeira recompleta o registro.
      logger.error('reembolso_notificacao_falhou', {
        eventoId,
        inscritoId,
        chave: n.chave,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Notificações da ABERTURA (RN-342): organizador (obrigatório) + recibo e
 * transição inicial ao atleta/responsável. `organizadorUid` vem do doc do
 * evento (`organizadorId`) — lido aqui para não alargar a transação de
 * abertura.
 */
export async function notificarAberturaReembolso(
  db: Db,
  eventoId: string,
  inscritoId: string,
  estadoRoteado: Extract<EstadoReembolso, 'aprovado_auto' | 'em_analise'>
): Promise<void> {
  let organizadorUid = '';
  try {
    const evento = await db.collection('eventos').doc(eventoId).get();
    organizadorUid = (evento.get('organizadorId') as string | undefined) ?? '';
  } catch (err) {
    logger.error('reembolso_notificacao_evento_ilegivel', {
      eventoId,
      erro: err instanceof Error ? err.message : String(err),
    });
  }
  if (organizadorUid.length === 0) {
    // Sem organizador resolvível: registra ao menos as notificações do
    // atleta (recibo + transição) — a do organizador fica no log de erro.
    logger.error('reembolso_notificacao_sem_organizador', { eventoId, inscritoId });
    await registrarLote(
      db,
      eventoId,
      inscritoId,
      notificacoesAberturaReembolso(inscritoId, 'desconhecido', estadoRoteado).filter(
        (n) => n.destinatario.tipo !== 'organizador'
      )
    );
    return;
  }
  await registrarLote(
    db,
    eventoId,
    inscritoId,
    notificacoesAberturaReembolso(inscritoId, organizadorUid, estadoRoteado)
  );
}

/** Notificação de UMA transição ao atleta/responsável (RN-342). */
export async function notificarTransicaoReembolso(
  db: Db,
  eventoId: string,
  inscritoId: string,
  para: EstadoReembolso
): Promise<void> {
  await registrarLote(
    db,
    eventoId,
    inscritoId,
    notificacoesTransicaoReembolso(inscritoId, para)
  );
}
