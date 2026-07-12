// =============================================================================
// apps/landing/lib/firebaseAdmin.ts
//
// Init do Firebase Admin SDK — SERVER-ONLY (aceite S1200: nenhum segredo
// Firebase vaza no bundle do cliente). Este módulo só é importado por Server
// Components / código de servidor (leitor.ts). Como todo o consumo é via
// Admin SDK, ele NUNCA entra no bundle do cliente (o Next tree-shaka para o
// server graph); firebase-admin sequer é resolvível no cliente.
//
// Emulator (dev / gate visual do maestro): quando o Emulator Suite está ligado
// (LEELA_USE_EMULATOR / NEXT_PUBLIC_USE_EMULATOR = 'true'), aponta para
// FIRESTORE_EMULATOR_HOST (default localhost:8080 — porta do firebase.json) e
// usa o projectId `demo-leela` (`.firebaserc`). Sem emulator e sem credencial
// (ex.: `next build` no gate 3), o init ainda cria o app; a LEITURA é que
// pode falhar — o leitor.ts trata com try/catch e degrada para null/[] (build
// não quebra por falta de dado).
//
// Produção: a credencial vem do ambiente de execução (SA default do Cloud
// Run/Functions) via applicationDefault — nada hardcoded aqui.
// =============================================================================

import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/** O Emulator Suite está ligado para esta execução? */
function usaEmulator(): boolean {
  return (
    process.env['LEELA_USE_EMULATOR'] === 'true' ||
    process.env['NEXT_PUBLIC_USE_EMULATOR'] === 'true' ||
    // fora de produção, assume dev local com emulator (padrão do monorepo)
    (process.env.NODE_ENV !== 'production' && process.env['FIRESTORE_EMULATOR_HOST'] !== undefined)
  );
}

/** projectId canônico (demo-* no emulator; env em produção). */
function resolveProjectId(): string {
  return (
    process.env['GOOGLE_CLOUD_PROJECT'] ??
    process.env['GCLOUD_PROJECT'] ??
    process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ??
    'demo-leela'
  );
}

/**
 * Credencial de produção via variável de ambiente (JSON da service account),
 * quando fornecida. Sem ela, cai em applicationDefault (SA do runtime). Nunca
 * há chave embutida no código.
 */
function resolveCredential(): ReturnType<typeof cert> | ReturnType<typeof applicationDefault> | undefined {
  const raw = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  if (raw !== undefined && raw.trim().length > 0) {
    try {
      return cert(JSON.parse(raw) as Record<string, unknown>);
    } catch (err) {
      console.error('[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON inválido — usando applicationDefault', err);
    }
  }
  return undefined;
}

let cachedApp: App | undefined;

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0 && existing[0] !== undefined) {
    return existing[0];
  }
  if (cachedApp !== undefined) return cachedApp;

  const projectId = resolveProjectId();

  if (usaEmulator()) {
    // Garante o host do emulator (o Admin SDK conecta quando esta env existe;
    // sem credencial real no emulator).
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    cachedApp = initializeApp({ projectId });
    return cachedApp;
  }

  const credential = resolveCredential();
  cachedApp = initializeApp(
    credential !== undefined
      ? { projectId, credential }
      : { projectId, credential: applicationDefault() },
  );
  return cachedApp;
}

let cachedDb: Firestore | undefined;

/** Firestore do Admin SDK (singleton por processo). */
export function getDb(): Firestore {
  if (cachedDb !== undefined) return cachedDb;
  cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}
