// =============================================================================
// packages/api-client/src/eventos/lotes.ts
//
// CRUD de `eventos/{eventoId}/lotes` — kernel de vendas E04 · ADR-012
// (LEELA-S300 · lote-por-modalidade).
//
// Escrita DIRETA do cliente é permitida pelas Rules (tenant writer), como kits:
// o lote é CONFIGURAÇÃO comercial do organizador. Guardas MONEY-CONFIG que a
// Rule impõe e que esta camada respeita:
//   - `vendidos` = ∑ de escrita EXCLUSIVA de Cloud Function (virada, S300-T2);
//     o cliente NUNCA o envia (a Rule nega create!=0 e qualquer update que o
//     toque). Por isso `SalvarLoteInput` não tem o campo.
//   - RN-200/300 na granularidade (modalidade, lote): quando `vendidos > 0` a
//     Rule CONGELA preco/inicioEm/fimEm/quantidadeLimite/ordem/modalidade. A UI
//     espelha o congelamento (desabilita os campos) — aqui só passamos o que a
//     UI montou; a Rule é a autoridade.
//   - `modalidade` deve existir em `evento.modalidades` (a Rule verifica no doc
//     pai). A UI só oferece modalidades do evento — sem degrau fantasma.
//   - `preco` é cent-exato (moneyCentExato na Rule): o valor em R$ é arredondado
//     a 2 casas ANTES de chegar aqui (ver loteForm.arredondarCentavos).
//
// Preço/estado de lote NÃO se recalculam aqui — a derivação (precoVigente,
// loteAtivo) é do core (`@leela/core`). Esta camada só lê/escreve o documento.
// =============================================================================

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { parseLote, type CapacidadeLote, type Lote } from '@leela/core';
import { getLeelaFunctions } from '../firebase';

/**
 * Lista os lotes de um evento, ordenados por `modalidade` e depois por `ordem`
 * (a lista ordenada da modalidade — ADR-012 — é a query
 * `where modalidade == X orderBy ordem`; aqui trazemos todas as modalidades de
 * uma vez e a tela agrupa). Ordena por `ordem` no servidor; o desempate por
 * modalidade é client-side (sort estável) para dispensar índice composto.
 */
export async function listarLotes(db: Firestore, eventoId: string): Promise<Lote[]> {
  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'lotes'), orderBy('ordem', 'asc'))
  );
  return snap.docs
    .map((d) => parseLote(d.id, d.data()))
    .sort((a, b) =>
      a.modalidade === b.modalidade
        ? a.ordem - b.ordem
        : a.modalidade.localeCompare(b.modalidade, 'pt-BR')
    );
}

/**
 * Payload de escrita de lote (sem `vendidos` — ∑ de Function; sem `tenantId`
 * gerenciado além do isolamento). Janela em `Date` puro: a conversão para
 * `Timestamp` do Firestore mora AQUI (a UI não importa firebase).
 */
export interface SalvarLoteInput {
  /** Isolamento multi-tenant (ADR-009) — deve casar com o tenant do evento pai. */
  tenantId: string;
  /** Modalidade dona do lote (ADR-012) — existente em `evento.modalidades`. */
  modalidade: string;
  /** Posição na sequência da modalidade (int ≥ 1, única por modalidade). */
  ordem: number;
  nome: string;
  /** Início da janela de venda. */
  inicioEm: Date;
  /** Fim da janela (fimEm > inicioEm). */
  fimEm: Date;
  /** Vaga própria do lote (int ≥ 1) — base da virada por quantidade (RN-300). */
  quantidadeLimite: number;
  /** Preço da inscrição neste lote em R$ (cent-exato, ≥ 0). */
  preco: number;
}

/**
 * Payload de edição de lote VENDIDO (RN-200/300 · review S300-T4 #1): quando
 * `vendidos > 0` a Rule congela preco/inicioEm/fimEm/quantidadeLimite/ordem/
 * modalidade — então SÓ o nome viaja. Re-enviar a janela "igual" dependia de
 * ela ser minuto-alinhada (o form trunca segundos): um lote com timestamps de
 * Function/seed teria o rename NEGADO pela Rule por diff fantasma na janela.
 */
export interface RenomearLoteVendidoInput {
  /** Isolamento multi-tenant (ADR-009). */
  tenantId: string;
  nome: string;
}

/** União dos payloads de escrita de lote: completo (sem venda) ou só-nome (vendido). */
export type EscritaLoteInput = SalvarLoteInput | RenomearLoteVendidoInput;

/**
 * Cria/atualiza um lote (merge). `criar` inclui `criadoEm` só na criação —
 * merge nunca reescreve o carimbo original numa edição.
 *
 * NUNCA envia `vendidos`: é ∑ de Cloud Function (virada). Payload só-nome
 * (lote vendido) grava apenas `nome` + `atualizadoEm` — nenhum campo
 * comercial toca o wire, então a Rule de congelamento nunca vê diff neles.
 */
export async function salvarLote(
  db: Firestore,
  eventoId: string,
  loteId: string,
  input: EscritaLoteInput,
  criar: boolean
): Promise<void> {
  if (!('preco' in input)) {
    if (criar) {
      throw new Error('payload só-nome é exclusivo de EDIÇÃO de lote vendido (RN-200/300)');
    }
    await setDoc(
      doc(db, 'eventos', eventoId, 'lotes', loteId),
      { nome: input.nome, atualizadoEm: serverTimestamp() },
      { merge: true }
    );
    return;
  }
  const data: Record<string, unknown> = {
    id: loteId,
    tenantId: input.tenantId,
    modalidade: input.modalidade,
    ordem: input.ordem,
    nome: input.nome,
    inicioEm: Timestamp.fromDate(input.inicioEm),
    fimEm: Timestamp.fromDate(input.fimEm),
    quantidadeLimite: input.quantidadeLimite,
    preco: input.preco,
    atualizadoEm: serverTimestamp(),
  };
  if (criar) {
    data['criadoEm'] = serverTimestamp();
  }
  await setDoc(doc(db, 'eventos', eventoId, 'lotes', loteId), data, { merge: true });
}

/**
 * Remove um lote. A Rule só permite quando `vendidos == 0` (lote com venda
 * nunca some — o histórico financeiro depende dele). O cliente também bloqueia
 * na UI; aqui a chamada segue e a Rule é a rede de segurança.
 */
export async function removerLote(
  db: Firestore,
  eventoId: string,
  loteId: string
): Promise<void> {
  await deleteDoc(doc(db, 'eventos', eventoId, 'lotes', loteId));
}

// ---------------------------------------------------------------------------
// Ajuste de capacidade de lote — reabrir vagas (LEELA-S307 · E04 · RN-304)
//
// ESCRITA EXCLUSIVA de Cloud Function (`ajustarCapacidadeLote`): a Rule congela
// `quantidadeLimite` de lote COM venda; a Function é a única porta (guard +
// auditoria). O cliente NUNCA escreve capacidade direto — este wrapper só
// transporta o input; o painel de retorno (configurado/vendido/disponível) e o
// veredito (reduzir < vendido NEGADO) são do servidor. Contrato = espelho de
// functions/src/eventos/ajustarCapacidadeLote.ts.
// ---------------------------------------------------------------------------

export interface AjustarCapacidadeLoteInput {
  eventoId: string;
  loteId: string;
  novaCapacidade: number;
  /** Motivo do ajuste (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

export interface AjustarCapacidadeLoteResult {
  eventoId: string;
  loteId: string;
  /** false = no-op (capacidade já era a pedida) — nada gravado. */
  alterado: boolean;
  capacidadeAnterior: number;
  /** Painel pós-ajuste (aceite S307: configurado/vendido/disponível). */
  capacidade: CapacidadeLote;
}

/**
 * Ajusta a capacidade de um lote (reabrir vagas — RN-304) via callable. O
 * servidor valida (inteiro ≥ 1; NUNCA abaixo do vendido — fail-closed) e grava
 * a auditoria; o cliente só transporta o input e recebe o painel autoritativo.
 * O erro (`failed-precondition` = reduzir < vendido; `permission-denied` =
 * não-owner/cross-tenant) sobe INTACTO para a UI (§2.12).
 */
export async function ajustarCapacidadeLote(
  input: AjustarCapacidadeLoteInput
): Promise<AjustarCapacidadeLoteResult> {
  const fn = httpsCallable<AjustarCapacidadeLoteInput, AjustarCapacidadeLoteResult>(
    getLeelaFunctions(),
    'ajustarCapacidadeLote'
  );
  const res = await fn(input);
  return res.data;
}
