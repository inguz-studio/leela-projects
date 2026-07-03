// =============================================================================
// @leela/api-client — inicialização do Firebase client SDK
//
// Uso (uma vez no entry-point de cada app):
//
//   Painel (Vite):
//     import { initLeela } from '@leela/api-client';
//     initLeela({ useEmulator: import.meta.env.VITE_USE_EMULATOR === 'true' });
//
//   Landing (Next.js):
//     import { initLeela } from '@leela/api-client';
//     initLeela({ useEmulator: process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' });
//
// Variáveis de ambiente (ver .env.example):
//   Painel (Vite):   VITE_USE_EMULATOR=true
//   Landing (Next):  NEXT_PUBLIC_USE_EMULATOR=true
//   Testes/Node:     LEELA_USE_EMULATOR=true
//
// Nenhum segredo de produção vive neste pacote.
// Firebase config em dev usa o projeto "demo-leela" (Emulator-only).
// =============================================================================

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions';

// ---------------------------------------------------------------------------
// Configuração padrão (projeto Emulator "demo-leela")
// Apps sobrescrevem via initLeela({ firebaseConfig: { ... } }) em produção.
// ---------------------------------------------------------------------------
const DEMO_CONFIG = {
  apiKey: 'demo-key',
  authDomain: 'demo-leela.firebaseapp.com',
  projectId: 'demo-leela',
  storageBucket: 'demo-leela.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
};

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------
let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;
let _functions: Functions | undefined;
let _emulatorsConnected = false;

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Configuração do Firebase para produção (valores do Firebase Console) */
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/** Opções de inicialização passadas pelo app no entry-point */
export interface LeelaFirebaseConfig {
  /**
   * Liga conexão com o Firebase Emulator Suite.
   * Passe `true` em desenvolvimento; `false` em produção.
   *
   * Como checar por ambiente (no código do app, não do pacote):
   *   Vite:    `import.meta.env.VITE_USE_EMULATOR === 'true'`
   *   Next.js: `process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'`
   */
  useEmulator?: boolean;
  /** Host dos emuladores (padrão: 'localhost') */
  emulatorHost?: string;
  /**
   * Configuração do Firebase para produção.
   * Se omitido em dev com emuladores, usa valores demo-leela.
   */
  firebaseConfig?: FirebaseClientConfig;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Inicializa o Firebase client SDK.
 * Idempotente — chamadas subsequentes são no-ops.
 * DEVE ser chamado no entry-point do app antes de qualquer uso do Firestore/Auth.
 */
export function initLeela(config: LeelaFirebaseConfig = {}): void {
  const { useEmulator = false, emulatorHost = 'localhost', firebaseConfig } = config;

  // Fail-closed: DEMO_CONFIG é Emulator-only. Sem emulador, o app DEVE
  // fornecer firebaseConfig real — apontar produção para demo-leela
  // silenciosamente seria erro grave de configuração (achado B3, review E00).
  if (!useEmulator && !firebaseConfig) {
    throw new Error(
      '[leela/api-client] initLeela({ useEmulator: false }) exige firebaseConfig. ' +
        'DEMO_CONFIG (demo-leela) é permitido apenas com useEmulator: true.'
    );
  }

  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig ?? DEMO_CONFIG);
  }

  if (!_db) _db = getFirestore(_app);
  if (!_auth) _auth = getAuth(_app);
  if (!_functions) _functions = getFunctions(_app, 'us-central1');

  if (useEmulator && !_emulatorsConnected) {
    connectFirestoreEmulator(_db, emulatorHost, 8080);
    connectAuthEmulator(_auth, `http://${emulatorHost}:9099`, {
      disableWarnings: true,
    });
    connectFunctionsEmulator(_functions, emulatorHost, 5001);
    _emulatorsConnected = true;
  }
}

// ---------------------------------------------------------------------------
// Acessores internos — usados por auth.ts e outras partes do api-client
// ---------------------------------------------------------------------------

/** @internal */
export function getLeelaDb(): Firestore {
  if (!_db) {
    throw new Error(
      '[leela/api-client] Firestore não inicializado. Chame initLeela() no entry-point.'
    );
  }
  return _db;
}

/** @internal */
export function getLeelaAuth(): Auth {
  if (!_auth) {
    throw new Error(
      '[leela/api-client] Auth não inicializado. Chame initLeela() no entry-point.'
    );
  }
  return _auth;
}

/** @internal */
export function getLeelaFunctions(): Functions {
  if (!_functions) {
    throw new Error(
      '[leela/api-client] Functions não inicializado. Chame initLeela() no entry-point.'
    );
  }
  return _functions;
}
