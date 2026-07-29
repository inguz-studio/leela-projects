// =============================================================================
// apps/landing/lib/sentryScrub.ts
//
// Remove o TOKEN da página do ingresso de tudo que sai para o Sentry
// (review INGPAGE-REV, achado 2 · RN-419/RN-422).
//
// O PROBLEMA, escrito por inteiro porque ele é fácil de não ver. A S1214 pôs
// uma CREDENCIAL PORTADORA dentro do path de uma URL: quem tem
// `/ingresso/{token}` tem o ingresso. A RN-419 escolheu esse desenho de olhos
// abertos e listou os vazamentos que ele precisa fechar — histórico do
// navegador, `Referer`, log de proxy, CDN — e a lane fechou todos os quatro
// (`Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `noindex`).
//
// Ficou de fora o vazamento que não parece um log: o SDK de observabilidade que
// já está montado nesta aplicação. `sentry.{client,server,edge}.config.ts`
// rodam com `tracesSampleRate: 1.0`, o que significa UMA transação por
// pageview, e toda transação carrega `request.url`. Com um DSN configurado —
// que é um passo de operação trivial, e o repositório inteiro já está cabeado
// para ele — cada abertura de ingresso passa a mandar o token para um terceiro.
//
// E o token NÃO EXPIRA (D-ING-5): quem o ler depois abre o ingresso meses
// depois. Só a re-emissão o revoga. Ou seja, o alcance do vazamento não é a
// sessão: é a vida do ingresso.
//
// O QUE ESTE MÓDULO FAZ. Varre o evento inteiro, recursivamente, e redige duas
// formas: o token no formato `LLIP1.<kid>.<payload>.<assinatura>` onde quer que
// ele apareça (transaction name, `request.url`, breadcrumb, tag, contexto,
// extra, mensagem, stack) e qualquer path `/ingresso/<algo>`. Varrer tudo em
// vez de listar os campos que lembramos é deliberado: o formato do evento do
// SDK muda entre versões, e uma lista de campos envelhece em silêncio — que é
// exatamente como este vazamento nasceu.
//
// LIMITE DECLARADO (não é fechado por aqui): o Session Replay do cliente
// (`replayIntegration`) envia URLs de navegação por um canal PRÓPRIO, que não
// passa por `beforeSend`. Enquanto o replay estiver ligado nesta rota, o token
// continua saindo por ele. Está registrado como ressalva da review.
// =============================================================================

/**
 * O token do link, no formato da `VERSAO_LINK_INGRESSO` (`LLIP1`) — quatro
 * partes separadas por ponto, alfabeto base64url. Casar o formato (e não só a
 * rota) pega o token onde ele aparece FORA de uma URL: numa mensagem de erro,
 * num parâmetro de rota registrado como tag, num corpo de request.
 */
const TOKEN_LINK_INGRESSO =
  /LLIP1\.[A-Za-z0-9_-]{1,32}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

/**
 * Qualquer path da rota do ingresso, com o que vier depois. Rede de segurança
 * para o dia em que a constante de versão do token mudar: a rota continua a
 * mesma e o segmento seguinte continua sendo credencial.
 */
const PATH_INGRESSO = /(\/ingresso\/)[^/?#\s"'<>]+/g;

const REDIGIDO_TOKEN = 'LLIP1.[redigido]';
const REDIGIDO_PATH = '$1[token]';

/** Redige as duas formas numa string. @pure */
export function redigirTokenIngresso(valor: string): string {
  return valor
    .replace(TOKEN_LINK_INGRESSO, REDIGIDO_TOKEN)
    .replace(PATH_INGRESSO, REDIGIDO_PATH);
}

/** Profundidade máxima da varredura — evento de SDK é raso; o teto é anti-ciclo. */
const PROFUNDIDADE_MAX = 12;

/**
 * Varre um valor qualquer e devolve a versão redigida. Preserva a forma
 * (objeto/array/primitivo); só strings mudam. @pure
 */
export function redigirProfundo<T>(valor: T, profundidade = 0): T {
  if (profundidade > PROFUNDIDADE_MAX) return valor;
  if (typeof valor === 'string') {
    return redigirTokenIngresso(valor) as unknown as T;
  }
  if (Array.isArray(valor)) {
    return valor.map((v) => redigirProfundo(v, profundidade + 1)) as unknown as T;
  }
  if (valor !== null && typeof valor === 'object') {
    const entrada = valor as Record<string, unknown>;
    const saida: Record<string, unknown> = {};
    for (const chave of Object.keys(entrada)) {
      saida[chave] = redigirProfundo(entrada[chave], profundidade + 1);
    }
    return saida as unknown as T;
  }
  return valor;
}

/**
 * `beforeSend` / `beforeSendTransaction` do Sentry. Assinatura larga de
 * propósito: os três configs (client, server, edge) usam o MESMO scrubber, e
 * tipar contra o SDK aqui obrigaria a importar o pacote inteiro num módulo que
 * precisa continuar puro para ser testado sem rede.
 */
export function scrubSentryEvent<T>(evento: T): T {
  return redigirProfundo(evento);
}
