// =============================================================================
// functions/src/clubs/onComunicadoEnvio.ts
//
// Envio de comunicado (LEELA-E05 · S108-T1). Valida o limite de push do
// clube (RN-133: ≤ 4 push/semana) e mantém o agregado ∑ `alcance` +
// carimbo de envio (status='enviado', enviadoEm) — escrita exclusiva
// Admin SDK (Rules negam cliente).
//
// Contratos:
//   - LIMITE RN-133: janela DESLIZANTE de 7 dias contada de `agora` —
//     mais estrita e determinística que semana-calendário (não há burst de
//     8 push na virada de domingo). Só comunicados com canal push contam;
//     email-only não consome cota.
//   - IDEMPOTENTE: reenviar um comunicado já 'enviado' é no-op (não
//     duplica alcance nem consome cota de novo) — retry-safe.
//   - ALCANCE: segmento 'todos' → recontagem real de membros não-inativos
//     (mesma definição de qtdMembrosAtivos); demais segmentos → fotografia
//     `segmento.tamanhoEstimado` (estimarAlcance — S109-T1), até registros
//     reais existirem (E13).
//
// O disparo físico de push/email é integração futura (fora de escopo da
// story); esta rotina é a máquina de estados testável, chamada por Admin
// SDK (padrão triggers v1 do repo) e futuramente por callable/cron.
// =============================================================================

import type { firestore } from 'firebase-admin';
import { PUSH_SEMANA_MAX, temCanalPush } from '@leela/core';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Janela deslizante do limite RN-133 (7 dias) */
export const JANELA_PUSH_DIAS = 7;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EnvioResultado {
  enviado: boolean;
  motivo:
    | 'ok'
    | 'ja_enviado'
    | 'limite_push_semana'
    | 'comunicado_invalido';
  /** Push enviados na janela (para copy de erro na tela) */
  pushNaJanela?: number;
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

/**
 * Envia um comunicado: valida RN-133, calcula alcance e carimba
 * status='enviado' + enviadoEm. Idempotente para retry.
 */
export async function enviarComunicado(
  db: firestore.Firestore,
  clubId: string,
  comunicadoId: string,
  agora: Date = new Date()
): Promise<EnvioResultado> {
  const clubeRef = db.collection('clubes').doc(clubId);
  const comunicadoRef = clubeRef.collection('comunicados').doc(comunicadoId);

  const snap = await comunicadoRef.get();
  if (!snap.exists) {
    return { enviado: false, motivo: 'comunicado_invalido' };
  }

  // Idempotência: reenvio de doc já enviado é no-op (retry-safe)
  if (snap.get('status') === 'enviado') {
    return { enviado: false, motivo: 'ja_enviado' };
  }

  const canal = (snap.get('canal') ?? []) as string[];

  // RN-133: o 5º push da janela é bloqueado (email-only não conta)
  if (temCanalPush(canal as never)) {
    const pushNaJanela = await contarPushNaJanela(
      db,
      clubId,
      agora,
      comunicadoId
    );
    if (pushNaJanela >= PUSH_SEMANA_MAX) {
      return { enviado: false, motivo: 'limite_push_semana', pushNaJanela };
    }
  }

  const alcance = await calcularAlcance(db, clubId, snap);

  await comunicadoRef.update({
    status: 'enviado',
    enviadoEm: agora,
    alcance,
  });

  return { enviado: true, motivo: 'ok' };
}

// ---------------------------------------------------------------------------
// Limite de push (RN-133)
// ---------------------------------------------------------------------------

/**
 * Conta comunicados ENVIADOS com canal push na janela deslizante de 7 dias.
 * `exceto` exclui o próprio doc (defesa contra recontagem em retry parcial).
 */
export async function contarPushNaJanela(
  db: firestore.Firestore,
  clubId: string,
  agora: Date,
  exceto?: string
): Promise<number> {
  const inicioJanela = new Date(agora.getTime() - JANELA_PUSH_DIAS * DIA_MS);

  const enviados = await db
    .collection('clubes')
    .doc(clubId)
    .collection('comunicados')
    .where('status', '==', 'enviado')
    .where('canal', 'array-contains', 'push')
    .where('enviadoEm', '>=', inicioJanela)
    .get();

  return enviados.docs.filter((d) => d.id !== exceto).length;
}

// ---------------------------------------------------------------------------
// Alcance (∑)
// ---------------------------------------------------------------------------

/**
 * Alcance do envio: 'todos' → recontagem real de membros não-inativos;
 * segmentos específicos → fotografia `segmento.tamanhoEstimado` (S109-T1).
 */
async function calcularAlcance(
  db: firestore.Firestore,
  clubId: string,
  snap: firestore.DocumentSnapshot
): Promise<number> {
  const segmento = (snap.get('segmento') ?? {}) as {
    tipo?: string;
    tamanhoEstimado?: number;
  };

  if (segmento.tipo === 'todos') {
    const countSnap = await db
      .collection('clubes')
      .doc(clubId)
      .collection('membros')
      .where('status', 'in', ['ativo', 'novo'])
      .count()
      .get();
    return countSnap.data().count;
  }

  return segmento.tamanhoEstimado ?? 0;
}
