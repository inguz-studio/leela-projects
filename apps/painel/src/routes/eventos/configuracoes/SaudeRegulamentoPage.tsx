// =============================================================================
// SaudeRegulamentoPage — container da rota
// `/eventos/:slug/configuracoes/saude` (LEELA-S306-T2 · E04). Lê `{ evento,
// papel }` do Outlet da ConfiguracoesLayout e fia o save das flags de saúde +
// regulamento via `useAtualizarExigenciasRegulamento` → read-your-writes
// (invalida a lista do organizador + o detalhe por slug; a versão do regulamento
// reflete quando o trigger server-side computa o bump). O gate de edição reusa
// `podeEditarConfiguracoes`; a Rule é a autoridade final.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import type { AtualizarExigenciasRegulamentoInput } from '@leela/api-client';
import { useAtualizarExigenciasRegulamento } from '../../../lib/query/mutations';
import { useEventosSession } from '../_data/session';
import { SaudeRegulamentoForm } from './_components/SaudeRegulamentoForm';
import { podeEditarConfiguracoes } from './_lib/gateEvento';
import type { ConfiguracoesOutletContext } from './ConfiguracoesLayout';

export function SaudeRegulamentoPage(): JSX.Element {
  const { evento, papel } = useOutletContext<ConfiguracoesOutletContext>();
  const session = useEventosSession();
  const mutation = useAtualizarExigenciasRegulamento({
    slug: evento.slug,
    eventoId: evento.id,
    tenantId: session.tenantId ?? '',
    organizadorId: session.uid ?? '',
  });

  function onSalvar(input: AtualizarExigenciasRegulamentoInput): Promise<void> {
    return mutation.mutateAsync(input);
  }

  return (
    <SaudeRegulamentoForm
      evento={evento}
      podeEditar={podeEditarConfiguracoes(papel)}
      onSalvar={onSalvar}
    />
  );
}

SaudeRegulamentoPage.displayName = 'SaudeRegulamentoPage';
