// =============================================================================
// apps/landing/lib/kitImagem.ts
//
// Resolve a IMAGEM 1:1 de cada kit nas superfícies públicas (seção de kits da
// página de vendas + detalhe do kit no checkout) — LP-VENDAS-KIT / KIT-IMG.
//
// S212-T4 (RN-428): a cascata ganha um QUARTO degrau, que vale para a GALERIA
// (`galeriaDoKit`) e não para a foto única — em preview, kit sem fotos
// adicionais recebe duas do acervo local, determinísticas; em produção, kit sem
// adicionais mostra só a principal. O seed NÃO grava URL de foto (lição
// LEELA-R14 no cabeçalho do seed: URL absoluta amarraria a demonstração à porta
// do ambiente e quebraria no primeiro deploy).
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

/**
 * Ordem fixa do acervo mock (S212-T4 · RN-428). Existe para o par extra de
 * preview ser DETERMINÍSTICO: o mesmo kit mostra sempre as mesmas duas fotos, e
 * kits de temas diferentes mostram pares diferentes — senão a fita ficaria
 * piscando entre renders e a demonstração não provaria nada.
 */
const ORDEM_ACERVO_KIT = [
  'tee',
  'apparelBundle',
  'ciclismo',
  'trail',
  'wellness',
] as const satisfies readonly (keyof typeof KITS_MOCK)[];

/**
 * As duas fotos extras de PREVIEW de um kit: as duas seguintes ao tema dele na
 * ordem do acervo. Começar depois do próprio tema é o que garante que a fita
 * nunca repita a foto grande quando a principal também é mock. @pure
 */
export function extrasDePreview(nome: string, modalidades: readonly string[]): string[] {
  const tema = temaKit(nome, modalidades);
  const base = ORDEM_ACERVO_KIT.indexOf(tema);
  return [1, 2].map((passo) => {
    const chave = ORDEM_ACERVO_KIT[(base + passo) % ORDEM_ACERVO_KIT.length] as keyof typeof KITS_MOCK;
    return KITS_MOCK[chave];
  });
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
  if (secundarias.length > 0) return [principal, ...secundarias];
  // QUARTO DEGRAU (S212-T4 · RN-428) — a mesma honestidade de superfície dos
  // três de cima, agora para a galeria: em PREVIEW, kit sem adicionais ganha
  // duas fotos do acervo local para o Vitor conseguir avaliar a fita de
  // miniaturas; em PRODUÇÃO, kit sem adicionais mostra só a principal.
  if (preview) {
    return [
      principal,
      ...extrasDePreview(kit.nome, kit.modalidades).map<ImagemKitResolvida>((src) => ({
        src,
        origem: 'mock',
        ampliavel: true,
      })),
    ];
  }
  return [principal];
}
