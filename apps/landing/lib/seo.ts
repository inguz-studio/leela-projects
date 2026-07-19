// =============================================================================
// apps/landing/lib/seo.ts
//
// Helpers de SEO PUROS (sem I/O, sem firebase-admin) — S1205-T1/T2.
//
// - `baseUrl()`: origem canônica da superfície pública. `{DOMINIO_LEELA}` ainda
//   é ação externa pendente (o domínio real não foi fixado), então usamos o
//   placeholder por env `NEXT_PUBLIC_LEELA_URL` (default localhost). Todas as
//   URLs absolutas (canonical, OG, JSON-LD, sitemap, robots) derivam DAQUI —
//   trocar o domínio é uma única variável.
// - Construtores de JSON-LD (schema.org) da página de evento e da home. NUNCA
//   fabricam campo: preço/imagem só entram quando o dado existe (RN-153/RN-166).
// - `serializeJsonLd()`: serialização SEGURA para inline `<script>` (W2-F-01).
// =============================================================================

import type { EventoPublico, EventoResumo } from './tipos';

/**
 * Serialização SEGURA de JSON-LD para `<script type="application/ld+json">`
 * (fix W2-F-01 · GATE-DS-W2). `JSON.stringify` NÃO escapa `<`/`>`/`&` — um
 * nome/descrição de evento contendo `</script><script>…` (dado do ORGANIZADOR:
 * tenant autenticado, mas fronteira de confiança vs visitante público)
 * terminaria o bloco e executaria script na página pública (stored XSS).
 *
 * Escapamos os pontos de breakout como escapes unicode JSON (válidos dentro de
 * string JSON; `JSON.parse` devolve o caractere original — semântica intacta
 * para crawlers):
 * - `<` vira `\u003c` — impede `</script>` E `<!--` (comment breakout).
 * - `>` vira `\u003e` — impede `-->` / `]]>` em parsers legados.
 * - `&` vira `\u0026` — impede reinterpretação de entidades em contexto XHTML.
 * - U+2028/U+2029 viram `\u2028`/`\u2029` — separadores de linha válidos em
 *   JSON mas ilegais em JS source (higiene padrão de inline-JSON).
 * Padrão recomendado pelo próprio Next para JSON-LD
 * (https://nextjs.org/docs/app/guides/json-ld).
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Origem canônica da landing, sem barra final. Placeholder até fixar domínio. */
export function baseUrl(): string {
  const raw = process.env['NEXT_PUBLIC_LEELA_URL'];
  const base = raw !== undefined && raw.trim().length > 0 ? raw.trim() : 'http://localhost:3000';
  return base.replace(/\/+$/, '');
}

/** URL pública absoluta de um evento (`{base}/{slug}`). */
export function urlEvento(slug: string): string {
  return `${baseUrl()}/${slug}`;
}

/** URL pública absoluta de um perfil (`{base}/@{handle}` — S1700/RN-160). */
export function urlPerfil(handle: string): string {
  return `${baseUrl()}/@${handle}`;
}

/**
 * JSON-LD `Event` (schema.org) da página de evento. Presencial, agendado. O
 * bloco `offers` só é emitido quando há preço vigente (venda aberta) — jamais
 * inventa preço para venda fechada. `image` só quando a capa é URL válida.
 */
export function eventoJsonLd(evento: EventoPublico): Record<string, unknown> {
  const url = urlEvento(evento.slug);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: evento.nome,
    startDate: evento.dataISO,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url,
    description: evento.seo.descricao,
    location: {
      '@type': 'Place',
      name: evento.local,
      address: evento.local,
    },
  };

  if (evento.imagemUrl !== undefined && evento.imagemUrl.length > 0) {
    jsonLd['image'] = [evento.imagemUrl];
  }

  // `offers` só com preço real (precoMinimo === null ⇒ venda fechada). O
  // schema.org exige `price` numérico — sem ele, o bloco inteiro é omitido.
  if (evento.precoMinimo !== null) {
    jsonLd['offers'] = {
      '@type': 'Offer',
      price: evento.precoMinimo.toFixed(2),
      priceCurrency: 'BRL',
      availability:
        evento.estadoVenda === 'esgotado'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: `${url}/inscricao`,
    };
  }

  return jsonLd;
}

/**
 * JSON-LD `ItemList` da home marketplace: os eventos publicados como itens
 * ordenados. Dado real (nome + URL), nada fabricado; lista vazia ⇒ itemList
 * vazio honesto.
 */
export function marketplaceJsonLd(eventos: readonly EventoResumo[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: eventos.map((ev, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: urlEvento(ev.slug),
      name: ev.nome,
    })),
  };
}
