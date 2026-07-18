// =============================================================================
// Hooks de dados da ANÁLISE de vendas (RN-820 · filtro por evento RN-821). Cada
// hook aceita `eventoId: string | null`:
//   • null  = "Todos os eventos" → agregado do tenant (fan-out / callable);
//   • id     = recorte de UM evento → agregado `…/current` DAQUELE evento.
// Nunca varre inscritos no cliente — só lê agregados ∑ (RN-820/§2.12):
//   • desempenho → `getOverview` (tenant) | `financeiro/current` do evento;
//   • modalidades → fan-out | `financeiro/current` de 1 evento;
//   • tamanhos → fan-out aprovisionamento | aprovisionamento de 1 evento;
//   • perfil (idade/sexo) → fan-out `demografia/current` | `demografia/current`
//     de 1 evento (LEELA-BEPEND-T1 — sem PII, só contagens · LGPD).
// Contrato { data, loading, error, refetch } (estados §2.12).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { BarChartDatum, ComboboxOption } from '@leela/design-system';
import type { OverviewResult } from '@leela/api-client';
import {
  aprovisionamentoDoEventoQuery,
  aprovisionamentoDoOrganizadorQuery,
  demografiaCurrentQuery,
  demografiaDoOrganizadorQuery,
  eventosDoOrganizadorQuery,
  financeiroCurrentQuery,
  financeiroPorEventoDoOrganizadorQuery,
  overviewQuery,
  type EventoFinanceiroRow,
} from '../../../../lib/query/queries';
import { somarDemografia, type DemografiaTenant } from '../_lib/demografia';
import { overviewDoFinanceiro } from '../_lib/desempenho';
import { modalidadesMaisInscritos } from '../_lib/modalidades';
import { tamanhosMaisPedidos } from '../_lib/tamanhos';

export interface AsyncQuery<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Eventos do organizador como opções do Combobox de filtro (RN-821). */
export function useEventosParaFiltro(
  tenantId: string | null,
  organizadorId: string | null,
): AsyncQuery<ComboboxOption[]> {
  const query = useQuery({
    ...eventosDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: !!tenantId && !!organizadorId,
  });
  return {
    data: (query.data ?? []).map((ev): ComboboxOption => ({ value: ev.id, label: ev.nome })),
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * Desempenho de vendas — KPIs + série de conversão. "Todos" → `getOverview`
 * (dashboard/current); evento → `financeiro/current` mapeado ao mesmo contrato
 * (S-R9-01-T2 · overviewDoFinanceiro). As duas queries coexistem, só a do escopo
 * ativo é `enabled` — a outra fica idle (não busca).
 */
export function useDesempenhoAnalise(eventoId: string | null): AsyncQuery<OverviewResult | null> {
  const todos = useQuery({ ...overviewQuery(), enabled: eventoId === null });
  const evento = useQuery({
    ...financeiroCurrentQuery(eventoId ?? ''),
    enabled: eventoId !== null,
  });
  if (eventoId === null) {
    return {
      data: todos.data ?? null,
      loading: todos.isPending,
      error: todos.error ?? null,
      refetch: () => {
        void todos.refetch();
      },
    };
  }
  return {
    data: evento.data ? overviewDoFinanceiro(evento.data) : null,
    loading: evento.isPending,
    error: evento.error ?? null,
    refetch: () => {
      void evento.refetch();
    },
  };
}

/** Modalidades com mais inscritos (∑ de `financeiro/current`) — tenant | evento. */
export function useModalidadesAnalise(
  tenantId: string | null,
  organizadorId: string | null,
  eventoId: string | null,
): AsyncQuery<BarChartDatum[]> {
  const habilitado = !!tenantId && !!organizadorId;
  const tenant = useQuery({
    ...financeiroPorEventoDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: habilitado && eventoId === null,
  });
  const evento = useQuery({
    ...financeiroCurrentQuery(eventoId ?? ''),
    enabled: eventoId !== null,
  });
  if (eventoId === null) {
    return {
      data: tenant.data ? modalidadesMaisInscritos(tenant.data) : [],
      loading: tenant.isPending,
      error: tenant.error ?? null,
      refetch: () => {
        void tenant.refetch();
      },
    };
  }
  // Um evento vira uma linha do MESMO shape do fan-out (EventoFinanceiroRow).
  const linha: EventoFinanceiroRow[] = evento.data
    ? [{ evento: { id: eventoId, nome: '', slug: '', status: 'publicado' }, financeiro: evento.data }]
    : [];
  return {
    data: modalidadesMaisInscritos(linha),
    loading: evento.isPending,
    error: evento.error ?? null,
    refetch: () => {
      void evento.refetch();
    },
  };
}

/** Perfil demográfico REAL (∑ de `demografia/current` — RN-820) — tenant | evento. */
export function useDemografiaAnalise(
  tenantId: string | null,
  organizadorId: string | null,
  eventoId: string | null,
): AsyncQuery<DemografiaTenant> {
  const habilitado = !!tenantId && !!organizadorId;
  const tenant = useQuery({
    ...demografiaDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: habilitado && eventoId === null,
  });
  const evento = useQuery({
    ...demografiaCurrentQuery(eventoId ?? ''),
    enabled: eventoId !== null,
  });
  if (eventoId === null) {
    return {
      data: somarDemografia(tenant.data ?? []),
      loading: tenant.isPending,
      error: tenant.error ?? null,
      refetch: () => {
        void tenant.refetch();
      },
    };
  }
  return {
    data: somarDemografia(evento.data ? [evento.data] : []),
    loading: evento.isPending,
    error: evento.error ?? null,
    refetch: () => {
      void evento.refetch();
    },
  };
}

/** Tamanhos de camiseta mais pedidos (∑ do aprovisionamento) — tenant | evento. */
export function useTamanhosAnalise(
  tenantId: string | null,
  organizadorId: string | null,
  eventoId: string | null,
): AsyncQuery<BarChartDatum[]> {
  const habilitado = !!tenantId && !!organizadorId;
  const tenant = useQuery({
    ...aprovisionamentoDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: habilitado && eventoId === null,
  });
  const evento = useQuery({
    ...aprovisionamentoDoEventoQuery(eventoId ?? ''),
    enabled: eventoId !== null,
  });
  if (eventoId === null) {
    return {
      data: tenant.data ? tamanhosMaisPedidos(tenant.data) : [],
      loading: tenant.isPending,
      error: tenant.error ?? null,
      refetch: () => {
        void tenant.refetch();
      },
    };
  }
  return {
    data: evento.data ? tamanhosMaisPedidos(evento.data) : [],
    loading: evento.isPending,
    error: evento.error ?? null,
    refetch: () => {
      void evento.refetch();
    },
  };
}
