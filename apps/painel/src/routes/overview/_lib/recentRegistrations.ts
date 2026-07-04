// =============================================================================
// Derivação das "últimas inscrições cross-evento" da Visão Geral (S601-T2).
// Pura. Ordena por data (criadoEm) desc e mapeia o status RN-204 para badge.
//
// RN-204 (StatusInscrito → badge semântico):
//   confirmado → "Pago"     (vitoria)
//   pendente   → "Pendente" (alerta)   ← nunca "Pago"
//   cancelado  → "Recusado" (vulcao)
// =============================================================================

import type { BadgeProps } from '@leela/design-system';
import type { StatusInscrito, Timestamp } from '@leela/core';

/** Recorte de uma inscrição (com o evento de origem — cross-evento). */
export interface InscricaoRecenteInput {
  id: string;
  atletaNome: string;
  modalidade: string;
  status: StatusInscrito;
  criadoEm: Timestamp;
  /** Nome do evento de origem (desnormalizado no fetch cross-evento) */
  eventoNome?: string;
}

export interface StatusInscritoBadge {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

/** Linha renderizável da lista de inscrições recentes. */
export interface InscricaoRecenteView {
  id: string;
  atletaNome: string;
  modalidade: string;
  eventoNome: string | null;
  badge: StatusInscritoBadge;
}

const BADGE_STATUS: Record<StatusInscrito, StatusInscritoBadge> = {
  confirmado: { label: 'Pago', variant: 'vitoria' },
  pendente: { label: 'Pendente', variant: 'alerta' },
  cancelado: { label: 'Recusado', variant: 'vulcao' },
};

/** Badge semântico do status da inscrição (RN-204). @pure */
export function badgeStatusInscrito(status: StatusInscrito): StatusInscritoBadge {
  return BADGE_STATUS[status] ?? BADGE_STATUS.pendente;
}

function millis(t: Timestamp): number {
  if (typeof t?.toMillis === 'function') return t.toMillis();
  if (typeof t?.toDate === 'function') return t.toDate().getTime();
  return 0;
}

/**
 * Ordena as inscrições por data desc (mais recentes primeiro), corta em
 * `limite` e mapeia para a view com badge RN-204. Empate de data → mantém
 * ordem estável por id (determinístico).
 * @pure
 */
export function derivarInscricoesRecentes(
  inscricoes: readonly InscricaoRecenteInput[],
  limite = 5
): InscricaoRecenteView[] {
  return [...inscricoes]
    .sort((a, b) => {
      const delta = millis(b.criadoEm) - millis(a.criadoEm);
      return delta !== 0 ? delta : a.id.localeCompare(b.id);
    })
    .slice(0, limite)
    .map((i) => ({
      id: i.id,
      atletaNome: i.atletaNome,
      modalidade: i.modalidade,
      eventoNome: i.eventoNome ?? null,
      badge: badgeStatusInscrito(i.status),
    }));
}
