/**
 * Hook de instrumentação do Next.js (carregado no boot do servidor).
 * Necessário desde @sentry/nextjs v8: os configs de server/edge NÃO são
 * carregados automaticamente — precisam ser importados aqui.
 * No-op silencioso quando NEXT_PUBLIC_SENTRY_DSN não está definido.
 *
 * Nota: onRequestError/captureRequestError (captura de erros de Server Components)
 * é API de Next.js 15. No Next 14 em uso aqui, erros de render são capturados
 * via app/global-error.tsx.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
