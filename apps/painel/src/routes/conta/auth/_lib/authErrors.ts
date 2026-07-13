// =============================================================================
// authErrors — tradução de erros da Firebase Auth para mensagens honestas em
// PT-BR (LEELA-S020). REGRA DE SEGURANÇA CENTRAL: nenhuma mensagem de LOGIN ou
// de RECUPERAÇÃO pode revelar se um e-mail está cadastrado (anti-enumeração).
//   - Login: "conta inexistente" e "senha errada" caem na MESMA mensagem.
//   - Recuperação: a confirmação é sempre neutra (ver RecuperarSenhaPage) —
//     este módulo só mapeia falhas TÉCNICAS (rede), não existência.
// Funções puras, sem estado, testáveis célula a célula.
// =============================================================================

interface FirebaseAuthLikeError {
  code?: unknown;
}

/** Extrai o `code` de um erro da Firebase Auth com segurança de tipo. */
export function getAuthErrorCode(erro: unknown): string {
  if (typeof erro === 'object' && erro !== null && 'code' in erro) {
    const { code } = erro as FirebaseAuthLikeError;
    if (typeof code === 'string') return code;
  }
  return '';
}

/**
 * Mensagem ÚNICA de falha de login. `user-not-found`, `wrong-password`,
 * `invalid-credential` e `invalid-email` colapsam aqui de propósito: o
 * atacante não descobre se o e-mail existe a partir do erro.
 */
export const CREDENCIAL_INVALIDA = 'E-mail ou senha inválidos.';

export function mensagemErroLogin(erro: unknown): string {
  switch (getAuthErrorCode(erro)) {
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde um instante e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    case 'auth/user-disabled':
      return 'Esta conta está desativada. Fale com o suporte.';
    // user-not-found · wrong-password · invalid-credential · invalid-email
    // → todos na mesma mensagem (não enumerar contas).
    default:
      return CREDENCIAL_INVALIDA;
  }
}

/**
 * Mensagem de falha de cadastro. `email-already-in-use` NÃO confirma
 * categoricamente a existência da conta: orienta ("se já tem conta, entre")
 * sem afirmar. A anti-enumeração forte no cadastro depende da
 * "Email Enumeration Protection" do Firebase (Console) — ver CadastrarPage.
 */
export function mensagemErroCadastro(erro: unknown): string {
  switch (getAuthErrorCode(erro)) {
    case 'auth/email-already-in-use':
      return 'Não foi possível concluir o cadastro com esses dados. Se você já tem uma conta, entre ou recupere sua senha.';
    case 'auth/weak-password':
      return 'Senha fraca: use pelo menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'Informe um e-mail válido.';
    case 'auth/operation-not-allowed':
      return 'O cadastro por e-mail está indisponível no momento.';
    case 'auth/network-request-failed':
      return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    default:
      return 'Não foi possível concluir o cadastro. Tente novamente.';
  }
}

/** Falha ao redefinir a senha pelo link (oobCode) — T2. */
export function mensagemErroRedefinicao(erro: unknown): string {
  switch (getAuthErrorCode(erro)) {
    case 'auth/expired-action-code':
      return 'Este link expirou. Solicite uma nova redefinição de senha.';
    case 'auth/invalid-action-code':
      return 'Link inválido ou já utilizado. Solicite uma nova redefinição de senha.';
    case 'auth/weak-password':
      return 'Senha fraca: use pelo menos 6 caracteres.';
    case 'auth/user-disabled':
    case 'auth/user-not-found':
      // Não distingue: mensagem única e neutra.
      return 'Não foi possível redefinir a senha. Solicite uma nova redefinição.';
    default:
      return 'Não foi possível redefinir a senha. Tente novamente.';
  }
}

/** Falha na troca de senha autenticada (reauth + updatePassword) — T4. */
export function mensagemErroTrocaSenha(erro: unknown): string {
  switch (getAuthErrorCode(erro)) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Senha atual incorreta.';
    case 'auth/weak-password':
      return 'Nova senha fraca: use pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um instante e tente de novo.';
    case 'auth/requires-recent-login':
      return 'Por segurança, entre novamente antes de trocar a senha.';
    default:
      return 'Não foi possível trocar a senha. Tente novamente.';
  }
}
