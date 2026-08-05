// =============================================================================
// packages/core/src/clubs/codigo-convite.ts
//
// Código de convite do clube (RN-101):
//   - 5 caracteres alfanuméricos MAIÚSCULOS;
//   - alfabeto exclui os ambíguos 0 / O / 1 / I / L.
//
// Funções puras — sem I/O; o sorteio aceita um RNG injetável para teste.
// =============================================================================

import { sorteioUniforme } from '../aleatorio';

/**
 * Alfabeto permitido (RN-101): A–Z sem O/I/L + dígitos 2–9 (sem 0/1).
 * 23 letras + 8 dígitos = 31 símbolos.
 */
export const ALFABETO_CODIGO_CONVITE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Comprimento fixo do código de convite (RN-101) */
export const TAMANHO_CODIGO_CONVITE = 5;

// Regex derivada do alfabeto — única fonte de verdade é a constante acima.
const CODIGO_RE = new RegExp(
  `^[${ALFABETO_CODIGO_CONVITE}]{${TAMANHO_CODIGO_CONVITE}}$`
);

/**
 * Valida um código de convite (RN-101).
 *
 * Regras:
 *   - exatamente 5 caracteres;
 *   - apenas símbolos do alfabeto permitido (maiúsculos; sem 0/O/1/I/L);
 *   - minúsculas são INVÁLIDAS (o código canônico é maiúsculo — ex.: 8A3K9).
 *
 * @pure
 */
export function validarCodigoConvite(codigo: string): boolean {
  return typeof codigo === 'string' && CODIGO_RE.test(codigo);
}

/**
 * Fonte default do sorteio: entropia do sistema (Web Crypto), uniforme sobre
 * os 31 símbolos — ver `aleatorio.ts` para o porquê de não ser `Math.random`.
 * O número de faces vem do alfabeto, nunca escrito à mão.
 */
const SORTEIO_PADRAO = sorteioUniforme(ALFABETO_CODIGO_CONVITE.length);

/**
 * Gera um código de convite válido (RN-101).
 *
 * @param random — fonte de aleatoriedade em [0, 1); default = entropia do
 *   sistema (Web Crypto, uniforme sobre o alfabeto). Injetável para testes
 *   determinísticos — a injeção é o seam, e ela continua intacta.
 * @returns código de 5 chars do alfabeto permitido (ex.: '8A3K9').
 */
export function gerarCodigoConvite(random: () => number = SORTEIO_PADRAO): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO_CONVITE; i++) {
    // Clamp defensivo: random() fora de [0,1) não pode indexar fora do alfabeto
    const r = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
    const idx = Math.floor(r * ALFABETO_CODIGO_CONVITE.length);
    codigo += ALFABETO_CODIGO_CONVITE[idx];
  }
  return codigo;
}
