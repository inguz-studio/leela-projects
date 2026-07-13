// =============================================================================
// functions/src/jornada/onRegistroWrite.ts
//
// Agregação de participação no desafio a partir dos registros de ação
// (LEELA-S1307-T1 · E13 adiantado · Onda 2 T2-L2 · RN-114/115).
//
// Trigger: onWrite de `atletas/{uid}/registros/{registroId}` → para cada par
// (clubeId, desafioId) afetado (before ∪ after), RECOMPUTE TOTAL da
// participação:
//   - registros do atleta para aquele desafio, FILTRADOS pela janela
//     [dataInicio, dataFim] e validados contra o CATÁLOGO (RN-114 — pilar/
//     unidade divergentes ou ação inexistente NÃO pontuam);
//   - pontos com bônus RN-115 via calcularPontos (@leela/core — fonte única:
//     +20% dia com 3 pilares, +10% semana com 5+ dias, acumuláveis);
//   - grava `clubes/{c}/desafios/{d}/participantes/{uid}` (pontos,
//     pontosPorPilar, diasAtivos) PRESERVANDO entrouEm/atletaId;
//   - ∑ do desafio: qtdParticipantes por RECONTAGEM count() + progressoPct/
//     progressoPorPilar derivados de TODOS os participantes.
//
// IDEMPOTENTE por construção: recompute do estado completo — reprocessar o
// mesmo registro (retry at-least-once) produz o MESMO agregado; nada de
// increment.
//
// ANTI-SPOOF (gate de participação): o agregado SÓ é escrito se
// `participantes/{uid}` JÁ EXISTE — participação nasce em entrarNoDesafio
// (S1308-T1, valida RN-117) ou seed. Registro apontando para desafio não
// participado NÃO materializa o atleta em board/participantes de desafio
// privado; os registros ficam latentes e contam quando a participação
// nascer (entrarNoDesafio dispara este mesmo recompute).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  agregarParticipante,
  dentroDaJanelaDesafio,
  derivarProgressoDesafio,
  derivarProgressoPorPilar,
  getAcaoCatalogo,
  metaTotalEmPontos,
  paraRegistroAcao,
  validarRegistro,
  type AcaoDesafio,
  type Desafio,
  type ParticipanteAgregado,
  type Pilar,
  type RegistroAcao,
} from '@leela/core';
import { recomputarBoardConsistencia } from './boardConsistencia';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Doc `clubes/{c}/desafios/{d}/participantes/{uid}` (∑ — só Function). */
export interface ParticipanteDoc extends ParticipanteAgregado {
  atletaId: string;
  clubeId: string;
  desafioId: string;
  /** Preservado do entrarNoDesafio (nunca sobrescrito pelo recompute). */
  entrouEm?: unknown;
}

export interface ResultadoRecomputeParticipacao {
  /** false = desafio inexistente OU atleta sem participação (anti-spoof). */
  agregado: boolean;
  registrosConsiderados: number;
  pontos: number;
  diasAtivos: number;
}

// ---------------------------------------------------------------------------
// Núcleo (testável no Emulator via Admin SDK — padrão ADR-007/triggers v1)
// ---------------------------------------------------------------------------

function toDate(v: unknown): Date | null {
  if (
    v &&
    typeof v === 'object' &&
    typeof (v as { toDate?: unknown }).toDate === 'function'
  ) {
    return (v as { toDate(): Date }).toDate();
  }
  return null;
}

/**
 * Recompute total da participação de UM atleta em UM desafio + ∑ do desafio.
 * Idempotente. Exportado para reuso por entrarNoDesafio (S1308-T1) e seeds.
 */
export async function recomputarParticipacao(
  db: Db,
  uid: string,
  clubeId: string,
  desafioId: string
): Promise<ResultadoRecomputeParticipacao> {
  const desafioRef = db
    .collection('clubes').doc(clubeId)
    .collection('desafios').doc(desafioId);
  const participanteRef = desafioRef.collection('participantes').doc(uid);

  const [desafioSnap, participanteSnap] = await Promise.all([
    desafioRef.get(),
    participanteRef.get(),
  ]);

  if (!desafioSnap.exists) {
    logger.warn('registro_para_desafio_inexistente', { uid, clubeId, desafioId });
    return { agregado: false, registrosConsiderados: 0, pontos: 0, diasAtivos: 0 };
  }
  if (!participanteSnap.exists) {
    // Anti-spoof: sem participação (RN-117 validada no entrarNoDesafio),
    // registro não materializa o atleta no desafio.
    logger.info('registro_sem_participacao', { uid, clubeId, desafioId });
    return { agregado: false, registrosConsiderados: 0, pontos: 0, diasAtivos: 0 };
  }

  const inicio = toDate(desafioSnap.get('dataInicio'));
  const fim = toDate(desafioSnap.get('dataFim'));

  // Registros do atleta para ESTE desafio (equality-only — índices
  // single-field bastam, nenhuma entrada em firestore.indexes.json)
  const registrosSnap = await db
    .collection('atletas').doc(uid)
    .collection('registros')
    .where('clubeId', '==', clubeId)
    .where('desafioId', '==', desafioId)
    .get();

  const inputs: RegistroAcao[] = [];
  for (const doc of registrosSnap.docs) {
    const acao = getAcaoCatalogo((doc.get('acaoRef') as string) ?? '');
    const dataReg = toDate(doc.get('data'));
    if (!acao || !dataReg) continue; // fora do catálogo/corrompido não pontua
    const erros = validarRegistro(
      {
        acaoRef: doc.get('acaoRef') as string,
        pilar: doc.get('pilar') as Pilar,
        quantidade: doc.get('quantidade') as number,
        unidade: doc.get('unidade') as string,
        origem: doc.get('origem') as never,
        clubeId,
        desafioId,
      },
      acao
    );
    if (erros.length > 0) {
      logger.warn('registro_invalido_ignorado', { uid, registroId: doc.id, erros });
      continue;
    }
    if (inicio && fim && !dentroDaJanelaDesafio(dataReg, inicio, fim)) {
      continue; // fora da janela do desafio não conta (ética da consistência)
    }
    inputs.push(
      paraRegistroAcao(
        { acaoRef: acao.id, quantidade: doc.get('quantidade') as number, data: dataReg },
        acao
      )
    );
  }

  const agregado = agregarParticipante(inputs);

  // Participante: substituição total do AGREGADO, preservando identidade
  // e trilha de entrada (entrouEm) — transação contra corrida com o join.
  await db.runTransaction(async (tx) => {
    const fresco = await tx.get(participanteRef);
    if (!fresco.exists) return; // participação sumiu no meio — não recria
    tx.set(participanteRef, {
      atletaId: uid,
      clubeId,
      desafioId,
      entrouEm: fresco.get('entrouEm') ?? null,
      pontos: agregado.pontos,
      pontosPorPilar: agregado.pontosPorPilar,
      diasAtivos: agregado.diasAtivos,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });

  await recomputarAgregadosDesafio(db, clubeId, desafioId);
  // Board de consistência (S1308-T3 · decisão 2): registrar ação nova
  // recomputa board/current no MESMO ciclo do fan-out.
  await recomputarBoardConsistencia(db, clubeId, desafioId);

  return {
    agregado: true,
    registrosConsiderados: inputs.length,
    pontos: agregado.pontos,
    diasAtivos: agregado.diasAtivos,
  };
}

/**
 * ∑ do desafio por RECONTAGEM (qtdParticipantes, progressoPct,
 * progressoPorPilar) — mesmo padrão idempotente de desafiosAggregates.
 */
export async function recomputarAgregadosDesafio(
  db: Db,
  clubeId: string,
  desafioId: string
): Promise<void> {
  const desafioRef = db
    .collection('clubes').doc(clubeId)
    .collection('desafios').doc(desafioId);

  const [desafioSnap, participantesSnap, acoesSnap] = await Promise.all([
    desafioRef.get(),
    desafioRef.collection('participantes').get(),
    desafioRef.collection('acoes').get(),
  ]);
  if (!desafioSnap.exists) return;

  const participantes = participantesSnap.docs.map((d) => ({
    pontos: (d.get('pontos') as number) ?? 0,
    pontosPorPilar:
      (d.get('pontosPorPilar') as Record<Pilar, number>) ??
      ({ fisico: 0, mental: 0, espiritual: 0 } as Record<Pilar, number>),
  }));

  const desafio = desafioSnap.data() as Pick<Desafio, 'modelo' | 'metaTotalPontos' | 'minimoPorPilar'>;
  const acoes: AcaoDesafio[] = acoesSnap.docs.map((d) => ({
    acaoRef: (d.get('acaoRef') as string) ?? d.id,
    ...(typeof d.get('meta') === 'number' ? { meta: d.get('meta') as number } : {}),
  }));

  const meta = metaTotalEmPontos(desafio, acoes, getAcaoCatalogo);
  const progressoPct = derivarProgressoDesafio(participantes, meta);
  const progressoPorPilar = derivarProgressoPorPilar(
    participantes,
    desafio.minimoPorPilar as Partial<Record<Pilar, number>> | undefined
  );

  const update: Record<string, unknown> = {
    qtdParticipantes: participantesSnap.size,
    progressoPct,
  };
  if (progressoPorPilar) update['progressoPorPilar'] = progressoPorPilar;

  await desafioRef.update(update);
}

// ---------------------------------------------------------------------------
// Trigger (fan-out — padrão v1 do repo)
// ---------------------------------------------------------------------------

/** Pares (clubeId, desafioId) afetados por um write (before ∪ after). */
function paresAfetados(change: {
  before: FirebaseFirestore.DocumentSnapshot;
  after: FirebaseFirestore.DocumentSnapshot;
}): { clubeId: string; desafioId: string }[] {
  const pares = new Map<string, { clubeId: string; desafioId: string }>();
  for (const snap of [change.before, change.after]) {
    if (!snap.exists) continue;
    const clubeId = snap.get('clubeId') as unknown;
    const desafioId = snap.get('desafioId') as unknown;
    if (
      typeof clubeId === 'string' && clubeId.length > 0 &&
      typeof desafioId === 'string' && desafioId.length > 0
    ) {
      pares.set(`${clubeId}/${desafioId}`, { clubeId, desafioId });
    }
  }
  return [...pares.values()];
}

export const onRegistroWrite = firestore
  .document('atletas/{uid}/registros/{registroId}')
  .onWrite(async (change, context) => {
    const uid = context.params['uid'] as string;
    const db = admin.firestore();
    for (const { clubeId, desafioId } of paresAfetados(change)) {
      const resultado = await recomputarParticipacao(db, uid, clubeId, desafioId);
      logger.info('participacao_recomputada', {
        uid, clubeId, desafioId,
        agregado: resultado.agregado,
        registros: resultado.registrosConsiderados,
      });
    }
  });
