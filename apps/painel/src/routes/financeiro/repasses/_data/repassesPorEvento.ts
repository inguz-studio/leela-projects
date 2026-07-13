// =============================================================================
// Hook de dados da visão de repasse POR EVENTO (RN-349). Consome o gateway
// (lib/query): o fan-out de `financeiro/current` dos eventos do organizador +
// o termo comercial do tenant (para a % de retenção). A derivação retido/
// disponível-estimado é PURA (core helpers via `derivarRepassesPorEvento`) — o
// hook só orquestra as leituras e degrada honestamente. Contrato { data,
// loading, error, refetch } (mesmos estados §2.12 do resto da tela).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { RETENCAO_REPASSE_PCT_DEFAULT } from '@leela/core';
import {
  commercialTermsQuery,
  financeiroPorEventoDoOrganizadorQuery,
} from '../../../../lib/query/queries';
import { derivarRepassesPorEvento, type LinhaRepasseEvento } from '../_lib/repassesPorEvento';
import type { AsyncQuery } from './repasses';

/**
 * Linhas "Por evento" do organizador logado (RN-349).
 *
 * O termo comercial é AUXILIAR: alimenta só a % de retenção. Se falhar (ex.:
 * termo ainda não cadastrado → null; ou leitura negada), a derivação cai no
 * default global (RETENCAO_REPASSE_PCT_DEFAULT = 15) — a seção NÃO quebra por
 * causa do termo. `loading`/`error` refletem o fan-out financeiro (o dado
 * principal); o termo nunca bloqueia a tela.
 */
export function useRepassesPorEvento(
  tenantId: string | null,
  organizadorId: string | null,
): AsyncQuery<LinhaRepasseEvento[]> {
  const habilitado = !!tenantId && !!organizadorId;

  const eventos = useQuery({
    ...financeiroPorEventoDoOrganizadorQuery({
      tenantId: tenantId ?? '',
      organizadorId: organizadorId ?? '',
    }),
    enabled: habilitado,
  });

  const termos = useQuery({
    ...commercialTermsQuery(tenantId ?? ''),
    enabled: habilitado,
  });

  const pct = termos.data?.retencaoRepassePct ?? RETENCAO_REPASSE_PCT_DEFAULT;
  const linhas = eventos.data ? derivarRepassesPorEvento(eventos.data, pct) : [];

  return {
    data: linhas,
    loading: eventos.isPending,
    error: eventos.error ?? null,
    refetch: () => {
      void eventos.refetch();
    },
  };
}
