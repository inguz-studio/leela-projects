// =============================================================================
// packages/core/src/affiliation/linkPromocional.ts
//
// O GERADOR ÚNICO do link compartilhável de afiliado e de assessoria
// (LEELA-S1215-T1 · RN-429 · D-KC-6).
//
// O QUE ESTE MÓDULO MATA. O link que uma assessoria compartilharia hoje é o
// `parceria.linkMaster`, texto livre gravado pelo seed como
// `beh.ro/mfl26?c=frc`. Ele não aplica cupom (nenhum arquivo do repo lê `c`),
// não atribui conversão (`beh.ro` não é a landing) e aponta para o domínio dos
// mocks Be Hero — o mesmo domínio de terceiro que a RN-423 acabou de expulsar
// do e-mail da compra. O link deixa de ser digitado e passa a ser DERIVADO.
//
// A FORMA, uma só:
//
//     {base pública do ambiente}/{slug do evento}?ref={refCodigo}&cupom={CÓDIGO}
//
// Sem cupom vinculado, o link sai só com `ref` e continua rastreando conversão,
// que é exatamente o que ele já faz hoje.
//
// SEM BASE, NÃO SAI LINK — `null`, nunca uma string. É a mesma disciplina da
// RN-423: um link torto distribuído em massa é pior que link nenhum, porque
// gasta a confiança de quem clicou e some com a venda de quem divulgou. E é a
// razão de a base entrar como PARÂMETRO e não ser lida de `process.env` aqui:
// este módulo roda no painel (Vite, `import.meta.env`), na landing (Next) e nas
// Functions (`process.env`), três mundos com três jeitos de guardar a mesma
// variável. Quem sabe ler o ambiente é a borda; o core só recusa o que é torto.
//
// A CHAVE `c` ENTRA E NÃO SAI. `c` continua aceita na ENTRADA como apelido de
// `cupom` (`cupomDaEntrada`) e nunca é produzida na saída. Postel com um motivo
// específico e caro: link de afiliado vive impresso em bio de rede social e em
// material já distribuído, e desligar a chave em silêncio custa a venda de quem
// já divulgou. Custa três linhas manter.
//
// O que este módulo NÃO faz, e não pode passar a fazer: decidir se o cupom
// existe, se está vigente, se o gate da RN-315 abriu ou quanto ele desconta.
// Tudo isso é do servidor, na cotação e de novo na criação da cobrança
// (RN-430/433). Aqui é só a montagem da URL.
// =============================================================================

import { isRefCodigoValido, normalizarRefCodigo } from './afiliado';
import { isCodigoCupomValido, normalizarCodigoCupom } from '../eventos/cupom';

/** A chave canônica do cupom na URL — a ÚNICA que o gerador produz. */
export const CHAVE_CUPOM_URL = 'cupom';

/**
 * Apelido histórico do cupom, aceito na ENTRADA e nunca gerado (RN-429).
 * `ATRIBUICAO_KEYS` da landing já preserva os dois na travessia até o checkout.
 */
export const CHAVE_CUPOM_URL_APELIDO = 'c';

/**
 * Base pública normalizada (sem barra final), ou `null` quando não há base
 * utilizável.
 *
 * ESPELHO consciente de `functions/src/eventos/basePublica.ts` (RN-423). O core
 * não pode importar das Functions e o painel não roda Node, então a guarda vive
 * nos dois lugares — o que NÃO pode divergir é o critério: só `http(s)://`, sem
 * espaço nem caractere que quebre atributo/URL, com teto de tamanho. Uma base
 * torta produz link torto em massa. @pure
 */
export function normalizarBasePublica(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null;
  const limpo = bruto.trim().replace(/\/+$/, '');
  if (limpo.length === 0 || limpo.length > 512) return null;
  if (!/^https?:\/\/[^\s<>"'\\]+$/.test(limpo)) return null;
  return limpo;
}

/** Insumos do link compartilhável (RN-429). */
export interface LinkPromocionalInput {
  /** Base pública do ambiente (RN-423). Ausente/torta ⇒ o link não sai. */
  baseUrl: unknown;
  /** Slug do evento na landing (a rota é a raiz: `{base}/{slug}`). */
  eventoSlug: string;
  /** `refCodigo` do afiliado — já é o docId. */
  refCodigo: string;
  /** `cupomCodigo` vinculado, quando existe. */
  cupomCodigo?: string | null;
}

/**
 * O link compartilhável, ou `null` quando não é possível montar um link
 * HONESTO (sem base, sem slug ou com `refCodigo` fora do padrão).
 *
 * Nenhum domínio de terceiro pode sair daqui: a única fonte do host é a
 * `baseUrl` recebida, e ela passa por `normalizarBasePublica`. Base ausente
 * devolve `null` em vez de `undefined/meia-floripa?...`, que é a forma que um
 * template descuidado produziria. @pure
 */
export function montarLinkPromocional(input: LinkPromocionalInput): string | null {
  const base = normalizarBasePublica(input.baseUrl);
  if (base === null) return null;

  const slug = input.eventoSlug.trim();
  if (slug.length === 0) return null;

  const ref = normalizarRefCodigo(input.refCodigo);
  if (!isRefCodigoValido(ref)) return null;

  const params = [`ref=${encodeURIComponent(ref)}`];

  // O cupom entra só quando é um código de verdade. Vínculo ausente, `null` ou
  // string podre ⇒ o link sai só com `ref` e segue rastreando a conversão, que
  // é o comportamento de hoje — nunca `&cupom=` vazio, que promete desconto e
  // não entrega.
  if (typeof input.cupomCodigo === 'string') {
    const cupom = normalizarCodigoCupom(input.cupomCodigo);
    if (isCodigoCupomValido(cupom)) {
      params.push(`${CHAVE_CUPOM_URL}=${encodeURIComponent(cupom)}`);
    }
  }

  return `${base}/${encodeURIComponent(slug)}?${params.join('&')}`;
}

/**
 * O cupom declarado na URL, normalizado; `null` quando não há um utilizável.
 *
 * `cupom` tem precedência sobre o apelido `c`: quando os dois vêm, o canônico
 * ganha, porque é o que o gerador produz e o que um link recém-compartilhado
 * carrega. Valor podre em qualquer uma das chaves devolve `null` em vez de
 * viajar até o servidor para ser recusado lá.
 *
 * O valor é CLAIM do cliente e nunca é fonte de verdade: existência, vigência,
 * gate do afiliado e valor do desconto são decididos no servidor (RN-430).
 * @pure
 */
export function cupomDaEntrada(
  ler: (chave: string) => string | null | undefined
): string | null {
  for (const chave of [CHAVE_CUPOM_URL, CHAVE_CUPOM_URL_APELIDO]) {
    const bruto = ler(chave);
    if (typeof bruto !== 'string' || bruto.trim().length === 0) continue;
    const codigo = normalizarCodigoCupom(bruto);
    if (isCodigoCupomValido(codigo)) return codigo;
  }
  return null;
}
