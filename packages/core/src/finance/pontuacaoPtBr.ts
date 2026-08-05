// =============================================================================
// packages/core/src/finance/pontuacaoPtBr.ts
//
// Leitura da PONTUAÇÃO de um número digitado em pt-BR: separa o texto do campo
// em sinal + dígitos inteiros + dígitos decimais, sem decidir o que o número
// significa. Módulo interno — quem o consome é `parseValorPtBr` (dinheiro) e
// `parseContagemPtBr` (contagem).
//
// ── por que este módulo existe (FIX-PARSE-MILHAR)
//
// A regra do ponto e da vírgula é a MESMA para dinheiro e para contagem, e é uma
// decisão de produto (ver abaixo). Escrita duas vezes, ela se separa: preço de
// lote leria "1.000" como mil e limite de vagas leria como um, e a divergência
// só apareceria na fatura ou na porta do evento. O repositório já tem a prova de
// que isso acontece — o teto de usos de cupom está implementado duas vezes
// (`cupomForm.ts` e `assessoriaForm.ts`) e as duas versões discordam sobre o que
// é seguro. Uma regra, um lugar.
//
// O que fica de fora daqui de propósito: magnitude e arredondamento. Dinheiro
// aceita doze dígitos inteiros e faz half-up sobre a terceira casa; contagem
// aceita nove e não tem casa decimal nenhuma. São políticas de cada domínio, não
// de pontuação.
//
// ── a regra de ponto vs vírgula (decisão do dono · 2026-08-05)
//
// A vírgula, quando existe, é o decimal: é assim que se escreve em pt-BR e é o
// que `toFixed(2).replace('.', ',')` produz nas telas. O ponto é o separador de
// milhar nesse caso, e precisa estar agrupado de três em três.
//
// Sem vírgula, o ponto sozinho decide pelo tamanho do grupo que vem depois dele:
//
//     grupo final ≠ 3 dígitos   →  DECIMAL   ("1234.56", "1.23", "1234.5")
//     grupo final = 3 dígitos   →  MILHAR    ("1.234", "1.000", "12.345")
//
// O milhar é a decisão do dono: é o que quase todo brasileiro quer dizer ao
// digitar assim. `temDecimal` existe para que quem lê CONTAGEM possa recusar a
// entrada decimal em vez de arredondar calado — é a diferença entre "1.000"
// (mil, sem decimal) e "1,000" (um, com decimal), que num campo de vagas separa
// mil lugares de um.
// =============================================================================

/** Por que a pontuação foi recusada. Cada domínio traduz para o seu vocabulário. */
export type MotivoPontuacao =
  /** Campo em branco (só espaços conta como branco). */
  | 'vazio'
  /** Caracteres fora de dígitos/separadores, sinal repetido, notação exponencial. */
  | 'formato'
  /** Pontuação de milhar malformada (ex.: "1.23,45", "1,234.56"). */
  | 'agrupamento';

/** Dígitos de um número digitado, já separados e sem pontuação. */
export interface DigitosPtBr {
  ok: true;
  /** Havia sinal de menos à esquerda. Quem recusa negativo é cada domínio. */
  negativo: boolean;
  /** Dígitos da parte inteira, sem os pontos de milhar. Pode ser `''` (",56"). */
  inteiro: string;
  /** Dígitos depois do separador decimal. `''` quando não há parte decimal. */
  fracao: string;
  /**
   * Havia separador DECIMAL na entrada, ainda que sem dígitos depois dele.
   *
   * Separa "1.000" (milhar, `false`) de "1,000" (decimal, `true`) — os dois dão
   * `fracao` diferente, mas é este campo que deixa a contagem recusar o segundo
   * pelo que ele é, e não pelo valor que sobrou.
   */
  temDecimal: boolean;
}

export type LeituraPontuacao = DigitosPtBr | { ok: false; motivo: MotivoPontuacao };

/** Um grupo de milhar é sempre três dígitos. */
const GRUPO = /^\d{3}$/;

/**
 * O agrupamento de milhar está bem formado?
 *
 * Primeiro grupo de 1 a 3 dígitos, os demais de exatamente 3, e nenhum zero à
 * esquerda quando há mais de um grupo — "0.500" não é meio milhar, é alguém
 * escrevendo meio real com ponto decimal.
 */
function agrupamentoValido(partes: readonly string[]): boolean {
  if (partes.length < 2) return false;
  const primeiro = partes[0] ?? '';
  if (!/^[1-9]\d{0,2}$/.test(primeiro)) return false;
  return partes.slice(1).every((g) => GRUPO.test(g));
}

/** Atalho de construção do resultado bem-sucedido. @pure */
function digitos(
  negativo: boolean,
  inteiro: string,
  fracao: string,
  temDecimal: boolean
): DigitosPtBr {
  return { ok: true, negativo, inteiro, fracao, temDecimal };
}

/**
 * Separa a pontuação de um número digitado em pt-BR. @pure
 *
 * Aceita: "1234", "1234,56", "1.234,56", "1.234.567,89", "1234.56", "1.234"
 * (milhar), "R$ 99,90", espaços em volta e entre os grupos (inclusive o NBSP do
 * `Intl`), sinal à esquerda e separador decimal pendurado no fim ("1234,").
 *
 * Recusa: vazio, letra (o que mata "1e3" — mil por exponencial nunca acontece),
 * vírgula repetida, "1,234.56" no estilo en-US e agrupamento torto.
 *
 * NÃO recusa: parte inteira vazia (",56") nem entrada sem dígito nenhum (",").
 * Quem sabe se isso é número é o domínio, que também sabe o que fazer com a
 * parte decimal.
 */
export function separarPtBr(entrada: string): LeituraPontuacao {
  if (typeof entrada !== 'string') return { ok: false, motivo: 'formato' };

  // Espaço em qualquer forma sai fora, inclusive o NBSP que o `Intl` põe depois
  // do "R$" e o espaço fino que alguns teclados usam como milhar.
  let s = entrada.replace(/[\s  ]/g, '');
  if (s === '') return { ok: false, motivo: 'vazio' };

  // Símbolo da moeda colado ou não, em qualquer caixa.
  s = s.replace(/^r\$/i, '');
  if (s === '') return { ok: false, motivo: 'vazio' };

  let negativo = false;
  if (s.startsWith('-')) {
    negativo = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (s === '') return { ok: false, motivo: 'formato' };

  // Daqui para baixo só pode existir dígito, ponto e vírgula. Letra, segundo
  // sinal, "%" ou "e" caem aqui — e é por isso que "1e3" nunca vira mil.
  if (!/^[\d.,]+$/.test(s)) return { ok: false, motivo: 'formato' };

  const virgulas = (s.match(/,/g) ?? []).length;
  const pontos = (s.match(/\./g) ?? []).length;

  // --- com vírgula: ela é o decimal, o ponto é milhar ---------------------
  if (virgulas > 0) {
    if (virgulas > 1) return { ok: false, motivo: 'formato' };
    const [inteiro = '', fracao = ''] = s.split(',');
    if (fracao.includes('.')) return { ok: false, motivo: 'agrupamento' };

    if (pontos === 0) return digitos(negativo, inteiro, fracao, true);

    const partes = inteiro.split('.');
    if (!agrupamentoValido(partes)) return { ok: false, motivo: 'agrupamento' };
    return digitos(negativo, partes.join(''), fracao, true);
  }

  // --- sem vírgula e sem ponto: inteiro puro ------------------------------
  if (pontos === 0) return digitos(negativo, s, '', false);

  const partes = s.split('.');
  const ultimo = partes[partes.length - 1] ?? '';

  // --- sem vírgula, dois ou mais pontos: só pode ser milhar ---------------
  if (pontos > 1) {
    if (!agrupamentoValido(partes)) return { ok: false, motivo: 'agrupamento' };
    return digitos(negativo, partes.join(''), '', false);
  }

  // --- sem vírgula, um ponto: o tamanho do grupo final decide -------------
  //
  // Três dígitos com agrupamento válido é MILHAR por decisão do dono ("1.234" é
  // mil duzentos e trinta e quatro), porque é o que o hábito pt-BR quer dizer.
  // Qualquer outro tamanho de grupo só pode ser decimal ("1234.56", "1.23").
  if (ultimo.length === 3 && agrupamentoValido(partes)) {
    return digitos(negativo, partes.join(''), '', false);
  }
  return digitos(negativo, partes[0] ?? '', ultimo, true);
}
