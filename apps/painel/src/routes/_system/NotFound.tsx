// =============================================================================
// NotFound (404 · Painel) — LEELA-E07 · S500-T2 (retraduzido Vite/React Router).
//
// Rota catch-all `path="*"` de cada sub-router de domínio. Cai DENTRO do shell
// daquele domínio (sidebar/header preservados, layout="shell"). Copy canônica
// HANDOFF-07. Ações: "Voltar" (history back) + "Ir para a Visão Geral" (`/`).
//
// Nota de fronteira: um EVENTO inexistente (`/eventos/:slug` com slug que não
// existe) NÃO cai aqui — casa com `:slug` e é tratado pelo EventoLayout com um
// EmptyState dedicado (decisão Onda1 review #16: staff não recebe "404 seco").
// Este 404 é para caminhos genuinamente sem rota (segmento/aba inexistente).
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { SystemStateScreen } from '@leela/design-system';

export function NotFound(): JSX.Element {
  const navigate = useNavigate();

  return (
    <SystemStateScreen
      variant="notFound"
      layout="shell"
      title="Essa página saiu para correr"
      message="O link que você seguiu não existe ou mudou de lugar."
      actions={[
        { label: 'Voltar', onPress: () => navigate(-1), variant: 'secondary' },
        { label: 'Ir para a Visão Geral', onPress: () => navigate('/'), variant: 'primary' },
      ]}
    />
  );
}

NotFound.displayName = 'NotFound';
