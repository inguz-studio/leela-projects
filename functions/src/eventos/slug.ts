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

/** Comprimento máximo do slug (legibilidade de URL {base}/{slug}). */
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

/**
 * Slugs RESERVADOS pela superfície pública (S1214-T2 · RN-418).
 *
 * O slug do evento é o primeiro segmento da URL pública (`/{slug}`), então ele
 * disputa espaço com toda rota estática da landing. Um evento chamado "Convite"
 * já sombreava `/convite` hoje; "Ingresso" sombrearia a página do ingresso, que
 * é onde a pessoa vê o QR na fila da largada.
 *
 * A lista é a das rotas ESTÁTICAS que existem na superfície pública, e cresce
 * junto com elas — quem criar rota nova na landing acrescenta o segmento aqui.
 * Reservar é barato (o evento ganha `-2` no slug); descobrir a colisão em
 * produção custa a página inteira.
 */
export const SLUGS_RESERVADOS: readonly string[] = [
  'ingresso',
  'convite',
  // S1223-T1 · RN-453: a tela do primeiro acesso do comprador. Um evento
  // chamado "Definir senha" sombrearia a rota para onde o e-mail de conta
  // criada manda a pessoa — e ela ficaria sem caminho para entrar.
  'definir-senha',
  // S1222-T2 · RN-451: a casa autenticada do comprador. Um evento com este
  // slug ficaria inalcançável (a rota estática vence a dinâmica no App Router)
  // e o organizador não teria como saber por quê.
  'minha-conta',
  'health',
  'robots.txt',
  'sitemap.xml',
  'api',
  '_next',
];

/**
 * O slug bate com uma rota estática da superfície pública? @pure
 *
 * Comparação sobre o slug já normalizado (`slugify` só produz minúsculas), e a
 * defesa contra `Object.prototype` vem de graça por usar array, não mapa.
 */
export function slugReservado(slug: string): boolean {
  return SLUGS_RESERVADOS.includes(slug);
}
