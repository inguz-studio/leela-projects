// =============================================================================
// Saudação do profissional na Visão Geral (S600-T1).
// Pura, sem React/DOM — 100% testável.
//
// O nome vem do Firebase `user.displayName` (AuthClaims não carrega nome).
// null/ vazio → saudação genérica, nunca "Olá, undefined".
// =============================================================================

/** Primeiro nome de um nome completo ("Marina Castelo" → "Marina"). */
export function primeiroNome(nomeCompleto: string | null | undefined): string | null {
  if (typeof nomeCompleto !== 'string') return null;
  const limpo = nomeCompleto.trim();
  if (limpo.length === 0) return null;
  const primeiro = limpo.split(/\s+/)[0];
  return primeiro && primeiro.length > 0 ? primeiro : null;
}

/**
 * Saudação da PageHeader do dashboard.
 * "Marina Castelo" → "Olá, Marina — aqui está o resumo das suas operações."
 * sem nome → "Olá — aqui está o resumo das suas operações."
 * @pure
 */
export function saudacaoProfissional(nomeCompleto: string | null | undefined): string {
  const primeiro = primeiroNome(nomeCompleto);
  const abertura = primeiro ? `Olá, ${primeiro}` : 'Olá';
  return `${abertura} — aqui está o resumo das suas operações.`;
}
