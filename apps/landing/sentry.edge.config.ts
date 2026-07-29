import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentryScrub';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// No-op silencioso quando NEXT_PUBLIC_SENTRY_DSN não está definido
if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: 1.0,
    // Ver `sentry.server.config.ts`: o token do ingresso não sai daqui.
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
  });
}
