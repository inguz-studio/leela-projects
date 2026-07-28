// =============================================================================
// functions/src/seed/platformAdmin.seed.ts
//
// Bootstrap da PRIMEIRA claim `platform_admin` (decisão #4 da Onda 1).
//
// Problema que resolve: nenhuma Function/tela de plataforma é exercitável sem
// um usuário com claim `platform_admin` — mas a única Function que seta claims
// (`setTenantClaims`) exige um caller que JÁ SEJA platform_admin. Este seed
// quebra o ovo-e-galinha criando o admin direto via Admin SDK, SÓ no Emulator.
//
// Guard anti-produção (mesmo padrão F5 de tenants.seed.ts): exige
// FIREBASE_AUTH_EMULATOR_HOST (o seed toca Auth) ou projectId `demo-*`.
// NUNCA roda contra produção — em prod a claim inicial é operação manual
// consciente (gcloud/console), fora do repositório.
//
// Uso (Git Bash, Emulator Suite de pé — Auth 9099 + Firestore 8080):
//   export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"
//   export PATH="$JAVA_HOME/bin:$PATH"
//   firebase emulators:exec --only auth,firestore --project demo-leela \
//     "npx tsx functions/src/seed/platformAdmin.seed.ts"
//
// E-mail configurável via LEELA_PLATFORM_ADMIN_EMAIL (default abaixo).
// =============================================================================

// Seed é script dev-only (nunca roda em produção — ver assertEmulatorOnly);
// console.log é a saída natural de um script de linha de comando.
/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import type { AuthClaims } from '@leela/core';

/** E-mail canônico do super-admin no ambiente de desenvolvimento. */
export const DEFAULT_PLATFORM_ADMIN_EMAIL = 'admin@demo-leela.dev';

/**
 * Guard anti-produção: o bootstrap SÓ roda contra o Emulator.
 * Como o seed escreve em Firebase AUTH (claims), o sinal exigido é
 * FIREBASE_AUTH_EMULATOR_HOST — ou, na falta dele, projectId `demo-*`.
 */
export function assertAuthEmulatorOnly(): void {
  const authEmulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  // Escape nominal de produção (lane DEPLOY-PREVIEW) — mesmo contrato do
  // emulator-guard.ts, mantido inline porque ESTE guard vigia o Auth host
  // (não o Firestore host): ack POR EXTENSO igual ao projectId + nenhum
  // Emulator de Auth apontado. O aviso de "operação manual" abaixo segue
  // valendo para qualquer caminho fora do runner dedicado da lane.
  const ack = process.env['LEELA_SEED_PROD_ACK'];
  if (
    ack !== undefined &&
    ack.length > 0 &&
    ack === projectId &&
    !authEmulatorHost
  ) {
    return;
  }

  if (!authEmulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      '[seed] BLOQUEADO: seedPlatformAdmin só roda no Emulator. ' +
        'Defina FIREBASE_AUTH_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este bootstrap contra produção — a primeira claim ' +
        'platform_admin em prod é operação manual fora do repositório.'
    );
  }
}

/**
 * Cria (ou reaproveita) o usuário do super-admin no Auth Emulator e aplica
 * a claim `{ role: 'platform_admin' }` (sem tenantId — papel cross-tenant).
 *
 * Idempotente: rerun encontra o usuário pelo e-mail e apenas regrava a claim.
 * Revoga refresh tokens para o próximo token já carregar o papel (RN-401).
 *
 * @returns uid do platform_admin provisionado.
 */
export async function seedPlatformAdmin(
  auth: admin.auth.Auth,
  email: string = process.env['LEELA_PLATFORM_ADMIN_EMAIL'] ??
    DEFAULT_PLATFORM_ADMIN_EMAIL
): Promise<string> {
  assertAuthEmulatorOnly();

  // 1. Resolver ou criar o usuário — idempotente por e-mail
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await auth.createUser({
      email,
      emailVerified: true,
      displayName: 'Leela Platform Admin',
    });
    uid = created.uid;
  }

  // 2. Claim platform_admin — papel cross-tenant, NUNCA carrega tenantId
  const claims: AuthClaims = { role: 'platform_admin' };
  await auth.setCustomUserClaims(uid, claims);

  // 3. Propagação: força novo token no próximo refresh (RN-401)
  await auth.revokeRefreshTokens(uid);

  console.log(`[seed] platform_admin: ${email} (uid=${uid})`);
  return uid;
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedPlatformAdmin(admin.auth())
    .then((uid) => {
      console.log(`[seed] done (uid=${uid})`);
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
