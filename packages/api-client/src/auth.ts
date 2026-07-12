// =============================================================================
// @leela/api-client — helpers de autenticação (email/Google/Apple)
//
// Provedores suportados:
//   - Email + senha
//   - Google (OAuth via popup/redirect)
//   - Apple (OAuth — chave de produção pendente, provider declarado)
//
// PENDÊNCIA (produção): Apple Sign-In requer:
//   1. Apple Developer Account com App ID + Service ID configurado
//   2. Chave privada (.p8) registrada no Firebase Console
//   3. Domain verification em https://appleid.apple.com/auth/keys
//   O provider está declarado abaixo mas só funciona com as chaves reais.
//
// Nenhum segredo no cliente. Custom claims são definidos server-side pela
// Cloud Function `onCreateUser` (functions/src/auth/onCreateUser.ts).
// =============================================================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User,
  type Unsubscribe,
  type UserCredential,
} from 'firebase/auth';
import { getLeelaAuth } from './firebase';

// ---------------------------------------------------------------------------
// Provedores OAuth
// ---------------------------------------------------------------------------

/** Provedor Google pré-configurado */
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Provedor Apple pré-configurado.
 * PENDÊNCIA: configurar no Firebase Console com chaves de produção da Apple.
 * Obrigatório para publicação na App Store (guideline 4.8).
 */
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

/**
 * Observa o estado de autenticação.
 * Retorna função para cancelar a inscrição (use em cleanup de componentes).
 *
 * @example
 * const unsubscribe = onSessionChange((user) => {
 *   if (user) console.log('Autenticado:', user.uid);
 *   else console.log('Deslogado');
 * });
 * // Em cleanup: unsubscribe();
 */
export function onSessionChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getLeelaAuth(), callback);
}

/**
 * Retorna o usuário atualmente autenticado ou null.
 * Prefira `onSessionChange` para reatividade; este helper é para leitura síncrona.
 */
export function getCurrentUser(): User | null {
  return getLeelaAuth().currentUser;
}

// ---------------------------------------------------------------------------
// Email + senha
// ---------------------------------------------------------------------------

/**
 * Login com email e senha.
 * Erros da Firebase Auth são propagados sem wrapping (tratar no chamador).
 */
export async function loginComEmail(
  email: string,
  senha: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getLeelaAuth(), email, senha);
}

/**
 * Cria conta com email e senha.
 * O trigger `onCreateUser` cria o doc `atletas/{uid}` e seta o claim `role`.
 */
export async function criarContaComEmail(
  email: string,
  senha: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(getLeelaAuth(), email, senha);
}

// ---------------------------------------------------------------------------
// Anônimo (checkout público sem login — LEELA-S1203)
// ---------------------------------------------------------------------------

/**
 * Login ANÔNIMO — dá ao atleta uma identidade Firebase (uid) SEM criar conta
 * nem coletar credencial. É o que permite o checkout público invocar as Cloud
 * Functions (que exigem `context.auth`) mantendo a UX "sem login": o uid anônimo
 * alimenta os ids determinísticos de idempotência do pedido (`ped-{uid}-{key}`).
 *
 * Idempotente na prática: se já há sessão (anônima ou não), devolve o usuário
 * atual sem reautenticar — a sessão anônima persiste no navegador entre reloads,
 * então o retry do checkout reusa o MESMO uid (idempotência preservada).
 *
 * PREMISSA DE PRODUÇÃO: exige o provedor "Anonymous" habilitado no Firebase
 * Auth (Console). No Emulator já vem ligado. Sem ele, lança
 * `auth/operation-not-allowed`.
 */
export async function loginAnonimo(): Promise<User> {
  const auth = getLeelaAuth();
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

/**
 * Login com Google via popup.
 * Em mobile/web-view pode ser necessário trocar para `signInWithRedirect`.
 */
export async function loginComGoogle(): Promise<UserCredential> {
  return signInWithPopup(getLeelaAuth(), googleProvider);
}

// ---------------------------------------------------------------------------
// Apple
// ---------------------------------------------------------------------------

/**
 * Login com Apple via popup.
 *
 * PENDÊNCIA DE PRODUÇÃO:
 *   - Registrar Service ID no Apple Developer Console
 *   - Adicionar key ID + chave .p8 no Firebase Console > Authentication > Sign-in method
 *   - Adicionar domínio ao Return URLs na Apple
 *   Sem configuração, este método lança FirebaseError auth/invalid-oauth-provider.
 */
export async function loginComApple(): Promise<UserCredential> {
  return signInWithPopup(getLeelaAuth(), appleProvider);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/** Encerra a sessão do usuário atual. */
export async function logout(): Promise<void> {
  return signOut(getLeelaAuth());
}

// ---------------------------------------------------------------------------
// Custom claims
// ---------------------------------------------------------------------------

/**
 * Lê os custom claims do token ID do usuário autenticado.
 * Retorna null se não há usuário autenticado.
 *
 * Os claims são setados server-side por `onCreateUser` e por
 * `setTenantClaims` (task S1600-T2). Forçar `forceRefresh: true` após
 * mudança de papel para evitar cache de token desatualizado.
 */
export async function getClaims(
  forceRefresh = false
): Promise<Record<string, unknown> | null> {
  const user = getLeelaAuth().currentUser;
  if (!user) return null;
  const token = await user.getIdTokenResult(forceRefresh);
  return token.claims as Record<string, unknown>;
}
