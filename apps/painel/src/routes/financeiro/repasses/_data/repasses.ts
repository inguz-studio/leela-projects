// =============================================================================
// Hooks de dados do REPASSE do organizador (E09s-L3). Consomem o gateway
// (lib/query), que reusa as leituras tenant-scoped do @leela/api-client. NUNCA
// somam dinheiro no cliente — o saldo é ∑ do servidor (RN-350/351). Contrato de
// retorno { data, loading, error, refetch } para os estados §2.12 da tela
// (Skeleton / erro com "Tentar novamente" / conteúdo).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { SaldoRepasse } from '@leela/core';
import { saldoRepasseQuery } from '../../../../lib/query/queries';

export interface AsyncQuery<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  /** Recarrega a query (botão "Tentar novamente" do estado de erro — §2.12). */
  refetch: () => void;
}

/**
 * `saldo/current` do tenant — a ÚNICA fonte dos 3 cards (vendido/disponível/
 * retido). `null` quando a Function ainda não computou (tenant sem venda) → a
 * tela mostra "Nenhuma movimentação", não zeros ambíguos (§2.12).
 */
export function useSaldoRepasse(tenantId: string | null): AsyncQuery<SaldoRepasse | null> {
  const query = useQuery({
    ...saldoRepasseQuery(tenantId ?? ''),
    enabled: !!tenantId,
  });
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
