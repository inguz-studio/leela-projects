// =============================================================================
// authValidation — validações CLIENTE das jornadas de conta (LEELA-S020).
// Barreira de UX apenas: o servidor (Firebase Auth) é a autoridade final.
// Funções puras.
//
// -----------------------------------------------------------------------------
// POR QUE A RÉGUA DE SENHA NÃO É MAIS ESCRITA AQUI (FRONTEIRA-AUTH)
// -----------------------------------------------------------------------------
// Este arquivo mantinha o PRÓPRIO piso de senha (`SENHA_MIN = 6`, "espelho do
// padrão do Firebase") no mesmo repo em que `@leela/core` ·
// `platform/politicaDeSenha` passou a ser a autoridade da casa — piso 8, mais
// número e caractere especial, e a MESMA função que as Functions chamam antes
// de criar usuário. Duas réguas sobre a mesma regra é exatamente o defeito que
// o core já pagou uma vez (três pisos vivos ao mesmo tempo, tela recusando o
// que a Function aceitava). Sobrou aqui o encaminhamento: a régua é uma só.
//
// Os dois nomes CONTINUAM exportados de propósito, em vez de sumirem: quem
// importa daqui segue compilando e passa a exigir a política nova no mesmo
// commit. São ponte, não API — tela nova importa de `@leela/core` direto.
//
// `senhaAtendeMinimo` delega a `senhaValida`, então hoje ela responde pela
// política INTEIRA (comprimento + número + especial), não só pelo comprimento.
// O nome ficou estreito de propósito: renomear os cinco pontos de chamada é
// diff de outra lane, e mentir para menos (aceitar o que a política recusa)
// seria pior que um nome apertado.
// =============================================================================

import { senhaValida } from '@leela/core';

/**
 * Piso de comprimento vigente. Reexportado do core — subir o piso é editar UM
 * arquivo lá, e as telas do painel acompanham sem tocar em nada aqui.
 */
export { SENHA_MIN } from '@leela/core';

/**
 * Aceita e-mail sintaticamente plausível. Deliberadamente leve — não tenta
 * replicar a RFC; só evita submit obviamente inválido (o servidor valida).
 */
export function emailValido(email: string): boolean {
  const alvo = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alvo);
}

/** A senha passa na política da casa? Ver o cabeçalho sobre o nome. */
export function senhaAtendeMinimo(senha: string): boolean {
  return senhaValida(senha);
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
