// =============================================================================
// Derivação PURA da visão de repasse POR EVENTO (RN-349). O eixo por-evento que
// a UI ganha sobre o agregado do tenant: vendido / retido / disponível ESTIMADO
// de cada evento.
//
// DINHEIRO — por que isto pode derivar no cliente (e o saldo NÃO): os 3 cards do
// topo continuam lendo SÓ `saldo/current` (∑ AUTORITATIVO do servidor —
// RN-350/351/357). Esta seção é uma ESTIMATIVA por-evento, reusando os MESMOS
// helpers puros e canônicos do core (`computeRetido`/`computeLiberadoPorEvento`/
// `computeDisponivelPorEvento`) que a Function usa — nunca uma matemática
// paralela. A coluna segue chamada "disponível estimado" porque a janela D+N
// (RN-348) é grandeza do TENANT, não do evento, e o número autoritativo é o card
// agregado. O que ela deixou de ignorar (DEC-0727): os repasses VIVOS daquele
// evento, que agora abate — mesma regra e mesma função da Caixa do evento, para
// as duas telas não contarem histórias diferentes do mesmo dinheiro.
//
// Sem termo comercial (RN-406/decisão #7): evento com `receitaLiquida === null`
// (tenant sem termo) conta no VENDIDO, mas NÃO estima retido/disponível — a
// retenção incide sobre o líquido, que é indeterminado. Mostramos "—" honesto,
// espelhando `eventosSemTermo` do core (nunca fabrica um líquido).
// =============================================================================

import {
  comprometeSaldo,
  computeDisponivelPorEvento,
  computeLiberadoPorEvento,
  computeRetido,
  RETENCAO_REPASSE_PCT_DEFAULT,
} from '@leela/core';
import type { Repasse } from '@leela/core';
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
  /**
   * Disponível ESTIMADO do evento (líquido − retido − repasses vivos do
   * evento, DEC-0727); null = sem termo. O abatimento só existe depois de
   * `abaterRepassesVivos` — `derivarRepassesPorEvento` sozinha não conhece o
   * histórico de repasses (ele vem de outro reader).
   */
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

// ---------------------------------------------------------------------------
// Associação EXATA repasse↔evento (RN-349 · LEELA-BEPEND-T2)
// ---------------------------------------------------------------------------

/** Σ dos repasses associados a um eixo (evento ou "sem associação"). */
export interface RepassesAssociados {
  /** Nº de repasses vivos ({solicitado, aprovado, pago}) */
  qtd: number;
  /** Σ valor desses repasses (R$) */
  total: number;
}

/** Resultado da associação por CAMPO EXATO `eventoId` (fim de heurística). */
export interface AssociacaoRepasses {
  /** eventoId → Σ dos repasses associados àquele evento */
  porEvento: ReadonlyMap<string, RepassesAssociados>;
  /** Docs SEM `eventoId` (legado pré-RN-349 / saldo geral) — declarados, nunca adivinhados */
  semAssociacao: RepassesAssociados;
}

/**
 * Agrupa o histórico de repasses pelo campo EXATO `eventoId` (RN-349 —
 * nenhuma heurística de período/valor). Conta só os estados VIVOS, e a
 * definição de vivo é a do core (`comprometeSaldo` — {solicitado, aprovado,
 * pago}, RN-351), não uma lista repetida aqui: cancelado/recusado devolveram o
 * valor e não representam saque. Um estado novo na máquina do repasse (RN-353)
 * passa a contar — ou não — pela decisão do core, em um lugar só; era a lista
 * paralela que deixava a Caixa e a macro divergirem por descuido.
 *
 * Doc sem `eventoId` (legado) cai em `semAssociacao` — a UI o declara,
 * honesto, em vez de atribuí-lo a um evento por adivinhação. @pure
 */
export function associarRepassesPorEvento(
  historico: readonly Repasse[],
): AssociacaoRepasses {
  const porEvento = new Map<string, RepassesAssociados>();
  const semAssociacao: RepassesAssociados = { qtd: 0, total: 0 };

  for (const r of historico) {
    if (!comprometeSaldo(r.estado)) continue; // estornado (cancelado/recusado) devolve
    if (r.eventoId === undefined) {
      semAssociacao.qtd += 1;
      semAssociacao.total += r.valor;
      continue;
    }
    const atual = porEvento.get(r.eventoId) ?? { qtd: 0, total: 0 };
    porEvento.set(r.eventoId, { qtd: atual.qtd + 1, total: atual.total + r.valor });
  }

  return { porEvento, semAssociacao };
}

/**
 * Abate de cada linha o repasse VIVO daquele evento (DEC-0727 · RN-349), via
 * `computeDisponivelPorEvento` — a MESMA função que a Caixa do evento usa.
 *
 * Por que a composição mora aqui e não em `derivarRepassesPorEvento`: as linhas
 * vêm do fan-out de `financeiro/current` e a associação vem do histórico de
 * repasses, dois readers independentes que só se encontram na view. Manter a
 * junção PURA (em vez de fazê-la dentro do componente) é o que deixa o
 * abatimento testável sem render.
 *
 * Evento sem termo (`disponivelEstimado === null`) continua "—": não há líquido
 * para abater de, e inventar zero seria pior que declarar indeterminado.
 * Retido/vendido não mudam — a retenção segue como está (RN-350). @pure
 */
export function abaterRepassesVivos(
  linhas: readonly LinhaRepasseEvento[],
  associacao: AssociacaoRepasses,
): LinhaRepasseEvento[] {
  return linhas.map((l) => {
    if (l.disponivelEstimado === null) return l;
    const assoc = associacao.porEvento.get(l.eventoId);
    if (assoc === undefined || assoc.qtd === 0) return l;
    return {
      ...l,
      disponivelEstimado: computeDisponivelPorEvento(l.disponivelEstimado, assoc.total),
    };
  });
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
