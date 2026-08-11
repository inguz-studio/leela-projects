// =============================================================================
// Nav secundária da ÁREA de clubs (D-1008-R9, reconciliada pela D-1008-R17) —
// fonte única das entradas.
//
// O R9 criou o menu com 5 entradas (substituindo botões soltos do hub). A
// D-1008-R17 migrou assessorias parceiras e afiliações/influenciadores para a
// área Parcerias ("faz mas sentido do que deixar em clubs" — dono); a área de
// clubs ficou com o que é COMUNIDADE:
//
//   Clubes      (`/clubes` — a raiz, o hub)
//   Engajamento (`/clubes/engajamento` — a análise da comunidade)
//
// Este é o nível ACIMA do `_lib/subnav.ts` do clube (que navega DENTRO de um
// clube). As rotas antigas das entradas migradas viram redirects SPA em
// ClubesRoutes (RN-234 — link salvo não morre).
//
// @pure de propósito (padrão eventos/_lib/subnav): a fiação de SPA acontece no
// ponto de render (ClubesAreaNav), nunca aqui.
// =============================================================================

import type { SubNavTab } from '@leela/design-system';

export type ClubesAreaId = 'clubes' | 'engajamento';

interface EntradaDef {
  id: ClubesAreaId;
  label: string;
  /** Segmento após `/clubes`; o hub é a rota-base (segmento vazio). */
  segmento: string;
}

const ENTRADAS: readonly EntradaDef[] = [
  { id: 'clubes', label: 'Clubes', segmento: '' },
  { id: 'engajamento', label: 'Engajamento', segmento: 'engajamento' },
];

/** Monta as entradas do DS (href + active) para a área de clubs. @pure */
export function clubesAreaNavTabs(ativa: ClubesAreaId): SubNavTab[] {
  return ENTRADAS.map((e) => ({
    id: e.id,
    label: e.label,
    href: e.segmento ? `/clubes/${e.segmento}` : '/clubes',
    active: e.id === ativa,
  }));
}

/**
 * Aba ativa da área dado o pathname (D-1008-R16). Vive aqui — e não em cada
 * página — porque o dono do menu é o LAYOUT ROUTE da área (`ClubesAreaLayout`):
 * a auditoria do R16 provou que menu colado página a página produz aba órfã
 * (rota sem menu) e layout inconsistente. Prefixo mais específico primeiro;
 * o que não casar com nenhuma entrada secundária é a raiz (o hub). Sub-rotas
 * de uma entrada herdam a aba da entrada.
 * @pure
 */
export function clubesAreaAtiva(pathname: string): ClubesAreaId {
  const secundarias = ENTRADAS.filter((e) => e.segmento !== '');
  for (const e of secundarias) {
    const base = `/clubes/${e.segmento}`;
    if (pathname === base || pathname.startsWith(`${base}/`)) return e.id;
  }
  return 'clubes';
}
