// =============================================================================
// linkPublico — FONTE ÚNICA da base pública (landing) do painel.
//
// Bug R10 (Vitor): o botão "Ver página pública" abria `window.location.origin`
// (o próprio painel, :5273 no preview) + prefixo `/e/` inexistente. A landing
// serve o evento na RAIZ (`/{slug}`; route group `(public)` não adiciona
// segmento) e só o próprio painel respondia — 404/nada.
//
// A URL pública é configurável por env do painel (`VITE_LEELA_URL`), a MESMA
// convenção já usada em Perfil público e Assessorias — aqui centralizada para
// não haver derivação divergente. No preview, `preview.sh` injeta
// `VITE_LEELA_URL=http://127.0.0.1:3000` (a landing local). Sem env, o fallback
// é o domínio de produção do produto (a decisão de domínio segue aberta; o env
// resolve os dois mundos).
//
// UXW-MELHORIAS (MEL-21 + be-hero): o cânone (`LEELA-E12-landing.md`, §Domínio
// público) proíbe hardcodar `be-hero.com.br` fora deste arquivo. Este É o
// ÚNICO lugar sancionado para o literal — é a fonte canônica que o resto do
// painel consome (`PUBLIC_BASE`/`PUBLIC_HOST` abaixo, e os helpers
// `link*Publico`). Achamos SEIS ocorrências soltas do domínio em rotas de
// clubs (`ClubeShell`, `ConfiguracoesView`, `DesafiosPage`, `ConviteModal`,
// `NovoClubePage`) que reescreviam o literal na mão em vez de ler daqui — as
// cinco trocamos por `linkClubePublico`; esta linha É a fonte, não um
// consumidor, e por isso não "troca por referência a si mesma".
// =============================================================================

import { montarLinkPromocional } from '@leela/core';

/** Base do link público (landing), sem barra final. */
export const PUBLIC_BASE: string =
  (import.meta.env.VITE_LEELA_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://be-hero.com.br';

/**
 * Base pública SEM protocolo, para exibição textual ("be-hero.com.br", nunca
 * "https://be-hero.com.br") — o formato que as telas de clube já usavam antes
 * de ler do env. @pure em relação a `PUBLIC_BASE` (calculado uma vez no módulo).
 */
export const PUBLIC_HOST: string = PUBLIC_BASE.replace(/^https?:\/\//, '');

/** URL pública de um evento na landing: `${PUBLIC_BASE}/${slug}`. @pure */
export function linkEventoPublico(slug: string): string {
  return `${PUBLIC_BASE}/${slug}`;
}

/**
 * Endereço público de um clube, sem protocolo: `${PUBLIC_HOST}/c/${slug}`.
 * Mesma anatomia textual que as telas de clube sempre mostraram — só a fonte
 * do domínio deixou de estar hardcoded. @pure
 */
export function linkClubePublico(slug: string): string {
  return `${PUBLIC_HOST}/c/${slug}`;
}

// ---------------------------------------------------------------------------
// Link compartilhável de afiliado e de assessoria (S1215-T1 · RN-429)
// ---------------------------------------------------------------------------

/**
 * Base pública SÓ para o link promocional. Diferente do `PUBLIC_BASE` acima de
 * propósito: aquele tem fallback para um domínio fixo porque serve o botão "Ver
 * página pública", que é navegação interna do organizador — se a env faltar,
 * ele abre a aba errada e a pessoa percebe na hora.
 *
 * Aqui não. Este link é COPIADO e DISTRIBUÍDO: vai para bio de influenciador,
 * story e material impresso. Um fallback para domínio de terceiro produziria um
 * link errado em massa, e quem clicasse cairia no site de outra empresa levando
 * a comissão de ninguém. Sem env, o link não existe — é a mesma escolha que a
 * RN-423 fez para o e-mail da compra, pelo mesmo motivo.
 */
function basePromocional(): string | undefined {
  return import.meta.env.VITE_LEELA_URL as string | undefined;
}

/**
 * O link compartilhável de um afiliado, ou `null` quando não dá para montar um
 * honesto (sem base configurada, sem slug, ref fora do padrão). Wrapper fino do
 * gerador ÚNICO do core — o painel não monta URL na mão. @pure
 */
export function linkPromocional(
  eventoSlug: string,
  refCodigo: string,
  cupomCodigo?: string | null,
): string | null {
  return montarLinkPromocional({
    baseUrl: basePromocional(),
    eventoSlug,
    refCodigo,
    ...(cupomCodigo !== undefined ? { cupomCodigo } : {}),
  });
}

/** Mensagem única de quando o link não pode ser gerado — honesta e acionável. */
export const MSG_SEM_LINK_PROMOCIONAL =
  'Link indisponível: a URL pública do produto não está configurada neste ambiente.';
