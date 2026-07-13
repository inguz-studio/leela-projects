// =============================================================================
// authValidation — validações CLIENTE das jornadas de conta (LEELA-S020).
// Barreira de UX apenas: o servidor (Firebase Auth) é a autoridade final. O
// mínimo de senha espelha o padrão do Firebase (6). Funções puras.
// =============================================================================

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
