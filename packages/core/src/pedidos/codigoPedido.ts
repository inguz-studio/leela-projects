// =============================================================================
// packages/core/src/pedidos/codigoPedido.ts
//
// Código identificador da COMPRA (LEELA-S1228-T1 · RN-474/RN-475) — parte PURA.
//
// O que ele é: o identificador que a pessoa lê na tela depois de pagar, recebe
// no e-mail, DITA no telefone e o operador DIGITA na busca. Cinco símbolos do
// alfabeto anti-ambíguo da casa, mais um prefixo de apresentação.
//
// O que ele NÃO é:
//   - NÃO é credencial. Nenhuma porta o aceita como chave de leitura, de
//     acesso ou de ação; a autorização do pedido continua sendo por CAMPO
//     (RN-469, `firestore.rules`). Com 28,6 milhões de combinações, qualquer
//     porta que o aceitasse como chave seria adivinhada em minutos — e este
//     módulo não expõe nada que sugira o contrário.
//   - NÃO substitui o id do documento. O id `ped-{uid}-{chave}` continua
//     endereçando o pedido, continua sendo a idempotência do checkout e
//     continua viajando ao gateway em `externalReference`. O código ACOMPANHA.
//
// POR QUE O ALFABETO DA CASA E NÃO CROCKFORD (decisão COD-1 da spec): o Leela
// já tem um alfabeto anti-ambíguo escrito e testado em quatro códigos, e ele
// derruba OS DOIS LADOS de cada par confundível (`0`/`O`, `1`/`I`/`L`).
// Crockford MANTÉM `0` e `1`. Sob a regra da casa o operador aprende uma frase
// só — "aqui nunca tem zero, um, i, o nem ele" — e ela vale para o código do
// ingresso e para o da compra, que saem lado a lado no mesmo e-mail. O que
// Crockford teria de melhor é o ALIAS de decodificação (`O`→`0`), e ele é
// recusado pela mesma razão que `normalizarCodigoIngresso` o recusa: consertar
// caractere ambíguo por conta própria é adivinhar — e aqui o palpite errado
// devolve A COMPRA DE OUTRA PESSOA.
//
// FONTE PRÓPRIA, NÃO CONSTANTE COMPARTILHADA (doutrina escrita em
// `tickets/codigoIngresso.ts:15-22`): o alfabeto está duplicado de propósito.
// A propriedade comum ("nenhum caractere ambíguo sai daqui") é garantida por
// TESTE sobre o conjunto ambíguo, não por acoplamento — ingresso e compra têm
// ciclos de vida independentes, e uma mudança num não pode reemitir o outro.
//
// UNICIDADE é GLOBAL e NÃO é garantida por este módulo: sorteio não é
// unicidade. Quem garante é a criação do pedido no servidor, contra a chave
// primária `pedidoCodigos/{codigo}` (`functions/src/checkout/
// codigoPedidoReserva.ts`), dentro da mesma transação que cria o pedido.
// =============================================================================

/**
 * Alfabeto do código da compra (RN-474): A–Z sem `O`, `I` e `L`; dígitos 2–9
 * (sem `0` e `1`). 23 letras + 8 dígitos = 31 símbolos — o MESMO conjunto do
 * código do ingresso, por decisão, e declarado aqui por doutrina.
 */
export const ALFABETO_CODIGO_PEDIDO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Comprimento fixo do código (RN-474 — cinco símbolos, como o dono pediu).
 * 31⁵ = 28.629.151 combinações. A colisão de sorteio é real e é por isso que
 * a unicidade vem de reserva por chave primária, nunca do tamanho do espaço:
 * em dez mil compras, um re-sorteio a cada 2.900; em um milhão, um a cada 29.
 */
export const TAMANHO_CODIGO_PEDIDO = 5;

/** Caracteres que o alfabeto exclui de propósito (RN-474) — usado em teste. */
export const CARACTERES_AMBIGUOS_PEDIDO = '0O1IL';

/**
 * Prefixo de APRESENTAÇÃO do código (RN-474 · item CODPED-1 do painel).
 *
 * Ele NÃO é gravado: o doc do pedido carrega os cinco símbolos limpos e o
 * prefixo entra na hora de exibir. É essa separação que torna o veto do dono
 * barato — trocar `PED-` por outra coisa é a troca desta constante mais um
 * redeploy, em vez de uma migração de dados MAIS o rechaveamento da coleção
 * de reservas. `PED-` é o default e vale enquanto o dono não responder.
 */
export const PREFIXO_CODIGO_PEDIDO = 'PED-';

// Regex DERIVADA das constantes acima — nunca reescrever o alfabeto à mão.
const CODIGO_PEDIDO_RE = new RegExp(
  `^[${ALFABETO_CODIGO_PEDIDO}]{${TAMANHO_CODIGO_PEDIDO}}$`
);

/** O prefixo como ele sobrevive à normalização (`PED-` → `PED`). */
const RAIZ_PREFIXO = PREFIXO_CODIGO_PEDIDO.replace(/[\s-]+/g, '').toUpperCase();

/**
 * O valor é um código de compra canônico? (RN-474)
 *
 * Canônico = exatamente 5 símbolos MAIÚSCULOS do alfabeto, SEM prefixo — é o
 * que está gravado no doc, o que a reserva chaveia e o que a busca compara.
 * Normalizar o que a pessoa digitou é trabalho de {@link normalizarCodigoPedido},
 * não deste predicado.
 * @pure
 */
export function isCodigoPedidoValido(valor: unknown): valor is string {
  return typeof valor === 'string' && CODIGO_PEDIDO_RE.test(valor);
}

/**
 * Normaliza o que a pessoa digitou na busca: maiúsculas, sem espaços, sem
 * hífen — e sem o prefixo, porque quem dita lê `PED-A2B3C` e digita o que leu.
 *
 * NÃO valida e NÃO conserta caractere ambíguo: trocar `O` por `0` por conta
 * própria seria adivinhar a compra de outra pessoa (a mesma recusa de
 * `normalizarCodigoIngresso`, e aqui com mais força — o alvo é a compra
 * inteira). Devolve o texto normalizado, válido ou não.
 *
 * O prefixo só cai quando o que sobra tem EXATAMENTE o tamanho do código:
 * `PEDXY` é um código legítimo (P, E e D estão no alfabeto) e fica intacto.
 * @pure
 */
export function normalizarCodigoPedido(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  const limpo = valor.replace(/[\s-]+/g, '').toUpperCase();
  if (
    limpo.length === RAIZ_PREFIXO.length + TAMANHO_CODIGO_PEDIDO &&
    limpo.startsWith(RAIZ_PREFIXO)
  ) {
    return limpo.slice(RAIZ_PREFIXO.length);
  }
  return limpo;
}

/**
 * O código COM o prefixo, para exibir (RN-475).
 *
 * AUSÊNCIA É AUSÊNCIA: pedido sem código — ou com código fora do formato —
 * devolve string vazia, nunca o id interno. Exibir o id é justamente o que a
 * RN-475 existe para impedir (ele é `ped-{uid}-{chave}` e publica o uid da
 * conta do comprador numa tela que a pessoa fotografa). A superfície que
 * receber `''` não escreve nada, ou escreve um travessão.
 * @pure
 */
export function formatarCodigoPedido(valor: unknown): string {
  return isCodigoPedidoValido(valor) ? `${PREFIXO_CODIGO_PEDIDO}${valor}` : '';
}

/**
 * Sorteia um código do alfabeto (RN-474).
 *
 * @param random fonte em [0, 1); default `Math.random`. Injetável para teste
 *   determinístico e para o servidor forçar colisão em prova.
 *
 * ⚠️ Sorteio NÃO é unicidade. O chamador tem de reservar o código contra a
 * chave primária `pedidoCodigos/{codigo}` DENTRO da transação que cria o
 * pedido, antes de gravá-lo (ver cabeçalho).
 */
export function gerarCodigoPedido(
  random: () => number = Math.random
): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO_PEDIDO; i++) {
    // Clamp defensivo, herdado do gerador do ingresso: um RNG que devolva 1
    // (ou -0.1) indexaria fora do alfabeto e produziria a string "undefined"
    // dentro do código. `NaN` atravessa Math.min/Math.max intacto (toda
    // comparação com NaN é falsa), então ele é barrado ANTES.
    const bruto = random();
    const r = Number.isFinite(bruto)
      ? Math.min(Math.max(bruto, 0), 1 - Number.EPSILON)
      : 0;
    codigo += ALFABETO_CODIGO_PEDIDO[
      Math.floor(r * ALFABETO_CODIGO_PEDIDO.length)
    ];
  }
  return codigo;
}
