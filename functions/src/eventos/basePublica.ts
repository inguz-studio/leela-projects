// =============================================================================
// functions/src/eventos/basePublica.ts
//
// A base pública das URLs do produto, UMA SÓ, vinda do ambiente
// (LEELA-S1214-T3 · RN-423 · D-ING-8).
//
// O QUE ESTE MÓDULO MATA. Até aqui existiam DUAS bases divergentes no mesmo
// produto: `EVENTO_URL_BASE = 'https://beh.ro'` cravado no código das Functions
// e `NEXT_PUBLIC_LEELA_URL` na landing. `beh.ro` é o domínio dos mocks Be Hero,
// então o e-mail da compra vinha mandando quem acabou de pagar para o site de
// outra empresa. Isso não era configuração errada: era domínio de terceiro
// dentro do código-fonte.
//
// COMO A BASE É RESOLVIDA, da mais explícita para a mais derivada:
//   1. `LEELA_PUBLIC_URL` — a variável desta camada;
//   2. `NEXT_PUBLIC_LEELA_URL` — a MESMA que a landing lê. Aceitar as duas é o
//      que permite ao operador manter literalmente uma variável só no ambiente,
//      que é o que a RN-423 pede;
//   3. nada. E "nada" é um estado legítimo, não um erro a contornar.
//
// SEM BASE, O E-MAIL SAI SEM LINK (D-ING-8). Um link que dá 404, ou que leva ao
// site de outra empresa, é pior que link nenhum: gasta a confiança de quem
// acabou de pagar. O código do ingresso em texto continua lá, e é ele que
// sustenta a manhã do evento.
//
// SEM BASE, PUBLICAR EVENTO FALHA ALTO. Aqui a escolha é oposta à do e-mail, e
// de propósito: a `url` gravada na publicação é PERSISTIDA e lida depois pelo
// painel e pelo QR do evento. Gravar uma URL errada é um defeito que se espalha
// pelo banco e sobrevive ao fix; recusar a publicação com mensagem acionável é
// um defeito que morre na hora, na frente de quem pode consertar. É a mesma
// disciplina de `carregarQrKeyring`: config quebrada grita na carga.
//
// O VALOR do domínio continua sendo decisão do dono (item 12 do painel). O que
// esta regra resolve é a máquina.
// =============================================================================

/** Nome canônico da variável desta camada. */
export const ENV_BASE_PUBLICA = 'LEELA_PUBLIC_URL';

/** Nome que a superfície pública (Next) já usa — aceito como a mesma base. */
export const ENV_BASE_PUBLICA_LANDING = 'NEXT_PUBLIC_LEELA_URL';

/**
 * Base pública configurada, sem barra final; `null` quando não há.
 *
 * Só aceita `http(s)://` e recusa qualquer coisa com espaço ou caractere que
 * quebre atributo/URL — uma base torta produziria link torto em massa, e o
 * template do e-mail já recusaria depois, longe da causa.
 * @pure
 */
export function basePublica(
  env: Record<string, string | undefined> = process.env
): string | null {
  const bruto = env[ENV_BASE_PUBLICA] ?? env[ENV_BASE_PUBLICA_LANDING];
  if (typeof bruto !== 'string') return null;
  const limpo = bruto.trim().replace(/\/+$/, '');
  if (limpo.length === 0 || limpo.length > 512) return null;
  if (!/^https?:\/\/[^\s<>"'\\]+$/.test(limpo)) return null;
  return limpo;
}

/**
 * URL pública do evento (`{base}/{slug}`); `null` sem base configurada.
 * @pure
 */
export function urlPublicaDoEvento(
  slug: string,
  env: Record<string, string | undefined> = process.env
): string | null {
  const base = basePublica(env);
  if (base === null) return null;
  return `${base}/${encodeURIComponent(slug)}`;
}

/**
 * URL da página do ingresso (`{base}/ingresso/{token}`); `null` sem base.
 *
 * O token é `encodeURIComponent`ado por disciplina, ainda que o alfabeto do
 * `LLIP1` (base64url + ponto) já seja seguro em path: quem mudar o formato do
 * token um dia não deve precisar lembrar deste detalhe.
 * @pure
 */
export function urlIngressoPorLink(
  token: string,
  env: Record<string, string | undefined> = process.env
): string | null {
  const base = basePublica(env);
  if (base === null || token.length === 0) return null;
  return `${base}/ingresso/${encodeURIComponent(token)}`;
}
