// =============================================================================
// Utilitários CSV compartilhados (RFC 4180 + anti-injeção de fórmula/DDE).
// Fonte ÚNICA de sanitização — inscritosCsv (S203) e financeiro (S207) reusam
// daqui (não reimplementam). Separador parametrizável: pt-BR/Excel usa `;`,
// mas o financeiro exporta em `,` — a célula escapa pelo delimitador ativo.
//
// Injeção de fórmula (OWASP CSV Injection): um valor iniciando por = + - @ (ou
// TAB/CR, tolerados pelo Excel/Sheets antes do gatilho) é avaliado como fórmula
// ao abrir o arquivo. Prefixamos apóstrofo para forçar interpretação literal.
// A neutralização acontece ANTES do escaping RFC (o apóstrofo entra no campo e,
// se houver aspas, elas são duplicadas normalmente).
// =============================================================================

const PERIGO_FORMULA = /^[=+\-@\t\r]/;

/** Prefixa apóstrofo em campos que o Excel/Sheets avaliaria como fórmula. */
export function neutralizarFormula(campo: string): string {
  return PERIGO_FORMULA.test(campo) ? `'${campo}` : campo;
}

/**
 * Sanitiza uma célula: neutraliza fórmula e então escapa por RFC 4180 —
 * envolve em aspas e duplica aspas internas quando o campo contém o
 * `separador`, aspas ou quebra de linha. @pure
 */
export function celulaCsv(valor: unknown, separador = ';'): string {
  const campo = neutralizarFormula(String(valor));
  const precisaAspas = campo.includes('"') || campo.includes(separador) || /[\n\r]/.test(campo);
  return precisaAspas ? `"${campo.replace(/"/g, '""')}"` : campo;
}
