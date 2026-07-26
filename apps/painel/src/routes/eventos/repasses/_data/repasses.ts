// =============================================================================
// Hooks de dados do REPASSE do organizador (E09s-L3). Consomem o gateway
// (lib/query), que reusa as leituras tenant-scoped do @leela/api-client. NUNCA
// somam dinheiro no cliente — o saldo é ∑ do servidor (RN-350/351). Contrato de
// retorno { data, loading, error, refetch } para os estados §2.12 da tela
// (Skeleton / erro com "Tentar novamente" / conteúdo).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { DadosBancarios, Repasse, SaldoRepasse } from '@leela/core';
import {
  dadosBancariosQuery,
  repassesHistoricoQuery,
  saldoRepasseQuery,
} from '../../../../lib/query/queries';

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

/**
 * `dadosBancarios/current` MASCARADO do tenant (RN-354) — a única versão que o
 * cliente vê (nunca o número em claro). `null` quando o organizador ainda não
 * cadastrou (a tela abre no form).
 */
export function useDadosBancarios(tenantId: string | null): AsyncQuery<DadosBancarios | null> {
  const query = useQuery({
    ...dadosBancariosQuery(tenantId ?? ''),
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

/**
 * Histórico de repasses do tenant (mais recentes primeiro) — a tabela do T4.
 * Lista vazia = organizador ainda não solicitou nenhum saque (EmptyState honesto).
 */
export function useHistoricoRepasses(tenantId: string | null): AsyncQuery<Repasse[]> {
  const query = useQuery({
    ...repassesHistoricoQuery(tenantId ?? ''),
    enabled: !!tenantId,
  });
  return {
    data: query.data ?? [],
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
