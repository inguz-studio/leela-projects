'use client';

// =============================================================================
// global-error.tsx (500 · Landing · raiz) — LEELA-E07-web · S502-T1 (upgrade).
//
// Boundary global do App Router: captura erros no PRÓPRIO root layout, então
// precisa reconstruir <html><body> (o layout raiz não roda aqui). Importa o
// globals.css e fixa data-theme="brasa" para os tokens do DS pintarem sem o
// root layout. Upgrade do stub E00: preserva a captura no Sentry (não regride),
// troca o <h2> cru pelo SystemStateScreen fullscreen com eventId + reset, e
// nunca expõe stack/message na UI. Copy HANDOFF-07.
// =============================================================================

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import './globals.css';
import { SystemStateScreen } from './_ds/ds';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  const [eventId, setEventId] = useState<string>('');

  useEffect(() => {
    // Não-regressão: a captura no Sentry do stub é preservada. O retorno é o
    // eventId (id vazio sem DSN — decisão #8).
    setEventId(Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="brasa">
      <body>
        <SystemStateScreen
          variant="error"
          layout="fullscreen"
          title="Tropeçamos aqui, não foi você"
          message="Algo quebrou do nosso lado e a equipe já foi avisada."
          detail={eventId}
          actions={[
            { label: 'Tentar novamente', onPress: () => reset(), variant: 'primary' },
          ]}
        />
      </body>
    </html>
  );
}
