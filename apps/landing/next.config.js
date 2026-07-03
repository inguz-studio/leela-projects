// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR/ISR habilitado por padrão com App Router
  experimental: {
    // Necessário no Next 14 para carregar instrumentation.ts (init do Sentry em server/edge)
    instrumentationHook: true,
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
