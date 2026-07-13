// =============================================================================
// Apoio de apresentação do editor da página de vendas (S300-T3). Rótulos das
// seções e dos grupos (o kernel dá só `id`/`canal`), ordem canônica dos grupos
// e a derivação da URL amigável read-only com o placeholder {DOMINIO_LEELA}
// (NUNCA `be-hero.com.br` — o domínio público real é config de outra camada).
// Sem regra de negócio aqui: agrupamento e labels são copy de UI.
// =============================================================================

import {
  CANAIS_SECAO,
  SECAO_CHECKOUT_ID,
  type CanalSecao,
  type SecaoVendas,
} from '@leela/core';

/**
 * Placeholder do domínio público da LEELA. O domínio real (ex.: custom domain
 * por tenant) é configuração que ainda não existe no produto — enquanto não
 * existir, a URL amigável é exibida com o placeholder, JAMAIS com o host legado
 * `be-hero.com.br`. LACUNA registrada no report (config de domínio ausente).
 */
export const DOMINIO_LEELA = '{DOMINIO_LEELA}';

/** Título humano de cada grupo (canal) — ordem canônica em `CANAIS_SECAO`. */
export const CANAL_LABEL: Record<CanalSecao, string> = {
  essenciais: 'Essenciais (web + app)',
  landing: 'Só landing pública',
  sistema: 'Sistema',
};

/** Subtítulo de cada grupo (contexto do canal para o organizador). */
export const CANAL_DESC: Record<CanalSecao, string> = {
  essenciais: 'Aparecem na página web e no app. A base do que o inscrito vê.',
  landing: 'Só na landing pública (web). Reforço de conversão, opcionais.',
  sistema: 'Blocos do sistema de vendas. O checkout é obrigatório e não desliga.',
};

/** Rótulo humano por id de seção (fallback = o próprio id capitalizado). */
const SECAO_LABEL: Record<string, string> = {
  hero: 'Capa / Hero',
  sobre: 'Sobre o evento',
  percursos: 'Percursos e modalidades',
  lotes: 'Lotes e preços',
  depoimentos: 'Depoimentos',
  patrocinadores: 'Patrocinadores',
  [SECAO_CHECKOUT_ID]: 'Checkout',
};

/** Descrição curta por id de seção (o que o bloco entrega na página). */
const SECAO_DESC: Record<string, string> = {
  hero: 'Imagem de capa, nome do evento e chamada principal.',
  sobre: 'Texto de apresentação, história e diferenciais do evento.',
  percursos: 'Distâncias e modalidades disponíveis para inscrição.',
  lotes: 'Preços por lote e a virada automática de cada modalidade.',
  depoimentos: 'Provas sociais de edições anteriores.',
  patrocinadores: 'Logos e marcas que apoiam o evento.',
  [SECAO_CHECKOUT_ID]: 'Fluxo de inscrição e pagamento. Sempre ativo.',
};

/** Rótulo de exibição de uma seção. @pure */
export function labelSecao(id: string): string {
  return SECAO_LABEL[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** Descrição de exibição de uma seção (string vazia quando não há). @pure */
export function descricaoSecao(id: string): string {
  return SECAO_DESC[id] ?? '';
}

/** Grupo de seções de um canal, com metadados de exibição. */
export interface GrupoSecoes {
  canal: CanalSecao;
  label: string;
  descricao: string;
  secoes: SecaoVendas[];
}

/**
 * Agrupa as seções por canal na ordem canônica (`CANAIS_SECAO`), preservando a
 * ordem original das seções dentro de cada grupo. Grupos vazios são omitidos.
 * @pure
 */
export function agruparSecoes(secoes: readonly SecaoVendas[]): GrupoSecoes[] {
  return CANAIS_SECAO.map((canal) => ({
    canal,
    label: CANAL_LABEL[canal],
    descricao: CANAL_DESC[canal],
    secoes: secoes.filter((s) => s.canal === canal),
  })).filter((g) => g.secoes.length > 0);
}

/**
 * URL amigável read-only exibida no card SEO: `{DOMINIO_LEELA}/<slug>`. O slug
 * vem do último segmento de `slugAmigavel` (o kernel a deriva) ou, na falta, do
 * slug do evento. NUNCA vaza domínio real/legado: só o placeholder + o segmento.
 * @pure
 */
export function urlAmigavelExibida(slugAmigavel: string, eventoSlug: string): string {
  const bruto = (slugAmigavel ?? '').trim();
  const segmento = bruto.length > 0 ? (bruto.split('/').pop() ?? '') : '';
  const slug = segmento.length > 0 ? segmento : eventoSlug;
  return `${DOMINIO_LEELA}/${slug}`;
}
