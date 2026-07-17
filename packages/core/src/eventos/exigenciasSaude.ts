// =============================================================================
// packages/core/src/eventos/exigenciasSaude.ts
//
// Flags de exigência de saúde do evento — domínio puro (LEELA-S306-T1 · E04 ·
// RN-146). MINIMIZAÇÃO LGPD: atestado e PAR-Q são OPCIONAIS e nascem
// DESLIGADOS — dado de saúde nunca é coletado por padrão; o organizador liga
// por flag quando o regulamento da prova exige. Nada de tipo sanguíneo/
// histórico médico no produto (escopo mínimo + flag).
//
// O DADO em si (quando coletado) vive ISOLADO na subcoleção
// `inscritos/{id}/saude/{unico}` (RN-147 · LGPD Art. 11 — ver saudeInscrito.ts):
// base legal própria, acesso restrito, retenção com expurgo programado.
// =============================================================================

/** Flags de exigência (RN-146) — ambas default OFF (minimização). */
export interface ExigenciasSaude {
  /** Exige atestado médico (upload) no checkout. */
  atestado: boolean;
  /** Exige questionário PAR-Q no checkout. */
  parq: boolean;
}

/** Default canônico: NADA exigido (RN-146 — opt-in explícito). @pure */
export function exigenciasSaudePadrao(): ExigenciasSaude {
  return { atestado: false, parq: false };
}

/** Shape válido? (map EXATO com os 2 booleans — espelhado nas Rules). @pure */
export function isExigenciasSaude(v: unknown): v is ExigenciasSaude {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const chaves = Object.keys(o);
  return (
    chaves.length === 2 &&
    typeof o['atestado'] === 'boolean' &&
    typeof o['parq'] === 'boolean'
  );
}

/**
 * Alguma exigência de saúde ativa? (gate da coleta no checkout e da
 * existência da subcoleção `saude` — RN-146: sem exigência, o doc de saúde
 * NÃO existe.) @pure
 */
export function exigeDadoDeSaude(
  exigencias: ExigenciasSaude | undefined
): boolean {
  return exigencias !== undefined && (exigencias.atestado || exigencias.parq);
}
