// =============================================================================
// packages/core/src/clubs/participacao.ts
//
// Regras PURAS de participação em desafio (LEELA-S1308-T1 · E13 adiantado ·
// Onda 2 T2-L2 · RN-117 — 3 níveis de visibilidade).
//
// Consumida pelo callable `entrarNoDesafio` (functions/src/jornada) — a
// fronteira REAL da visibilidade para atletas é o SERVIDOR (Rules não
// conseguem checar "é membro do clube" por uid: membros/{docId} não é
// keyed por uid). O cliente pode espelhar a decisão para UX, mas quem
// decide é a Function com dados relidos do Firestore.
//
// RN-117:
//   - 'publico'  — qualquer atleta autenticado entra;
//   - 'membros'  — só membro NÃO-inativo do clube (contaComoAtivo — RN-102:
//                  novo + ativo contam; inativo não);
//   - 'convite'  — só com convite EXPLÍCITO do desafio
//                  (`desafios/{id}/convites/{uid}`) — ser membro NÃO basta.
// Desafio só aceita entrada com status 'ativo' (rascunho não é público;
// encerrado não recebe mais ninguém).
// =============================================================================

import type { Desafio } from './desafio';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Contexto do atleta candidato, resolvido pelo SERVIDOR (nunca do cliente). */
export interface ContextoParticipacao {
  /** Membro do clube pai com status não-inativo (RN-102: novo/ativo). */
  membroAtivo: boolean;
  /** Convite explícito do desafio (`convites/{uid}` existe). */
  convidado: boolean;
}

/** Decisão de participação — motivo preenchido quando negada. */
export interface DecisaoParticipacao {
  ok: boolean;
  /** Código estável do motivo (mensagem de UI é responsabilidade da tela). */
  motivo:
    | null
    | 'desafio_nao_ativo'
    | 'exige_membro_do_clube'
    | 'exige_convite';
}

// ---------------------------------------------------------------------------
// Decisão pura (RN-117)
// ---------------------------------------------------------------------------

/**
 * O atleta pode entrar no desafio? @pure
 * A precedência é status do desafio → visibilidade (RN-117).
 */
export function podeParticipar(
  desafio: Pick<Desafio, 'status' | 'visibilidade'>,
  ctx: ContextoParticipacao
): DecisaoParticipacao {
  if (desafio.status !== 'ativo') {
    return { ok: false, motivo: 'desafio_nao_ativo' };
  }

  switch (desafio.visibilidade) {
    case 'publico':
      return { ok: true, motivo: null };
    case 'membros':
      return ctx.membroAtivo
        ? { ok: true, motivo: null }
        : { ok: false, motivo: 'exige_membro_do_clube' };
    case 'convite':
      // Convite é EXPLÍCITO — ser membro não substitui (RN-117)
      return ctx.convidado
        ? { ok: true, motivo: null }
        : { ok: false, motivo: 'exige_convite' };
  }
}
