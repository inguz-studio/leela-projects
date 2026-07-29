import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentryScrub';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// No-op silencioso quando NEXT_PUBLIC_SENTRY_DSN não está definido
if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Ver `sentry.server.config.ts`. ⚠️ RESSALVA DECLARADA: isto cobre erro e
    // transação, NÃO o Session Replay — o replay manda URL de navegação por um
    // canal próprio, que não passa por `beforeSend`. Enquanto o replay estiver
    // ligado, a rota do ingresso continua exposta por ele. Escalado na review.
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
  });
}
