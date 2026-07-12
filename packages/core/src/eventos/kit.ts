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
//
// CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): `Kit.id` dos kits canônicos do seed
// É o próprio valor do enum `KitInscrito` (`kit_ouro`, não `kit-ouro`) — o
// join `inscrito.kit === Kit.id` casa DIRETO, sem ponte de delimitador
// (`kitCasa`/`kitDocId` foram removidos). Kit custom de organizador tem id
// livre e colapsa em `sem_kit` no enum (fulfillment usa `inscrito.kitId`).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Kit
// ---------------------------------------------------------------------------

/**
 * Kit do evento (RN-210/211).
 * Subcoleção: `eventos/{eventoId}/kits/{kitId}`.
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

  return {
    id,
    tenantId,
    nome,
    preco,
    capacidade: typeof capacidade === 'number' ? capacidade : 0,
    modalidades,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
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

  if (typeof data['marca'] === 'string') {
    item.marca = data['marca'];
  }
  if (Array.isArray(data['usadoEm'])) {
    item.usadoEm = data['usadoEm'] as UsadoEmKit[];
  }

  return item;
}
