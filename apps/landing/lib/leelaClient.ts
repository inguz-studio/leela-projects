// =============================================================================
// apps/landing/lib/leelaClient.ts
//
// Init do Firebase client SDK NO NAVEGADOR para o checkout público (S1203).
// Reusa `@leela/api-client` (mesmo init do painel) — nada de segredo aqui.
//
// O checkout invoca Cloud Functions callables (que exigem `context.auth`), então
// o cliente precisa de Auth + Functions. Firestore é inicializado pelo init mas
// NUNCA lido direto pelo cliente anônimo (pedidos/pagamentos são deny-by-default
// nas Rules) — todo dado vem dos RESULTADOS das callables.
//
// Emulator: `NEXT_PUBLIC_USE_EMULATOR=true` liga a conexão. Portas por env
// (defaults do Emulator Suite). O gate visual do maestro roda contra o Firestore
// seedado (o maestro sobe Functions/Auth e aponta o Firestore do emulator de
// Functions ao seed) — ver o report para o setup exato.
// =============================================================================

import { initLeela, type FirebaseClientConfig } from '@leela/api-client';

/** Lê uma porta de env (NEXT_PUBLIC_*) com fallback ao default do Suite. */
function porta(nome: string, padrao: number): number {
  const raw = process.env[nome];
  if (raw === undefined || raw.trim().length === 0) return padrao;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : padrao;
}

/** Config de produção a partir de NEXT_PUBLIC_FIREBASE_* (só se completa). */
function configProducao(): FirebaseClientConfig | undefined {
  const c = {
    apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
    authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
    storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
  };
  const completa = Object.values(c).every((v) => typeof v === 'string' && v.length > 0);
  return completa ? (c as FirebaseClientConfig) : undefined;
}

let inicializado = false;

/**
 * Garante o init do Firebase client (idempotente). Chamar de dentro de um
 * Client Component, no navegador — nunca no servidor/build.
 */
export function ensureLeela(): void {
  if (inicializado) return;
  const useEmulator = process.env['NEXT_PUBLIC_USE_EMULATOR'] === 'true';
  const firebaseConfig = configProducao();

  initLeela({
    useEmulator,
    emulatorHost: process.env['NEXT_PUBLIC_EMULATOR_HOST'] ?? '127.0.0.1',
    emulatorPorts: {
      firestore: porta('NEXT_PUBLIC_EMULATOR_FIRESTORE_PORT', 8080),
      functions: porta('NEXT_PUBLIC_EMULATOR_FUNCTIONS_PORT', 5001),
      auth: porta('NEXT_PUBLIC_EMULATOR_AUTH_PORT', 9099),
    },
    ...(firebaseConfig !== undefined ? { firebaseConfig } : {}),
  });
  inicializado = true;
}
