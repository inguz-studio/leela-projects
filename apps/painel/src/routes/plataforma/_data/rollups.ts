// =============================================================================
// Hook de dados dos rollups macro da plataforma (dashboard S1605-T3).
// Lê o doc agregado `platform/rollups` (computado por Cloud Function). NUNCA
// varre `tenants/*` no cliente (RN-409); só platform_admin lê (Rules).
// =============================================================================

import { useEffect, useState } from 'react';
import { getLeelaDb, getPlatformRollups } from '@leela/api-client';
import type { PlatformRollups } from '@leela/core';
import type { AsyncState } from './tenants';

/** Rollups macro (`platform/rollups`); null quando a Function ainda não rodou. */
export function usePlatformRollups(reloadKey = 0): AsyncState<PlatformRollups> {
  const [state, setState] = useState<AsyncState<PlatformRollups>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    getPlatformRollups(getLeelaDb())
      .then((rollups) => ativo && setState({ data: rollups, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [reloadKey]);

  return state;
}
