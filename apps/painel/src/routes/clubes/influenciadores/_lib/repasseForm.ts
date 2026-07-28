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

import { validarSolicitacao } from '@leela/core';

/**
 * Converte o texto do campo em reais SEM arredondar — "10,005" continua
 * 10.005 para que a checagem de cent-exatidão tenha o que reprovar.
 * `null` = campo vazio ou ilegível. @pure
 */
export function parseValorRepasse(texto: string): number | null {
  const t = texto.trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
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
  const valor = parseValorRepasse(texto);

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
  if (valor === null) {
    // Campo vazio é começo de digitação, não erro — não acusar antes da hora.
    return { valor: null, podeEnviar: false, hint: null };
  }

  const veredito = validarSolicitacao(valor, saldo);
  if (veredito.ok) return { valor, podeEnviar: true, hint: null };

  if (valor > saldo) {
    return {
      valor,
      podeEnviar: false,
      hint: 'O valor excede o saldo de comissão deste afiliado.',
    };
  }
  if (valor <= 0) {
    return { valor, podeEnviar: false, hint: 'Informe um valor maior que zero.' };
  }
  return {
    valor,
    podeEnviar: false,
    hint: 'Informe um valor em reais e centavos (no máximo duas casas decimais).',
  };
}
