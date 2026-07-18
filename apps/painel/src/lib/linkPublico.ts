// =============================================================================
// linkPublico — FONTE ÚNICA da base pública (landing) do painel.
//
// Bug R10 (Vitor): o botão "Ver página pública" abria `window.location.origin`
// (o próprio painel, :5273 no preview) + prefixo `/e/` inexistente. A landing
// serve o evento na RAIZ (`/{slug}`; route group `(public)` não adiciona
// segmento) e só o próprio painel respondia — 404/nada.
//
// A URL pública é configurável por env do painel (`VITE_LEELA_URL`), a MESMA
// convenção já usada em Perfil público e Assessorias — aqui centralizada para
// não haver derivação divergente. No preview, `preview.sh` injeta
// `VITE_LEELA_URL=http://127.0.0.1:3000` (a landing local). Sem env, o fallback
// é o domínio de produção do produto (a decisão de domínio segue aberta; o env
// resolve os dois mundos).
// =============================================================================

/** Base do link público (landing), sem barra final. */
export const PUBLIC_BASE: string =
  (import.meta.env.VITE_LEELA_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://be-hero.com.br';

/** URL pública de um evento na landing: `${PUBLIC_BASE}/${slug}`. @pure */
export function linkEventoPublico(slug: string): string {
  return `${PUBLIC_BASE}/${slug}`;
}
