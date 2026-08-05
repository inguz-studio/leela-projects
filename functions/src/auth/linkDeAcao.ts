// =============================================================================
// functions/src/auth/linkDeAcao.ts
//
// ONDE OS LINKS DE AÇÃO DO FIREBASE AUTH ATERRISSAM (lane IDENTIDADE-EMAIL ·
// trace leela-build-2d6ee98d). PONTO ÚNICO DE DECISÃO — se a jornada de
// primeiro acesso mudar, muda AQUI e em nenhum outro lugar.
//
// -----------------------------------------------------------------------------
// O problema que este módulo resolve
// -----------------------------------------------------------------------------
// `actionCodeSettings` não existia em lugar nenhum do repositório, então todo
// link de ação do Auth caía na página HOSPEDADA do Firebase: layout genérico,
// domínio `leela-hub.firebaseapp.com`, zero marca. Para quem clica no link de
// "defina sua senha" no primeiro acesso, essa é a primeira tela do produto.
//
// -----------------------------------------------------------------------------
// A distinção que importa (e que é fácil errar)
// -----------------------------------------------------------------------------
// `actionCodeSettings.url` NÃO troca a página que recebe o clique. Ele vira o
// `continueUrl` do link — para onde a pessoa segue DEPOIS que o handler do
// Firebase faz o trabalho. Quem troca a página que recebe o clique é o "Action
// URL" do template no Console.
//
// Como agora somos NÓS que enviamos o e-mail (o Firebase só gera o link), dá
// para resolver os dois no código, sem depender de configuração de Console:
//
//   1. `actionCodeSettings.url` aponta para a tela do painel (o `continueUrl`
//      correto mesmo se alguém cair no handler hospedado);
//   2. `reescreverParaOPainel` reescreve o link gerado para a NOSSA tela,
//      levando o `oobCode` junto. A `RedefinirSenhaPage` já lê `?oobCode=` e
//      chama `verifyPasswordResetCode`/`confirmPasswordReset` no cliente — o
//      código funciona vindo de qualquer origem, porque a credencial é o
//      `oobCode`, não a URL que o entregou.
//
// -----------------------------------------------------------------------------
// O DESTINO É DECIDIDO PELA ORIGEM (S1223-T2 · RN-453)
// -----------------------------------------------------------------------------
// A SPEC-ADMINSEP aterrissou e destravou o que este módulo tinha deixado
// parado. A resposta não é uma rota, são DUAS — e quem escolhe é a ORIGEM:
//
//   - `comprador`   → a landing, em `/definir-senha`. Quem acabou de comprar
//                     não tem tenant nem `profissionais/{uid}`; mandá-lo para
//                     a tela do painel o faria definir a senha e ser EXPULSO
//                     no passo seguinte pela guarda de conta órfã do
//                     `destinoPosLogin`. É o oposto da frase do dono: "ela
//                     entra, define a senha e entra no sistema".
//   - `organizador` → o painel, em `/redefinir-senha`, como sempre foi.
//
// Por que NÃO o "Action URL" global do Console: ele é único para o projeto
// inteiro e não distingue comprador de organizador, que precisam aterrissar em
// casas diferentes. O comentário que propunha esse atalho fica superado pela
// RN-453.
//
// DEGRADAÇÃO: sem `LEELA_PUBLIC_URL` configurada, o comprador cai no
// comportamento do organizador em vez de num link torto. Link feio recupera
// conta; link quebrado não.
// =============================================================================

import { basePublica } from '../eventos/basePublica';

/**
 * Quem vai clicar no link. O comprador vem da confirmação da compra; o
 * organizador, do "esqueci minha senha" do painel.
 */
export type OrigemLinkSenha = 'comprador' | 'organizador';

/** Origem default — preserva o comportamento anterior à S1223-T2. */
export const ORIGEM_PADRAO: OrigemLinkSenha = 'organizador';

/** É uma origem que este módulo conhece? @pure */
export function origemDeLinkValida(valor: unknown): valor is OrigemLinkSenha {
  return valor === 'comprador' || valor === 'organizador';
}

/** Canal live do site de Hosting do painel — espelha `PAINEL_URL_PADRAO`. */
export const PAINEL_URL_PADRAO = 'https://leela-hub.web.app';

/** Variável desta camada; `NEXT_PUBLIC_PAINEL_URL` é a MESMA que a landing lê. */
export const ENV_PAINEL = 'LEELA_PAINEL_URL';
export const ENV_PAINEL_LANDING = 'NEXT_PUBLIC_PAINEL_URL';

/** Onde o clique do link de senha aterrissa, no PAINEL. */
export const ROTA_REDEFINIR_SENHA = '/redefinir-senha';

/** Onde o clique do link de senha aterrissa, na LANDING (S1223-T1). */
export const ROTA_DEFINIR_SENHA_LANDING = '/definir-senha';

/**
 * Para onde o ORGANIZADOR segue depois de definir a senha — o comportamento
 * que a `RedefinirSenhaPage` do painel sempre teve.
 *
 * O comprador não usa esta rota: a tela dele autentica e o entrega na conta na
 * mesma ação, sem segundo login (RN-453 item 3).
 */
export const ROTA_APOS_DEFINIR_SENHA = '/entrar';

/**
 * Base do painel, sem barra final. Diferente de `basePublica` (a landing), esta
 * tem DEFAULT: o painel é o destino de uma jornada de conta e não pode
 * desaparecer por variável faltando, do mesmo jeito que a landing faz com o
 * link do ingresso. O default é o canal live do projeto real, o mesmo que a
 * landing já usa. Domínio próprio entra pela env.
 * @pure
 */
export function basePainel(
  env: Record<string, string | undefined> = process.env
): string {
  const bruto = env[ENV_PAINEL] ?? env[ENV_PAINEL_LANDING];
  if (typeof bruto !== 'string') return PAINEL_URL_PADRAO;
  const limpo = bruto.trim().replace(/\/+$/, '');
  if (limpo.length === 0 || limpo.length > 512) return PAINEL_URL_PADRAO;
  // Base torta viraria link torto em massa; o template recusaria depois, longe
  // da causa. Mesma disciplina de `basePublica`.
  if (!/^https:\/\/[^\s<>"'\\]+$/.test(limpo)) return PAINEL_URL_PADRAO;
  return limpo;
}

/**
 * `actionCodeSettings` dos links de senha. `handleCodeInApp: false` porque o
 * fluxo é web: a tela do painel resolve o `oobCode` com o SDK do cliente.
 * @pure
 */
export function actionCodeSettingsSenha(
  origem: OrigemLinkSenha = ORIGEM_PADRAO,
  env: Record<string, string | undefined> = process.env
): { url: string; handleCodeInApp: false } {
  return {
    url: `${baseDaOrigem(origem, env)}${rotaDaOrigem(origem, env)}`,
    handleCodeInApp: false,
  };
}

/**
 * A base de cada origem. O comprador usa a base PÚBLICA (`LEELA_PUBLIC_URL`, a
 * mesma que já serve o link do ingresso nas functions deployadas); o
 * organizador usa a do painel. Sem base pública, o comprador degrada para o
 * painel — que é o comportamento anterior a esta task, e funciona.
 * @pure
 */
export function baseDaOrigem(
  origem: OrigemLinkSenha,
  env: Record<string, string | undefined> = process.env
): string {
  if (origem !== 'comprador') return basePainel(env);
  return basePublica(env) ?? basePainel(env);
}

/**
 * A rota de cada origem, coerente com a base escolhida: se o comprador
 * degradou para o painel, a rota tem de ser a do painel — apontar
 * `/definir-senha` no domínio do painel seria um 404 garantido.
 * @pure
 */
export function rotaDaOrigem(
  origem: OrigemLinkSenha,
  env: Record<string, string | undefined> = process.env
): string {
  if (origem === 'comprador' && basePublica(env) !== null) {
    return ROTA_DEFINIR_SENHA_LANDING;
  }
  return ROTA_APOS_DEFINIR_SENHA;
}

/**
 * Reescreve o link gerado pelo Firebase para a NOSSA tela, preservando os
 * parâmetros que a tela precisa (`mode`, `oobCode`, `lang`, `continueUrl`).
 *
 * Devolve o link ORIGINAL quando não dá para reescrever com segurança (URL que
 * não parseia, ou sem `oobCode`): um link de senha quebrado é pior que um link
 * feio, e o handler hospedado do Firebase pelo menos funciona.
 * @pure
 */
export function reescreverParaTelaDeSenha(
  linkDoFirebase: string,
  origem: OrigemLinkSenha = ORIGEM_PADRAO,
  env: Record<string, string | undefined> = process.env
): string {
  let doFirebase: URL;
  try {
    doFirebase = new URL(linkDoFirebase);
  } catch {
    return linkDoFirebase;
  }
  const oobCode = doFirebase.searchParams.get('oobCode');
  if (oobCode === null || oobCode.length === 0) return linkDoFirebase;

  // Base e rota vêm do MESMO par: o comprador que degradou por falta de
  // `LEELA_PUBLIC_URL` recebe a tela do painel inteira, nunca meia.
  const publica = basePublica(env);
  const alvo =
    origem === 'comprador' && publica !== null
      ? `${publica}${ROTA_DEFINIR_SENHA_LANDING}`
      : `${basePainel(env)}${ROTA_REDEFINIR_SENHA}`;

  const destino = new URL(alvo);
  for (const chave of ['mode', 'oobCode', 'apiKey', 'lang', 'continueUrl']) {
    const valor = doFirebase.searchParams.get(chave);
    if (valor !== null && valor.length > 0) destino.searchParams.set(chave, valor);
  }
  return destino.toString();
}

/**
 * Nome antigo, preservado para os call sites do organizador. É um alias, não
 * uma segunda máquina.
 */
export function reescreverParaOPainel(
  linkDoFirebase: string,
  env: Record<string, string | undefined> = process.env
): string {
  return reescreverParaTelaDeSenha(linkDoFirebase, 'organizador', env);
}
