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

/**
 * Sanitiza um destino de redirect pós-login (`state.from`) para um caminho
 * INTERNO seguro. Hoje o `from` só é gravado pelo RequirePapel a partir de
 * `location.pathname + location.search` (confiável), mas o redirect é o sink
 * clássico de open-redirect: qualquer origem futura de `state.from` (query
 * param, deep-link) tornaria `navigate(destino)` explorável. Esta guarda
 * fail-closed rejeita URL absoluta/protocol-relative e volta ao fallback.
 *
 * Aceita só caminho que começa com um único `/` (rota interna). Rejeita:
 *   - vazio / não-string → fallback
 *   - `//host`, `/\host` (protocol-relative → origem externa)
 *   - `http://`, `https://`, `javascript:` etc. (esquema absoluto)
 */
export function caminhoInternoSeguro(destino: unknown, fallback = '/'): string {
  if (typeof destino !== 'string' || destino.length === 0) return fallback;
  if (destino[0] !== '/') return fallback; // relativo/esquema absoluto → rejeita
  if (destino[1] === '/' || destino[1] === '\\') return fallback; // //host, /\host
  return destino;
}
