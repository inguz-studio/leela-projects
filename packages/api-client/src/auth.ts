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
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User,
  type Unsubscribe,
  type UserCredential,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getLeelaAuth, getLeelaFunctions } from './firebase';

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

// ---------------------------------------------------------------------------
// Recuperação de senha (LEELA-S020-T2)
// ---------------------------------------------------------------------------

/**
 * Rota do painel para onde o link de senha leva depois da ação. Espelha
 * `ROTA_APOS_DEFINIR_SENHA` de `functions/src/auth/linkDeAcao.ts`, que é o
 * PONTO ÚNICO DE DECISÃO da jornada de primeiro acesso.
 */
const ROTA_APOS_DEFINIR_SENHA = '/entrar';

/**
 * Quem está pedindo o link (S1223-T2 · RN-453). O destino do `continueUrl` é
 * decidido pela ORIGEM, no servidor: comprador aterrissa na landing
 * (`/definir-senha`), organizador no painel (`/redefinir-senha`).
 *
 * Espelha `OrigemLinkSenha` de `functions/src/auth/linkDeAcao.ts`. A escolha é
 * uma DICA de destino, nunca credencial: errar a origem só troca a casa em que
 * a pessoa aterrissa, e o `oobCode` continua sendo o que autoriza.
 */
export type OrigemLinkSenha = 'comprador' | 'organizador';

/**
 * `actionCodeSettings` do fluxo de senha (lane IDENTIDADE-EMAIL).
 *
 * Sem isto, o link de ação do Auth caía no handler HOSPEDADO do Firebase, fora
 * da marca e fora do painel. `handleCodeInApp: false` porque o fluxo é web: a
 * `RedefinirSenhaPage` resolve o `oobCode` com o SDK do cliente.
 *
 * O DOMÍNIO é o da PRÓPRIA app que está rodando (`window.location.origin`):
 * preview, emulador e produção acertam sozinhos, sem mais uma variável de
 * ambiente para alguém esquecer de setar.
 *
 * A ROTA, porém, é por origem (S1223-T2): a landing não tem `/entrar` — a casa
 * dela é `/definir-senha`. Combinar o domínio da landing com a rota do painel
 * produziria um 404 no caminho de recuperar conta, que é exatamente o defeito
 * que a RN-453 existe para fechar.
 */
function actionCodeSettingsSenha(
  origem: OrigemLinkSenha
): { url: string; handleCodeInApp: false } {
  // `globalThis` e não `window`: este módulo também é compilado pelo tsconfig
  // das Functions (lib node, sem DOM), onde `window` nem é um nome conhecido.
  const local = (globalThis as { location?: { origin?: string } }).location;
  const dominio =
    typeof local?.origin === 'string' && local.origin.startsWith('http')
      ? local.origin.replace(/\/+$/, '')
      : 'https://leela-hub.web.app';
  const rota = origem === 'comprador' ? '/definir-senha' : ROTA_APOS_DEFINIR_SENHA;
  return { url: `${dominio}${rota}`, handleCodeInApp: false };
}

/**
 * Dispara o e-mail de redefinição de senha PELA NOSSA CALLABLE.
 *
 * POR QUE NÃO É MAIS `sendPasswordResetEmail` (lane IDENTIDADE-EMAIL): quem
 * enviava era o Firebase, com o template padrão dele — remetente
 * `noreply@leela-hub.firebaseapp.com` e layout genérico. Como esse é o e-mail
 * que um cliente novo vê PRIMEIRO, virou o mais visível dos oito e o único sem
 * marca nenhuma. A callable `solicitarRedefinicaoSenha` gera o link oficial no
 * servidor (`generatePasswordResetLink`) e envia o NOSSO template pela Brevo.
 *
 * SEGURANÇA (anti-enumeração): a callable responde `{ ok: true }` sempre, com
 * TEMPO acolchoado até um piso fixo, exista ou não a conta — nem a mensagem nem
 * o relógio distinguem os dois casos. O chamador continua mostrando a MESMA
 * confirmação (ver `RecuperarSenhaPage`); o `catch` de lá segue valendo para
 * falha de rede, que também não distingue existência.
 *
 * FALLBACK: se a callable estiver indisponível (`internal`/`unavailable`/
 * `not-found` — deploy ainda não propagado), caímos no caminho antigo do
 * Firebase com `actionCodeSettings`. Feio é melhor que ninguém conseguir
 * recuperar a conta, e o caminho antigo continua funcional.
 */
export async function enviarResetSenha(
  email: string,
  origem: OrigemLinkSenha = 'organizador'
): Promise<void> {
  try {
    const fn = httpsCallable<{ email: string; origem: OrigemLinkSenha }, { ok: true }>(
      getLeelaFunctions(),
      'solicitarRedefinicaoSenha'
    );
    await fn({ email, origem });
    return;
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    const indisponivel =
      code.includes('internal') ||
      code.includes('unavailable') ||
      code.includes('not-found') ||
      code.includes('deadline-exceeded');
    if (!indisponivel) throw err;
  }
  await sendPasswordResetEmail(getLeelaAuth(), email, actionCodeSettingsSenha(origem));
}

/**
 * Valida um `oobCode` de redefinição (link do e-mail) e devolve o e-mail
 * associado. Lança `auth/expired-action-code` / `auth/invalid-action-code`
 * quando o código não presta — o chamador traduz para copy honesta.
 */
export async function verificarCodigoResetSenha(oobCode: string): Promise<string> {
  return verifyPasswordResetCode(getLeelaAuth(), oobCode);
}

/** Efetiva a nova senha para um `oobCode` válido. */
export async function confirmarResetSenha(oobCode: string, novaSenha: string): Promise<void> {
  return confirmPasswordReset(getLeelaAuth(), oobCode, novaSenha);
}

// ---------------------------------------------------------------------------
// Perfil do usuário logado (LEELA-S020-T3 cadastro · T4 configurações)
// ---------------------------------------------------------------------------

/**
 * Reenvia o e-mail de VERIFICAÇÃO para o usuário autenticado (S1222-T2 ·
 * RN-451).
 *
 * A área do cliente precisa disto porque a leitura dela exige `email_verified`
 * (RN-174 condição c) e a alternativa seria a lista vazia que mente. Quem
 * chegou pelo link de definir senha já tem o e-mail verificado — o Firebase
 * carimba a verificação quando o `oobCode` é consumido, e possuir o código
 * enviado ao endereço É a prova de posse. Este caminho existe para as contas
 * que nasceram por outra porta.
 *
 * NÃO é anti-enumeração: exige sessão, então quem chama já sabe quem é. Lança
 * se não houver sessão ativa.
 */
export async function enviarVerificacaoEmail(): Promise<void> {
  const user = getLeelaAuth().currentUser;
  if (!user) throw new Error('Sem sessão ativa para enviar a verificação.');
  return sendEmailVerification(user);
}

/**
 * Atualiza o nome de exibição (displayName) do usuário AUTENTICADO. Usado no
 * cadastro (logo após criar a conta) e nas configurações da conta. Lança se não
 * houver sessão ativa (o chamador só deve invocar autenticado).
 */
export async function atualizarNomeExibicao(displayName: string): Promise<void> {
  const user = getLeelaAuth().currentUser;
  if (!user) throw new Error('Sem sessão ativa para atualizar o perfil.');
  return updateProfile(user, { displayName });
}

/**
 * Atualiza a foto de perfil (photoURL) do usuário AUTENTICADO (LEELA-S020-T5).
 * Padrão URL+prévia (mesmo do avatar do perfil público / capa de evento): a UI
 * envia uma URL http(s); UPLOAD de arquivo segue lacuna (sem Storage no repo).
 *
 * String vazia LIMPA a foto (volta ao avatar por iniciais no shell). O
 * `onSessionChange` reemite o `User` com o `photoURL` novo — o Avatar do
 * sidebar/rodapé reflete sem reload. Lança se não houver sessão ativa.
 */
export async function atualizarFotoPerfil(photoURL: string): Promise<void> {
  const user = getLeelaAuth().currentUser;
  if (!user) throw new Error('Sem sessão ativa para atualizar a foto.');
  return updateProfile(user, { photoURL: photoURL.trim() });
}

/**
 * Troca a senha do usuário AUTENTICADO (LEELA-S020-T4).
 *
 * SEGURANÇA: REAUTENTICA obrigatoriamente com a senha atual antes de gravar a
 * nova. A reauth não é opcional nem separável (evita troca por sessão
 * sequestrada e satisfaz o `requires-recent-login` do Firebase) — por isso o
 * fluxo é um único helper, e não duas chamadas que a UI poderia desacoplar.
 * Nem a senha atual nem a nova são logadas ou retidas aqui.
 */
export async function trocarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  const user = getLeelaAuth().currentUser;
  if (!user?.email) throw new Error('Sem sessão com e-mail para trocar a senha.');
  const credencial = EmailAuthProvider.credential(user.email, senhaAtual);
  await reauthenticateWithCredential(user, credencial);
  await updatePassword(user, novaSenha);
}
