// =============================================================================
// apps/painel/src/lib/mensagemDoParser.ts
//
// A ponte entre a recusa do parser e a mensagem que o campo mostra (PARSE-1).
//
// ── por que este módulo existe
//
// `parseValorPtBr` e `parseContagemPtBr` já devolvem o MOTIVO da recusa, e o
// core já tem uma frase própria para cada motivo (`mensagemValorInvalido`,
// `mensagemContagemInvalida`). O que faltava era o caminho: dos dezoito campos
// do painel que passam pelos dois parsers, só QUATRO chegavam a montar a frase
// do motivo. Nos outros catorze o motivo era descartado — `lido.ok ? valor :
// NaN` — e o campo repetia a frase de domínio ("Preço inválido (use R$ ≥ 0)")
// para qualquer texto que a tela não entendeu, ou não dizia nada e só deixava o
// botão morto.
//
// ── a divisão de trabalho que este módulo carimba
//
// O parser responde "não consigo LER isto" e a frase é dele. A faixa — preço
// ≥ 0, ordem ≥ 1, teto ≥ 1, percentual ≤ 100 — é de domínio, continua onde
// sempre esteve, e a frase é da tela. Um texto ilegível nunca chega à guarda de
// faixa, então as duas frases não competem: a do parser vem primeiro e a de
// domínio só fala quando há número para julgar.
//
// ── o vazio é dos dois, e por isso é parâmetro
//
// Campo em branco é começo de digitação num campo opcional (teto de usos,
// mínimo de inscrições) e é erro num campo obrigatório (preço do lote). O
// parser tem o motivo `'vazio'` com frase pronta; quem decide se ela cabe é o
// campo, não este módulo. Daí `vazioAcusa`, que nasce `false`: acusar antes da
// primeira tecla é o oposto do que a lane veio fazer.
// =============================================================================

import {
  mensagemContagemInvalida,
  mensagemValorInvalido,
  parseContagemPtBr,
  parseValorPtBr,
} from '@leela/core';

export interface OpcoesDeLeitura {
  /**
   * Campo em branco acusa? `false` (default) = silêncio no vazio, para não
   * acusar quem ainda não digitou. `true` nos campos obrigatórios, onde o
   * branco é uma recusa como qualquer outra.
   */
  vazioAcusa?: boolean;
}

/**
 * Frase do parser de DINHEIRO para o texto do campo, ou `null` quando não há o
 * que dizer (texto legível, ou branco com `vazioAcusa: false`). @pure
 */
export function mensagemDeValor(texto: string, opcoes: OpcoesDeLeitura = {}): string | null {
  const lido = parseValorPtBr(texto);
  if (lido.ok) return null;
  if (lido.motivo === 'vazio' && opcoes.vazioAcusa !== true) return null;
  return mensagemValorInvalido(lido.motivo);
}

/**
 * Frase do parser de CONTAGEM para o texto do campo, ou `null` quando não há o
 * que dizer (texto legível, ou branco com `vazioAcusa: false`). @pure
 */
export function mensagemDeContagem(texto: string, opcoes: OpcoesDeLeitura = {}): string | null {
  const lido = parseContagemPtBr(texto);
  if (lido.ok) return null;
  if (lido.motivo === 'vazio' && opcoes.vazioAcusa !== true) return null;
  return mensagemContagemInvalida(lido.motivo);
}
