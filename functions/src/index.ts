// =============================================================================
// @leela/functions — entry point
// Cloud Functions são exportadas aqui e importadas por firebase-tools.
// Cada domínio tem seu próprio módulo em src/{domínio}/.
// =============================================================================

import * as admin from 'firebase-admin';

// Inicializa o Admin SDK uma única vez (idempotente)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Auth
export { onCreateUser } from './auth/onCreateUser';

// Plataforma — multi-tenancy (E16-S1600-T2)
export { setTenantClaims } from './platform/setTenantClaims';

// Plataforma — lifecycle do tenant (RN-402; wire de canTransition)
export { transitionTenant } from './platform/tenantLifecycle';

// Eventos — índice inverso N:N Kit↔Item "usado em" (E03-S205-T1 · RN-215)
export { onItemKitWrite, onKitWrite } from './eventos/itemKitIndex';

// Plataforma — provisionamento atômico do tenant (E16-S1601-T1 · RN-403)
export { provisionTenant } from './platform/provisionTenant';

// Plataforma — rollups macro cross-tenant (E16-S1605-T2 · RN-409)
export { recomputePlatformRollups } from './platform/rollups';

// Clubs — status derivado do membro (RN-102) + agregado ∑ qtdMembrosAtivos
// por recontagem idempotente (E05-S103-T1)
export { onMembroWrite } from './clubs/onMembroWrite';
export { recalcularStatusMembros } from './clubs/recalcularStatusMembros';

// Clubs — agregado ∑ qtdDesafiosAtivos por recontagem idempotente
// (E05-S105-T1 — fecha a pendência herdada do L1)
export { onDesafioWrite } from './clubs/onDesafioWrite';

// Overview — dashboard do profissional (E02-S600-T2): fan-out eventos/clubes
// → profissionais/{profId}/dashboard/current + callable de leitura
export {
  onEventoWriteDashboard,
  onClubeWriteDashboard,
} from './overview/aggregateProfessionalDashboard';
export { getOverview } from './overview/getOverview';

// Eventos — criação/publicação transacional (E03-S201-T2 · RN-201)
export { criarEvento } from './eventos/criarEvento';
export { publicarEvento } from './eventos/publicarEvento';

// Eventos — balcão: chip + entrega/presença (E03-S204-T2 · RN-205/206/207)
export { vincularChip } from './eventos/vincularChip';
export { registrarEntrega } from './eventos/registrarEntrega';

// Eventos — agregado financeiro por recontagem idempotente (E03-S207-T2)
export { onInscritoWrite } from './eventos/agregarFinanceiro';
