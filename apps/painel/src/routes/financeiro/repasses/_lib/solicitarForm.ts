// =============================================================================
// Espelho CLIENT da validação de solicitação de repasse (E09s-L3-T3). Puro.
//
// O servidor é AUTORITATIVO (RN-352): `requestRepasse` relê o disponível e
// valida no servidor — `valor > disponivel` ⇒ failed-precondition, nunca cria.
// Aqui é só UX: bloquear o botão + dar um hint antes do round-trip. Reusa o
// MESMO `validarSolicitacao` do core (não reimplementa a regra de dinheiro).
// =============================================================================

import { validarSolicitacao } from '@leela/core';

/**
 * Converte o texto do campo (input numérico, decimal com "." ou ",") em reais
 * cent-exatos, ou `null` quando vazio/inválido. @pure
 */
export function parseValorReais(texto: string): number | null {
  const t = texto.trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100; // cent-exato (evita ruído de float)
}

export interface AvaliacaoSolicitacao {
  /** Valor parseado (null = campo vazio/ilegível). */
  valor: number | null;
  /** Pode enviar? (espelho de RN-352 — o servidor reconfere). */
  podeEnviar: boolean;
  /** Hint honesto quando bloqueado (null = nada a dizer). */
  hint: string | null;
}

/**
 * Avalia o valor digitado contra o disponível — deriva o estado do botão +
 * hint (espelho de RN-352). Não decide nada de dinheiro: só reflete o core. @pure
 */
export function avaliarSolicitacao(texto: string, disponivel: number): AvaliacaoSolicitacao {
  const valor = parseValorReais(texto);
  if (valor === null) {
    return { valor: null, podeEnviar: false, hint: null };
  }
  const { ok } = validarSolicitacao(valor, disponivel);
  if (ok) return { valor, podeEnviar: true, hint: null };

  const hint =
    valor > disponivel
      ? 'O valor excede o disponível para saque.'
      : 'Informe um valor válido (maior que zero).';
  return { valor, podeEnviar: false, hint };
}
