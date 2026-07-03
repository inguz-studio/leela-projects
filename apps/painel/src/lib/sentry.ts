import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Inicializa o Sentry SDK para o painel.
 * No-op silencioso quando VITE_SENTRY_DSN não está definido.
 */
export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Captura um erro no Sentry com contexto extra opcional.
 * No-op silencioso quando DSN não está configurado.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
