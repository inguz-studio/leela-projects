// =============================================================================
// packages/core/src/clubs/segmentacao.ts
//
// Estimativa de alcance de segmento (LEELA-E05 · S109-T1). Função PURA —
// o editor de comunicado (S109-T2) mostra "tamanho estimado do segmento"
// ao vivo a partir dos agregados que o clube já mantém; a Function de
// envio persiste a fotografia em `segmento.tamanhoEstimado` (S108-T1).
//
// A fonte dos números é o conjunto de agregados do clube (∑ mantidos por
// Functions) — esta função só MAPEIA segmento → número, sem I/O.
// =============================================================================

import type { Pilar } from './catalogo-acoes';
import type { Segmento } from './comunicado';

// ---------------------------------------------------------------------------
// Agregados de entrada
// ---------------------------------------------------------------------------

/**
 * Fotografia dos agregados do clube usada na composição do comunicado.
 * O caller (tela/Function) monta a partir do que já está no Firestore:
 * qtdMembrosAtivos (clube), qtdParticipantes (por desafio) e contagens de
 * engajamento/pilar (E13 — enquanto não existem, o caller envia as
 * estimativas canônicas do protótipo).
 */
export interface AgregadosSegmentacao {
  /** Total de membros não-inativos (∑ qtdMembrosAtivos) */
  totalMembrosAtivos: number;
  /** Participantes por desafio: desafioId → ∑ qtdParticipantes */
  participantesPorDesafio: Record<string, number>;
  /** Membros ativos por janela de engajamento: '7d' | '14d' | '30d' */
  ativosPorJanela: Record<string, number>;
  /** Membros por pilar predominante */
  membrosPorPilar: Partial<Record<Pilar, number>>;
  /**
   * Membros com status 'novo' (RN-140 — primeiros 7 dias). Alimenta o 5º
   * segmento `novos_membros` (CONS-4-T2). Opcional: caller que ainda não
   * agrega novos envia undefined e a tela mostra "—" (estimativa null).
   */
  membrosNovos?: number;
}

// ---------------------------------------------------------------------------
// Estimativa
// ---------------------------------------------------------------------------

/**
 * Estima o alcance de um segmento a partir dos agregados.
 * Retorna null quando a referência não resolve (desafio/pilar/janela
 * desconhecidos) — a tela mostra "—" e bloqueia o envio via validação.
 */
export function estimarAlcance(
  segmento: Pick<Segmento, 'tipo' | 'referencia'>,
  agregados: AgregadosSegmentacao
): number | null {
  switch (segmento.tipo) {
    case 'todos':
      return agregados.totalMembrosAtivos;

    case 'por_desafio': {
      if (!segmento.referencia) return null;
      return agregados.participantesPorDesafio[segmento.referencia] ?? null;
    }

    case 'por_pilar': {
      if (!segmento.referencia) return null;
      const valor =
        agregados.membrosPorPilar[segmento.referencia as Pilar];
      return valor ?? null;
    }

    case 'por_engajamento': {
      if (!segmento.referencia) return null;
      return agregados.ativosPorJanela[segmento.referencia] ?? null;
    }

    case 'novos_membros':
      return agregados.membrosNovos ?? null;

    default:
      return null;
  }
}
