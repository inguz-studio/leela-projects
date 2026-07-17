// =============================================================================
// apps/landing/app/robots.ts
//
// robots.txt gerado (S1205-T2). A superfície pública é indexável (home +
// páginas de evento publicadas); o fluxo transacional de inscrição e o
// healthcheck ficam fora do índice (não são conteúdo de descoberta). Aponta
// para o sitemap e o host canônico.
//
// Nota RN-140 (visibilidade de clube: `publica` ⇒ noindex, `indexavel` ⇒
// index): o noindex por-página vive no `generateMetadata` da rota de clube,
// que AINDA NÃO EXISTE na landing (S1202 é backlog). Quando a rota de clube
// aterrissar, o robots por-página dela aplica RN-140; aqui nada a fazer.
// =============================================================================

import type { MetadataRoute } from 'next';
import { baseUrl } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/*/inscricao', '/health'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
