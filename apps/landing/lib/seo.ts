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
// =============================================================================

import type { EventoPublico, EventoResumo } from './tipos';

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
