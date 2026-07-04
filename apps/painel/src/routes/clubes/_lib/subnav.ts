// =============================================================================
// Sub-nav do clube (§2.14 / SPEC §1.3) — fonte única das 6 abas e da detecção
// de aba ativa. Espelha o padrão de eventos/_lib/subnav.
//
// As 6 abas SÃO as rotas do clube. Overview e Membros são preenchidas pelo
// E05-L3; Desafios/Parcerias/Comunicação/Configurações têm conteúdo nos lotes
// L4/L5 — a sub-nav já as lista (com contador pill) para que "qualquer rota do
// clube mostre a aba ativa" valha desde já, sem os lotes seguintes tocarem aqui.
// =============================================================================

import type { SubNavTab } from '@leela/design-system';

export type ClubeAbaId =
  | 'overview'
  | 'membros'
  | 'desafios'
  | 'parcerias'
  | 'comunicacao'
  | 'configuracoes';

interface AbaDef {
  id: ClubeAbaId;
  label: string;
  /** Segmento após o slug; overview é a rota-base (segmento vazio). */
  segmento: string;
}

const ABAS: readonly AbaDef[] = [
  { id: 'overview', label: 'Overview', segmento: '' },
  { id: 'membros', label: 'Membros', segmento: 'membros' },
  { id: 'desafios', label: 'Desafios', segmento: 'desafios' },
  { id: 'parcerias', label: 'Parcerias', segmento: 'parcerias' },
  { id: 'comunicacao', label: 'Comunicação', segmento: 'comunicacao' },
  { id: 'configuracoes', label: 'Configurações', segmento: 'configuracoes' },
];

/** Contadores pill opcionais por aba (ex.: membros = 120, desafios = 3). */
export interface ClubeSubNavCounts {
  membros?: number;
  desafios?: number;
}

/**
 * Deriva a aba ativa a partir do pathname atual e do slug do clube.
 * `/clubes/{slug}` (ou com barra final) → overview; caso contrário, casa o
 * primeiro segmento após o slug. Segmento desconhecido → overview (fallback).
 */
export function abaAtiva(pathname: string, slug: string): ClubeAbaId {
  const base = `/clubes/${slug}`;
  if (!pathname.startsWith(base)) return 'overview';
  const resto = pathname.slice(base.length).replace(/^\/+/, '');
  if (resto === '') return 'overview';
  const seg = resto.split('/')[0];
  const aba = ABAS.find((a) => a.segmento === seg);
  return aba?.id ?? 'overview';
}

/** Monta as 6 abas do DS (href + count + active) para um clube. */
export function clubeSubNavTabs(
  slug: string,
  ativa: ClubeAbaId,
  counts: ClubeSubNavCounts = {},
): SubNavTab[] {
  return ABAS.map((a) => {
    const href = a.segmento ? `/clubes/${slug}/${a.segmento}` : `/clubes/${slug}`;
    const tab: SubNavTab = {
      id: a.id,
      label: a.label,
      href,
      active: a.id === ativa,
    };
    if (a.id === 'membros' && counts.membros !== undefined) {
      tab.count = counts.membros;
    }
    if (a.id === 'desafios' && counts.desafios !== undefined) {
      tab.count = counts.desafios;
    }
    return tab;
  });
}
