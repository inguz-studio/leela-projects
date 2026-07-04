// =============================================================================
// functions/src/clubs/onConversao.ts
//
// Registro de conversão de afiliação (LEELA-E05 · S107-T1).
// Mantém os agregados ∑ `conversoes` e `valorAReceber` da parceria
// evento_afiliado (RN-125) — escrita exclusiva Admin SDK (Rules negam
// cliente).
//
// Contratos:
//   - IDEMPOTENTE por dedup key: cada conversão carrega `conversaoId`
//     (id da transação de pagamento — E12/E04). Reprocessar o mesmo evento
//     (retry de webhook) encontra o doc `conversoes/{conversaoId}` já
//     criado e vira no-op.
//   - JANELA DE ATRIBUIÇÃO (RN-125): conversão fora da janela contada do
//     clique inicial NÃO registra nem incrementa (limite inclusivo).
//   - Agregados por RECONTAGEM (count + sum sobre a subcoleção
//     `conversoes`), nunca increment — converge sob qualquer retry
//     (mesmo padrão de membros/desafiosAggregates).
//
// O gatilho real (webhook de split de pagamento) chega com E12/E04; até
// lá esta rotina é o contrato testável chamado por Admin SDK (padrão
// triggers v1 do repo).
// =============================================================================

import type { firestore } from 'firebase-admin';
import { AggregateField } from 'firebase-admin/firestore';
import { dentroDaJanelaAtribuicao } from '@leela/core';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ConversaoInput {
  clubId: string;
  parceriaId: string;
  /** Dedup key — id estável da transação (webhook reprocessado não duplica) */
  conversaoId: string;
  /** Comissão do clube nesta conversão (R$) */
  valorComissao: number;
  /** Instante do clique inicial no link master */
  clicadoEm: Date;
  /** Instante da conversão (pagamento confirmado) */
  convertidoEm: Date;
}

export interface ConversaoResultado {
  registrada: boolean;
  motivo: 'ok' | 'duplicada' | 'fora_da_janela' | 'parceria_invalida';
}

// ---------------------------------------------------------------------------
// Registro (idempotente + janela)
// ---------------------------------------------------------------------------

/**
 * Registra uma conversão atribuída e reconta os agregados da parceria.
 * Retorna o motivo para observabilidade/teste.
 */
export async function registrarConversao(
  db: firestore.Firestore,
  input: ConversaoInput
): Promise<ConversaoResultado> {
  const parceriaRef = db
    .collection('clubes')
    .doc(input.clubId)
    .collection('parcerias')
    .doc(input.parceriaId);

  const parceriaSnap = await parceriaRef.get();
  if (
    !parceriaSnap.exists ||
    parceriaSnap.get('tipo') !== 'evento_afiliado'
  ) {
    return { registrada: false, motivo: 'parceria_invalida' };
  }

  // RN-125: janela de atribuição espelhada do programa
  const janelaDias = parceriaSnap.get('janelaAtribuicaoDias') as number;
  if (
    !dentroDaJanelaAtribuicao(
      input.clicadoEm,
      input.convertidoEm,
      janelaDias
    )
  ) {
    return { registrada: false, motivo: 'fora_da_janela' };
  }

  // Dedup por conversaoId dentro de transação — retry nunca duplica
  const conversaoRef = parceriaRef
    .collection('conversoes')
    .doc(input.conversaoId);

  const criada = await db.runTransaction(async (tx) => {
    const existente = await tx.get(conversaoRef);
    if (existente.exists) return false;
    tx.set(conversaoRef, {
      id: input.conversaoId,
      valorComissao: input.valorComissao,
      clicadoEm: input.clicadoEm,
      convertidoEm: input.convertidoEm,
    });
    return true;
  });

  // Recontagem SEMPRE (mesmo na duplicada): auto-corrige agregado divergente
  await recontarConversoes(db, input.clubId, input.parceriaId);

  return criada
    ? { registrada: true, motivo: 'ok' }
    : { registrada: false, motivo: 'duplicada' };
}

// ---------------------------------------------------------------------------
// Recontagem dos agregados ∑
// ---------------------------------------------------------------------------

/**
 * Reconta `conversoes` (count) e `valorAReceber` (sum de valorComissao)
 * a partir da subcoleção — idempotente por construção.
 * Retorna true se algum agregado foi corrigido.
 */
export async function recontarConversoes(
  db: firestore.Firestore,
  clubId: string,
  parceriaId: string
): Promise<boolean> {
  const parceriaRef = db
    .collection('clubes')
    .doc(clubId)
    .collection('parcerias')
    .doc(parceriaId);

  const parceriaSnap = await parceriaRef.get();
  if (!parceriaSnap.exists) return false;

  const agg = await parceriaRef
    .collection('conversoes')
    .aggregate({
      total: AggregateField.count(),
      soma: AggregateField.sum('valorComissao'),
    })
    .get();

  const conversoes = agg.data().total;
  const valorAReceber = agg.data().soma ?? 0;

  if (
    parceriaSnap.get('conversoes') === conversoes &&
    parceriaSnap.get('valorAReceber') === valorAReceber
  ) {
    return false;
  }

  await parceriaRef.update({ conversoes, valorAReceber });
  return true;
}
