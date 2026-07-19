// =============================================================================
// apps/landing/lib/coverEvento.ts
//
// Resolve a CAPA de cada card da listagem pública (home marketplace) — LEELA-R14.
//
// Por que app-side (e não o `imagemUrl` do doc): a guarda RN-153
// (`isUrlCapaValida`, @leela/core) só aceita URL http(s); o seed grava caminho
// RELATIVO (`/seed-images/*.jpg`, consumido pelo painel no próprio public), que
// a landing descarta. Sem resolução app-side, TODO card caía no gradiente liso
// do `CardEvento` — o placeholder que o Vitor cobrou 3×. Mesma decisão do R7/R12
// para a página do evento (`resolverCapa`/`mockImagem`): dado real (URL http(s))
// tem precedência; sem ele, uma CAPA MOCK RICA por tema — nunca um gradiente.
//
// As capas mock são assets locais em `apps/landing/public/covers/` (FOTOS
// royalty-free de banco de imagens — Unsplash License, sem hotlink, baixadas no
// próprio public; LP-VENDAS-KIT/T1: o Vitor pediu imagens semi-realistas em vez
// de arte abstrata). A escolha é DETERMINÍSTICA pelo tema do evento (nome +
// distâncias), então o mesmo evento sempre mostra a mesma capa. Créditos das
// fotos: ver outputs/leela-build-2d6ee98d/LP-VENDAS-KIT-REPORT.md.
//
// Puro (sem React/estado): testável e reusável server+client.
// =============================================================================

/** Diretório dos assets de capa mock. */
const BASE = '/covers';

/** Capas mock por tema — FOTO semi-realista que lê como "capa de evento". */
export const CAPAS_MOCK = {
  corridaRua: `${BASE}/leela-cover-corrida-rua.jpg`,
  noturna: `${BASE}/leela-cover-noturna.jpg`,
  maratona: `${BASE}/leela-cover-maratona.jpg`,
  largada: `${BASE}/leela-cover-largada.jpg`,
  trail: `${BASE}/leela-cover-trail.jpg`,
  mtb: `${BASE}/leela-cover-mtb.jpg`,
  bemEstar: `${BASE}/leela-cover-bemestar.jpg`,
} as const;

/** Tema visual da capa a partir do nome + distâncias do evento (determinístico). */
export function temaCapa(nome: string, modalidades: readonly string[]): keyof typeof CAPAS_MOCK {
  const alvo = `${nome} ${modalidades.join(' ')}`.toLowerCase();

  // Ordem importa: temas específicos antes do default de corrida de rua.
  if (/noturn|night|neon|luar/.test(alvo)) return 'noturna';
  if (/\bmtb\b|mountain|\bbike\b|cicl|pedal|gravel|\bbtt\b/.test(alvo)) return 'mtb';
  if (/trilha|trail|montanha|travessia/.test(alvo)) return 'trail';
  if (/yoga|bem-?estar|retiro|wellness|medita|respiro/.test(alvo)) return 'bemEstar';
  if (/maratona|\bmeia\b|21k|42k/.test(alvo)) return 'maratona';
  if (/largada|silvestre|cl[áa]ssic|volta\s|revezamento/.test(alvo)) return 'largada';
  return 'corridaRua';
}

/**
 * Capa do card: a URL http(s) do organizador quando existe (já filtrada por
 * `isUrlCapaValida` no leitor), senão a capa mock rica do tema. NUNCA vazia →
 * o card sempre renderiza uma <img> de verdade (⛔ critério R14), jamais o
 * gradiente liso.
 */
export function capaDoEvento(ev: {
  nome: string;
  modalidades: readonly string[];
  imagemUrl?: string;
}): string {
  const real = ev.imagemUrl?.trim();
  if (real !== undefined && real.length > 0) return real;
  return CAPAS_MOCK[temaCapa(ev.nome, ev.modalidades)];
}
