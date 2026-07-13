'use client';

// =============================================================================
// error.tsx (500 · Landing · segmento) — LEELA-E07-web · S502-T1.
//
// Error boundary de SEGMENTO do App Router: captura erro de runtime abaixo do
// root layout (o <html><body> do layout permanece). Registra no Sentry e
// mostra o `eventId` como id de erro; NUNCA expõe `error.message`/stack na UI.
// "Tentar novamente" chama `reset()` (re-render do segmento). Copy HANDOFF-07.
// =============================================================================

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { SystemStateScreen } from './_ds/ds';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  const [eventId, setEventId] = useState<string>('');

  useEffect(() => {
    // captureException devolve o eventId (no-op → id vazio sem DSN; decisão #8).
    setEventId(Sentry.captureException(error));
  }, [error]);

  return (
    <SystemStateScreen
      variant="error"
      layout="fullscreen"
      title="Tropeçamos aqui, não foi você"
      message="Algo quebrou do nosso lado e a equipe já foi avisada."
      detail={eventId}
      actions={[
        { label: 'Tentar novamente', onPress: () => reset(), variant: 'primary' },
        { label: 'Voltar', onPress: () => window.history.back(), variant: 'secondary' },
      ]}
    />
  );
}
