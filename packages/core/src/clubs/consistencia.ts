// =============================================================================
// packages/core/src/clubs/consistencia.ts
//
// Board de CONSISTÊNCIA do desafio (LEELA-S1308-T3 · E13 adiantado · Onda 2
// T2-L2 — decisão 2: o "ranking competitivo" da spec E13 é SUBSTITUÍDO por
// um board ético anti-streak).
//
// ÉTICA DO BOARD (por que não ordenar por pontos):
//   - ordenar por volume bruto premia overtraining e binge de registros;
//   - ordenar por DIAS ATIVOS DISTINTOS premia constância — o comportamento
//     que o produto quer formar (3 pilares, hábito sustentável);
//   - pontos entram SÓ como desempate (entre dois consistentes, o que
//     produziu mais), e atletaId como desempate final (ordem estável e
//     determinística — sem flicker entre recomputes).
//
// Métrica canônica (decisão aberta nº 3 do brief — proposta implementada):
// dias ativos distintos NA JANELA DO DESAFIO (diasAtivos do participante,
// agregado por onRegistroWrite), desempate por pontos. Variações (semana
// corrente, % de dias) ficam para o Vitor decidir na Onda 3 — trocar a
// métrica é trocar ESTA função, o board materializado não muda de shape.
// =============================================================================

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Resumo mínimo de participante para o board. */
export interface ParticipanteBoard {
  atletaId: string;
  /** Dias-calendário distintos com registro pontuável na janela do desafio. */
  diasAtivos: number;
  /** Pontos com bônus RN-115 (desempate — nunca critério primário). */
  pontos: number;
}

/** Entrada materializada do board (`board/current.entradas[]`). */
export interface EntradaBoard extends ParticipanteBoard {
  /** Posição 1-based após a ordenação por consistência. */
  posicao: number;
}

/** Top-N materializado no doc `board/current` (telas E13 leem só isto). */
export const BOARD_TOP_N = 50;

// ---------------------------------------------------------------------------
// Ordenação (pura, determinística)
// ---------------------------------------------------------------------------

/**
 * Ordena por CONSISTÊNCIA: dias ativos DESC → pontos DESC → atletaId ASC.
 * NÃO ordena por volume bruto (decisão 2 — anti-streak ético). @pure
 */
export function ordenarPorConsistencia<T extends ParticipanteBoard>(
  participantes: readonly T[]
): T[] {
  return [...participantes].sort((a, b) => {
    if (b.diasAtivos !== a.diasAtivos) return b.diasAtivos - a.diasAtivos;
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    return a.atletaId < b.atletaId ? -1 : a.atletaId > b.atletaId ? 1 : 0;
  });
}

/**
 * Monta o top-N materializado do board (posições 1-based).
 * Participante sem NENHUM dia ativo não entra no board (aparecer em
 * "consistência" sem ter feito nada seria ruído, não motivação). @pure
 */
export function montarBoardConsistencia(
  participantes: readonly ParticipanteBoard[],
  topN: number = BOARD_TOP_N
): EntradaBoard[] {
  const elegiveis = participantes.filter((p) => p.diasAtivos > 0);
  return ordenarPorConsistencia(elegiveis)
    .slice(0, Math.max(0, topN))
    .map((p, i) => ({
      atletaId: p.atletaId,
      diasAtivos: p.diasAtivos,
      pontos: p.pontos,
      posicao: i + 1,
    }));
}
