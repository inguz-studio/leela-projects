// =============================================================================
// Derivação PURA da visão de repasse POR EVENTO (RN-349). O eixo por-evento que
// a UI ganha sobre o agregado do tenant: vendido / retido / disponível ESTIMADO
// de cada evento.
//
// DINHEIRO — por que isto pode derivar no cliente (e o saldo NÃO): os 3 cards do
// topo continuam lendo SÓ `saldo/current` (∑ AUTORITATIVO do servidor —
// RN-350/351/357). Esta seção é uma ESTIMATIVA por-evento, reusando os MESMOS
// helpers puros e canônicos do core (`computeRetido`/`computeLiberadoPorEvento`)
// que a Function usa — nunca uma matemática paralela. Por isso a coluna se chama
// "disponível estimado": a estimativa por-evento NÃO abate o comprometido
// (repasses já solicitados) nem a janela D+N (RN-348) — esses são grandezas do
// tenant, não do evento. O número autoritativo é o card agregado.
//
// Sem termo comercial (RN-406/decisão #7): evento com `receitaLiquida === null`
// (tenant sem termo) conta no VENDIDO, mas NÃO estima retido/disponível — a
// retenção incide sobre o líquido, que é indeterminado. Mostramos "—" honesto,
// espelhando `eventosSemTermo` do core (nunca fabrica um líquido).
// =============================================================================

import { computeLiberadoPorEvento, computeRetido, RETENCAO_REPASSE_PCT_DEFAULT } from '@leela/core';
import type { EventoFinanceiroRow } from '../../../../lib/query/queries';

/** Uma linha da tabela "Por evento" (RN-349). */
export interface LinhaRepasseEvento {
  eventoId: string;
  nome: string;
  slug: string;
  /** RN-350: retenção libera quando o evento encerra (status === 'encerrado'). */
  encerrado: boolean;
  /** Receita bruta confirmada do evento (∑ do servidor — `financeiro.receitaBruta`). */
  vendido: number;
  /** Retenção estimada; null = evento sem termo (líquido indeterminado). */
  retido: number | null;
  /** Disponível ESTIMADO do evento (líquido − retido); null = sem termo. */
  disponivelEstimado: number | null;
  /** true = tenant sem termo comercial p/ este evento (RN-406) — retido/disp = "—". */
  semTermo: boolean;
}

/** Totais das linhas — só para a UI conferir/contextualizar (não é o saldo). */
export interface TotaisRepasseEvento {
  vendido: number;
  retido: number;
  disponivelEstimado: number;
  /** Nº de eventos sem termo comercial (retido/disponível não estimáveis). */
  eventosSemTermo: number;
}

/**
 * Deriva as linhas "Por evento" a partir do fan-out de `financeiro/current`.
 *
 * Inclui só eventos COM agregado financeiro computado (`financeiro !== null` —
 * houve ao menos uma inscrição confirmada). Eventos sem movimento ficam FORA:
 * repasse por-evento sem venda é ruído, não informação (mesma disciplina do
 * EmptyState "Nenhuma movimentação" dos cards).
 *
 * `encerrado` sai do `status` do evento (RN-350: a retenção libera no
 * encerramento, automático por data — o organizador não encerra o próprio
 * evento). `retencaoPct` vem do termo do tenant; ausente ⇒ default 15 (RN-350).
 * @pure
 */
export function derivarRepassesPorEvento(
  rows: readonly EventoFinanceiroRow[],
  retencaoPct: number = RETENCAO_REPASSE_PCT_DEFAULT,
): LinhaRepasseEvento[] {
  const pct = Number.isFinite(retencaoPct) ? retencaoPct : RETENCAO_REPASSE_PCT_DEFAULT;
  const linhas: LinhaRepasseEvento[] = [];

  for (const { evento, financeiro } of rows) {
    if (financeiro === null) continue; // sem agregado → sem movimento
    const encerrado = evento.status === 'encerrado';
    const semTermo = financeiro.receitaLiquida === null;

    const base: LinhaRepasseEvento = {
      eventoId: evento.id,
      nome: evento.nome,
      slug: evento.slug,
      encerrado,
      vendido: financeiro.receitaBruta,
      retido: null,
      disponivelEstimado: null,
      semTermo,
    };

    if (!semTermo) {
      const liquido = financeiro.receitaLiquida as number;
      base.retido = computeRetido(liquido, pct, encerrado);
      base.disponivelEstimado = computeLiberadoPorEvento(liquido, pct, encerrado);
    }

    linhas.push(base);
  }

  // Maior vendido primeiro — o evento que mais movimenta lidera a leitura.
  linhas.sort((a, b) => b.vendido - a.vendido);
  return linhas;
}

/** Soma as linhas (eventos sem termo entram só no vendido). @pure */
export function totaisRepasseEvento(linhas: readonly LinhaRepasseEvento[]): TotaisRepasseEvento {
  return linhas.reduce<TotaisRepasseEvento>(
    (acc, l) => ({
      vendido: acc.vendido + l.vendido,
      retido: acc.retido + (l.retido ?? 0),
      disponivelEstimado: acc.disponivelEstimado + (l.disponivelEstimado ?? 0),
      eventosSemTermo: acc.eventosSemTermo + (l.semTermo ? 1 : 0),
    }),
    { vendido: 0, retido: 0, disponivelEstimado: 0, eventosSemTermo: 0 },
  );
}
