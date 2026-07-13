// =============================================================================
// functions/src/eventos/estimarAlcance.ts
//
// Cloud Function callable: estimativa de alcance de um segmento de campanha
// (LEELA-E06-L2-T1 · S401-T1). Contrato:
//   estimarAlcance({ eventoId, segmento }) -> { tamanho }
//
// DIFERENÇA DELIBERADA vs. o clube (Camada C — brief E06-L1): o clube tem
// `estimarAlcance` PURO sobre agregados que ele já mantém; o EVENTO não tem
// agregados por-modalidade/por-kit — a estimativa é uma contagem count()
// ON-DEMAND sobre `eventos/{id}/inscritos`. É count() no SERVIDOR, nunca
// cálculo no cliente (o editor S401-T3 chama debounced a cada troca).
//
// PII (Schneier): a Function usa APENAS aggregate count() — nenhum doc de
// inscrito é lido/transportado; nome/CPF/telefone nunca saem do servidor
// para estimar um número.
//
// Semântica (aceites E06-L2-T1):
//   - `todos_inscritos`  → inscritos ATIVOS (não-cancelado E não-estornado —
//     `inscritoAtivo` do core é a fonte da definição; a lista de status
//     ativos é DERIVADA dela, nunca redeclarada);
//   - `por_modalidade`   → ativos do percurso (ref = string do evento);
//   - `por_kit`          → ativos do kit (ref ∈ enum RN-202);
//   - `por_status`       → contagem DIRETA do status (ref ∈ enum RN-204;
//     'pendente' conta os pendentes — o filtro É o status pedido);
//   - referência que não casa com nenhum inscrito → 0 (count vazio);
//     referência FORA do enum → invalid-argument (validarSegmentoCampanha).
//
// ÍNDICES: todas as queries são igualdade pura (modalidade==X && status==Y);
// o Firestore atende por index merging de single-field — nenhum índice
// composto novo. O `in` foi evitado de propósito (soma de counts por status
// ativo) para ficar 100% em igualdade simples.
//
// Autorização: papel de escrita do tenant (assertTenantWriter — RN-401) +
// evento do PRÓPRIO tenant (RN-400). Erros sem PII.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  STATUS_INSCRITO,
  inscritoAtivo,
  validarSegmentoCampanha,
  type AuthClaims,
  type SegmentoCampanha,
  type StatusInscrito,
} from '@leela/core';
import { assertTenantWriter, type EventoCaller } from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface EstimarAlcanceInput {
  eventoId: string;
  segmento: Pick<SegmentoCampanha, 'tipo' | 'referencia'>;
}

export interface EstimarAlcanceResult {
  tamanho: number;
}

/**
 * Status que contam como "ativo" — DERIVADOS de `inscritoAtivo` (fonte
 * única da definição RN-204: cancelado e estornado ficam fora).
 */
const STATUS_ATIVOS: readonly StatusInscrito[] = STATUS_INSCRITO.filter(
  (status) => inscritoAtivo({ status })
);

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function estimarAlcanceCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller
): Promise<EstimarAlcanceResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<EstimarAlcanceInput> | null;
  const eventoId = input?.eventoId;
  const segmento = input?.segmento;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }
  const errosSegmento = validarSegmentoCampanha(segmento ?? null);
  if (errosSegmento.length > 0 || segmento === undefined) {
    throw new https.HttpsError(
      'invalid-argument',
      `segmento inválido: ${errosSegmento.join('; ')}`
    );
  }

  const eventoRef = db.collection('eventos').doc(eventoId);
  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists) {
    throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
  }
  if (eventoSnap.get('tenantId') !== tenantId) {
    throw new https.HttpsError(
      'permission-denied',
      'Evento pertence a outro tenant (RN-400).'
    );
  }

  const inscritos = eventoRef.collection('inscritos');

  /** count() agregado de uma query — nenhum doc é lido (PII mínima). */
  const contar = async (q: FirebaseFirestore.Query): Promise<number> =>
    (await q.count().get()).data().count;

  /** Soma de counts por status ATIVO (igualdade pura — sem `in`). */
  const contarAtivos = async (
    filtro?: { campo: 'modalidade' | 'kit'; valor: string }
  ): Promise<number> => {
    let total = 0;
    for (const status of STATUS_ATIVOS) {
      let q: FirebaseFirestore.Query = inscritos.where(
        'status',
        '==',
        status
      );
      if (filtro) q = q.where(filtro.campo, '==', filtro.valor);
      total += await contar(q);
    }
    return total;
  };

  let tamanho: number;
  switch (segmento.tipo) {
    case 'todos_inscritos':
      tamanho = await contarAtivos();
      break;
    case 'por_modalidade':
      tamanho = await contarAtivos({
        campo: 'modalidade',
        valor: segmento.referencia as string,
      });
      break;
    case 'por_kit':
      tamanho = await contarAtivos({
        campo: 'kit',
        valor: segmento.referencia as string,
      });
      break;
    case 'por_status':
      tamanho = await contar(
        inscritos.where('status', '==', segmento.referencia as string)
      );
      break;
  }

  // Sem PII no log — só ids e o número agregado (LGPD)
  logger.info('alcance_estimado', {
    tenantId,
    eventoId,
    tipo: segmento.tipo,
    tamanho,
  });

  return { tamanho };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `estimarAlcance` — callable do editor de campanha (S401-T3 consome). */
export const estimarAlcance = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return estimarAlcanceCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
