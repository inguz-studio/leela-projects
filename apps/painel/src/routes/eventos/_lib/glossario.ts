// =============================================================================
// Glossário canônico de nomenclatura do E03 (RN-216). Termo do produto é
// SEMPRE "kit" — "tier" não existe. Fonte única para a copy das telas e para
// a guarda de regressão (`nomenclatura.regression.test`).
//
// Nota de escopo: idealmente vive em `packages/core/src/i18n/glossario.ts`
// (spec S206-T2). Mantido no E03 do painel para não tocar o barrel de core
// durante o trabalho concorrente do E05 (clubs) — pode ser elevado depois.
// =============================================================================

/** Termos proibidos na copy do produto (RN-216). */
export const TERMOS_PROIBIDOS = ['tier'] as const;

/** Termo canônico do produto para o pacote de itens do evento (RN-216). */
export const TERMO_KIT = {
  canonico: 'kit',
  plural: 'kits',
  /** Sinônimos legados que NÃO podem aparecer na copy. */
  proibidos: ['tier'],
} as const;

/** A copy contém algum termo proibido? (whole-word, case-insensitive) @pure */
export function contemTermoProibido(texto: string): string | null {
  for (const termo of TERMOS_PROIBIDOS) {
    if (new RegExp(`\\b${termo}\\b`, 'i').test(texto)) return termo;
  }
  return null;
}
