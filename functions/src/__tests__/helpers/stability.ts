// =============================================================================
// functions/src/__tests__/helpers/stability.ts — infra de estabilidade da
// suíte contra o Emulator QUENTE (lane SUITE-STAB · run leela-build-2d6ee98d).
//
// Problema que este módulo paga (evidência: claimfix-t4-suite-full5.log):
// a suíte roda sequencial por arquivo, mas o Functions Emulator executa
// triggers de forma ASSÍNCRONA — seeds grandes (453 inscritos × 6 triggers
// onInscritoWrite*) enfileiram milhares de execuções que transbordam para os
// arquivos seguintes. O clear+seed do próximo arquivo corre contra esse
// backlog: seeds engolidos ("Evento 'X' não existe"), leftovers ressuscitados
// ("Slug já em uso"), contenção (409 Transaction lock, Service call error em
// get() de Rules) e claims clobberadas pela janela do onCreateUser.
//
// Estratégia (à prova de LATÊNCIA, não de máquina rápida):
//   1. withTriggersPaused — pausa background triggers via Emulator Hub
//      durante clear+seed (mata o storm NA FONTE; fallback gracioso quando o
//      Hub não está de pé — ex.: run com --only firestore,auth).
//   2. clearFirestoreDrained — clear com retry (409 sob contenção) + settle +
//      SEGUNDO clear (varre docs recriados por execuções que já estavam em
//      voo antes da pausa).
//   3. seedVerified — seed + settle + verificação de canários (getAll admin);
//      swallow detectado ⇒ re-clear + re-seed. Apoia na idempotência dos
//      seeds do repo (docIds fixos + set merge) — retry NUNCA duplica.
//   4. ensureUserWithClaims — generalização do padrão warm-safe e4ddbb9:
//      createUser idempotente + drenagem do onCreateUser (poll até o role
//      default aterrissar) + claims com verificação de estabilidade.
//
// REGRA (E00): teste novo de integração que semeia Firestore + cria usuário
// de fixture usa ESTES helpers no beforeEach — não clear/seed cru.
// =============================================================================

import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import type * as admin from 'firebase-admin';

/** Janela de assentamento p/ execuções em voo aterrissarem (ms). */
const SETTLE_MS = 120;
/** Tentativas de seed+verify antes de desistir com diagnóstico. */
const SEED_VERIFY_ATTEMPTS = 4;
/** Tentativas de clearFirestore sob contenção (409 Transaction lock). */
const CLEAR_ATTEMPTS = 3;
/** Timeout p/ o onCreateUser aterrissar após createUser (ms). */
const ONCREATE_DRAIN_TIMEOUT_MS = 5_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Emulator Hub — pausa de background triggers
// ---------------------------------------------------------------------------

/** Caches dos probes do Hub (1× por worker — o ambiente não muda no run). */
let hubTriggersAvailable: boolean | undefined;
let functionsEmulatorAvailable: boolean | undefined;
/**
 * Pausa STICKY por arquivo: o RE-ENABLE de background triggers dispara um
 * RELOAD completo das function definitions no Functions Emulator (~segundos;
 * provado no smoke T3: 105 reloads = hook timeouts + "Failed to load function
 * definition ... Timeout after 10000" + cascata de fetch failed). Por isso a
 * pausa NÃO é re-habilitada por beforeEach — ela fica ativa até o FIM do
 * arquivo (resumeTriggersSticky no afterAll global do vitest.setup.ts):
 * 1 reload por arquivo wired, não 1 por teste.
 */
let stickyPaused = false;

function hubHost(): string | undefined {
  const hub = process.env['FIREBASE_EMULATOR_HUB'];
  return hub !== undefined && hub.length > 0 ? hub : undefined;
}

/**
 * O Functions Emulator está de pé? (GET /emulators no Hub lista os emulators
 * ativos.) Sem Functions não há trigger em background — drenagens viram no-op.
 */
async function functionsEmulatorUp(): Promise<boolean> {
  if (functionsEmulatorAvailable !== undefined) return functionsEmulatorAvailable;
  const hub = hubHost();
  if (hub === undefined) {
    functionsEmulatorAvailable = false;
    return false;
  }
  try {
    const res = await fetch(`http://${hub}/emulators`);
    const body = (await res.json()) as Record<string, unknown>;
    functionsEmulatorAvailable = res.ok && body['functions'] !== undefined;
  } catch {
    functionsEmulatorAvailable = false;
  }
  return functionsEmulatorAvailable;
}

/**
 * O Emulator Hub expõe PUT /functions/{disable,enable}BackgroundTriggers
 * (mesma API que o próprio firebase-tools usa em import/export). Probe 1×;
 * indisponível ⇒ caímos no caminho settle-only (nunca falha o teste por isso).
 */
async function hubCanPauseTriggers(): Promise<boolean> {
  if (hubTriggersAvailable !== undefined) return hubTriggersAvailable;
  if (!(await functionsEmulatorUp())) {
    hubTriggersAvailable = false;
    return false;
  }
  const hub = hubHost();
  if (hub === undefined) {
    hubTriggersAvailable = false;
    return false;
  }
  try {
    const res = await fetch(`http://${hub}/functions/enableBackgroundTriggers`, {
      method: 'PUT',
    });
    hubTriggersAvailable = res.ok;
  } catch {
    hubTriggersAvailable = false;
  }
  return hubTriggersAvailable;
}

async function setBackgroundTriggers(enabled: boolean): Promise<void> {
  const hub = hubHost();
  if (hub === undefined) return;
  const verb = enabled ? 'enableBackgroundTriggers' : 'disableBackgroundTriggers';
  try {
    await fetch(`http://${hub}/functions/${verb}`, { method: 'PUT' });
  } catch {
    // Hub caiu no meio do run — segue no caminho settle-only.
  }
}

/**
 * Executa `fn` com background triggers PAUSADOS (clear+seed sem fan-out de
 * onWrite/onCreate) e DEIXA a pausa ativa (sticky) até o fim do arquivo —
 * o afterAll global do vitest.setup.ts re-habilita. Os arquivos wired testam
 * os cores DIRETO (padrão do repo: "Function REAL in-process"); nenhum
 * depende de entrega de background durante o corpo do teste. Writes feitos
 * durante a pausa nunca disparam (semântica de import do firebase-tools).
 */
export async function withTriggersPaused<T>(fn: () => Promise<T>): Promise<T> {
  await pauseTriggersSticky();
  return fn();
}

/** Pausa background triggers (idempotente; no-op sem Hub/Functions). */
export async function pauseTriggersSticky(): Promise<void> {
  if (stickyPaused) return;
  if (!(await hubCanPauseTriggers())) return;
  await setBackgroundTriggers(false);
  stickyPaused = true;
}

/**
 * Re-habilita background triggers SE este arquivo pausou (chamado pelo
 * afterAll global do vitest.setup.ts — roda por último, com o emulator
 * ocioso, minimizando o risco do reload de definitions estourar timeout).
 */
export async function resumeTriggersSticky(): Promise<void> {
  if (!stickyPaused) return;
  stickyPaused = false;
  await setBackgroundTriggers(true);
}

// ---------------------------------------------------------------------------
// Firestore — clear drenado + seed verificado
// ---------------------------------------------------------------------------

async function clearWithRetry(testEnv: RulesTestEnvironment): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= CLEAR_ATTEMPTS; attempt++) {
    try {
      await testEnv.clearFirestore();
      return;
    } catch (err) {
      // 409 Transaction lock timeout / transporte sob contenção — settle e
      // tenta de novo; a causa (backlog de triggers) se dissipa sozinha.
      lastErr = err;
      await sleep(SETTLE_MS * attempt * 2);
    }
  }
  throw lastErr;
}

/**
 * clearFirestore à prova de emulator quente: retry sob contenção + settle +
 * SEGUNDA varredura para docs recriados por execuções que já estavam em voo.
 */
export async function clearFirestoreDrained(
  testEnv: RulesTestEnvironment
): Promise<void> {
  await clearWithRetry(testEnv);
  await sleep(SETTLE_MS);
  await clearWithRetry(testEnv);
}

/**
 * Clear BULK via endpoint REST do próprio emulator (o mesmo que o
 * rules-unit-testing usa) — para suites SEM RulesTestEnvironment que antes
 * limpavam com listCollections+recursiveDelete doc-a-doc (lento a ponto de
 * estourar hook timeout com dataset residual grande; smoke T3).
 */
export async function clearFirestoreRest(projectId: string): Promise<void> {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (host === undefined || host.length === 0) return;
  const url =
    `http://${host}/emulator/v1/projects/${projectId}` +
    `/databases/(default)/documents`;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= CLEAR_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) return;
      lastStatus = res.status;
    } catch {
      lastStatus = -1;
    }
    await sleep(SETTLE_MS * attempt * 2);
  }
  throw new Error(`clearFirestoreRest: falhou após ${CLEAR_ATTEMPTS} tentativas (status ${lastStatus})`);
}

/**
 * Roda `seedFn` e VERIFICA que os canários existem depois de uma janela de
 * assentamento. Canário sumido = seed engolido por varredura tardia do clear
 * ou delete de trigger atrasado ⇒ re-clear + re-seed (seeds idempotentes).
 *
 * `canaries` são doc paths que o seed GARANTE existir (tenant, evento, docs
 * que os testes do arquivo leem no caminho crítico). Leitura via Admin SDK
 * (getAll — 1 RPC, bypassa Rules).
 */
export async function seedVerified(
  db: admin.firestore.Firestore,
  testEnv: RulesTestEnvironment,
  seedFn: () => Promise<void>,
  canaries: readonly string[]
): Promise<void> {
  await seedVerifiedWith(db, () => clearFirestoreDrained(testEnv), seedFn, canaries);
}

/** Variante para suites SEM RulesTestEnvironment: re-clear injetável. */
export async function seedVerifiedWith(
  db: admin.firestore.Firestore,
  reclear: () => Promise<void>,
  seedFn: () => Promise<void>,
  canaries: readonly string[]
): Promise<void> {
  if (canaries.length === 0) {
    throw new Error('seedVerified: informe ao menos 1 canário do seed.');
  }
  let missing: string[] = [];
  for (let attempt = 1; attempt <= SEED_VERIFY_ATTEMPTS; attempt++) {
    await seedFn();
    await sleep(SETTLE_MS);
    const snaps = await db.getAll(...canaries.map((p) => db.doc(p)));
    missing = snaps.filter((s) => !s.exists).map((s) => s.ref.path);
    if (missing.length === 0) return;
    // Estado indeterminado — limpa TUDO e re-semeia do zero.
    await reclear();
  }
  throw new Error(
    `seedVerified: canários ausentes após ${SEED_VERIFY_ATTEMPTS} tentativas ` +
      `(seed engolido pelo emulator?): ${missing.join(', ')}`
  );
}

// ---------------------------------------------------------------------------
// Auth — limpeza tolerante + claims estáveis contra o onCreateUser
// ---------------------------------------------------------------------------

/** Deleta TODOS os usuários do Auth Emulator, tolerante a corrida. */
export async function deleteAllUsersDrained(
  auth: admin.auth.Auth
): Promise<void> {
  for (let pass = 0; pass < 3; pass++) {
    const { users } = await auth.listUsers(1000);
    if (users.length === 0) return;
    await Promise.all(
      users.map((u) => auth.deleteUser(u.uid).catch(() => undefined))
    );
  }
}

function claimsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | null
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b);
}

/**
 * Espera o onCreateUser da criação RECENTE aterrissar (ele seta role default
 * 'athlete' quando o usuário nasce sem claims). Só faz sentido quando o
 * Functions Emulator está de pé E os triggers estão ativos; caso contrário
 * retorna direto. Timeout NÃO falha — a estabilização abaixo cobre o residual.
 */
async function drainOnCreateUser(
  auth: admin.auth.Auth,
  uid: string
): Promise<void> {
  if (stickyPaused) return; // pausado: o trigger nunca dispara p/ este create
  if (!(await functionsEmulatorUp())) return;
  const deadline = Date.now() + ONCREATE_DRAIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const fresh = await auth.getUser(uid);
    if ((fresh.customClaims ?? {})['role'] !== undefined) return;
    await sleep(75);
  }
}

/**
 * Cria usuário de FIXTURE (idempotente — padrão warm-safe e4ddbb9: conta da
 * rodada anterior = estado equivalente) e aplica claims EXATAS de forma
 * estável contra a janela do onCreateUser (getUser→setCustomUserClaims do
 * trigger clobbera claims setadas no meio — fonte da assinatura
 * `athlete` vs `tenant_owner` do full5).
 *
 * `claims: null` limpa as claims (semântica do Admin SDK).
 */
export async function ensureUserWithClaims(
  auth: admin.auth.Auth,
  uid: string,
  email: string,
  claims: Record<string, unknown> | null
): Promise<void> {
  let created = false;
  try {
    await auth.createUser({ uid, email });
    created = true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/uid-already-exists' && code !== 'auth/email-already-exists') {
      throw err;
    }
  }
  if (created) await drainOnCreateUser(auth, uid);

  await auth.setCustomUserClaims(uid, claims);
  // Com a pausa sticky ativa não há onCreateUser p/ clobberar — o set é
  // definitivo. Fora da pausa, estabiliza: relê até 2 leituras consecutivas
  // iguais às claims pedidas; clobber detectado ⇒ re-aplica (o onCreateUser
  // nunca sobrescreve role não-athlete já presente — convergência garantida).
  if (stickyPaused || !(await functionsEmulatorUp())) return;
  let stable = 0;
  for (let i = 0; i < 20 && stable < 2; i++) {
    const fresh = await auth.getUser(uid);
    if (claimsEqual(fresh.customClaims, claims)) {
      stable++;
    } else {
      stable = 0;
      await auth.setCustomUserClaims(uid, claims);
    }
    await sleep(50);
  }
  if (stable < 2) {
    throw new Error(
      `ensureUserWithClaims: claims de '${uid}' não estabilizaram (onCreateUser em loop?).`
    );
  }
}
