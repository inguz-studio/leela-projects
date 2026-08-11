// =============================================================================
// Nav secundária da ÁREA de clubs (D-1008-R9) — fonte única das 5 entradas.
//
// A decisão do dono: os acessos "afiliações influenciadores, assessorias
// parceiras e engajamento" saem de BOTÕES SOLTOS no header do hub e viram um
// menu secundário canônico (SubNav do DS — o mesmo padrão § 2.14 de eventos e
// do clube). "Clubes" é a raiz da área (o hub); as demais são as rotas
// estáticas irmãs de `ClubesRoutes` — este é o nível ACIMA do `_lib/subnav.ts`
// do clube (que navega DENTRO de um clube).
//
// @pure de propósito (padrão eventos/_lib/subnav): a fiação de SPA acontece no
// ponto de render (ClubesAreaNav), nunca aqui.
// =============================================================================

import type { SubNavTab } from '@leela/design-system';

export type ClubesAreaId =
  | 'clubes'
  | 'engajamento'
  | 'minhas-afiliacoes'
  | 'influenciadores'
  | 'assessorias';

interface EntradaDef {
  id: ClubesAreaId;
  label: string;
  /** Segmento após `/clubes`; o hub é a rota-base (segmento vazio). */
  segmento: string;
}

// Ordem = a mesma dos botões que este menu substitui (Engajamento primeiro
// entre as secundárias: é a leitura de TODA a lista, não um destino lateral),
// com "Clubes" (a raiz) na frente.
const ENTRADAS: readonly EntradaDef[] = [
  { id: 'clubes', label: 'Clubes', segmento: '' },
  { id: 'engajamento', label: 'Engajamento', segmento: 'engajamento' },
  { id: 'minhas-afiliacoes', label: 'Minhas afiliações', segmento: 'minhas-afiliacoes' },
  { id: 'influenciadores', label: 'Influenciadores', segmento: 'influenciadores' },
  { id: 'assessorias', label: 'Assessorias parceiras', segmento: 'assessorias' },
];

/** Monta as 5 entradas do DS (href + active) para a área de clubs. @pure */
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
 * de uma entrada (ex.: `/clubes/assessorias/{id}`) herdam a aba da entrada.
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
