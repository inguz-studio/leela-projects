import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Captura um erro no Sentry com contexto extra opcional.
 * No-op silencioso quando NEXT_PUBLIC_SENTRY_DSN não está configurado.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
