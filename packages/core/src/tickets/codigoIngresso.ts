// =============================================================================
// packages/core/src/tickets/codigoIngresso.ts
//
// Código identificador do ingresso (LEELA-S1206-T5 · RN-396) — parte PURA.
//
// O que ele é: o número que a pessoa DITA no balcão às seis da manhã e que o
// operador DIGITA na busca da lista. Por isso o alfabeto exclui `0`, `O`,
// `1`, `I` e `L` — os cinco pares que a voz e o olho confundem.
//
// O que ele NÃO é: credencial. A prova de presença continua sendo a
// verificação de assinatura do `qrToken` (RN-218/221/222 — ver
// `eventos/qrToken.ts`). Nenhuma superfície aceita este código como entrada
// de check-in, e este módulo não expõe nenhuma função que sugira o contrário.
//
// Fonte única (RN-157): alfabeto e tamanho vivem AQUI e a regex é derivada
// deles. Existem outros dois códigos ditáveis no domínio — convite de clube
// (RN-101, 5 chars) e ref de afiliado (8 chars) — com a MESMA propriedade de
// legibilidade e ciclos de vida independentes. A propriedade compartilhada
// ("nenhum caractere ambíguo sai daqui") é garantida por TESTE sobre o
// conjunto ambíguo, não por uma constante compartilhada: acoplar o código do
// ingresso ao alfabeto do convite faria uma mudança em Clubes reemitir
// ingresso, que é exatamente o efeito que não pode existir.
//
// UNICIDADE é POR EVENTO e NÃO é garantida por este módulo: sorteio não é
// unicidade. Quem garante é a emissão no servidor, com chave primária
// (`functions/src/eventos/emitirIngressos.ts`).
// =============================================================================

import { sorteioUniforme } from '../aleatorio';

/**
 * Alfabeto do código do ingresso (RN-396): A–Z sem `O`, `I` e `L`; dígitos
 * 2–9 (sem `0` e `1`). 23 letras + 8 dígitos = 31 símbolos.
 */
export const ALFABETO_CODIGO_INGRESSO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Comprimento fixo do código (RN-396). Seis símbolos de 31 dão 887.503.681
 * combinações — folga de sobra para o maior evento imaginável, e ainda curto
 * o bastante para ser ditado numa frase só.
 */
export const TAMANHO_CODIGO_INGRESSO = 6;

/** Caracteres que o alfabeto exclui de propósito (RN-396) — usado em teste. */
export const CARACTERES_AMBIGUOS_INGRESSO = '0O1IL';

// Regex DERIVADA das constantes acima — nunca reescrever o alfabeto à mão.
const CODIGO_INGRESSO_RE = new RegExp(
  `^[${ALFABETO_CODIGO_INGRESSO}]{${TAMANHO_CODIGO_INGRESSO}}$`
);

/**
 * O valor é um código de ingresso canônico? (RN-396)
 *
 * Canônico = exatamente 6 símbolos MAIÚSCULOS do alfabeto. Minúscula é
 * inválida: o código canônico é o que está gravado no doc e o que a busca
 * compara — normalizar é trabalho de `normalizarCodigoIngresso`, não deste
 * predicado.
 * @pure
 */
export function isCodigoIngressoValido(valor: unknown): valor is string {
  return typeof valor === 'string' && CODIGO_INGRESSO_RE.test(valor);
}

/**
 * Normaliza o que a pessoa digitou na busca: maiúsculas, sem espaços, sem
 * hífen. Serve à BUSCA (RN-397) — não valida e não conserta caractere
 * ambíguo (trocar `O` por `0` por conta própria seria adivinhar ingresso
 * alheio). Devolve o texto normalizado, válido ou não.
 * @pure
 */
export function normalizarCodigoIngresso(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[\s-]+/g, '').toUpperCase();
}

/**
 * Fonte default do sorteio: entropia do sistema (Web Crypto), uniforme sobre
 * os 31 símbolos — ver `aleatorio.ts` para o porquê de não ser `Math.random`.
 * O tamanho vem do alfabeto, nunca escrito à mão.
 */
const SORTEIO_PADRAO = sorteioUniforme(ALFABETO_CODIGO_INGRESSO.length);

/**
 * Sorteia um código do alfabeto (RN-396).
 *
 * @param random fonte em [0, 1); default = entropia do sistema (Web Crypto,
 *   uniforme sobre o alfabeto). Injetável para teste determinístico e para o
 *   servidor forçar colisão em prova — a injeção é o que os testes usam para
 *   pregar o sorteio, e ela continua intacta.
 *
 * ⚠️ Sorteio NÃO é unicidade. O chamador tem de reservar o código contra uma
 * chave primária por evento antes de gravá-lo (ver cabeçalho).
 */
export function gerarCodigoIngresso(
  random: () => number = SORTEIO_PADRAO
): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO_INGRESSO; i++) {
    // Clamp defensivo: um RNG que devolva 1 (ou -0.1) indexaria fora do
    // alfabeto e produziria a string "undefined" dentro do código. `NaN`
    // atravessa Math.min/Math.max intacto (toda comparação com NaN é falsa),
    // então ele é barrado ANTES — não é paranoia gratuita: foi o que o teste
    // de RNG hostil pegou.
    const bruto = random();
    const r = Number.isFinite(bruto)
      ? Math.min(Math.max(bruto, 0), 1 - Number.EPSILON)
      : 0;
    codigo += ALFABETO_CODIGO_INGRESSO[
      Math.floor(r * ALFABETO_CODIGO_INGRESSO.length)
    ];
  }
  return codigo;
}
