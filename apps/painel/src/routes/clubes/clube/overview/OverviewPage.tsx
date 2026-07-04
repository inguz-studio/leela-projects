// =============================================================================
// OverviewPage — container do Overview (rota-índice de `/clubes/:slug`).
// Pega o clube do Outlet context (carregado no ClubeLayout) e busca os membros
// para derivar os "novos" (status derivado = novo, RN-102).
// =============================================================================

import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { OverviewClube } from './OverviewClube';
import { useMembros } from '../../_data/clubes';
import { filtrarMembros } from '../../_lib/membros';
import type { ClubeOutletContext } from '../ClubeLayout';

export function OverviewPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { data: membros, loading } = useMembros(clube.id);

  const novos = useMemo(
    () => (membros ? filtrarMembros(membros, { status: 'novo' }) : null),
    [membros],
  );

  return <OverviewClube clube={clube} novosMembros={novos} novosLoading={loading} />;
}

OverviewPage.displayName = 'OverviewPage';
