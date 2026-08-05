// =============================================================================
// Espelho CLIENT da validação de solicitação de repasse (E09s-L3-T3). Puro.
//
// O servidor é AUTORITATIVO (RN-352/368): `requestRepasse` relê os dois tetos e
// valida no servidor. Aqui é só UX: bloquear o botão + dar um hint antes do
// round-trip. Reusa o MESMO `validarSolicitacao` do core (não reimplementa a
// regra de dinheiro) — duas vezes, porque no servidor são DUAS validações que
// compõem desde a DEC-0727C:
//
//   RN-368 · o valor não pode passar do disponível DAQUELE evento;
//   RN-352 · nem do saldo consolidado do tenant.
//
// Os dois tetos podem divergir, e a diferença é informação, não ruído: o do
// tenant carrega a janela D+N (RN-348), que segura fundos recém-confirmados. Um
// hint só para os dois casos mandaria o organizador adivinhar qual estourou.
//
// RN-369: sem evento escolhido não há solicitação — o "sem associação" morreu.
// =============================================================================

import { mensagemValorInvalido, parseValorPtBr, validarSolicitacao } from '@leela/core';

/**
 * Converte o texto do campo em reais cent-exatos, ou `null` quando
 * vazio/ilegível/ambíguo. @pure
 *
 * Lê pelo `parseValorPtBr` do core (FIX-PARSE-DINHEIRO): o `replace(',', '.')`
 * anterior lia uma solicitação de "1.234,56" como R$ 1,23 e o organizador
 * pedia mil reais a menos do que quis. O cent-exato sai dos DÍGITOS, então
 * `Math.round(n * 100)` sobre float saiu junto.
 */
export function parseValorReais(texto: string): number | null {
  const lido = parseValorPtBr(texto);
  return lido.ok ? lido.centavos / 100 : null;
}

export interface AvaliacaoSolicitacao {
  /** Valor parseado (null = campo vazio/ilegível). */
  valor: number | null;
  /** Pode enviar? (espelho de RN-352/368 — o servidor reconfere). */
  podeEnviar: boolean;
  /** Hint honesto quando bloqueado (null = nada a dizer). */
  hint: string | null;
}

export interface AvaliacaoSolicitacaoParams {
  texto: string;
  /** Evento escolhido; `null` = nenhum ainda (RN-369 — obrigatório). */
  eventoId: string | null;
  /**
   * Disponível DAQUELE evento — o MESMO número do card da Caixa (RN-367).
   * `null` = evento sem termo comercial: indeterminado, e nada a repassar.
   */
  disponivelDoEvento: number | null;
  /** Saldo consolidado do tenant (RN-352 — o outro teto que compõe). */
  disponivelDoTenant: number;
}

/**
 * Avalia o valor digitado contra os DOIS tetos — deriva o estado do botão +
 * hint. Não decide nada de dinheiro: só reflete o core. @pure
 */
export function avaliarSolicitacao(
  params: AvaliacaoSolicitacaoParams,
): AvaliacaoSolicitacao {
  const { texto, eventoId, disponivelDoEvento, disponivelDoTenant } = params;
  const valor = parseValorReais(texto);

  if (eventoId === null) {
    // Sem número digitado ainda não há o que cobrar — a pessoa acabou de abrir
    // o modal. Com número, o que falta é explícito.
    return {
      valor,
      podeEnviar: false,
      hint: valor === null ? null : 'Escolha o evento deste repasse.',
    };
  }
  if (valor === null) {
    // Vazio é começo de digitação e não acusa nada. Texto ILEGÍVEL passava por
    // aqui calado também: o botão morria sem dizer por quê. Agora a recusa do
    // parser vira hint (FIX-PARSE-DINHEIRO).
    const lido = parseValorPtBr(texto);
    return {
      valor: null,
      podeEnviar: false,
      hint: lido.ok || lido.motivo === 'vazio' ? null : mensagemValorInvalido(lido.motivo),
    };
  }
  if (disponivelDoEvento === null) {
    return {
      valor,
      podeEnviar: false,
      hint: 'Este evento ainda não tem termo comercial: não há disponível para repassar.',
    };
  }

  // RN-368 primeiro: é o teto mais específico e o que o card ao lado mostra.
  const noEvento = validarSolicitacao(valor, disponivelDoEvento);
  if (!noEvento.ok) {
    return {
      valor,
      podeEnviar: false,
      hint:
        valor > disponivelDoEvento
          ? 'O valor excede o disponível deste evento.'
          : 'Informe um valor válido (maior que zero).',
    };
  }

  // RN-352: cabe no evento, mas não no caixa consolidado — normalmente porque
  // parte do dinheiro ainda está na janela de liberação (RN-348).
  const noTenant = validarSolicitacao(valor, disponivelDoTenant);
  if (!noTenant.ok) {
    return {
      valor,
      podeEnviar: false,
      hint: 'O valor cabe neste evento, mas excede o saldo disponível da sua conta.',
    };
  }

  return { valor, podeEnviar: true, hint: null };
}
