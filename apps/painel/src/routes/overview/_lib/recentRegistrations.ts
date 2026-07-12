// =============================================================================
// Derivação das "últimas inscrições cross-evento" da Visão Geral (S601-T2;
// tabela de 6 colunas no Lote FIDELIDADE T6). Pura. Ordena por data (criadoEm)
// desc e mapeia o status RN-204 para badge.
//
// RN-204 (StatusInscrito → badge semântico):
//   confirmado → "Pago"     (vitoria)
//   pendente   → "Pendente" (alerta)   ← nunca "Pago"
//   cancelado  → "Recusado" (vulcao)
//
// Valor (T6): o Inscrito NÃO carrega valor — ele é derivado do percurso do
// evento (Evento.percursos[]={nome,preco}, RN-200) casando a modalidade da
// inscrição com o nome do percurso. Sem match/sem percursos → null e a UI
// mostra "—" (nunca inventa preço).
// =============================================================================

import type { BadgeProps } from '@leela/design-system';
import type { PercursoEvento, StatusInscrito, Timestamp } from '@leela/core';
import { formatQuando } from './format';

/** Recorte de uma inscrição (com o evento de origem — cross-evento). */
export interface InscricaoRecenteInput {
  id: string;
  atletaNome: string;
  modalidade: string;
  status: StatusInscrito;
  criadoEm: Timestamp;
  /** Nome do evento de origem (desnormalizado no fetch cross-evento) */
  eventoNome?: string;
  /** Preço do percurso casado com a modalidade; null = desconhecido (honesto) */
  valor?: number | null;
}

export interface StatusInscritoBadge {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

/** Linha renderizável da tabela de inscrições recentes (6 colunas do mockup). */
export interface InscricaoRecenteView {
  id: string;
  atletaNome: string;
  modalidade: string;
  eventoNome: string | null;
  /** null = sem preço derivável → coluna Valor mostra "—" */
  valor: number | null;
  /** Coluna Data: "Hoje · 14:22" / "Ontem · 19:58" / "12 Mar · 09:15" */
  quando: string;
  badge: StatusInscritoBadge;
}

const BADGE_STATUS: Record<StatusInscrito, StatusInscritoBadge> = {
  confirmado: { label: 'Pago', variant: 'vitoria' },
  pendente: { label: 'Pendente', variant: 'alerta' },
  cancelado: { label: 'Recusado', variant: 'vulcao' },
  // RN-341/FABLE-B: valor devolvido ao pagador (neutro, espelha o [pag])
  estornado: { label: 'Estornado', variant: 'neutro' },
};

/** Badge semântico do status da inscrição (RN-204). @pure */
export function badgeStatusInscrito(status: StatusInscrito): StatusInscritoBadge {
  return BADGE_STATUS[status] ?? BADGE_STATUS.pendente;
}

/**
 * Preço da inscrição a partir dos percursos do evento: match do nome do
 * percurso com a modalidade (case-insensitive, trim). Sem match → null.
 * @pure
 */
export function valorDaInscricao(
  percursos: readonly PercursoEvento[] | undefined,
  modalidade: string
): number | null {
  if (!percursos || percursos.length === 0) return null;
  const alvo = modalidade.trim().toLowerCase();
  if (alvo.length === 0) return null;
  const percurso = percursos.find((p) => p.nome.trim().toLowerCase() === alvo);
  return percurso ? percurso.preco : null;
}

function millis(t: Timestamp): number {
  if (typeof t?.toMillis === 'function') return t.toMillis();
  if (typeof t?.toDate === 'function') return t.toDate().getTime();
  return 0;
}

/**
 * Ordena as inscrições por data desc (mais recentes primeiro), corta em
 * `limite` e mapeia para a view com badge RN-204 + valor + coluna Data.
 * Empate de data → mantém ordem estável por id (determinístico).
 * @pure
 */
export function derivarInscricoesRecentes(
  inscricoes: readonly InscricaoRecenteInput[],
  limite = 5,
  agora: Date = new Date()
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
      valor: i.valor ?? null,
      quando: formatQuando(new Date(millis(i.criadoEm)), agora),
      badge: badgeStatusInscrito(i.status),
    }));
}
