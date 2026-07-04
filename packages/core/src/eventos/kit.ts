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

  const item: ItemKit = {
    id,
    tenantId,
    eventoId: typeof eventoId === 'string' ? eventoId : '',
    nome,
    tamanhado,
    origem,
    exibirLogo,
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
