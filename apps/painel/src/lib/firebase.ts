// =============================================================================
// apps/painel/src/lib/firebase.ts — inicialização do Firebase client
//
// Achado A3 (review E00): o painel importava o design-system mas nunca
// chamava initLeela(), então getLeelaDb()/getLeelaAuth() estouravam e o
// app jamais conectava ao Emulator. Este módulo é chamado UMA vez no
// entry-point (main.tsx), antes do primeiro render.
//
// Regras de ambiente (contrato documentado em @leela/api-client):
//   - VITE_USE_EMULATOR === 'true'  → conecta no Emulator Suite (demo-leela)
//   - VITE_USE_EMULATOR === 'false' → exige VITE_FIREBASE_* completos
//     (initLeela é fail-closed — achado B3 — e lança sem firebaseConfig)
//   - ausente em dev (import.meta.env.DEV) → Emulator por padrão; nunca
//     apontamos DEMO_CONFIG para produção silenciosamente
// =============================================================================

import { initLeela, type FirebaseClientConfig } from '@leela/api-client';

/**
 * Monta o FirebaseClientConfig a partir de VITE_FIREBASE_* quando TODAS as
 * variáveis estão presentes; caso contrário retorna undefined (Emulator).
 */
function readFirebaseConfig(): FirebaseClientConfig | undefined {
  const env = import.meta.env;
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  const complete = Object.values(config).every(
    (value) => typeof value === 'string' && value.length > 0,
  );
  return complete ? (config as FirebaseClientConfig) : undefined;
}

/** Inicializa o Firebase SDK. Idempotente — initLeela ignora chamadas extra. */
export function initFirebase(): void {
  const explicit = import.meta.env.VITE_USE_EMULATOR;
  // Sem valor explícito: dev usa Emulator; build de produção exige config
  // real (initLeela lança erro claro se VITE_FIREBASE_* estiver incompleto).
  const useEmulator =
    explicit === undefined ? import.meta.env.DEV : explicit === 'true';

  // exactOptionalPropertyTypes: nunca passar firebaseConfig: undefined
  const firebaseConfig = readFirebaseConfig();
  initLeela(firebaseConfig ? { useEmulator, firebaseConfig } : { useEmulator });
}
