// =============================================================================
// functions/src/seed/tenants.seed.ts
//
// Seed dos tenants canônicos para o Emulator (dev/testes).
// NÃO executar em produção.
//
// Tenants canônicos (ADR-009 / E16):
//   1. Castelo Produções — status: ativo (tenant-sócio, owner: Marina Castelo)
//   2. Passo Certo Eventos — status: pending (exercita lifecycle e macro)
//
// Uso:
//   export JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.19.10-hotspot"
//   export PATH="$JAVA_HOME/bin:$PATH"
//   firebase emulators:exec --only firestore --project demo-leela \
//     "npx ts-node -r tsconfig-paths/register src/seed/tenants.seed.ts"
//
// Ou dentro de firebase emulators:exec + a suite de testes (que chama seedTenants).
// =============================================================================

import * as admin from 'firebase-admin';

// IDs canônicos — fixos para os seeds serem idempotentes
export const CASTELO_TENANT_ID = 'castelo-producoes';
export const PASSO_CERTO_TENANT_ID = 'passo-certo';
export const MARINA_CASTELO_UID = 'uid-marina-castelo';

export interface TenantSeed {
  id: string;
  nome: string;
  slug: string;
  status: 'pending' | 'ativo' | 'suspenso';
  ownerUid: string;
  tipo: 'produtor' | 'promotor';
  gmvAcumulado: number;
  eventosAtivos: number;
}

export const TENANT_SEEDS: TenantSeed[] = [
  {
    id: CASTELO_TENANT_ID,
    nome: 'Castelo Produções',
    slug: 'castelo-producoes',
    status: 'ativo',
    ownerUid: MARINA_CASTELO_UID,
    tipo: 'produtor',
    gmvAcumulado: 0,
    eventosAtivos: 0,
  },
  {
    id: PASSO_CERTO_TENANT_ID,
    nome: 'Passo Certo Eventos',
    slug: 'passo-certo',
    status: 'pending',
    ownerUid: 'uid-passo-certo-owner',
    tipo: 'promotor',
    gmvAcumulado: 0,
    eventosAtivos: 0,
  },
];

/**
 * Popula a coleção `tenants` no Firestore (Emulator).
 * Idempotente — usa set() com merge, então reprocessar não duplica.
 */
export async function seedTenants(db: admin.firestore.Firestore): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();

  const batch = db.batch();

  for (const tenant of TENANT_SEEDS) {
    const ref = db.collection('tenants').doc(tenant.id);
    batch.set(
      ref,
      {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        status: tenant.status,
        ownerUid: tenant.ownerUid,
        tipo: tenant.tipo,
        gmvAcumulado: tenant.gmvAcumulado,
        eventosAtivos: tenant.eventosAtivos,
        criadoEm: now,
        atualizadoEm: now,
      },
      { merge: true }
    );
  }

  await batch.commit();
  console.log('[seed] tenants: Castelo Produções (ativo) + Passo Certo Eventos (pending)');
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedTenants(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
