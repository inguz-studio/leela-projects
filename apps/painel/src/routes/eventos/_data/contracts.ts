// =============================================================================
// Porta tipada da mutation `criarEvento` (contrato consumido, não inventado).
//
// A Function `criarEvento` e o wrapper `packages/api-client/src/eventos/
// mutations.ts` são do lote E03-L2 (Fable), EM CONSTRUÇÃO. Aqui declaramos
// a interface esperada (spec S201-T2: `criarEvento(input) -> {eventoId, slug}`)
// para o form submeter contra ela; em teste injeta-se um mock desta porta.
//
// ⚠ CONTRATO CONFIRMADO com L2 (EVENTO-CAMPOS, RN-347): a spec S201-T2 definia a
// SAÍDA (`{eventoId, slug}`); a ENTRADA abaixo era a proposta do L3. O servidor
// (`functions/src/eventos/criarEvento.ts`) já ACEITA e persiste `taxaModo` (modo
// da taxa por evento — RN-347), resolvendo `input explícito > default do tenant >
// 'incorporada'`. Esta porta espelha só o subconjunto que a tela `/eventos/novo`
// envia. Ver EVENTO-CAMPOS-REPORT §3.
// =============================================================================

import type { ModoTaxa } from '@leela/core';

/** Percurso com preço independente (S201-T1). Preço em reais. */
export interface CriarEventoPercurso {
  nome: string;
  preco: number;
}

export interface CriarEventoInput {
  nome: string;
  descricao?: string;
  /** ISO `yyyy-mm-dd`. O servidor converte para Timestamp. */
  data: string;
  local: string;
  modalidades: string[];
  percursos: CriarEventoPercurso[];
  /**
   * Modo da taxa da plataforma POR EVENTO (RN-347) — OPCIONAL. Ausente ⇒ o
   * servidor aplica o default do tenant (`commercialTerms.modoTaxaDefault`) e,
   * na falta, 'incorporada'. A tela `/eventos/novo` sempre envia a escolha do
   * organizador (WYSIWYG). Após a 1ª venda a troca CONGELA nas Rules.
   */
  taxaModo?: ModoTaxa;
}

/** Contrato de saída definido pela spec S201-T2. */
export interface CriarEventoResult {
  eventoId: string;
  slug: string;
}

/**
 * Porta de criação de evento. O form depende DESTA função (injeção), não da
 * implementação concreta — mantém a tela testável sem Firebase e desacoplada
 * do lote L2.
 */
export type CriarEventoFn = (input: CriarEventoInput) => Promise<CriarEventoResult>;
