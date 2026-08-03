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
 * (RN-311/RN-406/RN-436 — nunca de constante).
 *
 * Regras aplicadas:
 *   - até `maxParcelas`;
 *   - nenhuma parcela abaixo de `parcelaMinima`;
 *   - juros pela **tabela Price** quando `jurosAoMes > 0`; 0 = sem juros;
 *   - `n = 1` NUNCA tem juros;
 *   - à vista (1x) é sempre ofertada.
 *
 * ── S314-T1 · o que mudou, e por que é dinheiro (RN-436) ───────────────────
 *
 * O modelo anterior era `total = valor × (1 + i)^n` com `parcela = total / n`.
 * Isso não é Price: é o principal corrigido pelo juro composto do PRAZO
 * INTEIRO, sem amortização. Com R$ 300 a 2,89% a.m. em 12x ele cobra
 * R$ 422,28; a tabela Price cobra R$ 359,28 — 17,5% de diferença na tela do
 * dinheiro, contra o comprador. Enquanto `jurosAoMes` era 0 os dois modelos
 * coincidiam e a diferença nunca valeu um centavo; ligar o número é o que a
 * torna real.
 *
 * A forma canônica:
 *
 *     n = 1   →  parcela = PV                        (sem juros)
 *     n ≥ 2   →  parcela = PV × i ÷ (1 − (1 + i)^−n)
 *                total   = parcela × n
 *
 * **`n = 1` sem juros não é arredondamento de conveniência.** Price puro
 * cobra um mês na parcela única, porque a fórmula assume pagamento ao FIM do
 * período; no cartão à vista o pagamento é agora. Sem a exceção, a opção
 * "À vista" do cartão nasceria 2,89% mais cara que o PIX com esse rótulo, e o
 * `totalAVista` do resumo passaria a divergir do primeiro item da lista de
 * parcelamento NA MESMA TELA.
 *
 * **A ordem do arredondamento é normativa (RN-183 ampliada).** Arredonda-se a
 * PARCELA, e o total é a parcela multiplicada. Como o adapter manda
 * `installmentCount` + `totalValue` e deixa o gateway dividir, um total que é
 * múltiplo exato da parcela faz a divisão dele cair no MESMO número que a tela
 * mostrou. Com o total arredondado primeiro (o que se fazia aqui), o gateway
 * podia devolver centavos diferentes do que o comprador leu — e isso vale
 * inclusive com juros ZERO, onde R$ 35 em 3x dava parcela 11,67 e total 35,00,
 * três parcelas que não somam o total.
 */
export function buildInstallmentOptions(
  valor: number,
  rules: InstallmentRules
): InstallmentOption[] {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new RangeError('valor deve ser um número > 0.');
  }

  const i = rules.jurosAoMes > 0 ? rules.jurosAoMes / 100 : 0;

  const options: InstallmentOption[] = [];
  for (let n = 1; n <= rules.maxParcelas; n++) {
    // Parcela primeiro (RN-436), total depois — a ordem é a regra.
    const valorParcela =
      n === 1 || i === 0
        ? roundMoney(valor / n)
        : roundMoney((valor * i) / (1 - Math.pow(1 + i, -n)));
    const valorTotal = roundMoney(valorParcela * n);

    // Parcela mínima do termo — exceto à vista, que é sempre válida
    if (n > 1 && valorParcela < rules.parcelaMinima) break;

    options.push({ parcelas: n, valorParcela, valorTotal });
  }
  return options;
}
