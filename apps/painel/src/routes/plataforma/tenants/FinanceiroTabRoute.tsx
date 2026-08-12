// =============================================================================
// FinanceiroTabRoute — container de `/plataforma/tenants/:tenantId/financeiro`
// (ADMIN-VISAO onda 2 · S1613-T4).
//
// SEM LEITURA NOVA: os números macro saem de `platform/rollups`, o mesmo doc e
// a mesma chave de cache que o dashboard macro já consome
// (`usePlatformRollups` → `platformRollupsQuery`). A linha do tenant é
// `rollups.tenants[tenantId]` — indexação, não varredura.
//
// PENDÊNCIA DECLARADA: a RN-538 pede o recompute manual disparável daqui e o
// callable `recomputePlatformRollups` existe e está no ar, mas NÃO há wrapper
// dele em `@leela/api-client` (zero ocorrências no pacote e no painel).
// `packages/api-client` está fora do território desta lane, então o botão fica
// de fora em vez de nascer com uma chamada inventada — a tela declara a idade
// e o aviso de obsolescência, que é a metade que dá para pagar honestamente.
// =============================================================================

import { useParams } from 'react-router-dom';
import { FinanceiroTab } from './FinanceiroTab';
import { RepassesDoTenantSecao } from './_components/RepassesDoTenantSecao';
import { usePlatformRollups } from '../_data/rollups';

export function FinanceiroTabRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { data: rollups, loading, error } = usePlatformRollups();

  return (
    <FinanceiroTab
      rollup={rollups?.tenants[tenantId] ?? null}
      atualizadoEm={rollups?.atualizadoEm ?? null}
      loading={loading}
      error={error}
      agora={new Date()}
      repasses={<RepassesDoTenantSecao tenantId={tenantId} />}
    />
  );
}

FinanceiroTabRoute.displayName = 'FinanceiroTabRoute';
