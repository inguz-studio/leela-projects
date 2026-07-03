'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Error boundary global do App Router — sem ele, erros de render no cliente
 * são engolidos pelo boundary do Next e nunca chegam ao Sentry.
 * captureException é no-op quando o Sentry não foi inicializado (sem DSN).
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <h2>Algo deu errado. Recarregue a página para tentar de novo.</h2>
      </body>
    </html>
  );
}
