// =============================================================================
// functions/src/eventos/slug.ts
//
// Slug de evento (LEELA-S201-T2 · E03 · RN-201).
//
// `slugify` é puro e determinístico: normaliza acentos (NFD), minúsculas,
// não-alfanumérico vira hífen, colapsa e apara. O slug É o docId do evento
// (ADR do modelo: `eventos/{eventoId}` com docId = slug), então a unicidade
// é garantida ONDE ela mora: dentro da transação de criação (`criarEvento`),
// lendo candidatos `base`, `base-2`, `base-3`… até achar doc livre — duas
// criações concorrentes com o mesmo nome não colidem (a transação do
// Firestore aborta/retenta a perdedora, que enxerga o doc da vencedora).
// =============================================================================

/** Máximo de sufixos tentados antes de desistir (colisão patológica). */
export const MAX_TENTATIVAS_SLUG = 30;

/** Comprimento máximo do slug (legibilidade de URL beh.ro/{slug}). */
export const MAX_SLUG_LENGTH = 60;

/**
 * Converte um nome de evento em slug URL-safe.
 * "Meia Maratona Floripa 2026" → "meia-maratona-floripa-2026".
 * @pure
 */
export function slugify(nome: string): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (ã→a, ç→c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // qualquer separador vira hífen
    .replace(/^-+|-+$/g, '') // apara hífens das pontas
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ''); // corte no limite pode deixar hífen final

  return slug;
}

/**
 * Candidato de slug para a tentativa `n` (0-based).
 * n=0 → base; n=1 → base-2; n=2 → base-3…
 * @pure
 */
export function slugCandidato(base: string, n: number): string {
  return n === 0 ? base : `${base}-${n + 1}`;
}
