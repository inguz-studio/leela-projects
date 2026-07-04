// =============================================================================
// packages/core/src/finance/calc.ts
//
// Cálculo financeiro puro (E09 · RN-330/RN-406; E04 · RN-311).
//
// REGRA DE OURO (RN-406): `platformFeePct` SEMPRE chega por parâmetro, vindo
// do termo do tenant (TermsProvider — S1602-T3). Este módulo NÃO tem
// constante de taxa; o mock "10,5%" citado nas specs de E09 é o VALOR DO
// TERMO da Castelo Produções, não um default deste código.
//
// Convenção monetária: valores em reais (number), arredondados a 2 casas
// com arredondamento half-up sobre centavos — consistente com os agregados
// (`receitaConfirmada`, `gmvAcumulado`) já modelados em reais.
// =============================================================================

import type { InstallmentRules } from '../platform/commercialTerms';

/** Arredonda para 2 casas decimais (centavos), half-up. */
export function roundMoney(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Taxa da plataforma sobre a receita bruta confirmada (RN-330).
 *
 * @param receitaBruta    receita bruta confirmada (R$)
 * @param platformFeePct  taxa do TERMO do tenant, em % (RN-406 — nunca constante)
 * @returns valor da taxa em R$ (2 casas)
 */
export function computeTaxa(receitaBruta: number, platformFeePct: number): number {
  if (!Number.isFinite(receitaBruta) || receitaBruta < 0) {
    throw new RangeError('receitaBruta deve ser um número ≥ 0.');
  }
  if (!Number.isFinite(platformFeePct) || platformFeePct < 0 || platformFeePct > 100) {
    throw new RangeError('platformFeePct deve estar entre 0 e 100.');
  }
  return roundMoney(receitaBruta * (platformFeePct / 100));
}

/** Receita líquida do produtor após a taxa da plataforma (RN-330). */
export function computeReceitaLiquida(
  receitaBruta: number,
  platformFeePct: number
): number {
  return roundMoney(receitaBruta - computeTaxa(receitaBruta, platformFeePct));
}

// ---------------------------------------------------------------------------
// Parcelamento (E04 · RN-311) — deriva das installmentRules do TERMO
// ---------------------------------------------------------------------------

/** Uma opção de parcelamento ofertável no checkout. */
export interface InstallmentOption {
  /** Número de parcelas (1 = à vista) */
  parcelas: number;
  /** Valor de cada parcela (R$, 2 casas) */
  valorParcela: number;
  /** Total pago (R$) — difere do valor base quando há juros */
  valorTotal: number;
}

/**
 * Monta as opções de parcelamento a partir das regras do TERMO do tenant
 * (RN-311/RN-406 — nunca de constante).
 *
 * Regras aplicadas:
 *   - até `maxParcelas`;
 *   - nenhuma parcela abaixo de `parcelaMinima`;
 *   - `jurosAoMes` composto por parcela quando > 0 (price simplificado:
 *     total = valor × (1 + juros%)^n); 0 = sem juros;
 *   - à vista (1x) é sempre ofertada.
 */
export function buildInstallmentOptions(
  valor: number,
  rules: InstallmentRules
): InstallmentOption[] {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new RangeError('valor deve ser um número > 0.');
  }

  const options: InstallmentOption[] = [];
  for (let n = 1; n <= rules.maxParcelas; n++) {
    const fator = rules.jurosAoMes > 0 ? Math.pow(1 + rules.jurosAoMes / 100, n) : 1;
    const valorTotal = roundMoney(valor * fator);
    const valorParcela = roundMoney(valorTotal / n);

    // Parcela mínima do termo — exceto à vista, que é sempre válida
    if (n > 1 && valorParcela < rules.parcelaMinima) break;

    options.push({ parcelas: n, valorParcela, valorTotal });
  }
  return options;
}
