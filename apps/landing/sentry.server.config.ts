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
    // O token de `/ingresso/{token}` é credencial portadora e NÃO expira
    // (D-ING-5). Com `tracesSampleRate: 1.0`, cada abertura de ingresso vira
    // uma transação carregando `request.url` — o ingresso inteiro indo para um
    // terceiro, para sempre. Review INGPAGE-REV, achado 2.
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
  });
}
