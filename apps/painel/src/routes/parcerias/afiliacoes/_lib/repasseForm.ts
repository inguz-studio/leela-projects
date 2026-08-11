// =============================================================================
// Espelho CLIENT da guarda de valor do repasse de comissão (S705-T2 · RN-385).
// Puro, sem React.
//
// O SERVIDOR é o fence: `registrarRepasseComissaoCore` compara `valor` contra o
// saldo lido DENTRO da mesma transação que grava o ledger e incrementa
// `comissaoRepassada`. Nada aqui decide dinheiro — isto só evita o round-trip
// e diz em português o que o servidor recusaria.
//
// REUSO (não reimplementar regra de dinheiro): a tripla "cent-exato · maior que
// zero · não maior que o teto" já é `validarSolicitacao` do core, escrita para o
// repasse do organizador (RN-352/368). É literalmente a mesma aritmética; um
// segundo predicado local seria uma segunda verdade para divergir.
//
// A DIFERENÇA proposital em relação ao `parseValorReais` da tela de repasses do
// organizador: ali o texto é ARREDONDADO para centavo (`Math.round(n*100)/100`),
// o que faz "10,005" virar 10,01 e passar. Aqui a story pede o oposto —
// "valor com mais de duas casas decimais: a validação de tela bloqueia antes da
// chamada, com a mesma regra que o servidor aplica". Arredondar seria mentir
// sobre o que foi digitado num campo de dinheiro. Então o parse preserva o
// número e quem reprova é o core.
// =============================================================================

import { mensagemValorInvalido, parseValorPtBr, validarSolicitacao } from '@leela/core';

/**
 * Converte o texto do campo em reais SEM arredondar — "10,005" continua
 * 10.005 para que a checagem de cent-exatidão tenha o que reprovar.
 * `null` = campo vazio, ilegível ou ambíguo. @pure
 *
 * Lê pelo `parseValorPtBr` do core (FIX-PARSE-DINHEIRO), usando o campo
 * `valor`, que é o decimal exato sem arredondamento — é exatamente o que esta
 * tela precisa. O `centavos` do mesmo resultado existe para quem quer o
 * cent-exato; aqui ele seria a mentira que o cabeçalho recusa.
 */
export function parseValorRepasse(texto: string): number | null {
  const lido = parseValorPtBr(texto);
  return lido.ok ? lido.valor : null;
}

/**
 * Texto inicial do campo: o saldo INTEGRAL (RN-385 — "o formulário propõe o
 * saldo integral como valor inicial, para que o caminho de hoje continue sendo
 * um clique"). Vírgula decimal porque é o que a pessoa lê no resto da tela
 * (`formatBRL`) e o parse aceita os dois separadores. @pure
 */
export function textoInicialRepasse(saldo: number): string {
  return Number.isFinite(saldo) && saldo > 0
    ? saldo.toFixed(2).replace('.', ',')
    : '';
}

export interface AvaliacaoRepasse {
  /** Valor parseado (null = campo vazio/ilegível). */
  valor: number | null;
  /** Pode registrar? (espelho da guarda do servidor — ele reconfere). */
  podeEnviar: boolean;
  /** Hint honesto quando bloqueado (null = nada a dizer ainda). */
  hint: string | null;
}

/**
 * Avalia o valor digitado contra o saldo vigente do afiliado. @pure
 *
 * Saldo negativo (dívida por estorno pós-repasse) não é "teto zero": é um
 * estado em que registrar repasse não é a operação certa, e a tela diz por quê
 * em vez de deixar a pessoa caçar o erro do servidor.
 */
export function avaliarRepasse(texto: string, saldo: number): AvaliacaoRepasse {
  const lido = parseValorPtBr(texto);
  const valor = lido.ok ? lido.valor : null;

  if (!Number.isFinite(saldo) || saldo < 0) {
    return {
      valor,
      podeEnviar: false,
      hint: 'Este afiliado está em dívida: uma dívida não se quita registrando repasse.',
    };
  }
  if (saldo === 0) {
    return { valor, podeEnviar: false, hint: 'Não há saldo de comissão a repassar.' };
  }
  if (!lido.ok) {
    // Campo vazio é começo de digitação, não erro — não acusar antes da hora.
    // Texto ILEGÍVEL é outra coisa: antes o botão só ficava morto e a pessoa
    // não tinha como saber por quê. Agora a recusa diz o nome dela.
    return {
      valor: null,
      podeEnviar: false,
      hint: lido.motivo === 'vazio' ? null : mensagemValorInvalido(lido.motivo),
    };
  }

  const valorLido = lido.valor;
  const veredito = validarSolicitacao(valorLido, saldo);
  if (veredito.ok) return { valor: valorLido, podeEnviar: true, hint: null };

  if (valorLido > saldo) {
    return {
      valor,
      podeEnviar: false,
      hint: 'O valor excede o saldo de comissão deste afiliado.',
    };
  }
  if (valorLido <= 0) {
    return { valor: valorLido, podeEnviar: false, hint: 'Informe um valor maior que zero.' };
  }
  return {
    valor: valorLido,
    podeEnviar: false,
    hint: 'Informe um valor em reais e centavos (no máximo duas casas decimais).',
  };
}
