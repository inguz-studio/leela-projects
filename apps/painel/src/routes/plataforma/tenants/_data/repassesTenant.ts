// =============================================================================
// Leitura de SALDO e REPASSES de UM tenant, para a aba Financeiro da ficha
// (ADMIN-VISAO onda 2 · S1613-T5).
//
// Reuso quase total: os dois wrappers de query já existem no gateway
// (`saldoRepasseQuery` e `repassesHistoricoQuery`, sobre `getSaldoRepasse` e
// `listRepasses` do api-client). Nada de reader novo, nada de soma no cliente —
// o saldo é ∑ do servidor (RN-350/351) e chega pronto.
//
// ⛔ A FILA GLOBAL NÃO SERVE AQUI. `repassesFilaAdminQuery` é um fan-out sobre
// TODOS os tenants e traz só os estados `solicitado|aprovado`: usada nesta aba,
// ela esconderia os repasses `pago`, `recusado` e `cancelado` deste produtor —
// justamente o histórico que a ficha existe para mostrar, e justamente onde
// mora a RN-356. A leitura tenant-scoped devolve o histórico inteiro e custa
// uma consulta.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { Repasse, SaldoRepasse } from '@leela/core';
import { repassesHistoricoQuery, saldoRepasseQuery } from '../../../../lib/query/queries';

export interface SaldoDoTenantState {
  /** `null` = a Function ainda não computou saldo (tenant sem venda). */
  saldo: SaldoRepasse | null;
  loading: boolean;
  error: Error | null;
}

/**
 * `tenants/{tid}/saldo/current` — a ÚNICA fonte dos cards de saldo. `null` não
 * é erro nem zero: é "ainda não houve movimento", e a tela diz isso.
 */
export function useSaldoDoTenant(tenantId: string): SaldoDoTenantState {
  const query = useQuery({ ...saldoRepasseQuery(tenantId), enabled: !!tenantId });
  return {
    saldo: query.data ?? null,
    loading: !!tenantId && query.isPending,
    error: query.error ?? null,
  };
}

export interface RepassesDoTenantState {
  repasses: Repasse[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Histórico COMPLETO de repasses do tenant (mais recentes primeiro). */
export function useRepassesDoTenant(tenantId: string): RepassesDoTenantState {
  const query = useQuery({ ...repassesHistoricoQuery(tenantId), enabled: !!tenantId });
  return {
    repasses: query.data ?? [],
    loading: !!tenantId && query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
