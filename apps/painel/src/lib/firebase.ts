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

import {
  initLeela,
  type FirebaseClientConfig,
  type LeelaEmulatorPorts,
} from '@leela/api-client';

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

/**
 * Lê portas alternativas do Emulator a partir de VITE_EMULATOR_*_PORT.
 * Ausentes → retorna undefined e o api-client usa os defaults
 * 8080/9099/5001/9199 (comportamento inalterado). Usado pelo preview local
 * (portas alt) — ver preview.sh / PREVIEW.md.
 */
function readEmulatorPorts(): LeelaEmulatorPorts | undefined {
  const env = import.meta.env;
  const parse = (raw: string | undefined): number | undefined => {
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  const firestore = parse(env.VITE_EMULATOR_FIRESTORE_PORT);
  const auth = parse(env.VITE_EMULATOR_AUTH_PORT);
  const functions = parse(env.VITE_EMULATOR_FUNCTIONS_PORT);
  const storage = parse(env.VITE_EMULATOR_STORAGE_PORT);
  if (
    firestore === undefined &&
    auth === undefined &&
    functions === undefined &&
    storage === undefined
  ) {
    return undefined;
  }
  // exactOptionalPropertyTypes: montar só as chaves definidas
  return {
    ...(firestore !== undefined ? { firestore } : {}),
    ...(auth !== undefined ? { auth } : {}),
    ...(functions !== undefined ? { functions } : {}),
    ...(storage !== undefined ? { storage } : {}),
  };
}

/**
 * Modo de ambiente do painel — FONTE ÚNICA da distinção Emulator × produção.
 * Mesma regra que sempre decidiu o `initLeela` (acima): explícito vence;
 * ausente cai em `import.meta.env.DEV`. Exportada para o guard de autenticação
 * (`RequireSessao`) respeitar o preview local mockado: em modo Emulator o
 * comportamento histórico ("já logado" na raiz) permanece; em produção o guard
 * morde (LEELA-FIX-AUTHGUARD).
 */
export function isModoEmulador(): boolean {
  const explicit = import.meta.env.VITE_USE_EMULATOR;
  return explicit === undefined ? import.meta.env.DEV : explicit === 'true';
}

/** Inicializa o Firebase SDK. Idempotente — initLeela ignora chamadas extra. */
export function initFirebase(): void {
  // Sem valor explícito: dev usa Emulator; build de produção exige config
  // real (initLeela lança erro claro se VITE_FIREBASE_* estiver incompleto).
  const useEmulator = isModoEmulador();

  // exactOptionalPropertyTypes: nunca passar chaves com valor undefined
  const firebaseConfig = readFirebaseConfig();
  const emulatorPorts = readEmulatorPorts();
  // Host do Emulator: default 'localhost'; o preview força '127.0.0.1' para
  // fixar IPv4 (no Windows 'localhost' pode resolver p/ ::1 e o Emulator só
  // escuta em 127.0.0.1 — quebraria a conexão do navegador).
  const rawHost = import.meta.env.VITE_EMULATOR_HOST;
  const emulatorHost =
    typeof rawHost === 'string' && rawHost.length > 0 ? rawHost : undefined;
  initLeela({
    useEmulator,
    ...(emulatorHost ? { emulatorHost } : {}),
    ...(firebaseConfig ? { firebaseConfig } : {}),
    ...(emulatorPorts ? { emulatorPorts } : {}),
  });
}
