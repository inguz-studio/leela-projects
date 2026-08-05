// =============================================================================
// packages/core/src/finance/parseContagemPtBr.ts
//
// Leitura de um campo de CONTAGEM digitado em pt-BR: teto de usos de cupom,
// limite de vagas do lote, capacidade do evento/kit, estoque. Irmão de
// `parseValorPtBr`; os dois leem a pontuação pelo MESMO módulo
// (`pontuacaoPtBr`), então "1.000" é mil nos dois — divergir aqui é o defeito
// que a extração veio impedir.
//
// ── o defeito (FIX-PARSE-MILHAR)
//
// Campo de contagem lia o texto com `Number(s)` ou `Number.parseInt(s, 10)`.
// Nas duas formas o separador de milhar não sobrevive:
//
//     Number("1.000")            → 1        (e passa em `Number.isInteger`)
//     Number.parseInt("1.500")   → 1        (para no ponto e trunca)
//
// Num campo de vaga isso abre MIL VEZES menos lugares, e ninguém percebe: 1 é
// um inteiro perfeitamente válido, aprovado por qualquer `Number.isInteger`.
// O organizador descobre quando o evento "esgota" no primeiro inscrito.
//
// A leitura era divergente até dentro do mesmo produto: o teto de usos está
// implementado duas vezes (`cupomForm` com `parseInt` + round-trip,
// `assessoriaForm` com `Number` cru) e as duas discordavam — "1e3" virava 1000
// numa tela e recusa na outra.
//
// ── contagem é INTEIRA: casa decimal é recusa, nunca arredondamento
//
// Dinheiro tem centavos e arredonda a terceira casa; contagem não tem casa
// nenhuma. Meia vaga não existe, e um estoque de "2,5" só pode ser erro de
// digitação ou de teclado. Arredondar calado aqui repetiria o pecado do
// defeito de origem — decidir pelo usuário no escuro. Por isso qualquer
// separador decimal na entrada é recusado pelo QUE ELE É (`temDecimal`), e não
// pelo valor que sobrou depois dele:
//
//     "1.000"  →  1000   (ponto de milhar)
//     "1,000"  →  RECUSA (vírgula é decimal em pt-BR; devolver 1 aqui seria
//                         exatamente o erro de mil vezes, ao contrário)
//     "2,5"    →  RECUSA
//     "1234,"  →  RECUSA (separador pendurado ainda é separador)
//
// O par "1.000" vs "1,000" é o motivo de a recusa ser por tipo. Os dois textos
// têm os mesmos dígitos; só a pontuação diz que um é mil e o outro é um.
//
// ── o que este módulo NÃO decide
//
// Sinal e faixa. `valor` sai com sinal e cada campo aplica a sua guarda —
// teto de cupom exige ≥ 1, estoque aceita 0, capacidade de evento exige > 0.
// Essas réguas são de domínio e já existem nas telas; o parser não as
// duplica nem as afrouxa.
// =============================================================================

import { separarPtBr } from './pontuacaoPtBr';

/** Por que a contagem foi recusada. Cada motivo tem mensagem própria. */
export type MotivoContagemInvalida =
  /** Campo em branco (só espaços conta como branco). */
  | 'vazio'
  /** Caracteres fora de dígitos/separadores, sinal repetido, notação exponencial. */
  | 'formato'
  /** Pontuação de milhar malformada (ex.: "1.23.4", "12.34"). */
  | 'agrupamento'
  /** Tinha separador decimal — contagem não tem casa decimal. */
  | 'decimal'
  /** Mais dígitos do que qualquer contagem real do produto. */
  | 'magnitude';

/** Contagem lida de um campo de texto. */
export interface ContagemLida {
  ok: true;
  /** Inteiro COM SINAL. A faixa (≥ 0, ≥ 1) é guarda de cada campo. */
  valor: number;
  /** Havia sinal de menos e o número não é zero. */
  negativo: boolean;
  /** Forma canônica só com dígitos ("-1234") — para log e diagnóstico. */
  canonico: string;
}

export type ResultadoContagemLida =
  | ContagemLida
  | { ok: false; motivo: MotivoContagemInvalida };

/**
 * Dígitos aceitos: 999.999.999 é ordem de grandeza acima de qualquer vaga,
 * estoque ou teto de uso que este produto vá ver, e mantém o inteiro longe do
 * limite seguro do double.
 */
const MAX_DIGITOS = 9;

/**
 * Lê um campo de contagem digitado em pt-BR. @pure
 *
 * Aceita: "1000", "1.000" (mil), "1.234.567", " 12 ", "+7", "-3", "007".
 *
 * Recusa: vazio, letra (o que mata "1e3" — mil por exponencial nunca
 * acontece), qualquer casa decimal ("2,5", "1,000", "1.5", "1234,"),
 * agrupamento torto ("12.34", "1,234.56") e magnitude fora da escala.
 */
export function parseContagemPtBr(entrada: string): ResultadoContagemLida {
  const lido = separarPtBr(entrada);
  if (!lido.ok) return lido;

  // Recusa pelo TIPO da entrada, não pelo resto: "1,000" tem os mesmos dígitos
  // que "1.000" e significa mil vezes menos.
  if (lido.temDecimal) return { ok: false, motivo: 'decimal' };

  const digitos = lido.inteiro.replace(/^0+(?=\d)/, '');
  // Sem dígito nenhum sobrando (só sinal, só separador): não há número aqui.
  if (digitos === '') return { ok: false, motivo: 'formato' };
  if (digitos.length > MAX_DIGITOS) return { ok: false, motivo: 'magnitude' };

  const modulo = Number(digitos);
  // "-0" é zero: sinal em cima de zero não cria um zero negativo para vazar
  // num payload e voltar como `-0` de um documento.
  const negativo = lido.negativo && modulo !== 0;
  return {
    ok: true,
    valor: negativo ? -modulo : modulo,
    negativo,
    canonico: `${negativo ? '-' : ''}${digitos}`,
  };
}

/** Mensagem de campo para cada recusa — o texto que a tela mostra. @pure */
export function mensagemContagemInvalida(motivo: MotivoContagemInvalida): string {
  switch (motivo) {
    case 'vazio':
      return 'Informe uma quantidade.';
    case 'decimal':
      return 'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.';
    case 'agrupamento':
      return 'Pontuação fora do padrão. O ponto separa o milhar, de três em três (ex.: 1.000).';
    case 'magnitude':
      return 'Quantidade alta demais.';
    case 'formato':
      return 'Quantidade inválida. Use apenas números inteiros (ex.: 1.000).';
  }
}
