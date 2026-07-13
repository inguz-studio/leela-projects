// =============================================================================
// functions/src/clubs/onComunicadoEnvio.ts
//
// Envio de comunicado do CLUBE (LEELA-E05 · S108-T1) — CASCA FINA sobre o
// envelope genérico `shared/comunicacaoEnvio.ts` (E06-L1-T1 · Camada B).
// O envelope carrega os contratos (RN-133 janela deslizante 7d, idempotência
// de reenvio, transação única, carimbo status/enviadoEm/alcance); aqui fica
// SÓ o que é do clube: o caminho `clubes/{id}/comunicados` e o alcance
// (segmento 'todos' → recontagem real de membros não-inativos; demais →
// fotografia `segmento.tamanhoEstimado` — S109-T1, até registros reais E13).
//
// API pública 100% estável (enviarComunicado, contarPushNaJanela,
// JANELA_PUSH_DIAS, EnvioResultado) — nenhum caller/teste E05 muda.
//
// O disparo físico de push/email é integração futura (fora de escopo da
// story); esta rotina é a máquina de estados testável, chamada por Admin
// SDK (padrão triggers v1 do repo) e futuramente por callable/cron.
// =============================================================================

import type { firestore } from 'firebase-admin';
import {
  contarPushNaJanelaColecao,
  executarEnvioComunicacao,
} from '../shared/comunicacaoEnvio';

// Re-export estável: constantes/tipos do envelope fazem parte da API deste
// módulo desde S108-T1 (testes e consumidores importam daqui).
export { JANELA_PUSH_DIAS } from '../shared/comunicacaoEnvio';
export type { EnvioResultado } from '../shared/comunicacaoEnvio';

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

/** Coleção canônica dos comunicados do clube. */
function comunicadosDoClube(
  db: firestore.Firestore,
  clubId: string
): firestore.CollectionReference {
  return db.collection('clubes').doc(clubId).collection('comunicados');
}

/**
 * Envia um comunicado: valida RN-133, calcula alcance e carimba
 * status='enviado' + enviadoEm. Idempotente para retry e TRANSACIONAL
 * (fix #05) — comportamento integral no envelope compartilhado.
 */
export async function enviarComunicado(
  db: firestore.Firestore,
  clubId: string,
  comunicadoId: string,
  agora: Date = new Date()
) {
  const clubeRef = db.collection('clubes').doc(clubId);

  return executarEnvioComunicacao(
    db,
    comunicadosDoClube(db, clubId),
    comunicadoId,
    (tx, snap) => calcularAlcance(tx, clubeRef, snap),
    agora
  );
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
  return contarPushNaJanelaColecao(
    comunicadosDoClube(db, clubId),
    agora,
    exceto
  );
}

// ---------------------------------------------------------------------------
// Alcance (∑) — Camada C do clube
// ---------------------------------------------------------------------------

/**
 * Alcance do envio: 'todos' → recontagem real de membros não-inativos;
 * segmentos específicos → fotografia `segmento.tamanhoEstimado` (S109-T1).
 * Roda DENTRO da transação de envio (fix #05) — o count agregado participa
 * do snapshot da tx.
 */
async function calcularAlcance(
  tx: firestore.Transaction,
  clubeRef: firestore.DocumentReference,
  snap: firestore.DocumentSnapshot
): Promise<number> {
  const segmento = (snap.get('segmento') ?? {}) as {
    tipo?: string;
    tamanhoEstimado?: number;
  };

  if (segmento.tipo === 'todos') {
    const countSnap = await tx.get(
      clubeRef
        .collection('membros')
        .where('status', 'in', ['ativo', 'novo'])
        .count()
    );
    return countSnap.data().count;
  }

  return segmento.tamanhoEstimado ?? 0;
}
