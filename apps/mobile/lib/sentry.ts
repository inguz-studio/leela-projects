import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Inicializa o Sentry SDK para o app mobile.
 * No-op silencioso quando EXPO_PUBLIC_SENTRY_DSN não está definido.
 */
export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',
    tracesSampleRate: 1.0,
    // Para produção: configurar EAS Build com o plugin nativo do Sentry
    // Ver README.md — seção "Sentry: ativar crash reporting nativo"
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
