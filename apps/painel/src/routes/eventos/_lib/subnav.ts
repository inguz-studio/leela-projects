// =============================================================================
// Sub-nav do evento (§2.14) — fonte única das abas e da detecção de aba ativa.
//
// Abas = as rotas reais de um evento. Overview/Inscritos/Kits/Financeiro vêm
// da spec S202-T1; "Entrega" (balcão · S204/L4) entra como aba porque também
// é rota do evento — assim "qualquer rota do evento mostra a aba ativa"
// (aceite do brief) vale para TODAS as sub-rotas, e os lotes L4/L5 só
// preenchem o conteúdo sem tocar nesta sub-nav.
// =============================================================================

import type { SubNavTab } from '@leela/design-system';

export type EventoAbaId =
  | 'overview'
  | 'inscritos'
  | 'kits'
  | 'lotes'
  | 'pagina-vendas'
  | 'comunicacao'
  | 'entrega'
  | 'financeiro';

interface AbaDef {
  id: EventoAbaId;
  label: string;
  /** Segmento após o slug; overview é a rota-base (segmento vazio). */
  segmento: string;
}

const ABAS: readonly AbaDef[] = [
  { id: 'overview', label: 'Visão geral', segmento: '' },
  { id: 'inscritos', label: 'Inscritos', segmento: 'inscritos' },
  { id: 'kits', label: 'Kits', segmento: 'kits' },
  { id: 'lotes', label: 'Lotes', segmento: 'lotes' },
  { id: 'pagina-vendas', label: 'Página de vendas', segmento: 'pagina-vendas' },
  // E06 (Comunicação) segue E04 (Página de vendas) — ordem canônica, sem reordenar.
  { id: 'comunicacao', label: 'Comunicação', segmento: 'comunicacao' },
  { id: 'entrega', label: 'Entrega', segmento: 'entrega' },
  { id: 'financeiro', label: 'Financeiro', segmento: 'financeiro' },
];

/** Contadores pill opcionais por aba (ex.: inscritos = 453). */
export interface EventoSubNavCounts {
  inscritos?: number;
}

/**
 * Deriva a aba ativa a partir do pathname atual e do slug do evento.
 * `/eventos/{slug}` (ou com barra final) → overview; caso contrário, casa o
 * primeiro segmento após o slug. Segmento desconhecido → overview (fallback).
 */
export function abaAtiva(pathname: string, slug: string): EventoAbaId {
  const base = `/eventos/${slug}`;
  if (!pathname.startsWith(base)) return 'overview';
  const resto = pathname.slice(base.length).replace(/^\/+/, '');
  if (resto === '') return 'overview';
  const seg = resto.split('/')[0];
  const aba = ABAS.find((a) => a.segmento === seg);
  return aba?.id ?? 'overview';
}

/** Monta as abas do DS (href + count + active) para um evento. */
export function eventoSubNavTabs(
  slug: string,
  ativa: EventoAbaId,
  counts: EventoSubNavCounts = {},
): SubNavTab[] {
  return ABAS.map((a) => {
    const href = a.segmento ? `/eventos/${slug}/${a.segmento}` : `/eventos/${slug}`;
    const tab: SubNavTab = {
      id: a.id,
      label: a.label,
      href,
      active: a.id === ativa,
    };
    if (a.id === 'inscritos' && counts.inscritos !== undefined) {
      tab.count = counts.inscritos;
    }
    return tab;
  });
}
