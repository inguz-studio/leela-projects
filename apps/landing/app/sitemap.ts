// =============================================================================
// apps/landing/app/sitemap.ts
//
// Sitemap dinâmico (S1205-T2). Lista a home + cada evento PUBLICADO (o mesmo
// gate do leitor: só `publicado`/`ao_vivo` chegam aqui — rascunho/encerrado
// nunca vazam para o índice). Sem emulator (ex.: `next build`), o leitor
// devolve `[]` e o sitemap fica só com a home — build-safe, nunca fabrica rota.
//
// URLs derivam de `baseUrl()` (placeholder por env até fixar o domínio).
// =============================================================================

import type { MetadataRoute } from 'next';
import { listarEventosPublicados } from '../lib/leitor';
import { baseUrl } from '../lib/seo';

// Revalida junto com as páginas de evento (ISR): novos eventos publicados
// entram no sitemap no ciclo seguinte sem rebuild.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const eventos = await listarEventosPublicados();

  const rotasEventos: MetadataRoute.Sitemap = eventos.map((ev) => ({
    url: `${base}/${ev.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    ...rotasEventos,
  ];
}
