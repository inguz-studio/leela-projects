// =============================================================================
// packages/api-client/src/eventos/modalidades.ts
//
// A porta única da lista de modalidades do evento (S316-T1/T2/T3 · E04 ·
// RN-500, RN-501, RN-502, RN-505).
//
// ESCRITA EXCLUSIVA de Cloud Function. Ao contrário de lote e kit — que são
// escrita DIRETA do organizador, com a Rule como autoridade —, aqui o cliente
// nunca toca o documento, e o motivo não é permissão:
//   - `modalidades[]` e `percursos[].nome` são duas cópias do mesmo fato no
//     mesmo doc, e mantê-las em sincronia exige ler-checar-escrever, que no
//     cliente é a corrida entre duas abas;
//   - renomear migra CINCO referências (evento ×2, lotes, kits, campanhas) e
//     precisa de transação: entre duas escritas separadas, a Rule
//     `modalidadeExisteNoEventoPai` inutiliza os lotes da modalidade;
//   - ⛔ RN-505: o cliente manda o NOME e a operação, JAMAIS a lista. A
//     projeção degradada (`eventoDegradado`, queries.ts) devolve
//     `modalidades: []` incondicionalmente, e um editor que gravasse "a lista
//     que eu vi" apagaria modalidades boas passando em todas as Rules.
//
// Contrato = espelho de `functions/src/eventos/editarModalidadesEvento.ts`. A
// recusa (`failed-precondition`) sobe INTACTA para a UI (§2.12): ela nomeia
// cada lote, kit e campanha que impedem a remoção, e virar "falha ao salvar"
// aqui recriaria o defeito de endereço que a review da SEAL-LOTES corrigiu
// (`2a97a592`).
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import type { OperacaoModalidade } from '@leela/core';
import { getLeelaFunctions } from '../firebase';

export interface EditarModalidadesEventoInput {
  eventoId: string;
  operacao: OperacaoModalidade;
  /** `acrescentar`: o nome novo. `renomear`/`remover`: o nome ATUAL. */
  modalidade: string;
  /** Só em `renomear`: o nome de destino. */
  novoNome?: string;
  /** Motivo da operação (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

/** Quantos documentos a renomeação migrou, por família (RN-501). */
export interface MigracaoModalidade {
  lotes: number;
  kits: number;
  campanhas: number;
}

export interface EditarModalidadesEventoResult {
  eventoId: string;
  operacao: OperacaoModalidade;
  /** false = no-op declarado (nada gravado). */
  alterado: boolean;
  /** A lista DEPOIS da operação, lida do documento — autoritativa. */
  modalidades: string[];
  /** Presente só em `renomear`. */
  migracao?: MigracaoModalidade;
}

/**
 * Acrescenta, renomeia ou remove uma modalidade do evento pela porta única.
 * O servidor valida (`qtdInscritos == 0`, nome duplicado, quem aponta), migra
 * as cinco referências num commit quando for renomear, e grava a auditoria; o
 * cliente só transporta o input e recebe a lista autoritativa de volta.
 */
export async function editarModalidadesEvento(
  input: EditarModalidadesEventoInput,
): Promise<EditarModalidadesEventoResult> {
  const fn = httpsCallable<EditarModalidadesEventoInput, EditarModalidadesEventoResult>(
    getLeelaFunctions(),
    'editarModalidadesEvento',
  );
  const res = await fn(input);
  return res.data;
}
