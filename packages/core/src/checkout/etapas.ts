// =============================================================================
// packages/core/src/checkout/etapas.ts
//
// Máquina de etapas do checkout — TIPO PURO (LEELA-E12 · fundação).
//
// A UI do checkout (S1203 — próximo lote) navega dados → pagamento →
// confirmação. A sequência é dado de DOMÍNIO (a ordem importa: cobrança só
// depois dos dados validados), então a lista canônica e as transições moram
// no core — a UI consome, nunca redefine. Estado que se computa não se
// denormaliza: o índice/progresso deriva da lista.
// =============================================================================

/** Etapas do checkout, na ordem canônica de navegação. */
export type EtapaCheckout = 'dados' | 'pagamento' | 'confirmacao';

/** Lista canônica ORDENADA — única fonte para stepper/validação. */
export const ETAPAS_CHECKOUT: readonly EtapaCheckout[] = [
  'dados',
  'pagamento',
  'confirmacao',
];

/** Type guard de EtapaCheckout. @pure */
export function isEtapaCheckout(value: unknown): value is EtapaCheckout {
  return (
    typeof value === 'string' &&
    (ETAPAS_CHECKOUT as readonly string[]).includes(value)
  );
}

/** Posição (0-based) da etapa na sequência canônica. @pure */
export function indiceEtapa(etapa: EtapaCheckout): number {
  return ETAPAS_CHECKOUT.indexOf(etapa);
}

/** Próxima etapa — `null` quando `confirmacao` (fim da sequência). @pure */
export function proximaEtapa(etapa: EtapaCheckout): EtapaCheckout | null {
  const proxima = ETAPAS_CHECKOUT[indiceEtapa(etapa) + 1];
  return proxima ?? null;
}

/** Etapa anterior — `null` quando `dados` (início da sequência). @pure */
export function etapaAnterior(etapa: EtapaCheckout): EtapaCheckout | null {
  const indice = indiceEtapa(etapa);
  if (indice <= 0) return null;
  return ETAPAS_CHECKOUT[indice - 1] ?? null;
}
