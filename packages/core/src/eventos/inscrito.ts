// =============================================================================
// packages/core/src/eventos/inscrito.ts
//
// Entidade Inscrito — join Atleta ↔ Evento (LEELA-S203-T1 · E03).
// Subcoleção: `eventos/{eventoId}/inscritos/{inscritoId}` — tenant-scoped
// (carrega tenantId coerente com o evento pai — ADR-009 / S1600).
//
// RN-202: kit ∈ {kit_ouro, kit_prata, kit_basico, sem_kit}
// RN-203: chipNumero nulo até a entrega
// RN-204: status ∈ {confirmado, pendente, cancelado}
// RN-205/221/222: kitEntregueEm/checkinEm são carimbos distintos, escritos
//                 SÓ por Function (`registrarEntrega`/`registrarCheckin`).
//
// ADR-011 (FABLE-A-T2): o Inscrito ganha o LINK ao pedido (`pedidoRef` +
// `ehResponsavel`) e o bloco `[reg]` do titular (`dadosPessoais` +
// `tamanhos`). Decisão denorm×join:
//   - `[reg]`/`tamanhos` MORAM aqui (cópia canônica, não denormalização:
//     o pedido NÃO carrega dado pessoal por inscrito — titular próprio é o
//     próprio ADR-011). Dono da escrita = Function do checkout (S1203-T5).
//   - `[pag]` NUNCA se denormaliza: dinheiro muda de estado por webhook e
//     estorno opera POR INSCRITO — espelhar em N docs criaria fan-out de
//     writes financeiros sem ganho de leitura (o slide-in lê 1 inscrito →
//     2 point reads O(1): pedidoRef → pedido → pagamentoRef → pagamento).
// =============================================================================

import type { Timestamp } from '../index';
import type { Pedido } from '../pedidos/pedido';
import {
  parseDadosPessoais,
  parseTamanhos,
  type DadosPessoaisInscrito,
} from './dadosPessoais';

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/** Kit escolhido pelo inscrito (RN-202; nomenclatura "kit", nunca "tier" — RN-216) */
export type KitInscrito = 'kit_ouro' | 'kit_prata' | 'kit_basico' | 'sem_kit';

/** Lista canônica de kits — única fonte para validação/UI */
export const KITS_INSCRITO: readonly KitInscrito[] = [
  'kit_ouro',
  'kit_prata',
  'kit_basico',
  'sem_kit',
];

/** Type guard de KitInscrito (RN-202) */
export function isKitInscrito(value: unknown): value is KitInscrito {
  return (
    typeof value === 'string' && (KITS_INSCRITO as readonly string[]).includes(value)
  );
}

/** Status da inscrição (RN-204) */
export type StatusInscrito = 'confirmado' | 'pendente' | 'cancelado';

/** Lista canônica de status de inscrito */
export const STATUS_INSCRITO: readonly StatusInscrito[] = [
  'confirmado',
  'pendente',
  'cancelado',
];

/** Type guard de StatusInscrito (RN-204) */
export function isStatusInscrito(value: unknown): value is StatusInscrito {
  return (
    typeof value === 'string' && (STATUS_INSCRITO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Inscrito — join Atleta ↔ Evento.
 * Subcoleção: `eventos/{eventoId}/inscritos/{inscritoId}`.
 * Paginação obrigatória na listagem (mock canônico: 453 — HANDOFF-05).
 */
export interface Inscrito {
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Referência ao atleta (→ atletas/{atletaId}) */
  atletaId: string;
  /** 🔁 Desnormalizado — mantido por Function */
  atletaNome: string;
  /** RN-202 */
  kit: KitInscrito;
  /** RN-203 — null até a entrega do kit no balcão */
  chipNumero: string | null;
  /** RN-204 */
  status: StatusInscrito;
  /** Percurso escolhido (5k/10k/21k…) */
  modalidade: string;
  /**
   * ADR-011 — pedido a que a inscrição pertence (→ pedidos/{pedidoId}).
   * null = legado pré-ADR-011 ou inscrição ainda sem pedido (o join `[pag]`
   * cai no fallback `getPedidoDoInscrito` por `inscritoRefs`).
   * Escrita SÓ pela Function do checkout (S1203-T5).
   */
  pedidoRef: string | null;
  /**
   * ADR-011 — este inscrito também é o responsável/pagador do pedido
   * (auto-inscrição = pedido de 1 inscrito com ehResponsavel = true).
   * Coerência com `pedido.responsavel` verificável por
   * `pedidoDoInscritoCoerente`. Escrita SÓ pela Function do checkout.
   */
  ehResponsavel: boolean;
  /**
   * RN-223/S209-T1 — tamanho POR ITEM TAMANHADO do kit (`itemId → tamanho`,
   * ex.: `{ "camiseta-tecnica": "M" }`). `{}` = kit sem item tamanhado ou
   * doc legado. Por inscrito, nunca herdado do responsável (ADR-011).
   */
  tamanhos: Record<string, string>;
  /**
   * `[reg]` — dados pessoais do TITULAR coletados no checkout (S1202).
   * ⚠️ PII/LGPD (inclui dado sensível): leitura só do organizador (Rules);
   * escrita SÓ pela Function do checkout; A-T3 mascara CPF/telefone.
   */
  dadosPessoais?: DadosPessoaisInscrito;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  // ── Carimbos de operação — escrita SÓ por Function (RN-205/221/222) ──────
  /** Kit retirado no balcão (retirar = presença — RN-205) */
  kitEntregueEm?: Timestamp;
  /** Presença na largada (kit antecipado seta só este — RN-222) */
  checkinEm?: Timestamp;
  /** Token opaco do ingresso/QR (RN-218/221 — S1206) */
  qrToken?: string;
  /** Emissão do ingresso digital (S1206) */
  ingressoEmitidoEm?: Timestamp;
}

/**
 * Campos do inscrito com escrita EXCLUSIVA de Cloud Function
 * (espelhados nas Security Rules — o cliente nunca os escreve).
 *
 * FABLE-A-T2 (ADR-011): `pedidoRef`/`ehResponsavel` (link ao pedido) e
 * `dadosPessoais`/`tamanhos` (bloco `[reg]` + RN-223) são escritos pela
 * Function do checkout (S1203-T5) no MESMO fluxo que cria o pedido —
 * cliente não forja vínculo financeiro nem edita PII por escrita direta.
 * As Rules de `inscritos` ESPELHAM os 4 campos (aplicado em 2c01306):
 * `semCamposDeFunctionInscrito`/`camposDeFunctionIntocados` os incluem nas
 * listas `hasAny`, negando escrita direta de cliente no create/update.
 */
export const CAMPOS_FUNCTION_INSCRITO = [
  'kitEntregueEm',
  'checkinEm',
  'qrToken',
  'ingressoEmitidoEm',
  'pedidoRef',
  'ehResponsavel',
  'dadosPessoais',
  'tamanhos',
] as const;

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/** Chip já vinculado? (RN-203 — nulo até a entrega) @pure */
export function chipVinculado(inscrito: Pick<Inscrito, 'chipNumero'>): boolean {
  return typeof inscrito.chipNumero === 'string' && inscrito.chipNumero.length > 0;
}

/** Inscrito conta para operação/entrega? (cancelado fica fora) @pure */
export function inscritoAtivo(inscrito: Pick<Inscrito, 'status'>): boolean {
  return inscrito.status !== 'cancelado';
}

/** Já pertence a um pedido? (false = legado pré-ADR-011) @pure */
export function inscritoTemPedido(
  inscrito: Pick<Inscrito, 'pedidoRef'>
): boolean {
  return inscrito.pedidoRef !== null;
}

/**
 * O link inscrito↔pedido é COERENTE? (ADR-011 — guarda do join `[pag]`)
 * Verifica as três pontas da relação denormalizada:
 *   1. `pedidoRef` aponta para ESTE pedido;
 *   2. o pedido lista o inscrito em `inscritoRefs` (índice inverso);
 *   3. `ehResponsavel` bate com `pedido.responsavel.atletaId`.
 * Falso = dado corrompido → o chamador NÃO renderiza a compra (mostrar o
 * pedido errado é pior que não mostrar). @pure
 */
export function pedidoDoInscritoCoerente(
  inscrito: Pick<Inscrito, 'id' | 'atletaId' | 'pedidoRef' | 'ehResponsavel'>,
  pedido: Pick<Pedido, 'id' | 'inscritoRefs' | 'responsavel'>
): boolean {
  return (
    inscrito.pedidoRef === pedido.id &&
    pedido.inscritoRefs.includes(inscrito.id) &&
    inscrito.ehResponsavel === (pedido.responsavel.atletaId === inscrito.atletaId)
  );
}

/**
 * Parsing defensivo de um doc Firestore em `Inscrito` (fail-fast).
 * @pure
 */
export function parseInscrito(id: string, data: Record<string, unknown>): Inscrito {
  const tenantId = data['tenantId'];
  const atletaId = data['atletaId'];
  const atletaNome = data['atletaNome'];
  const kit = data['kit'];
  const status = data['status'];
  const modalidade = data['modalidade'];
  const chipNumero = data['chipNumero'];
  const pedidoRef = data['pedidoRef'];
  const ehResponsavel = data['ehResponsavel'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Inscrito ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof atletaId !== 'string' || atletaId.length === 0) {
    throw new Error(`Inscrito ${id}: campo "atletaId" inválido`);
  }
  if (typeof atletaNome !== 'string' || atletaNome.length === 0) {
    throw new Error(`Inscrito ${id}: campo "atletaNome" inválido`);
  }
  if (!isKitInscrito(kit)) {
    throw new Error(`Inscrito ${id}: kit "${String(kit)}" fora do enum (RN-202)`);
  }
  if (!isStatusInscrito(status)) {
    throw new Error(`Inscrito ${id}: status "${String(status)}" fora do enum (RN-204)`);
  }
  if (chipNumero !== null && chipNumero !== undefined && typeof chipNumero !== 'string') {
    throw new Error(`Inscrito ${id}: chipNumero inválido (RN-203)`);
  }

  // ADR-011: pedidoRef ausente normaliza para null (legado pré-pedido);
  // presente deve ser id não-vazio — link financeiro corrompido lança.
  if (
    pedidoRef !== null &&
    pedidoRef !== undefined &&
    (typeof pedidoRef !== 'string' || pedidoRef.length === 0)
  ) {
    throw new Error(`Inscrito ${id}: "pedidoRef" inválido (string|null — ADR-011)`);
  }
  if (ehResponsavel !== undefined && typeof ehResponsavel !== 'boolean') {
    throw new Error(`Inscrito ${id}: "ehResponsavel" deve ser boolean (ADR-011)`);
  }

  const contexto = `Inscrito ${id}`;
  const inscrito: Inscrito = {
    id,
    tenantId,
    atletaId,
    atletaNome,
    kit,
    chipNumero: typeof chipNumero === 'string' ? chipNumero : null,
    status,
    modalidade: typeof modalidade === 'string' ? modalidade : '',
    pedidoRef: typeof pedidoRef === 'string' ? pedidoRef : null,
    ehResponsavel: ehResponsavel === true,
    tamanhos: parseTamanhos(contexto, data['tamanhos']),
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

  // Coerência ADR-011: responsável SEM pedido é impossível — a Function do
  // checkout escreve pedidoRef e ehResponsavel no MESMO batch que cria o
  // pedido. Fail-fast: flag órfã indica vínculo financeiro corrompido.
  if (inscrito.ehResponsavel && inscrito.pedidoRef === null) {
    throw new Error(
      `Inscrito ${id}: ehResponsavel true com pedidoRef null — vínculo ` +
        `ao pedido incoerente (ADR-011: escritos no mesmo batch do checkout)`
    );
  }

  if (data['dadosPessoais'] !== undefined) {
    inscrito.dadosPessoais = parseDadosPessoais(contexto, data['dadosPessoais']);
  }

  if (data['kitEntregueEm'] !== undefined) {
    inscrito.kitEntregueEm = data['kitEntregueEm'] as Timestamp;
  }
  if (data['checkinEm'] !== undefined) {
    inscrito.checkinEm = data['checkinEm'] as Timestamp;
  }
  if (typeof data['qrToken'] === 'string') {
    inscrito.qrToken = data['qrToken'];
  }
  if (data['ingressoEmitidoEm'] !== undefined) {
    inscrito.ingressoEmitidoEm = data['ingressoEmitidoEm'] as Timestamp;
  }

  return inscrito;
}
