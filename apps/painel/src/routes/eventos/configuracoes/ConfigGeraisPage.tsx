// =============================================================================
// ConfigGeraisPage — container da rota `/eventos/:slug/configuracoes` (S304-T2 ·
// E04-L5). Lê `{ evento, papel }` do Outlet da ConfiguracoesLayout, deriva o
// gate de edição (`podeEditarConfiguracoes`) e fia o save direto do doc do
// evento (`useAtualizarConfiguracoesEvento` → read-your-writes). O papel sem
// permissão vê o form em leitura (a Rule também nega o write — dupla camada).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import type { AtualizarConfiguracoesEventoInput } from '@leela/api-client';
import { useAtualizarConfiguracoesEvento } from '../../../lib/query/mutations';
import { useEventosSession } from '../_data/session';
import { ConfigGeraisForm } from './_components/ConfigGeraisForm';
import { podeEditarConfiguracoes } from './_lib/gateEvento';
import type { ConfiguracoesOutletContext } from './ConfiguracoesLayout';

export function ConfigGeraisPage(): JSX.Element {
  const { evento, papel } = useOutletContext<ConfiguracoesOutletContext>();
  const session = useEventosSession();
  const mutation = useAtualizarConfiguracoesEvento({
    slug: evento.slug,
    eventoId: evento.id,
    tenantId: session.tenantId ?? '',
    organizadorId: session.uid ?? '',
  });

  function onSalvar(input: AtualizarConfiguracoesEventoInput): Promise<void> {
    return mutation.mutateAsync(input);
  }

  return (
    <ConfigGeraisForm
      evento={evento}
      podeEditar={podeEditarConfiguracoes(papel)}
      onSalvar={onSalvar}
    />
  );
}

ConfigGeraisPage.displayName = 'ConfigGeraisPage';
