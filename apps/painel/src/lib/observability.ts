// =============================================================================
// observability.ts — wrapper de captura de erro sobre lib/sentry.ts.
// LEELA-E07-web · S502-T1 (painel).
//
// `captureException(err) → eventId`: registra a exceção no Sentry e devolve o
// eventId, exibido ao usuário como id de erro no SystemStateScreen (500). Sem
// VITE_SENTRY_DSN → no-op, devolve '' (decisão #8: id real só com DSN de
// staging; sem DSN o componente oculta o detalhe). Nenhum dado sensível sai
// daqui para a UI — o eventId é opaco.
// =============================================================================

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Captura a exceção no Sentry (com contexto extra opcional) e devolve o
 * eventId. No-op silencioso (devolve '') quando o DSN não está configurado.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): string {
  if (!DSN) return '';
  let eventId = '';
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    eventId = Sentry.captureException(error);
  });
  return eventId;
}
