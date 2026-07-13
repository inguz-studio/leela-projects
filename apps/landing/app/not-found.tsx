'use client';

// =============================================================================
// not-found.tsx (404 · Landing pública) — LEELA-E07-web · S500-T3.
//
// Renderizado pelo App Router quando `notFound()` dispara (slug inexistente OU
// evento em rascunho — gate SEO já vive no loader `getEventoPublicado`, que
// devolve null p/ status não-público e a página chama `notFound()`) e também
// como fallback de qualquer rota pública sem match. Layout mínimo (fullscreen,
// sem shell de painel), ação única "Ir para a página inicial". Copy HANDOFF-07.
//
// Client Component: o SystemStateScreen usa hooks (foco/efeitos). A navegação
// da ação é por `href` (âncora nativa) — recarga completa é aceitável no 404.
// O tema `brasa` vem do <html data-theme> do root layout (SSR-correto).
// =============================================================================

import { SystemStateScreen } from './_ds/ds';

export default function NotFound(): React.JSX.Element {
  return (
    <SystemStateScreen
      variant="notFound"
      layout="fullscreen"
      title="Essa página saiu para correr"
      message="O link que você seguiu não existe ou mudou de lugar."
      actions={[
        {
          label: 'Ir para a página inicial',
          onPress: () => undefined,
          variant: 'primary',
          href: '/',
        },
      ]}
    />
  );
}
