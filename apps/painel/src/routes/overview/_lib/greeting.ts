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

/** Frase fixa da saudação v3 (protótipo Visao Geral v3 — HIFI-REC). */
export const PANORAMA_V3 = 'aqui está o panorama do seu ecossistema.';

/**
 * Partes da saudação do protótipo v3: "Olá, VITOR, aqui está o panorama do
 * seu ecossistema." — o nome vem em MAIÚSCULAS e em destaque de marca (o
 * `<strong>` é da view; aqui só as partes). Sem nome, a frase fecha sozinha:
 * "Olá, aqui está o panorama do seu ecossistema." — nunca "undefined".
 * @pure
 */
export function saudacaoPanorama(nomeCompleto: string | null | undefined): {
  nome: string | null;
  frase: string;
} {
  const primeiro = primeiroNome(nomeCompleto);
  return { nome: primeiro ? primeiro.toUpperCase() : null, frase: PANORAMA_V3 };
}
