// =============================================================================
// packages/core/src/finance/parseValorPtBr.ts
//
// Leitura de valor digitado em pt-BR (texto de campo → número). Fonte ÚNICA do
// painel para preço de lote, preço de kit, valor de cupom, comissão de
// afiliado, valor de repasse e condição de desconto de parceria.
//
// ── por que este módulo existe (FIX-PARSE-DINHEIRO · achado REV-LOTES/SEAL-LOTES)
//
// Oito telas liam dinheiro com `Number(texto.replace(',', '.'))`. Com separador
// de milhar essa troca não converte: ela CORTA.
//
//     "1.234,56"  →  "1.234.56"  →  Number → 1.234  →  R$ 1,23
//
// O organizador digitava mil duzentos e trinta e quatro reais e o sistema
// gravava um real e vinte e três centavos, sem erro e sem aviso, porque
// `Number("1.234.56")` é NaN mas `parseFloat("1.234.56")` para no segundo ponto
// e devolve 1.234 — um número perfeitamente finito, que passa por qualquer
// `Number.isFinite`. O defeito não tinha sintoma até a fatura.
//
// ── a regra de ponto vs vírgula
//
// A vírgula, quando existe, é o decimal: é assim que se escreve dinheiro em
// pt-BR e é o que `toFixed(2).replace('.', ',')` produz nas telas. O ponto é o
// separador de milhar nesse caso, e precisa estar agrupado de três em três para
// ser aceito.
//
// Sem vírgula, o ponto sozinho decide pelo tamanho do grupo que vem depois
// dele. Um grupo com número de dígitos DIFERENTE de três só pode ser decimal
// ("1234.56", que é o teclado numérico e o `String(kit.preco)` do editor). Um
// grupo com exatamente três dígitos e agrupamento válido ("1.234") é MILHAR:
// R$ 1.234,00.
//
// ── por que milhar, e o que essa escolha custa (decisão do dono · 2026-08-05)
//
// "1.234" tem duas leituras legítimas — mil duzentos e trinta e quatro, e um
// real e vinte e três — e elas diferem por mil vezes. A primeira versão deste
// módulo RECUSAVA a entrada e devolvia a decisão para quem digitou. O dono
// desfez isso: o hábito pt-BR é o milhar, e é isso que quase todo brasileiro
// quer dizer ao digitar assim num campo de preço. Recusar cobra um passo a
// mais de quem digitou do jeito certo, para proteger quem digitou do jeito
// menos comum.
//
// O custo é declarado, não descoberto. Quem usa ponto como decimal por hábito
// de teclado numérico e escreve TRÊS casas grava mil vezes mais do que quis:
//
//     "1.23"   →  R$ 1,23      (grupo final de dois: decimal, continua atendido)
//     "1.234"  →  R$ 1.234,00  (grupo final de três: milhar, era R$ 1,23 na
//                               intenção de quem digitou com teclado numérico)
//
// A mitigação combinada é o TEXTO DE AJUDA do campo, que diz qual leitura o
// sistema faz — não uma recusa. Quem quiser um real e vinte e três em três
// casas escreve "1,234" com vírgula, e o parser lê o decimal exato.
//
// ── por que centavos inteiros saem daqui, e não de `roundMoney`
//
// `roundMoney` (finance/calc.ts) arredonda um `number` que JÁ perdeu a
// identidade decimal, e compensa com EPSILON o que o binário estragou. No
// boundary do texto essa perda ainda não aconteceu: os dígitos estão inteiros
// na string, então o half-up é feito sobre os DÍGITOS e sai exato. Com
// "1,005" o caminho float devolve R$ 1,00 (porque 1.005 × 100 em double dá
// 100.49999999999999) e o caminho dos dígitos devolve R$ 1,01, que é o valor
// que a pessoa escreveu. O erro não é sistemático — "10,005" cai do mesmo lado
// nos dois caminhos —, e é justamente por ser intermitente que ele nunca vira
// um bug reproduzível. Quem já tem `number` em mãos continua usando
// `roundMoney`; quem tem texto usa `centavos` daqui.
//
// O campo `valor` sai SEM arredondar de propósito: a guarda de cent-exatidão do
// repasse de comissão (RN-385) precisa da terceira casa viva para ter o que
// reprovar. Cada tela decide se usa `valor` cru ou `centavos / 100`.
// =============================================================================

/** Por que a leitura falhou. Cada motivo tem uma mensagem própria ao usuário. */
export type MotivoValorInvalido =
  /** Campo em branco (só espaços conta como branco). */
  | 'vazio'
  /** Caracteres fora de dígitos/separadores, sinal repetido, notação exponencial. */
  | 'formato'
  /** Pontuação de milhar malformada (ex.: "1.23,45", "1,234.56"). */
  | 'agrupamento'
  /** Parte inteira longa demais para caber em centavos seguros. */
  | 'magnitude';

/** Leitura bem-sucedida de um valor digitado. */
export interface ValorLido {
  ok: true;
  /**
   * O decimal EXATO como número, sem arredondar ("10,005" → 10.005). É o campo
   * certo para percentuais e para guardas que precisam ver a sub-centavo.
   */
  valor: number;
  /**
   * Centavos inteiros, half-up sobre os dígitos (nunca sobre o float).
   * É o campo certo para dinheiro: `centavos / 100` é cent-exato por
   * construção.
   */
  centavos: number;
  /** `false` quando a entrada tinha mais de duas casas decimais. */
  centExato: boolean;
  /** Forma canônica com ponto decimal ("-1234.56") — para log e diagnóstico. */
  canonico: string;
}

export type ResultadoValorLido = ValorLido | { ok: false; motivo: MotivoValorInvalido };

/** Dígitos inteiros aceitos: R$ 999.999.999.999,99 cabe com folga em centavos seguros. */
const MAX_DIGITOS_INTEIROS = 12;

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

/** Monta o resultado a partir dos dígitos já separados. @pure */
function montar(
  negativo: boolean,
  inteiro: string,
  fracao: string
): ResultadoValorLido {
  const digitosInteiros = inteiro.replace(/^0+(?=\d)/, '');
  if (digitosInteiros.length > MAX_DIGITOS_INTEIROS) {
    return { ok: false, motivo: 'magnitude' };
  }
  if (digitosInteiros === '' && fracao === '') {
    // Só sinal, ou só separador: não há número nenhum aqui.
    return { ok: false, motivo: 'formato' };
  }

  const parteInteira = digitosInteiros === '' ? '0' : digitosInteiros;
  const canonico = `${negativo ? '-' : ''}${parteInteira}${fracao === '' ? '' : `.${fracao}`}`;

  // Half-up sobre os DÍGITOS: os dois primeiros decimais entram inteiros e o
  // terceiro decide o arredondamento. Nada disso passa por float.
  const doisPrimeiros = `${fracao}00`.slice(0, 2);
  const sobra = fracao.slice(2);
  let centavos = Number(parteInteira) * 100 + Number(doisPrimeiros);
  if (sobra !== '' && sobra.charCodeAt(0) >= 53 /* '5' */) centavos += 1;

  return {
    ok: true,
    valor: Number(canonico),
    centavos: negativo ? -centavos : centavos,
    centExato: sobra === '',
    canonico,
  };
}

/**
 * Lê um valor digitado em pt-BR. @pure
 *
 * Aceita: "1234", "1234,56", "1.234,56", "1.234.567,89", "1234.56", "1.234"
 * (milhar), "R$ 99,90", espaços em volta e entre os grupos, sinal à esquerda, e
 * separador decimal pendurado no fim ("1234,").
 *
 * Recusa: vazio, letra (o que mata "1e3" — mil por exponencial nunca acontece),
 * vírgula repetida, "1,234.56" no estilo en-US e agrupamento torto.
 */
export function parseValorPtBr(entrada: string): ResultadoValorLido {
  if (typeof entrada !== 'string') return { ok: false, motivo: 'formato' };

  // Espaço em qualquer forma sai fora, inclusive o NBSP que o `Intl` põe depois
  // do "R$" e o espaço fino que alguns teclados usam como milhar.
  let s = entrada.replace(/[\s  ]/g, '');
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

    if (pontos === 0) return montar(negativo, inteiro, fracao);

    const partes = inteiro.split('.');
    if (!agrupamentoValido(partes)) return { ok: false, motivo: 'agrupamento' };
    return montar(negativo, partes.join(''), fracao);
  }

  // --- sem vírgula e sem ponto: inteiro puro ------------------------------
  if (pontos === 0) return montar(negativo, s, '');

  const partes = s.split('.');
  const ultimo = partes[partes.length - 1] ?? '';

  // --- sem vírgula, dois ou mais pontos: só pode ser milhar ---------------
  if (pontos > 1) {
    if (!agrupamentoValido(partes)) return { ok: false, motivo: 'agrupamento' };
    return montar(negativo, partes.join(''), '');
  }

  // --- sem vírgula, um ponto: o tamanho do grupo final decide -------------
  //
  // Três dígitos com agrupamento válido é MILHAR por decisão do dono ("1.234" é
  // R$ 1.234,00), porque é o que o hábito pt-BR quer dizer. Qualquer outro
  // tamanho de grupo só pode ser decimal ("1234.56", "1.23"). Ver o cabeçalho
  // para o caso que essa escolha custa.
  if (ultimo.length === 3 && agrupamentoValido(partes)) {
    return montar(negativo, partes.join(''), '');
  }
  return montar(negativo, partes[0] ?? '', ultimo);
}

/** Mensagem de campo para cada recusa — o texto que a tela mostra. @pure */
export function mensagemValorInvalido(motivo: MotivoValorInvalido): string {
  switch (motivo) {
    case 'vazio':
      return 'Informe um valor.';
    case 'agrupamento':
      return 'Pontuação fora do padrão. Ponto separa milhar e vírgula separa centavos (ex.: 1.234,56).';
    case 'magnitude':
      return 'Valor alto demais.';
    case 'formato':
      return 'Valor inválido. Use apenas números, com vírgula nos centavos (ex.: 1.234,56).';
  }
}
