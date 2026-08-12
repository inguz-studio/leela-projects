// =============================================================================
// ClientesTabRoute — container de `/plataforma/tenants/:tenantId/clientes`
// (ADMIN-VISAO onda 3 · S1612-T6). Liga as duas leituras à casca apresentacional
// e nada mais: o tenant vem do path, a lista vem do hook paginado e a ficha do
// indivíduo vem do hook que só dispara sob gesto.
//
// A rota é montada em `PlataformaRoutes.tsx` pelo maestro — este arquivo só
// exporta a tela.
// =============================================================================

import { useParams } from 'react-router-dom';
import { ClientesTab } from './ClientesTab';
import { useClientesDoTenant, useFichaDoCliente } from './_data/clientesTenant';

export function ClientesTabRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const estado = useClientesDoTenant(tenantId);
  const ficha = useFichaDoCliente(tenantId);

  return <ClientesTab estado={estado} ficha={ficha} />;
}

ClientesTabRoute.displayName = 'ClientesTabRoute';
