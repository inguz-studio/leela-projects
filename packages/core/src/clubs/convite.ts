// =============================================================================
// packages/core/src/clubs/convite.ts
//
// Convite de membros por email (LEELA-E05 · S104-T1). Validação PURA, sem
// segurança (a autorização/entrega vive no backend). Módulo Clubs.
//
// RN-106 — no máximo 50 emails por envio; ao menos 1 email é obrigatório.
//   validarConvite([...1 email...])   → válido
//   validarConvite([...50 emails...]) → válido
//   validarConvite([])                → inválido (mínimo)
//   validarConvite([...51 emails...]) → inválido (máximo)
//
// Funções puras — usadas pela tela (feedback do form) e por seeds/Functions.
// =============================================================================

/** Mínimo de emails por envio (RN-106). */
export const CONVITE_MIN_EMAILS = 1;

/** Máximo de emails por envio (RN-106). */
export const CONVITE_MAX_EMAILS = 50;

// Formato de email pragmático (não RFC-completo): algo@dominio.tld sem espaços.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida o formato de um único email. @pure */
export function validarEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

/**
 * Extrai emails de um texto livre: separadores vírgula, ponto e vírgula, quebra
 * de linha ou espaço. Faz trim, descarta vazios e deduplica (case-insensitive)
 * preservando a ordem de primeira ocorrência. @pure
 */
export function parseEmails(raw: string): string[] {
  if (typeof raw !== 'string') return [];
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const email = token.trim();
    if (!email) continue;
    const chave = email.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(email);
  }
  return out;
}

export interface ResultadoConvite {
  /** true quando a contagem está em [1, 50] e todos os emails têm formato válido. */
  valido: boolean;
  /** Quantidade de emails informados (após dedupe). */
  total: number;
  /** Emails com formato inválido. */
  invalidos: string[];
  /** Mensagens de erro legíveis (vazio = válido). */
  erros: string[];
}

/**
 * Valida um lote de emails de convite (RN-106). Puro.
 *
 * Regras:
 *   - contagem em [CONVITE_MIN_EMAILS, CONVITE_MAX_EMAILS];
 *   - todo email precisa ter formato válido.
 */
export function validarConvite(emails: string[]): ResultadoConvite {
  const lista = Array.isArray(emails) ? emails : [];
  const total = lista.length;
  const invalidos = lista.filter((e) => !validarEmail(e));
  const erros: string[] = [];

  if (total < CONVITE_MIN_EMAILS) {
    erros.push('Informe ao menos 1 email.');
  }
  if (total > CONVITE_MAX_EMAILS) {
    erros.push(`No máximo ${CONVITE_MAX_EMAILS} emails por envio (RN-106).`);
  }
  if (invalidos.length > 0) {
    erros.push(`${invalidos.length} email(s) com formato inválido.`);
  }

  return { valido: erros.length === 0, total, invalidos, erros };
}
