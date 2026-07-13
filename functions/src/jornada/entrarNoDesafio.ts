// =============================================================================
// functions/src/jornada/entrarNoDesafio.ts
//
// Callable de ENTRADA no desafio (LEELA-S1308-T1 · E13 adiantado · Onda 2
// T2-L2 · RN-117). É a fronteira REAL da visibilidade para atletas: Rules
// não conseguem checar "é membro do clube" por uid (membros/{docId} não é
// keyed por uid) — a validação acontece AQUI, com dados relidos do
// Firestore (nunca payload do cliente).
//
// Fluxo:
//   1. resolve o contexto do caller no SERVIDOR: membro não-inativo do
//      clube (query por atletaId + derivarStatus RN-102) e convite
//      explícito (`desafios/{id}/convites/{uid}`);
//   2. podeParticipar (@leela/core — RN-117 pura) decide;
//   3. cria `participantes/{uid}` em TRANSAÇÃO (idempotente: já existe ⇒
//      replay=true, nada muda);
//   4. recompute da participação (absorve registros gravados ANTES do join
//      — fecha o gap do gate anti-spoof do S1307) + ∑ do desafio por
//      RECONTAGEM count() (chamar 2× incrementa UMA vez).
// =============================================================================

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  contaComoAtivo,
  derivarStatus,
  podeParticipar,
  type Desafio,
  type StatusMembro,
} from '@leela/core';
import { recomputarParticipacao } from './onRegistroWrite';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface EntrarNoDesafioInput {
  clubeId: string;
  desafioId: string;
}

export interface EntrarNoDesafioResult {
  participanteId: string;
  /** true = já participava (retry idempotente — nada mudou). */
  replay: boolean;
  /** ∑ recontado após a entrada. */
  qtdParticipantes: number;
}

/** Caller mínimo (uid do token — o cliente NUNCA escolhe o atleta). */
export interface JornadaCaller {
  uid: string;
}

// ---------------------------------------------------------------------------
// Núcleo (testável no Emulator via Admin SDK — padrão callables v1)
// ---------------------------------------------------------------------------

function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

/** Membro NÃO-inativo do clube? (RN-102 — status derivado por data). */
async function resolverMembroAtivo(
  db: Db,
  clubeId: string,
  uid: string,
  agora: Date
): Promise<boolean> {
  const snap = await db
    .collection('clubes').doc(clubeId)
    .collection('membros')
    .where('atletaId', '==', uid)
    .limit(1)
    .get();
  if (snap.empty) return false;

  const membro = snap.docs[0]!;
  // Status persistido pode estar velho (cron 03:00) — deriva por data,
  // mesma fonte RN-102 da Function de membros; fallback ao persistido.
  const entrouEm = toDate(membro.get('entrouEm'));
  if (entrouEm) {
    const status = derivarStatus(
      entrouEm,
      toDate(membro.get('ultimaAtividadeEm')),
      agora
    );
    return contaComoAtivo(status);
  }
  const persistido = membro.get('status') as StatusMembro | undefined;
  return persistido ? contaComoAtivo(persistido) : false;
}

export async function entrarNoDesafioCore(
  db: Db,
  rawInput: unknown,
  caller: JornadaCaller,
  agora: Date = new Date()
): Promise<EntrarNoDesafioResult> {
  const input = rawInput as Partial<EntrarNoDesafioInput> | null;
  const clubeId = input?.clubeId;
  const desafioId = input?.desafioId;
  if (
    typeof clubeId !== 'string' || clubeId.length === 0 ||
    typeof desafioId !== 'string' || desafioId.length === 0
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"clubeId" e "desafioId" são obrigatórios (path aninhado ADR-009).'
    );
  }

  const desafioRef = db
    .collection('clubes').doc(clubeId)
    .collection('desafios').doc(desafioId);
  const desafioSnap = await desafioRef.get();
  if (!desafioSnap.exists) {
    throw new https.HttpsError('not-found', 'Desafio não encontrado.');
  }
  const desafio = desafioSnap.data() as Pick<Desafio, 'status' | 'visibilidade'>;

  // Contexto SEMPRE resolvido no servidor (RN-117)
  const [membroAtivo, conviteSnap] = await Promise.all([
    resolverMembroAtivo(db, clubeId, caller.uid, agora),
    desafioRef.collection('convites').doc(caller.uid).get(),
  ]);

  const decisao = podeParticipar(desafio, {
    membroAtivo,
    convidado: conviteSnap.exists,
  });
  if (!decisao.ok) {
    const mensagens: Record<string, string> = {
      desafio_nao_ativo: 'O desafio não está ativo.',
      exige_membro_do_clube:
        'Este desafio é só para membros do clube (RN-117).',
      exige_convite: 'Este desafio é por convite (RN-117).',
    };
    throw new https.HttpsError(
      decisao.motivo === 'desafio_nao_ativo'
        ? 'failed-precondition'
        : 'permission-denied',
      mensagens[decisao.motivo ?? ''] ?? 'Participação negada.'
    );
  }

  // Criação idempotente da participação (transação — corrida de retry)
  const participanteRef = desafioRef.collection('participantes').doc(caller.uid);
  const replay = await db.runTransaction(async (tx) => {
    const fresco = await tx.get(participanteRef);
    if (fresco.exists) return true;
    tx.set(participanteRef, {
      atletaId: caller.uid,
      clubeId,
      desafioId,
      entrouEm: Timestamp.fromDate(agora),
      pontos: 0,
      pontosPorPilar: { fisico: 0, mental: 0, espiritual: 0 },
      diasAtivos: 0,
    });
    return false;
  });

  // Recompute absorve registros anteriores ao join + ∑ por recontagem
  await recomputarParticipacao(db, caller.uid, clubeId, desafioId);

  const qtd = (
    await desafioRef.collection('participantes').count().get()
  ).data().count;

  logger.info('entrar_no_desafio', {
    uid: caller.uid, clubeId, desafioId, replay, qtdParticipantes: qtd,
  });

  return { participanteId: caller.uid, replay, qtdParticipantes: qtd };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const entrarNoDesafio = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return entrarNoDesafioCore(admin.firestore(), data, { uid: context.auth.uid });
});
