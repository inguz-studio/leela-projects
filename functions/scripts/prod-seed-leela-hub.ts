// =============================================================================
// functions/scripts/prod-seed-leela-hub.ts — seed de PRODUÇÃO (leela-hub)
// Lane DEPLOY-PREVIEW · DEC-0728F.
//
// Reaproveita 100% os seeds canônicos (functions/src/seed/* + extras do
// preview) e RE-DATA os dados na escrita: todo Timestamp/Date/string de data
// é deslocado pelo nº de dias entre o relógio de referência do dataset
// (LEELA_CLOCK do preview local = 2026-03-15) e HOJE. Nada de relógio fake em
// produção (LEELA_CLOCK só existe sob FUNCTIONS_EMULATOR): o dado nasce com
// datas futuras REAIS e envelhece naturalmente. `codigoIngresso` vem de graça
// (o seed canônico de inscritos já o grava — item 54/INGRESSO-QR).
//
// Como re-data: patch de protótipo NESTE processo (DocumentReference.set,
// WriteBatch.set, CollectionReference.add — únicos métodos de escrita que os
// seeds usam) aplicando redate() ao payload antes de gravar. Ferramenta de
// script, nunca código de produção (fora de src/ ⇒ fora de build/lint/vitest).
//
// A lógica de re-datação vive em `./redate` desde a lane CHECKOUT-UX (task A1 /
// T-SEED-2): lá ela é IDEMPOTENTE, o que corrige o deslocamento DOBRADO de tudo
// que os seeds escreviam por `ref.set` (a lib implementa `DocumentReference.set`
// por cima de `WriteBatch.set`, e o payload atravessava os dois patches). Prova
// re-rodável e offline em `./redate-dry-run.ts`.
//
// Guard: o escape nominal do emulator-guard exige LEELA_SEED_PROD_ACK igual
// ao projectId POR EXTENSO — este runner define ambos de propósito. Também
// ABORTA se qualquer *_EMULATOR_HOST estiver no ambiente (nunca misturar).
//
// Credenciais: GOOGLE_APPLICATION_CREDENTIALS (ADC). Rodar SEMPRE via
// wrapper da lane (ver handoff DEPLOY-PREVIEW) — nunca commitar credencial.
//
// Uso:
//   node <tsx> functions/scripts/prod-seed-leela-hub.ts
//   (com GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_QUOTA_PROJECT=leela-hub)
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import type { AuthClaims } from '@leela/core';
import { instalarRedatePatch, offsetDias } from './redate';

const PROD_PROJECT_ID = 'leela-hub';

// ---------------------------------------------------------------------------
// Trava de ambiente (ANTES de importar os seeds não é necessário — os guards
// rodam na CHAMADA — mas validamos primeiro de qualquer forma).
// ---------------------------------------------------------------------------
for (const v of [
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
]) {
  if (process.env[v] !== undefined) {
    throw new Error(
      `[prod-seed] ${v} está definido — este runner é EXCLUSIVO de produção. ` +
        'Rode o preview local pelo preview.sh.'
    );
  }
}
if (process.env['GOOGLE_APPLICATION_CREDENTIALS'] === undefined) {
  throw new Error(
    '[prod-seed] GOOGLE_APPLICATION_CREDENTIALS ausente — rode via wrapper ' +
      'da lane (credencial local, nunca commitada).'
  );
}
process.env['GCLOUD_PROJECT'] = PROD_PROJECT_ID;
process.env['LEELA_SEED_PROD_ACK'] = PROD_PROJECT_ID;

// Imports dos seeds DEPOIS da trava (entry-blocks não rodam ao importar).
/* eslint-disable import/first */
import {
  seedTenants,
  CASTELO_TENANT_ID,
  MARINA_CASTELO_UID,
} from '../src/seed/tenants.seed';
import { seedCommercialTerms } from '../src/seed/commercialTerms.seed';
import { seedCatalogoAcoes } from '../src/seed/catalogoAcoes.seed';
import { seedEventos } from '../src/seed/eventos.seed';
import { seedKits } from '../src/seed/kits.seed';
import { seedInscritos } from '../src/seed/inscritos.seed';
import { seedPedidos } from '../src/seed/pedidos.seed';
import { seedPoliticaVendas } from '../src/seed/politicaVendas.seed';
import {
  seedClubes,
  CORRIDA_PERFEITA_TENANT_ID,
  FELIPE_MARTINS_UID,
} from '../src/seed/clubes.seed';
import { seedMembros } from '../src/seed/membros.seed';
import { seedDesafios } from '../src/seed/desafios.seed';
import { seedComunicados } from '../src/seed/comunicados.seed';
import { seedParcerias } from '../src/seed/parcerias.seed';
import {
  seedPlatformAdmin,
  DEFAULT_PLATFORM_ADMIN_EMAIL,
} from '../src/seed/platformAdmin.seed';
import { seedPreviewExtra } from './preview-seed-extra';
import { seedPreviewClubes } from './preview-seed-clubes';
/* eslint-enable import/first */

// ---------------------------------------------------------------------------
// Re-datação (lógica em ./redate — idempotente desde T-SEED-2)
// ---------------------------------------------------------------------------

const OFFSET_DIAS = offsetDias();
const OFFSET_MS = OFFSET_DIAS * 86_400_000;

// ---------------------------------------------------------------------------
// Usuários de login (mesma convenção do preview local — senha pública do
// repo; PENDENTE-DONO: trocar/desativar antes de divulgar o link).
// ---------------------------------------------------------------------------
const PREVIEW_PASSWORD = 'demo1234';
const MARINA_EMAIL = 'marina@demo-leela.dev';
const FELIPE_EMAIL = 'felipe@demo-leela.dev';

async function ensurePreviewUser(
  auth: admin.auth.Auth,
  uid: string,
  email: string,
  displayName: string,
  claims: AuthClaims
): Promise<void> {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password: PREVIEW_PASSWORD,
      emailVerified: true,
      displayName,
    });
  } catch {
    await auth.createUser({
      uid,
      email,
      password: PREVIEW_PASSWORD,
      emailVerified: true,
      displayName,
    });
  }
  await auth.setCustomUserClaims(uid, claims);
  await auth.revokeRefreshTokens(uid);
  console.log(`[prod-seed] login: ${email} (uid=${uid}, role=${claims.role})`);
}

// ---------------------------------------------------------------------------
// Main — mesma ordem do preview-seed.ts (dependências entre seeds).
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(
    `[prod-seed] alvo=${PROD_PROJECT_ID} · offset=+${OFFSET_DIAS} dias ` +
      `(ref 2026-03-15 → hoje)`
  );
  if (OFFSET_DIAS <= 0) {
    throw new Error(
      '[prod-seed] offset não-positivo — revisar REF_CLOCK_UTC em ./redate.'
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROD_PROJECT_ID });
  }
  const db = admin.firestore();
  const auth = admin.auth();

  instalarRedatePatch(OFFSET_MS);

  await seedPlatformAdmin(auth);
  const adminUser = await auth.getUserByEmail(DEFAULT_PLATFORM_ADMIN_EMAIL);
  await auth.updateUser(adminUser.uid, {
    password: PREVIEW_PASSWORD,
    emailVerified: true,
  });
  console.log(`[prod-seed] login: ${DEFAULT_PLATFORM_ADMIN_EMAIL} (role=platform_admin)`);

  await seedTenants(db);
  await seedCommercialTerms(db);
  await seedCatalogoAcoes(db);
  await seedEventos(db);
  await seedKits(db);
  await seedInscritos(db);
  await seedPedidos(db);
  await seedPoliticaVendas(db);
  await seedClubes(db);
  await seedMembros(db);
  await seedDesafios(db);
  await seedComunicados(db);
  await seedParcerias(db);
  await seedPreviewExtra(db);
  await seedPreviewClubes(db);

  await ensurePreviewUser(auth, MARINA_CASTELO_UID, MARINA_EMAIL, 'Marina Castelo', {
    role: 'tenant_owner',
    tenantId: CASTELO_TENANT_ID,
  });
  await ensurePreviewUser(auth, FELIPE_MARTINS_UID, FELIPE_EMAIL, 'Felipe Martins', {
    role: 'tenant_owner',
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
  });

  console.log('[prod-seed] OK — seeds aplicados RE-DATADOS e logins prontos.');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[prod-seed] ERRO:', err);
    process.exit(1);
  });
