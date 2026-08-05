// =============================================================================
// authMensagens — tradução de erros da Firebase Auth para copy honesta em
// PT-BR, e as validações de cliente das jornadas de conta.
//
// POR QUE AQUI (S1221-T1): a landing passou a ter login próprio (o overlay da
// S1221) e precisa exatamente das mesmas mensagens que o painel já usa em
// `apps/painel/src/routes/conta/auth/_lib/authErrors.ts` e
// `_lib/authValidation.ts`. Uma app não importa da outra — são dois deploys —
// e copiar a tabela de mensagens criaria DUAS autoridades sobre a regra
// anti-enumeração, que é a parte que não pode divergir. O api-client já é o
// dono do seam de Auth (`loginComEmail`, `enviarResetSenha`,
// `confirmarResetSenha`), então a tradução do erro que ele propaga mora aqui.
//
// PROVENIÊNCIA: cópia fiel dos dois módulos do painel (LEELA-S020), sem uma
// vírgula de mudança de comportamento. A convergência do painel para este
// módulo é follow-up registrado (território `apps/painel`, fora desta lane).
//
// REGRA DE SEGURANÇA CENTRAL: nenhuma mensagem de LOGIN ou de RECUPERAÇÃO pode
// revelar se um e-mail está cadastrado (anti-enumeração).
//   - Login: "conta inexistente" e "senha errada" caem na MESMA mensagem.
//   - Recuperação: a confirmação é sempre neutra (quem chama decide a copy);
//     este módulo só mapeia falhas TÉCNICAS, nunca existência.
// Funções puras, sem estado, sem dependência do SDK — testáveis célula a célula.
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

/** Falha ao definir/redefinir a senha pelo link (oobCode). */
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

/** Comprimento mínimo de senha exigido pela Firebase Auth. */
export const SENHA_MIN = 6;

/**
 * Aceita e-mail sintaticamente plausível. Deliberadamente leve — não tenta
 * replicar a RFC; só evita submit obviamente inválido (o servidor valida).
 */
export function emailValido(email: string): boolean {
  const alvo = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alvo);
}

/** Senha atende ao mínimo do Firebase. */
export function senhaAtendeMinimo(senha: string): boolean {
  return senha.length >= SENHA_MIN;
}
