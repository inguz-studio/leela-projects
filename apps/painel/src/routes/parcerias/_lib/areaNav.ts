// =============================================================================
// Nav secundária da ÁREA de Parcerias (D-1008-R17) — fonte única das 3 abas.
//
// A decisão do dono: "Marcas no Menu principal pode alterar para 'Parcerias'
// onde incluimos tanto marcas quanto assessorias parceiras … o mesmo se aplica
// para minhas afiliações e influenciadores". A área concentra as três frentes:
//
//   Marcas                (`/parcerias` — a raiz, patrocinadores reutilizáveis)
//   Assessorias parceiras (`/parcerias/assessorias` — migrou de clubs)
//   Afiliações            (`/parcerias/afiliacoes` — migrou de clubs; os DOIS
//                          lados RN-318/RN-319 vivem sob a frente, com sub-nav
//                          terciária no AfiliacoesLayout)
//
// Mesmo padrão do R9 (SubNav canônica + indicador deslizante R14). A área de
// clubs ficou com o que é comunidade (hub + engajamento).
//
// @pure de propósito (padrão clubes/_lib/areaNav): a fiação de SPA acontece no
// ponto de render (ParceriasAreaNav), nunca aqui.
// =============================================================================

import type { SubNavTab } from '@leela/design-system';

export type ParceriasAreaId = 'marcas' | 'assessorias' | 'afiliacoes';

interface EntradaDef {
  id: ParceriasAreaId;
  label: string;
  /** Segmento após `/parcerias`; Marcas é a rota-base (segmento vazio). */
  segmento: string;
}

const ENTRADAS: readonly EntradaDef[] = [
  { id: 'marcas', label: 'Marcas', segmento: '' },
  { id: 'assessorias', label: 'Assessorias parceiras', segmento: 'assessorias' },
  { id: 'afiliacoes', label: 'Afiliações', segmento: 'afiliacoes' },
];

/** Monta as 3 abas do DS (href + active) para a área de Parcerias. @pure */
export function parceriasAreaNavTabs(ativa: ParceriasAreaId): SubNavTab[] {
  return ENTRADAS.map((e) => ({
    id: e.id,
    label: e.label,
    href: e.segmento ? `/parcerias/${e.segmento}` : '/parcerias',
    active: e.id === ativa,
  }));
}

/**
 * Aba ativa da área dado o pathname (mesma anatomia do D-1008-R16: quem decide
 * é a MOLDURA, nunca a página). Sub-rota herda a aba da entrada — o detalhe de
 * uma assessoria fica com "Assessorias parceiras" ativa.
 * @pure
 */
export function parceriasAreaAtiva(pathname: string): ParceriasAreaId {
  const secundarias = ENTRADAS.filter((e) => e.segmento !== '');
  for (const e of secundarias) {
    const base = `/parcerias/${e.segmento}`;
    if (pathname === base || pathname.startsWith(`${base}/`)) return e.id;
  }
  return 'marcas';
}
