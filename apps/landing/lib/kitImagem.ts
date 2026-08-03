// =============================================================================
// apps/landing/lib/kitImagem.ts
//
// Resolve a IMAGEM 1:1 de cada kit nas superfícies públicas (seção de kits da
// página de vendas + detalhe do kit no checkout) — LP-VENDAS-KIT / KIT-IMG.
//
// Cascata em três níveis (padrão capas R14 "sem dado → nunca vazio", mas com a
// honestidade de superfície do mockImagem/ehPreview — adendo 13):
//   1. imagemUrl REAL (upload 1:1 do organizador pelo KitEditor, já validada
//      http(s) pelo core RN-230) → sempre vence, em preview e em produção;
//   2. sem imagem + PREVIEW (Emulator ligado — o que o Vitor avalia) → FOTO
//      MOCK temática por kit (asset local, sem serviço externo), determinística;
//   3. sem imagem + PRODUÇÃO real → o PLACEHOLDER PADRÃO LEELA (wordmark sobre
//      fundo brasa, SVG estático). Nunca uma foto de kit que o organizador não
//      fotografou numa página de verdade — a foto mock é só do preview.
//
// Por que app-side (e não seedar `imagemUrl`): mesma razão das capas (LEELA-R14)
// — o seed NÃO grava URL http(s) e a guarda RN-230 rejeita caminho relativo, e
// a lição R14 é que mock é APP-SIDE. Créditos das fotos: ver
// outputs/leela-build-2d6ee98d/KIT-IMG-LANDING-REPORT.md.
//
// Puro (sem React/estado): o `preview` entra como parâmetro para o resolvedor
// ser testável (a cascata real → mock preview → padrão Leela) e reusável
// server (seção de kits) + client (detalhe do checkout).
// =============================================================================

/** Diretório dos assets de imagem de kit. */
const BASE = '/covers/kits';

/** Fotos mock por tema — FOTO de gear/vestuário que lê como "imagem do kit". */
export const KITS_MOCK = {
  ciclismo: `${BASE}/leela-kit-ciclismo.jpg`,
  trail: `${BASE}/leela-kit-trail.jpg`,
  wellness: `${BASE}/leela-kit-wellness.jpg`,
  /** Bundle de vestuário (premium/ouro) — várias peças, lê como "kit completo". */
  apparelBundle: `${BASE}/leela-kit-apparel-bundle.jpg`,
  /** Camiseta limpa — o default de corrida (prata/básico/genérico). */
  tee: `${BASE}/leela-kit-tee.jpg`,
} as const;

/**
 * Placeholder PADRÃO LEELA (T3) — wordmark cream sobre fundo brasa, SVG
 * estático (NÃO foto). Último fallback em TODA superfície de kit quando não há
 * imagem real e não estamos em preview. É o default de PRODUÇÃO (documentado
 * no épico E03).
 */
export const PLACEHOLDER_KIT = `${BASE}/leela-kit-placeholder.svg`;

/** Tema visual da foto mock a partir do nome + modalidades do kit (determinístico). */
export function temaKit(nome: string, modalidades: readonly string[]): keyof typeof KITS_MOCK {
  const alvo = `${nome} ${modalidades.join(' ')}`.toLowerCase();

  // Ordem importa: esporte específico antes do tier de vestuário de corrida.
  if (/\bmtb\b|mountain|\bbike\b|cicl|pedal|gravel|\bbtt\b|speed\b/.test(alvo)) return 'ciclismo';
  if (/trilha|trail|montanha|travessia|cross\b/.test(alvo)) return 'trail';
  if (/yoga|bem-?estar|wellness|medita|caminhada|walk|retiro|respiro/.test(alvo)) return 'wellness';
  // Tier premium ganha o bundle de várias peças; o resto, a camiseta limpa.
  if (/ouro|gold|premium|master|elite|full|completo|\btop\b|plus\b/.test(alvo)) return 'apparelBundle';
  return 'tee';
}

/**
 * Rótulo acessível/alt do kit — evita "Kit Kit Prata" quando o nome do doc já
 * começa com "Kit" (o caso comum do seed), mas ainda prefixa nomes soltos
 * ("Ouro" → "Kit Ouro") para o alt ser sempre descritivo (SEO/a11y).
 */
export function rotuloKit(nome: string): string {
  const limpo = nome.trim();
  return /^kit\b/i.test(limpo) ? limpo : `Kit ${limpo}`;
}

/** Origem da imagem resolvida — dita se ela é ampliável no lightbox. */
export type OrigemImagemKit = 'real' | 'mock' | 'placeholder';

/** Imagem de kit já resolvida para o slot 1:1. */
export interface ImagemKitResolvida {
  /** URL do asset (foto real/mock) ou do placeholder padrão Leela. */
  src: string;
  origem: OrigemImagemKit;
  /**
   * Ampliável no lightbox? Só a FOTO (real/mock) tem o que ampliar; o
   * placeholder brandado é wordmark — ampliá-lo não informa nada, então fica
   * estático (não vira botão).
   */
  ampliavel: boolean;
}

/**
 * Imagem 1:1 de um kit: dado REAL primeiro; sem ele, foto mock temática SÓ no
 * preview; em produção real sem imagem, o placeholder padrão Leela. NUNCA um
 * slot vazio, NUNCA uma foto fabricada numa página de produção.
 */
export function imagemDoKit(
  kit: { nome: string; modalidades: readonly string[]; imagemUrl?: string | null },
  preview: boolean,
): ImagemKitResolvida {
  const real = kit.imagemUrl?.trim();
  if (real !== undefined && real.length > 0) {
    return { src: real, origem: 'real', ampliavel: true };
  }
  if (preview) {
    return { src: KITS_MOCK[temaKit(kit.nome, kit.modalidades)], origem: 'mock', ampliavel: true };
  }
  return { src: PLACEHOLDER_KIT, origem: 'placeholder', ampliavel: false };
}

/** Kit visto pela galeria — a projeção pública mais as fotos adicionais. */
export interface KitComGaleria {
  nome: string;
  modalidades: readonly string[];
  imagemUrl?: string | null;
  fotosSecundarias?: readonly string[] | null;
}

/**
 * GALERIA do kit para o DETALHE (S212-T3 · RN-425/426): a principal resolvida
 * pela cascata de cima, seguida das fotos adicionais REAIS do organizador, na
 * ordem em que ele as pôs.
 *
 * Uma lista, nunca vazia — a posição 0 é sempre a que a listagem também mostra.
 * Kit de uma foto devolve uma entrada, e o detalhe volta a ser exatamente a
 * tela que era antes desta RN.
 *
 * As secundárias são sempre `origem: 'real'` e ampliáveis: elas só existem
 * quando o organizador subiu o arquivo. Só a posição 0 pode ser mock ou
 * placeholder, porque só ela tem cascata.
 */
export function galeriaDoKit(kit: KitComGaleria, preview: boolean): ImagemKitResolvida[] {
  const principal = imagemDoKit(kit, preview);
  const secundarias = (kit.fotosSecundarias ?? [])
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && f !== principal.src)
    .map<ImagemKitResolvida>((src) => ({ src, origem: 'real', ampliavel: true }));
  return [principal, ...secundarias];
}
