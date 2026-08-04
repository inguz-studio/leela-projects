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
// O que está DECIDIDO e o que está PARADO esperando spec
// -----------------------------------------------------------------------------
// DECIDIDO: o clique cai em `/redefinir-senha` no painel.
// PARADO: para onde a pessoa vai DEPOIS de definir a senha. A lane
// SPEC-ADMINSEP está especificando a jornada de primeiro acesso e onde o
// cliente novo aterrissa. Até ela aterrissar, `ROTA_APOS_DEFINIR_SENHA` fica
// em `/entrar` (o comportamento de hoje da `RedefinirSenhaPage`) e é a ÚNICA
// linha a mexer quando a spec chegar. Não inventamos a jornada aqui.
// =============================================================================

/** Canal live do site de Hosting do painel — espelha `PAINEL_URL_PADRAO`. */
export const PAINEL_URL_PADRAO = 'https://leela-hub.web.app';

/** Variável desta camada; `NEXT_PUBLIC_PAINEL_URL` é a MESMA que a landing lê. */
export const ENV_PAINEL = 'LEELA_PAINEL_URL';
export const ENV_PAINEL_LANDING = 'NEXT_PUBLIC_PAINEL_URL';

/** Onde o clique do link de senha aterrissa. */
export const ROTA_REDEFINIR_SENHA = '/redefinir-senha';

/**
 * Para onde a pessoa segue DEPOIS de definir a senha.
 *
 * ⚠️ PONTO ÚNICO DE DECISÃO, esperando a lane SPEC-ADMINSEP. Trocar este valor
 * (e só ele) move o destino de primeiro acesso do produto inteiro.
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
  env: Record<string, string | undefined> = process.env
): { url: string; handleCodeInApp: false } {
  return {
    url: `${basePainel(env)}${ROTA_APOS_DEFINIR_SENHA}`,
    handleCodeInApp: false,
  };
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
export function reescreverParaOPainel(
  linkDoFirebase: string,
  env: Record<string, string | undefined> = process.env
): string {
  let origem: URL;
  try {
    origem = new URL(linkDoFirebase);
  } catch {
    return linkDoFirebase;
  }
  const oobCode = origem.searchParams.get('oobCode');
  if (oobCode === null || oobCode.length === 0) return linkDoFirebase;

  const destino = new URL(`${basePainel(env)}${ROTA_REDEFINIR_SENHA}`);
  for (const chave of ['mode', 'oobCode', 'apiKey', 'lang', 'continueUrl']) {
    const valor = origem.searchParams.get(chave);
    if (valor !== null && valor.length > 0) destino.searchParams.set(chave, valor);
  }
  return destino.toString();
}
