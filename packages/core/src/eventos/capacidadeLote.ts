// =============================================================================
// packages/core/src/eventos/capacidadeLote.ts
//
// Capacidade de lote EDITÁVEL — domínio puro (LEELA-S307-T1 · E04 · RN-304,
// decisão Vitor 2026-07-17). "A vaga cancelada não volta sozinha (ratchet
// RN-300 mantido); só o organizador reabre subindo a capacidade."
//
// A Function `ajustarCapacidadeLote` é a ÚNICA porta de escrita de
// `quantidadeLimite` em lote COM venda (a Rule congela o campo pós-1ª venda
// do próprio lote); estas derivações são a regra que ela aplica — e que a
// UI (S307-T2) espelha como hint, nunca como autoridade.
//
// DECISÃO (premissa registrada no report): o aceite verbatim do Vitor é
// "posso aumentar e salvar; reduzir abaixo do vendido é negado" — logo
// reduzir ATÉ o vendido (fechar as vagas remanescentes) é permitido; abaixo
// do vendido é fail-closed. O carimbo de virada (`encerradoEm`) NÃO é
// apagado na reabertura: é trilha monotônica (decisão #3 do virarLote); o
// estado ativo/encerrado que o checkout consome é DERIVADO (`loteAtivo`),
// e volta a "ativo" por construção quando a capacidade sobe e a janela
// ainda está aberta.
// =============================================================================

import type { Lote } from './lote';

/** Teto sanitário de capacidade por lote (paridade com o teto de estoque). */
export const CAPACIDADE_LOTE_MAX = 1_000_000;

/** Painel de capacidade do lote (aceite S307: configurado/vendido/disponível). */
export interface CapacidadeLote {
  configurado: number;
  vendido: number;
  /** = configurado − vendido, nunca negativo. */
  disponivel: number;
}

/** Deriva o painel de capacidade de um lote. @pure */
export function capacidadeDoLote(
  lote: Pick<Lote, 'quantidadeLimite' | 'vendidos'>
): CapacidadeLote {
  return {
    configurado: lote.quantidadeLimite,
    vendido: lote.vendidos,
    disponivel: Math.max(0, lote.quantidadeLimite - lote.vendidos),
  };
}

/**
 * Valida um ajuste de capacidade (RN-304). Retorna `null` quando o ajuste é
 * válido; senão a mensagem de recusa (fail-closed — nada é gravado):
 *   - capacidade deve ser inteiro 1..CAPACIDADE_LOTE_MAX;
 *   - reduzir ABAIXO do vendido é negado (verbatim RN-304);
 *   - `vendidos` NUNCA é alterado por este fluxo (∑ exclusivo da virada).
 * @pure
 */
export function validarAjusteCapacidade(
  lote: Pick<Lote, 'quantidadeLimite' | 'vendidos'>,
  novaCapacidade: number
): string | null {
  if (
    typeof novaCapacidade !== 'number' ||
    !Number.isInteger(novaCapacidade) ||
    novaCapacidade < 1 ||
    novaCapacidade > CAPACIDADE_LOTE_MAX
  ) {
    return `Capacidade deve ser inteiro entre 1 e ${CAPACIDADE_LOTE_MAX}.`;
  }
  if (novaCapacidade < lote.vendidos) {
    return (
      `Capacidade ${novaCapacidade} é menor que o vendido (${lote.vendidos}) — ` +
      'reduzir abaixo do vendido é negado (RN-304).'
    );
  }
  return null;
}
