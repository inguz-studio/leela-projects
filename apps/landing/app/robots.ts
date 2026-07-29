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
      // `/convite` cobre também `/convite/afiliado` (prefixo) — páginas
      // transacionais de aceite com token na query (W2-F-02 · GATE-DS-W2).
      // `/ingresso` cobre a página do ingresso e a versão imprimível: é
      // ingresso de gente, com token no caminho (S1214-T2 · RN-422). O
      // `disallow` é a terceira tranca, junto do `<meta robots>` da rota e do
      // `X-Robots-Tag` do next.config — crawler educado nem chega a pedir.
      disallow: ['/*/inscricao', '/health', '/convite', '/ingresso'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
