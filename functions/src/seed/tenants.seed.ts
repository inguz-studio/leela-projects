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

// Seed é script dev-only (nunca roda em produção — ver assertEmulatorOnly);
// console.log é a saída natural de um script de linha de comando.
/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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
 * Guard anti-produção (F5 — review S1600): o seed SÓ roda contra o Emulator.
 * Lança erro se não houver FIRESTORE_EMULATOR_HOST e o projectId não for
 * claramente de demo (prefixo 'demo-').
 */
function assertEmulatorOnly(): void {
  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  if (!emulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      '[seed] BLOQUEADO: seedTenants só roda no Emulator. ' +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}

/**
 * Popula a coleção `tenants` no Firestore (Emulator).
 * Idempotente — usa set() com merge, então reprocessar não duplica.
 * `criadoEm` é gravado APENAS na criação (F8); reruns só tocam `atualizadoEm`.
 */
export async function seedTenants(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly();

  const now = FieldValue.serverTimestamp();

  const batch = db.batch();

  for (const tenant of TENANT_SEEDS) {
    const ref = db.collection('tenants').doc(tenant.id);
    const snap = await ref.get();

    const data: Record<string, unknown> = {
      id: tenant.id,
      nome: tenant.nome,
      slug: tenant.slug,
      status: tenant.status,
      ownerUid: tenant.ownerUid,
      tipo: tenant.tipo,
      gmvAcumulado: tenant.gmvAcumulado,
      eventosAtivos: tenant.eventosAtivos,
      atualizadoEm: now,
    };

    // criadoEm só na criação — rerun não regrava (F8)
    if (!snap.exists) {
      data['criadoEm'] = now;
    }

    batch.set(ref, data, { merge: true });
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
