// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR/ISR habilitado por padrão com App Router
  experimental: {
    // Necessário no Next 14 para carregar instrumentation.ts (init do Sentry em server/edge)
    instrumentationHook: true,
  },

  // Cabeçalhos de privacidade da página do ingresso (S1214-T2 · RN-422).
  // Os três são REGRA, não detalhe de implementação, e dois deles são
  // cabeçalho de RESPOSTA — não há como emiti-los de dentro de um Server
  // Component, por isso a rota está declarada aqui:
  //   - `Referrer-Policy: no-referrer` — sem ele o TOKEN sai no `Referer` de
  //     todo link de saída da página;
  //   - `Cache-Control: no-store` — o token está na URL, então CDN e proxy no
  //     caminho não podem guardar a resposta;
  //   - `X-Robots-Tag: noindex, nofollow` — o `<meta robots>` do
  //     `generateMetadata` já cobre o HTML; o cabeçalho cobre também o
  //     crawler que só olha o header. Sem isso, buscador indexa ingresso.
  // O `:token*` casa a rota e a versão imprimível abaixo dela.
  async headers() {
    return [
      {
        source: '/ingresso/:token*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // Primeiro acesso do comprador (S1223-T1 · RN-453). O `oobCode` viaja na
      // QUERY e é credencial de uso único: sem `no-referrer` ele sai no
      // `Referer` de qualquer link de saída da página, e sem `no-store` fica em
      // cache de CDN. Mesma razão da rota acima, superfície diferente.
      {
        source: '/definir-senha',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // A área do cliente (S1222-T2 · RN-451). A resposta é de UMA pessoa: um
      // cache de CDN aqui serviria a lista de alguém para o próximo visitante.
      // O `no-referrer` acompanha porque a página tem links de saída (a
      // experiência, o ingresso) e o caminho da conta não precisa viajar neles.
      {
        source: '/minha-conta',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

// withSentryConfig é aplicado SEMPRE: é ele quem injeta sentry.client.config.ts
// no bundle do cliente. Sem DSN o init vira no-op silencioso (gate no próprio config).
// O upload de source maps é gated separadamente por SENTRY_AUTH_TOKEN — sem o token,
// nada é enviado e o build segue normal.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? 'leela-landing',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  widenClientFileUpload: true,
  disableLogger: true,
});
