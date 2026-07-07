// =============================================================================
// Atividade recente do Overview (LEELA-FID-EVT-T3) — derivação PURA a partir dos
// inscritos recentes (dado real via useInscritosRecentes). Vira um feed TIPADO
// (não uma lista de nomes): cada item tem tipo, texto, iniciais de avatar,
// carimbo relativo ("há 12 min") e, quando aplica, um badge de estado. Fiel ao
// espírito do mockup `Overview do Evento.html` (Atividade recente).
// =============================================================================

import type { Inscrito, StatusInscrito, Timestamp } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

export type AtividadeTipo = 'confirmado' | 'pendente' | 'falhou';

export interface AtividadeItem {
  id: string;
  tipo: AtividadeTipo;
  /** Nome do atleta (para o texto). */
  nome: string;
  /** Iniciais para o avatar (2 letras). */
  iniciais: string;
  modalidade: string;
  /** Carimbo relativo ("há 12 min"). */
  quando: string;
  /** Badge de destaque (só em estados que pedem atenção). */
  badge?: { label: string; variant: NonNullable<BadgeProps['variant']> };
}

const TIPO_POR_STATUS: Record<StatusInscrito, AtividadeTipo> = {
  confirmado: 'confirmado',
  pendente: 'pendente',
  cancelado: 'falhou',
};

/** Iniciais (até 2) a partir do nome completo. @pure */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]![0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]![0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

function millis(t: Timestamp | undefined): number {
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  if (t && typeof t.toDate === 'function') return t.toDate().getTime();
  return 0;
}

/**
 * Carimbo relativo compacto pt-BR: "agora", "há N min", "há Nh", "há Nd".
 * Nunca futuro (clampa em "agora"). @pure
 */
export function tempoRelativo(data: Date, agora: Date = new Date()): string {
  const diffMs = agora.getTime() - data.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

/**
 * Deriva o feed de atividade dos inscritos recentes (mais novos primeiro).
 * confirmado → pagamento confirmado; pendente → aguardando (badge Pendente);
 * cancelado → pagamento falhou (badge Falha). @pure
 */
export function derivaAtividade(
  inscritos: Inscrito[] | null,
  agora: Date = new Date()
): AtividadeItem[] {
  if (!inscritos) return [];
  return [...inscritos]
    .sort((a, b) => millis(b.criadoEm) - millis(a.criadoEm))
    .map((i) => {
      const tipo = TIPO_POR_STATUS[i.status] ?? 'pendente';
      const item: AtividadeItem = {
        id: i.id,
        tipo,
        nome: i.atletaNome,
        iniciais: iniciaisDe(i.atletaNome),
        modalidade: i.modalidade,
        quando: tempoRelativo(new Date(millis(i.criadoEm)), agora),
      };
      if (tipo === 'pendente') item.badge = { label: 'Pendente', variant: 'alerta' };
      if (tipo === 'falhou') item.badge = { label: 'Falha', variant: 'vulcao' };
      return item;
    });
}
