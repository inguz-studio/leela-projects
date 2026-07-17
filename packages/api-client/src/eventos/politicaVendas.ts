// =============================================================================
// packages/api-client/src/eventos/politicaVendas.ts
//
// Acesso à política de vendas do evento — subcoleção
// `eventos/{eventoId}/politicaVendas/{config}` (LEELA-S305-T1 · E04). O SHAPE,
// os defaults legais e as derivações (roteamento RN-338/339/340, janelas
// RN-343/344) vivem no kernel (`@leela/core` politicaVendas). Esta camada só
// LÊ/ESCREVE o documento; nada de regra de negócio recalculada aqui.
//
// ESCRITA: direta do OWNER do tenant (Rules negam staff/papéis de evento —
// política de reembolso é contrato legal do organizador). A EXECUÇÃO da
// política (máquina de reembolso, estorno, fila) é de E09-S904 e escreve SÓ
// por Cloud Function — nunca por aqui.
// =============================================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  POLITICA_VENDAS_DOC_ID,
  parsePoliticaVendas,
  validarPoliticaVendas,
  type PoliticaReembolso,
  type PoliticaTransferencia,
  type PoliticaTrocaIngresso,
  type PoliticaVendas,
} from '@leela/core';

/**
 * Lê a política de vendas de um evento (docId canônico `config`) — leitura
 * direta O(1). Retorna null quando o organizador ainda não configurou (a UI
 * então parte de `politicaVendasPadrao()` do kernel, nunca inventa número).
 */
export async function getPoliticaVendas(
  db: Firestore,
  eventoId: string
): Promise<PoliticaVendas | null> {
  const snap = await getDoc(
    doc(db, 'eventos', eventoId, 'politicaVendas', POLITICA_VENDAS_DOC_ID)
  );
  if (!snap.exists()) return null;
  return parsePoliticaVendas(snap.id, snap.data());
}

/** Payload de escrita da política (os 3 blocos, sempre completos). */
export interface SalvarPoliticaVendasInput {
  tenantId: string;
  reembolso: PoliticaReembolso;
  transferencia: PoliticaTransferencia;
  trocaIngresso: PoliticaTrocaIngresso;
}

/**
 * Salva (cria/edita) a política de vendas do evento — merge no doc canônico.
 * Valida o shape no kernel ANTES de escrever (fail-fast espelhado nas Rules;
 * payload inválido nunca sai do cliente). Só o OWNER do tenant passa na Rule.
 */
export async function salvarPoliticaVendas(
  db: Firestore,
  eventoId: string,
  input: SalvarPoliticaVendasInput
): Promise<void> {
  const erros = validarPoliticaVendas({
    reembolso: input.reembolso,
    transferencia: input.transferencia,
    trocaIngresso: input.trocaIngresso,
  });
  if (erros.length > 0) {
    throw new Error(`Política de vendas inválida: ${erros.join(' ')}`);
  }

  await setDoc(
    doc(db, 'eventos', eventoId, 'politicaVendas', POLITICA_VENDAS_DOC_ID),
    {
      id: POLITICA_VENDAS_DOC_ID,
      tenantId: input.tenantId,
      eventoId,
      reembolso: input.reembolso,
      transferencia: input.transferencia,
      trocaIngresso: input.trocaIngresso,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  );
}
