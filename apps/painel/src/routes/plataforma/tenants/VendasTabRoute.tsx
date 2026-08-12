// =============================================================================
// VendasTabRoute — container de `/plataforma/tenants/:tenantId/vendas`
// (ADMIN-VISAO onda 2 · S1613-T2). Liga a leitura paginada à casca
// apresentacional e nada mais: o tenant vem do path, o estado vem do hook.
// =============================================================================

import { useParams } from 'react-router-dom';
import { VendasTab } from './VendasTab';
import { useVendasDoTenant } from './_data/vendas';

export function VendasTabRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const estado = useVendasDoTenant(tenantId);

  return <VendasTab estado={estado} />;
}

VendasTabRoute.displayName = 'VendasTabRoute';
