// =============================================================================
// Hooks de dados da ANÁLISE de vendas (RN-820). Consomem o gateway (lib/query),
// que reusa leituras provadas do api-client e os agregados existentes — NUNCA
// varre inscritos no cliente:
//   • desempenho de vendas → `getOverview` (callable server-side: dashboard/current);
//   • modalidades com mais inscritos → fan-out de `financeiro/current`;
//   • tamanhos mais pedidos → fan-out de aprovisionamento por SKU (FABLE-D);
//   • perfil de compradores (idade/sexo) → fan-out de `demografia/current`
//     (LEELA-BEPEND-T1 — agregado por evento da Function agregarDemografia;
//     substitui o mock; nenhum dado individual chega ao painel — LGPD).
// Contrato { data, loading, error, refetch } (estados §2.12).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { BarChartDatum } from '@leela/design-system';
import type { OverviewResult } from '@leela/api-client';
import {
  aprovisionamentoDoOrganizadorQuery,
  demografiaDoOrganizadorQuery,
  financeiroPorEventoDoOrganizadorQuery,
  overviewQuery,
} from '../../../../lib/query/queries';
import { somarDemografia, type DemografiaTenant } from '../_lib/demografia';
import { modalidadesMaisInscritos } from '../_lib/modalidades';
import { tamanhosMaisPedidos } from '../_lib/tamanhos';

export interface AsyncQuery<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Desempenho de vendas — KPIs + série de conversão (getOverview · dashboard/current). */
export function useDesempenhoVendas(): AsyncQuery<OverviewResult | null> {
  const query = useQuery(overviewQuery());
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Modalidades com mais inscritos do organizador (∑ de `financeiro/current`). */
export function useModalidadesTenant(
  tenantId: string | null,
  organizadorId: string | null,
): AsyncQuery<BarChartDatum[]> {
  const query = useQuery({
    ...financeiroPorEventoDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: !!tenantId && !!organizadorId,
  });
  return {
    data: query.data ? modalidadesMaisInscritos(query.data) : [],
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Perfil demográfico REAL do organizador (∑ de `demografia/current` — RN-820). */
export function useDemografiaTenant(
  tenantId: string | null,
  organizadorId: string | null,
): AsyncQuery<DemografiaTenant> {
  const query = useQuery({
    ...demografiaDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: !!tenantId && !!organizadorId,
  });
  return {
    data: somarDemografia(query.data ?? []),
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Tamanhos de camiseta mais pedidos do organizador (∑ do aprovisionamento). */
export function useTamanhosTenant(
  tenantId: string | null,
  organizadorId: string | null,
): AsyncQuery<BarChartDatum[]> {
  const query = useQuery({
    ...aprovisionamentoDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: !!tenantId && !!organizadorId,
  });
  return {
    data: query.data ? tamanhosMaisPedidos(query.data) : [],
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
