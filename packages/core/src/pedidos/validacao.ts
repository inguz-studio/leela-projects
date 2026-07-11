// =============================================================================
// packages/core/src/pedidos/validacao.ts
//
// Helpers COMUNS de validação de parse do módulo pedidos (review r1 —
// fixes 2/4/8): dinheiro e Timestamp validados UMA vez, usados por
// pedido.ts e pagamento.ts (antes cada arquivo re-implementava o check
// monetário por conta própria).
//
// Convenção monetária: REAIS, 2 casas (ver pedido.ts). Valor com fração de
// SUB-CENTAVO (ex.: 32.239999) é REJEITADO: sub-centavo em doc financeiro é
// sintoma de aritmética sem `roundMoney` upstream — fail-fast aqui evita
// propagar dinheiro errado para o slide-in e para os agregados.
// =============================================================================

import type { Timestamp } from '../index';
import { roundMoney } from '../finance/calc';

/**
 * Meio centavo (R$ 0,005) — tolerância para comparar valores CENT-EXATOS
 * sob ruído de ponto flutuante, e erro máximo POR PARCELA do parcelamento:
 * `buildInstallmentOptions` (finance/calc.ts) arredonda `valorParcela`
 * half-up a centavos, então |parcelas × valorParcela − valorTotal| pode
 * chegar a parcelas × 0,005.
 */
export const TOLERANCIA_MEIO_CENTAVO = 0.005;

/**
 * Um centavo (R$ 0,01) — tolerância para campos calculados PELO GATEWAY
 * (ex.: `repasseOrganizador`): o arredondamento da taxa no Asaas pode
 * divergir do nosso em até 1 centavo sem indicar corrupção.
 */
export const TOLERANCIA_CENTAVO = 0.01;

/**
 * Valida campo monetário (fail-fast): number finito ≥ 0 E cent-exato
 * (`roundMoney(v) === v` — rejeita sub-centavo).
 * `contexto` prefixa a mensagem: "Pagamento pag-1" / "Pedido ped-1".
 */
export function parseMoney(
  contexto: string,
  campo: string,
  value: unknown
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${contexto}: "${campo}" deve ser number ≥ 0 (R$)`);
  }
  if (roundMoney(value) !== value) {
    throw new Error(
      `${contexto}: "${campo}" (${value}) tem fração de sub-centavo — ` +
        `valores monetários são R$ com 2 casas (aplicar roundMoney na origem)`
    );
  }
  return value;
}

/** Shape estrutural de Timestamp (compatível client SDK e Admin SDK). @pure */
export function isTimestampLike(value: unknown): value is Timestamp {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { seconds?: unknown }).seconds === 'number' &&
    typeof (value as { nanoseconds?: unknown }).nanoseconds === 'number'
  );
}

/**
 * Valida campo Timestamp OBRIGATÓRIO (fail-fast). `criadoEm` é campo mínimo
 * do ADR-011 e chave do orderBy — doc sem ele SOME silenciosamente da
 * listagem; blind-cast que aceita undefined esconderia corrupção.
 */
export function parseTimestamp(
  contexto: string,
  campo: string,
  value: unknown
): Timestamp {
  if (!isTimestampLike(value)) {
    throw new Error(
      `${contexto}: "${campo}" ausente ou não é Timestamp ` +
        `(seconds/nanoseconds) — campo obrigatório (ADR-011)`
    );
  }
  return value;
}
