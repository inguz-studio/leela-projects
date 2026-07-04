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
// =============================================================================

import type { Timestamp } from '../index';

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
 */
export const CAMPOS_FUNCTION_INSCRITO = [
  'kitEntregueEm',
  'checkinEm',
  'qrToken',
  'ingressoEmitidoEm',
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

  const inscrito: Inscrito = {
    id,
    tenantId,
    atletaId,
    atletaNome,
    kit,
    chipNumero: typeof chipNumero === 'string' ? chipNumero : null,
    status,
    modalidade: typeof modalidade === 'string' ? modalidade : '',
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

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
