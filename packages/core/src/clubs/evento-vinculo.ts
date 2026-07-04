// =============================================================================
// packages/core/src/clubs/evento-vinculo.ts
//
// Copy de vínculo Desafio ↔ Evento (LEELA-E05 · S106-T1).
//
// RN-113 — desafio pode ser vinculado a um evento; o vínculo adiciona a
// copy "(Preparação para [evento])" ao nome/descrição exibidos. Função
// pura — o editor (S106-T2) e o card do desafio consomem daqui para a
// copy nunca divergir entre telas.
// =============================================================================

/**
 * Gera a copy de vínculo de evento (RN-113).
 * `copyPreparacao('Meia Maratona Floripa 2026')` →
 * `"(Preparação para Meia Maratona Floripa 2026)"`.
 * Nome vazio/apenas espaços → string vazia (sem parênteses órfãos).
 */
export function copyPreparacao(nomeEvento: string): string {
  const nome = nomeEvento?.trim();
  if (!nome) return '';
  return `(Preparação para ${nome})`;
}
