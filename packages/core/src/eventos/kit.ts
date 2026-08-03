// =============================================================================
// packages/core/src/eventos/kit.ts
//
// Entidades Kit e ItemKit — domínio puro (LEELA-S205-T1 · E03).
//   Kit:     `eventos/{eventoId}/kits/{kitId}` (subcoleção, tenant-scoped)
//   ItemKit: `itensKit/{itemId}` (top-level, tenant-scoped, com eventoId)
//
// RN-210: evento oferece 0..N kits.
// RN-211: "Sem kit" é kit válido e aceita preço NEGATIVO (desconto).
// RN-212: item é tamanhado (camiseta) ou único (sacochila, amostra).
// RN-213: item tem origem organizador | patrocinador.
// RN-214: item patrocinado tem toggle "Exibir logo ao atleta".
// RN-215: mesmo item pode aparecer em múltiplos kits (N:N) — estratégia:
//         array de refs `kits[]` no item + índice inverso desnormalizado
//         `usadoEm` (nomes) mantido pela Function itemKitIndex.
// RN-216: nomenclatura "kit" SEMPRE — "tier" não existe no produto.
// RN-225 (S210-T1 · FABLE-D): item tem `modeloEstoque` (`sob_encomenda` |
//         `estoque_proprio`) — base do aprovisionamento por SKU.
// RN-223 (S210-T1): item tamanhado carrega `tamanhosDisponiveis[]` (valores
//         de tamanho válidos, ex.: ['P','M','G','GG']) — fonte da validação
//         de tamanho do checkout (S209-T2) e da matriz de SKUs (S210-T3).
// RN-231 (TAMANHOS-GRADE): item tamanhado pode ter GRADE POR CORTE
//         (`grade[]` = [{corte: feminina|masculina|unissex, tamanhos[]}]) —
//         pedido do organizador: "separar forma masculina e feminina e DEPOIS
//         a pessoa seleciona o tamanho". RETROCOMPAT (Postel, só leitura):
//         doc legado com apenas `tamanhosDisponiveis[]` ≡ grade de UM corte
//         `unissex` — `gradeEfetivaDoItem` é o acessor canônico; NENHUM doc
//         existente é migrado. Corte unissex é PERMITIDO (default ratificado
//         do maestro): organizador que não separa forma usa grade única;
//         escolher M/F nunca é obrigatório por plataforma.
//
// RN-425 (S212-T1 · SPEC-KITCUPOM): o kit tem até TRÊS fotos e exatamente UMA
//         principal — POR CONSTRUÇÃO, não por validação. A principal continua
//         em `imagemUrl` (RN-227) e as outras duas vivem em
//         `fotosSecundarias[]`. Um `fotos[]` com sinalizador de principal foi
//         rejeitado na spec porque deixa representável o estado de zero e o de
//         duas principais, e aí a invariante vira checagem repetida em cada
//         superfície. Aqui não há o que checar: existe UM campo para a
//         principal. Consequência de graça: doc legado parseia sem migração e
//         TODA leitura de `imagemUrl` que já existe segue correta.
//         Acessor canônico = `fotosDoKit` (principal primeiro).
//
// CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): `Kit.id` dos kits canônicos do seed
// É o próprio valor do enum `KitInscrito` (`kit_ouro`, não `kit-ouro`) — o
// join `inscrito.kit === Kit.id` casa DIRETO, sem ponte de delimitador
// (`kitCasa`/`kitDocId` foram removidos). Kit custom de organizador tem id
// livre e colapsa em `sem_kit` no enum (fulfillment usa `inscrito.kitId`).
// =============================================================================

import type { Timestamp } from '../index';
import { isUrlCapaValida } from './evento';

// ---------------------------------------------------------------------------
// Kit
// ---------------------------------------------------------------------------

// Limites da VISÃO do kit (R9-C · RN-227/RN-230 — anti doc-bomba; a visão é
// decorativa, nunca pode virar vetor de payload gigante no checkout público).
/** Teto da descrição do kit (mesma ordem do `descricao` de clube). */
export const KIT_DESCRICAO_MAX = 280;
/** Máximo de itens exibíveis em "o que está incluso". */
export const KIT_ITENS_MAX = 30;
/** Teto de cada item da lista. */
export const KIT_ITEM_MAX = 140;

/**
 * Kit do evento (RN-210/211).
 * Subcoleção: `eventos/{eventoId}/kits/{kitId}`.
 *
 * VISÃO DE COMPRA (R9-C · gap R13 · RN-227/RN-230): `descricao`, `itens[]` e
 * `imagemUrl` alimentam o detalhe do kit no checkout. Todos OPCIONAIS — doc
 * legado continua parseando; a UI cai no fallback mock (nunca vazio).
 */
export interface Kit {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Nome exibido ("Kit Ouro", "Sem kit"…) — nunca "tier" (RN-216) */
  nome: string;
  /** Delta sobre o preço da inscrição; ACEITA NEGATIVO = desconto (RN-211) */
  preco: number;
  /** Capacidade máxima de escolha do kit */
  capacidade: number;
  /** Modalidades onde o kit é oferecido (ex.: ['21k']) */
  modalidades: string[];
  /** Frase que posiciona o kit no checkout (≤280 — RN-230). Ausente = fallback. */
  descricao?: string;
  /**
   * "O que está incluso" — itens em linguagem de produto (RN-230).
   * `[]` = doc legado/sem preenchimento → a UI usa o fallback.
   */
  itens: string[];
  /**
   * Imagem 1:1 do kit (RN-227): URL http(s) válida (upload em
   * `eventos/{eventoId}/kits/{kitId}` no Storage) ou ausente. NUNCA
   * fabricada; esquema fora de http(s) não passa do parse (a URL vira
   * `src` de <img> no checkout público).
   */
  imagemUrl?: string;
  /**
   * Fotos ADICIONAIS do kit (RN-425), até `KIT_FOTOS_SECUNDARIAS_MAX`. A ordem
   * do array é a ordem de exibição. Ausente/`[]` = kit de uma foto, que é o
   * que todo doc anterior a esta RN já era — sem migração.
   *
   * Detalhe de PERSISTÊNCIA: toda lógica nova lê por `fotosDoKit`, nunca
   * daqui, porque só o acessor garante "principal primeiro".
   */
  fotosSecundarias?: string[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** Preço de kit válido: número finito — negativo é legal (RN-211). @pure */
export function precoKitValido(preco: unknown): preco is number {
  return typeof preco === 'number' && Number.isFinite(preco);
}

/** Kit é desconto? ("Sem kit" com preço negativo — RN-211) @pure */
export function kitEhDesconto(kit: Pick<Kit, 'preco'>): boolean {
  return kit.preco < 0;
}

/**
 * Normaliza a lista "o que está incluso" de um doc (RN-230). Postel para
 * campo DECORATIVO: entrada que não é lista → `[]`; elementos que não são
 * string não-vazia são descartados; corta em KIT_ITENS_MAX e cada item em
 * KIT_ITEM_MAX. Um doc envenenado nunca derruba o checkout público. @pure
 */
export function normalizarItensKit(itens: unknown): string[] {
  if (!Array.isArray(itens)) return [];
  const resultado: string[] = [];
  for (const item of itens) {
    if (typeof item === 'string' && item.trim().length > 0) {
      resultado.push(item.slice(0, KIT_ITEM_MAX));
      if (resultado.length >= KIT_ITENS_MAX) break;
    }
  }
  return resultado;
}

/**
 * Imagem 1:1 do kit VÁLIDA para exibição (RN-227): reusa a fronteira da capa
 * (http(s) parseável, host presente, ≤2048 — `javascript:`/`data:` nunca
 * passam; a URL vira `src` de <img> público). @pure
 */
export function isUrlImagemKitValida(url: unknown): url is string {
  return isUrlCapaValida(url);
}

// ---------------------------------------------------------------------------
// Galeria do kit (RN-425/426/427 · S212-T1)
// ---------------------------------------------------------------------------

/** Teto de fotos SECUNDÁRIAS: com a principal fecham as três da RN-425. */
export const KIT_FOTOS_SECUNDARIAS_MAX = 2;

/**
 * Normaliza `fotosSecundarias` de um doc (RN-425). Postel de campo DECORATIVO,
 * mesma disciplina de `normalizarItensKit` — mais duas regras que existem por
 * um defeito VISÍVEL, não por gosto:
 *
 * - entrada que não é lista → `[]`;
 * - entrada que não passa em `isUrlImagemKitValida` é descartada item a item
 *   (a URL vira `src` de <img> público — `javascript:`/`data:` não passam);
 * - entrada IGUAL à principal é descartada: repetir a foto grande na fita de
 *   miniaturas é defeito que o visitante enxerga;
 * - entrada repetida DENTRO da lista é descartada, pelo mesmo motivo;
 * - a lista é cortada em `KIT_FOTOS_SECUNDARIAS_MAX` DEPOIS de filtrar, para
 *   que uma URL podre no começo não roube a vaga de uma boa.
 *
 * Um doc envenenado nunca derruba o parse nem o checkout público. @pure
 */
export function normalizarFotosSecundarias(
  fotos: unknown,
  imagemUrl?: unknown
): string[] {
  if (!Array.isArray(fotos)) return [];
  const principal = isUrlImagemKitValida(imagemUrl) ? imagemUrl : null;
  const resultado: string[] = [];
  const vistas = new Set<string>();
  for (const foto of fotos) {
    if (!isUrlImagemKitValida(foto)) continue;
    if (foto === principal || vistas.has(foto)) continue;
    vistas.add(foto);
    resultado.push(foto);
    if (resultado.length >= KIT_FOTOS_SECUNDARIAS_MAX) break;
  }
  return resultado;
}

/**
 * ACESSOR CANÔNICO da galeria (RN-425): principal primeiro, secundárias na
 * ordem do array; `[]` quando não há principal — kit com secundárias e sem
 * principal é estado que as listagens não sabem exibir, e o acessor não o
 * inventa.
 *
 * Toda superfície nova (galeria do detalhe, contagem, lightbox) lê por aqui;
 * `fotosSecundarias` cru fica sendo detalhe de persistência. @pure
 */
export function fotosDoKit(
  kit: Pick<Kit, 'imagemUrl' | 'fotosSecundarias'>
): string[] {
  if (!isUrlImagemKitValida(kit.imagemUrl)) return [];
  const secundarias = Array.isArray(kit.fotosSecundarias)
    ? kit.fotosSecundarias.filter(
        (f) => isUrlImagemKitValida(f) && f !== kit.imagemUrl
      )
    : [];
  return [kit.imagemUrl, ...secundarias.slice(0, KIT_FOTOS_SECUNDARIAS_MAX)];
}

/** As duas posições de foto de um kit, isoladas do resto do doc (RN-427). */
export interface GaleriaKit {
  imagemUrl?: string;
  fotosSecundarias?: string[];
}

/**
 * "Tornar principal" (RN-427): TROCA o conteúdo da secundária `indice` com a
 * principal. Nunca copia — copiar produziria a mesma foto duas vezes, que é
 * exatamente o defeito que a `normalizarFotosSecundarias` gasta uma regra para
 * impedir na leitura.
 *
 * Sem principal, a secundária SOBE e sai da lista, em vez de trocar com o
 * nada: um buraco na lista não é representável (`string[]`) e um `undefined`
 * lá dentro vazaria para o `src` de um <img>.
 *
 * `indice` fora da faixa devolve a galeria inalterada. Função pura e sem
 * mutação: é a ÚNICA operação capaz de violar a forma da RN-425 por descuido,
 * então existe uma só, testada uma vez, reusada por toda superfície. @pure
 */
export function promoverFotoPrincipal(
  galeria: GaleriaKit,
  indice: number
): GaleriaKit {
  const secundarias = Array.isArray(galeria.fotosSecundarias)
    ? [...galeria.fotosSecundarias]
    : [];
  if (!Number.isInteger(indice) || indice < 0 || indice >= secundarias.length) {
    return { ...galeria };
  }
  const promovida = secundarias[indice] as string;
  const anterior = galeria.imagemUrl;
  if (typeof anterior === 'string' && anterior.length > 0) {
    secundarias[indice] = anterior;
  } else {
    secundarias.splice(indice, 1);
  }
  return { ...galeria, imagemUrl: promovida, fotosSecundarias: secundarias };
}

/**
 * Remover a PRINCIPAL (RN-427): quando há secundárias, a primeira sobe. Kit
 * com galeria e sem principal não é exibível nas listagens (RN-426 manda a
 * listagem usar só a principal), então esse estado não pode nascer de um
 * clique em "remover".
 *
 * Sem secundárias, o kit fica sem foto — que é um estado legítimo e antigo
 * (a cascata do `kitImagem` cobre). @pure
 */
export function removerFotoPrincipal(galeria: GaleriaKit): GaleriaKit {
  const secundarias = Array.isArray(galeria.fotosSecundarias)
    ? [...galeria.fotosSecundarias]
    : [];
  const promovida = secundarias.shift();
  const proxima: GaleriaKit = { ...galeria, fotosSecundarias: secundarias };
  if (promovida === undefined) {
    delete proxima.imagemUrl;
    return proxima;
  }
  proxima.imagemUrl = promovida;
  return proxima;
}

/** Parsing defensivo de um doc Firestore em `Kit` (fail-fast). @pure */
export function parseKit(id: string, data: Record<string, unknown>): Kit {
  const tenantId = data['tenantId'];
  const nome = data['nome'];
  const preco = data['preco'];
  const capacidade = data['capacidade'];
  const modalidades = data['modalidades'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Kit ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Kit ${id}: campo "nome" inválido`);
  }
  if (!precoKitValido(preco)) {
    throw new Error(`Kit ${id}: preco deve ser número (negativo ok — RN-211)`);
  }
  if (!Array.isArray(modalidades) || !modalidades.every((m) => typeof m === 'string')) {
    throw new Error(`Kit ${id}: campo "modalidades" inválido`);
  }

  const kit: Kit = {
    id,
    tenantId,
    nome,
    preco,
    capacidade: typeof capacidade === 'number' ? capacidade : 0,
    modalidades,
    // RN-230: campos de visão são DECORATIVOS — normalização Postel (nunca
    // derrubam o parse; segurança da URL via isUrlImagemKitValida abaixo).
    itens: normalizarItensKit(data['itens']),
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

  const descricao = data['descricao'];
  if (typeof descricao === 'string' && descricao.trim().length > 0) {
    kit.descricao = descricao.slice(0, KIT_DESCRICAO_MAX);
  }
  // RN-227: URL inválida/esquema perigoso é OMITIDA (fallback mock), não
  // propagada — o campo alimenta <img src> na landing pública.
  if (isUrlImagemKitValida(data['imagemUrl'])) {
    kit.imagemUrl = data['imagemUrl'] as string;
  }
  // RN-425: a galeria só existe DEPOIS da principal — a normalização precisa
  // da `imagemUrl` já resolvida para descartar a repetição. Campo OMITIDO
  // quando não sobra nada, para o doc de um kit de uma foto continuar
  // exatamente o objeto que sempre foi.
  const fotosSecundarias = normalizarFotosSecundarias(
    data['fotosSecundarias'],
    kit.imagemUrl
  );
  if (fotosSecundarias.length > 0) {
    kit.fotosSecundarias = fotosSecundarias;
  }

  return kit;
}

// ---------------------------------------------------------------------------
// ItemKit
// ---------------------------------------------------------------------------

/** Origem do item (RN-213) */
export type OrigemItem = 'organizador' | 'patrocinador';

/** Lista canônica de origens */
export const ORIGENS_ITEM: readonly OrigemItem[] = ['organizador', 'patrocinador'];

/**
 * Modelo de estoque do item (RN-225 · S210-T1):
 *   - `sob_encomenda`:   vende sem estimativa e encomenda pelo vendido —
 *     "a encomendar" (RN-224) é o número que resolve a compra;
 *   - `estoque_proprio`: organizador tem saldo físico próprio.
 */
export type ModeloEstoque = 'sob_encomenda' | 'estoque_proprio';

/** Lista canônica de modelos de estoque (RN-225) */
export const MODELOS_ESTOQUE: readonly ModeloEstoque[] = [
  'sob_encomenda',
  'estoque_proprio',
];

/** Type guard de ModeloEstoque (RN-225) */
export function isModeloEstoque(value: unknown): value is ModeloEstoque {
  return (
    typeof value === 'string' &&
    (MODELOS_ESTOQUE as readonly string[]).includes(value)
  );
}

/** Type guard de OrigemItem (RN-213) */
export function isOrigemItem(value: unknown): value is OrigemItem {
  return (
    typeof value === 'string' && (ORIGENS_ITEM as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Grade por corte (RN-231 · TAMANHOS-GRADE)
// ---------------------------------------------------------------------------

/**
 * Corte do item tamanhado (RN-231). Enum FECHADO — os valores entram na chave
 * de SKU (`itemId__corte__tamanho`) e por isso NUNCA podem conter o separador
 * `__` nem crescer sem revisar o round-trip da chave (aprovisionamento.ts).
 * `unissex` = grade única (default ratificado — nunca é obrigatório separar).
 */
export type CorteItem = 'feminina' | 'masculina' | 'unissex';

/** Lista canônica de cortes (RN-231) — única fonte para validação/UI. */
export const CORTES_ITEM: readonly CorteItem[] = [
  'feminina',
  'masculina',
  'unissex',
];

/** Type guard de CorteItem (RN-231) */
export function isCorteItem(value: unknown): value is CorteItem {
  return (
    typeof value === 'string' && (CORTES_ITEM as readonly string[]).includes(value)
  );
}

/** Uma linha da grade: corte + tamanhos válidos DESSE corte (RN-231). */
export interface GradeCorte {
  corte: CorteItem;
  /** Tamanhos válidos do corte (ex.: ['P','M','G']) — não-vazios, sem `__`. */
  tamanhos: string[];
}

/** Tamanho de item VÁLIDO para compor chave de SKU: não-vazio e sem `__`
 *  (S210-T2 — `__` quebraria o round-trip `itemId__[corte__]tamanho`). @pure */
export function isTamanhoItemValido(t: unknown): t is string {
  return typeof t === 'string' && t.length > 0 && !t.includes('__');
}

/**
 * Valida uma grade de escrita (config do organizador — fail-fast como o resto
 * do parse). Regras: lista não-vazia de entradas {corte ∈ enum, tamanhos
 * lista não-vazia de tamanhos válidos}; corte NÃO repete (uma linha por
 * corte); tamanho não repete DENTRO do corte (SKU colapsaria). Retorna a
 * lista de erros (vazia = válida). @pure
 */
export function validarGradeItem(grade: unknown): string[] {
  if (!Array.isArray(grade) || grade.length === 0) {
    return ['grade deve ser lista não-vazia de {corte, tamanhos[]} (RN-231)'];
  }
  const erros: string[] = [];
  const cortesVistos = new Set<string>();
  grade.forEach((linha, idx) => {
    if (linha === null || typeof linha !== 'object' || Array.isArray(linha)) {
      erros.push(`grade[${idx}]: entrada deve ser objeto {corte, tamanhos[]}`);
      return;
    }
    const { corte, tamanhos } = linha as Record<string, unknown>;
    if (!isCorteItem(corte)) {
      erros.push(`grade[${idx}]: corte "${String(corte)}" fora do enum (RN-231)`);
      return;
    }
    if (cortesVistos.has(corte)) {
      erros.push(`grade[${idx}]: corte "${corte}" repetido (uma linha por corte)`);
      return;
    }
    cortesVistos.add(corte);
    if (
      !Array.isArray(tamanhos) ||
      tamanhos.length === 0 ||
      !tamanhos.every(isTamanhoItemValido)
    ) {
      erros.push(
        `grade[${idx}] (${corte}): tamanhos deve ser lista não-vazia de ` +
          `tamanhos não-vazios sem "__" (RN-223/S210-T2)`
      );
      return;
    }
    if (new Set(tamanhos).size !== tamanhos.length) {
      erros.push(`grade[${idx}] (${corte}): tamanho repetido no corte`);
    }
  });
  return erros;
}

/**
 * Grade EFETIVA de um item parseado (acessor canônico — RN-231):
 *   - `grade[]` presente e não-vazia → é ela;
 *   - senão, item tamanhado com `tamanhosDisponiveis[]` legado → grade de UM
 *     corte `unissex` (retrocompat Postel de leitura — doc NÃO é migrado);
 *   - senão → `[]` (item único ou tamanhado sem configuração).
 * TODA lógica nova (SKUs declarados, validação de checkout, UI) lê por aqui —
 * `tamanhosDisponiveis` cru vira detalhe de persistência legado. @pure
 */
export function gradeEfetivaDoItem(
  item: Pick<ItemKit, 'tamanhado' | 'tamanhosDisponiveis'> & {
    grade?: GradeCorte[];
  }
): GradeCorte[] {
  if (Array.isArray(item.grade) && item.grade.length > 0) return item.grade;
  if (item.tamanhado && item.tamanhosDisponiveis.length > 0) {
    return [{ corte: 'unissex', tamanhos: [...item.tamanhosDisponiveis] }];
  }
  return [];
}

/** Tamanhos de um corte na grade — `[]` quando o corte não existe nela. @pure */
export function tamanhosDoCorte(
  grade: readonly GradeCorte[],
  corte: CorteItem
): string[] {
  return grade.find((g) => g.corte === corte)?.tamanhos ?? [];
}

/**
 * Grade efetiva a partir de um DOC CRU de `itensKit` (Postel — para Functions
 * que leem snapshots sem parse fail-fast, ex.: agregação de estoque e
 * validação do checkout): entradas inválidas são DESCARTADAS (corte fora do
 * enum, tamanho vazio/com `__`), corte repetido fica com a PRIMEIRA linha;
 * sem grade aproveitável cai no legado `tamanhosDisponiveis` ≡ unissex.
 * Item não-tamanhado → `[]` sempre. Um doc envenenado nunca derruba a
 * agregação — e nunca legitima um SKU forjado (só entra o que é válido). @pure
 */
export function gradeDoDocItemKit(data: Record<string, unknown>): GradeCorte[] {
  if (data['tamanhado'] !== true) return [];
  const bruto = data['grade'];
  const resultado: GradeCorte[] = [];
  if (Array.isArray(bruto)) {
    const cortesVistos = new Set<string>();
    for (const linha of bruto) {
      if (linha === null || typeof linha !== 'object' || Array.isArray(linha)) continue;
      const { corte, tamanhos } = linha as Record<string, unknown>;
      if (!isCorteItem(corte) || cortesVistos.has(corte)) continue;
      const validos = Array.isArray(tamanhos)
        ? [...new Set(tamanhos.filter(isTamanhoItemValido))]
        : [];
      if (validos.length === 0) continue;
      cortesVistos.add(corte);
      resultado.push({ corte, tamanhos: validos });
    }
  }
  if (resultado.length > 0) return resultado;
  const legado = data['tamanhosDisponiveis'];
  const tamanhosLegado = Array.isArray(legado)
    ? [...new Set(legado.filter(isTamanhoItemValido))]
    : [];
  return tamanhosLegado.length > 0
    ? [{ corte: 'unissex', tamanhos: tamanhosLegado }]
    : [];
}

/** Entrada do índice inverso desnormalizado "usado em" (RN-215) */
export interface UsadoEmKit {
  kitId: string;
  /** 🔁 Nome do kit — desnormalizado para exibição sem N reads */
  nome: string;
}

/**
 * Item do catálogo de kits (RN-212/213/214/215).
 * Coleção top-level: `itensKit/{itemId}` — tenant-scoped, aponta o evento.
 */
export interface ItemKit {
  id: string;
  /** Isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Evento cujos kits este item integra (refs de `kits[]`) */
  eventoId: string;
  nome: string;
  /** true = tamanhado (camiseta); false = único (sacochila, amostra) — RN-212 */
  tamanhado: boolean;
  /** RN-213 */
  origem: OrigemItem;
  /** Marca do patrocinador (só quando origem = patrocinador) */
  marca?: string;
  /** "Exibir logo ao atleta" — só faz sentido patrocinado (RN-214) */
  exibirLogo: boolean;
  /**
   * RN-225 (S210-T1) — modelo de estoque do item. Doc legado (pré-FABLE-D)
   * normaliza para `sob_encomenda`: é o modelo SEM premissa de saldo físico
   * ("vende sem estimativa, encomenda pelo vendido") — default honesto para
   * item que nunca declarou estoque.
   */
  modeloEstoque: ModeloEstoque;
  /**
   * RN-223 (S210-T1) — valores de tamanho VÁLIDOS do item tamanhado
   * (ex.: ['P','M','G','GG']). `[]` = item único (não tamanhado) ou doc
   * legado. Fonte da validação do checkout (S209-T2) e da matriz de SKUs
   * do aprovisionamento (S210-T3 — ver aprovisionamento.ts).
   */
  tamanhosDisponiveis: string[];
  /**
   * RN-231 (TAMANHOS-GRADE) — grade por CORTE do item tamanhado. Ausente =
   * doc legado/sem separação: `gradeEfetivaDoItem` deriva a grade unissex de
   * `tamanhosDisponiveis`. Quando presente, é a FONTE da validação do
   * checkout (corte→tamanho) e da matriz de SKUs (`itemId__corte__tamanho`).
   */
  grade?: GradeCorte[];
  /** N:N — ids dos kits que incluem este item (fonte de verdade — RN-215) */
  kits: string[];
  /** ∑ Índice inverso desnormalizado — mantido pela Function itemKitIndex */
  usadoEm?: UsadoEmKit[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Toggle de logo permitido? Item do organizador NUNCA tem toggle (RN-214).
 * @pure
 */
export function podeExibirLogo(item: Pick<ItemKit, 'origem'>): boolean {
  return item.origem === 'patrocinador';
}

/**
 * Shape coerente de exibirLogo (espelha a Rule): organizador → sempre false.
 * @pure
 */
export function exibirLogoCoerente(
  item: Pick<ItemKit, 'origem' | 'exibirLogo'>
): boolean {
  return item.origem === 'patrocinador' || item.exibirLogo === false;
}

/**
 * Computa o índice inverso "usado em: [kits]" a partir da fonte de verdade
 * (`item.kits`) e do mapa kitId → nome. Kits ausentes do mapa (deletados)
 * são omitidos. Determinístico e idempotente (ordem = ordem de `kits`).
 * @pure
 */
export function computeUsadoEm(
  kitsIds: readonly string[],
  nomesPorKitId: Readonly<Record<string, string>>
): UsadoEmKit[] {
  const resultado: UsadoEmKit[] = [];
  for (const kitId of kitsIds) {
    const nome = nomesPorKitId[kitId];
    if (typeof nome === 'string' && nome.length > 0) {
      resultado.push({ kitId, nome });
    }
  }
  return resultado;
}

/** Parsing defensivo de um doc Firestore em `ItemKit` (fail-fast). @pure */
export function parseItemKit(id: string, data: Record<string, unknown>): ItemKit {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const nome = data['nome'];
  const tamanhado = data['tamanhado'];
  const origem = data['origem'];
  const exibirLogo = data['exibirLogo'];
  const kits = data['kits'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`ItemKit ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`ItemKit ${id}: campo "nome" inválido`);
  }
  if (typeof tamanhado !== 'boolean') {
    throw new Error(`ItemKit ${id}: "tamanhado" deve ser boolean (RN-212)`);
  }
  if (!isOrigemItem(origem)) {
    throw new Error(`ItemKit ${id}: origem "${String(origem)}" fora do enum (RN-213)`);
  }
  if (typeof exibirLogo !== 'boolean') {
    throw new Error(`ItemKit ${id}: "exibirLogo" deve ser boolean (RN-214)`);
  }
  if (!exibirLogoCoerente({ origem, exibirLogo })) {
    throw new Error(`ItemKit ${id}: item do organizador não exibe logo (RN-214)`);
  }
  if (!Array.isArray(kits) || !kits.every((k) => typeof k === 'string')) {
    throw new Error(`ItemKit ${id}: campo "kits" inválido (RN-215)`);
  }

  // RN-225: presente deve estar no enum; ausente normaliza para
  // 'sob_encomenda' (doc legado — ver comentário do campo).
  const modeloEstoque = data['modeloEstoque'];
  if (modeloEstoque !== undefined && !isModeloEstoque(modeloEstoque)) {
    throw new Error(
      `ItemKit ${id}: modeloEstoque "${String(modeloEstoque)}" fora do enum (RN-225)`
    );
  }

  // RN-223: presente deve ser lista de tamanhos não-vazios; ausente = []
  // (legado/item único). "__" é o separador de SKU (S210-T2) — tamanho que o
  // contenha quebraria o round-trip da chave `itemId__tamanho`.
  const tamanhosDisponiveis = data['tamanhosDisponiveis'];
  if (
    tamanhosDisponiveis !== undefined &&
    (!Array.isArray(tamanhosDisponiveis) ||
      !tamanhosDisponiveis.every(
        (t) => typeof t === 'string' && t.length > 0 && !t.includes('__')
      ))
  ) {
    throw new Error(
      `ItemKit ${id}: "tamanhosDisponiveis" deve ser lista de tamanhos ` +
        `não-vazios sem "__" (RN-223/S210-T2)`
    );
  }

  // RN-231: grade presente deve ser válida (fail-fast — é config que vira
  // chave de SKU); ausente = doc legado (gradeEfetivaDoItem cobre a leitura).
  const grade = data['grade'];
  if (grade !== undefined) {
    const errosGrade = validarGradeItem(grade);
    if (errosGrade.length > 0) {
      throw new Error(`ItemKit ${id}: ${errosGrade.join('; ')}`);
    }
    if (tamanhado !== true) {
      throw new Error(`ItemKit ${id}: grade só existe em item tamanhado (RN-212/231)`);
    }
  }

  const item: ItemKit = {
    id,
    tenantId,
    eventoId: typeof eventoId === 'string' ? eventoId : '',
    nome,
    tamanhado,
    origem,
    exibirLogo,
    modeloEstoque: modeloEstoque === undefined ? 'sob_encomenda' : modeloEstoque,
    tamanhosDisponiveis:
      tamanhosDisponiveis === undefined ? [] : (tamanhosDisponiveis as string[]),
    kits,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

  if (grade !== undefined) {
    item.grade = grade as GradeCorte[];
  }
  if (typeof data['marca'] === 'string') {
    item.marca = data['marca'];
  }
  if (Array.isArray(data['usadoEm'])) {
    item.usadoEm = data['usadoEm'] as UsadoEmKit[];
  }

  return item;
}
