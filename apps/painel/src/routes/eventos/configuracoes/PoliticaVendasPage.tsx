// =============================================================================
// PoliticaVendasPage — container da rota `/eventos/:slug/configuracoes/politica`
// (LEELA-S305-T2/T3 · E04). Lê `{ evento, papel }` do Outlet da
// ConfiguracoesLayout, carrega a política gravada (ou parte dos defaults legais
// do kernel quando `null`) e fia o save via `useSalvarPoliticaVendas` →
// read-your-writes (invalida a chave da política). O gate de edição reusa
// `podeEditarConfiguracoes` (a Rule ainda restringe a ESCRITA ao owner do
// tenant — dupla camada).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Skeleton } from '@leela/design-system';
import type { SalvarPoliticaVendasInput } from '@leela/api-client';
import { politicaVendasDoEventoQuery } from '../../../lib/query/queries';
import { useSalvarPoliticaVendas } from '../../../lib/query/mutations';
import { useTenantSession } from '../../../lib/session/tenantSession';
import { PoliticaVendasForm } from './_components/PoliticaVendasForm';
import { podeEditarConfiguracoes } from './_lib/gateEvento';
import type { ConfiguracoesOutletContext } from './ConfiguracoesLayout';

export function PoliticaVendasPage(): JSX.Element {
  const { evento, papel } = useOutletContext<ConfiguracoesOutletContext>();
  const session = useTenantSession();
  const { data, isPending, error } = useQuery(politicaVendasDoEventoQuery(evento.id));
  const mutation = useSalvarPoliticaVendas({
    eventoId: evento.id,
    tenantId: session.tenantId ?? '',
  });

  function onSalvar(input: Omit<SalvarPoliticaVendasInput, 'tenantId'>): Promise<void> {
    return mutation.mutateAsync(input);
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando política de vendas" className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton variant="rect" className="h-40" />
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar a política"
        description="Tente recarregar a página. Se persistir, verifique sua conexão."
      />
    );
  }

  return (
    <PoliticaVendasForm
      politica={data}
      podeEditar={podeEditarConfiguracoes(papel)}
      onSalvar={onSalvar}
    />
  );
}

PoliticaVendasPage.displayName = 'PoliticaVendasPage';
