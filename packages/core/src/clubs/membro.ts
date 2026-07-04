// =============================================================================
// packages/core/src/clubs/membro.ts
//
// Entidade Membro — join Atleta ⇄ Clube (LEELA-E05 · S103-T1).
// Subcoleção: `clubes/{clubId}/membros/{membroId}`.
//
// RN-102 — status derivado por DATA (nunca escrito pelo cliente):
//   novo    : entrou há menos de 7 dias;
//   inativo : sem atividade há 30+ dias;
//   ativo   : caso contrário.
// A derivação vive AQUI (função pura) e é aplicada pela Cloud Function
// onMembroWrite + cron diário recalcularStatusMembros.
//
// RN-103 — papéis: owner (1 único), admin (N), membro (N).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Literal types
// ---------------------------------------------------------------------------

/** Papel do membro dentro de um clube (RN-103) */
export type PapelMembro = 'owner' | 'admin' | 'membro';

/** Status derivado do membro no clube (RN-102 — calculado por Function) */
export type StatusMembro = 'ativo' | 'novo' | 'inativo';

/** Via pela qual o atleta entrou no clube */
export type EntradaVia = 'codigo' | 'convite' | 'link';

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Membro — join Atleta ↔ Clube.
 * Subcoleção: `clubes/{clubId}/membros/{membroId}`.
 * Herda tenantId do clube pai (propagado pela Function — ADR-009).
 */
export interface Membro {
  id: string;
  /** Propagado do clube pai para filtragem direta (ADR-009) */
  tenantId: string;
  /** Referência ao atleta */
  atletaId: string;
  /** 🔁 Desnormalizado — mantido por Function */
  atletaNome: string;
  papel: PapelMembro;
  entrouEm: Timestamp;
  entrouVia: EntradaVia;
  /** ∑ Status derivado (RN-102) — escrito APENAS pela Cloud Function */
  status: StatusMembro;
  /** Última atividade registrada (base do limiar de inatividade) */
  ultimaAtividadeEm?: Timestamp;
}

// ---------------------------------------------------------------------------
// Derivação de status (RN-102)
// ---------------------------------------------------------------------------

/** Milissegundos por dia (UTC — sem DST em aritmética pura de época) */
const DIA_MS = 24 * 60 * 60 * 1000;

/** Limiar de "novo": entrou há MENOS de 7 dias (RN-102) */
export const MEMBRO_NOVO_DIAS = 7;

/** Limiar de "inativo": sem atividade há 30 dias OU MAIS (RN-102) */
export const MEMBRO_INATIVO_DIAS = 30;

/**
 * Deriva o status do membro a partir das datas (RN-102). Função PURA —
 * usada pela Cloud Function (onWrite + cron) e por leituras no cliente.
 *
 * Regras (nesta ordem de precedência):
 *   1. novo    — `entrouEm` há menos de 7 dias de `hoje` (estrito: 7d exatos
 *                já NÃO é novo);
 *   2. inativo — última atividade há 30 dias ou mais (inclusivo). Sem
 *                `ultimaAtividadeEm`, a entrada no clube conta como última
 *                atividade (membro que nunca registrou nada não vira
 *                inativo antes de 30 dias de casa);
 *   3. ativo   — caso contrário.
 *
 * @param entrouEm — data de entrada no clube
 * @param ultimaAtividadeEm — última atividade registrada (null/undefined se nunca)
 * @param hoje — referência "agora" (injetável para teste/cron determinístico)
 */
export function derivarStatus(
  entrouEm: Date,
  ultimaAtividadeEm: Date | null | undefined,
  hoje: Date
): StatusMembro {
  const idadeMs = hoje.getTime() - entrouEm.getTime();
  if (idadeMs < MEMBRO_NOVO_DIAS * DIA_MS) {
    return 'novo';
  }

  const ultimaAtividade = ultimaAtividadeEm ?? entrouEm;
  const ociosidadeMs = hoje.getTime() - ultimaAtividade.getTime();
  if (ociosidadeMs >= MEMBRO_INATIVO_DIAS * DIA_MS) {
    return 'inativo';
  }

  return 'ativo';
}

/**
 * Um membro conta no agregado ∑ `qtdMembrosAtivos` quando NÃO está inativo
 * (ativo + novo). É a definição usada pela Function de agregados e pelos
 * KPIs do painel ("120 membros ativos" inclui os recém-chegados).
 */
export function contaComoAtivo(status: StatusMembro): boolean {
  return status !== 'inativo';
}
