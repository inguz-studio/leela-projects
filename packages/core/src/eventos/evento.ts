// =============================================================================
// packages/core/src/eventos/evento.ts
//
// Entidade Evento — domínio puro (LEELA-S200-T1 · E03).
// Coleção: `eventos/{eventoId}` (docId = slug) — tenant-scoped (ADR-009).
//
// Agregados ∑ (`qtdInscritos`, `receitaConfirmada`) são mantidos por Cloud
// Function e NUNCA escritos pelo cliente — as Security Rules negam.
// Ref: leela-specs/modelo-de-dados-firestore.md · RN-200/201.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Status do ciclo de vida
// ---------------------------------------------------------------------------

/** Status do ciclo de vida de um evento */
export type StatusEvento = 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado';

/** Lista canônica de status — única fonte para validação/UI */
export const STATUS_EVENTO: readonly StatusEvento[] = [
  'rascunho',
  'publicado',
  'ao_vivo',
  'encerrado',
];

/** Type guard de StatusEvento (parsing de dados vindos do Firestore) */
export function isStatusEvento(value: unknown): value is StatusEvento {
  return (
    typeof value === 'string' && (STATUS_EVENTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Evento de corrida — tenant-scoped.
 * Coleção: `eventos/{eventoId}` (docId = slug).
 * Subcoleções: inscritos, kits, programaAfiliacao, politicaVendas, etc.
 */
export interface Evento {
  /** docId = slug */
  id: string;
  /** Isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** Referência ao profissional organizador */
  organizadorId: string;
  nome: string;
  data: Timestamp;
  local: string;
  /** Lista de percursos/modalidades do evento */
  modalidades: string[];
  slug: string;
  status: StatusEvento;
  /** Usa chip de cronometragem (RN-207) */
  usaChip: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** Agregado ∑ — mantido por Cloud Function */
  qtdInscritos: number;
  /** Agregado ∑ financeiro confirmado — mantido por Cloud Function */
  receitaConfirmada: number;
}

/**
 * Campos agregados ∑ do evento — escrita EXCLUSIVA de Cloud Function.
 * As Security Rules usam esta mesma lista (espelhada em firestore.rules).
 */
export const CAMPOS_AGREGADOS_EVENTO = ['qtdInscritos', 'receitaConfirmada'] as const;

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/**
 * Há venda registrada? (base da RN-200 — bloqueio de preço após 1ª venda).
 * Deriva do agregado ∑ `qtdInscritos` mantido por Function.
 * @pure
 */
export function temVenda(evento: Pick<Evento, 'qtdInscritos'>): boolean {
  return evento.qtdInscritos > 0;
}

/**
 * Evento visível ao público (página de vendas ativa)?
 * @pure
 */
export function eventoPublico(status: StatusEvento): boolean {
  return status === 'publicado' || status === 'ao_vivo';
}

/**
 * Faz o parsing defensivo de um doc Firestore em `Evento`.
 * Lança `Error` descritivo quando o shape é inválido — nunca devolve
 * um objeto parcialmente válido (fail-fast na borda de I/O).
 *
 * Agregados ausentes entram como 0 (docs recém-criados pela Function
 * `criarEvento` ainda não passaram pelo onWrite de agregados).
 * @pure
 */
export function parseEvento(id: string, data: Record<string, unknown>): Evento {
  const nome = data['nome'];
  const tenantId = data['tenantId'];
  const organizadorId = data['organizadorId'];
  const local = data['local'];
  const slug = data['slug'];
  const status = data['status'];
  const usaChip = data['usaChip'];
  const modalidades = data['modalidades'];

  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`Evento ${id}: campo "nome" inválido`);
  }
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Evento ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof organizadorId !== 'string' || organizadorId.length === 0) {
    throw new Error(`Evento ${id}: campo "organizadorId" inválido`);
  }
  if (!isStatusEvento(status)) {
    throw new Error(`Evento ${id}: status "${String(status)}" fora do enum`);
  }
  if (!Array.isArray(modalidades) || !modalidades.every((m) => typeof m === 'string')) {
    throw new Error(`Evento ${id}: campo "modalidades" inválido`);
  }

  const qtdInscritos = data['qtdInscritos'];
  const receitaConfirmada = data['receitaConfirmada'];

  return {
    id,
    tenantId,
    organizadorId,
    nome,
    data: data['data'] as Timestamp,
    local: typeof local === 'string' ? local : '',
    modalidades,
    slug: typeof slug === 'string' && slug.length > 0 ? slug : id,
    status,
    usaChip: usaChip === true,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
    qtdInscritos: typeof qtdInscritos === 'number' ? qtdInscritos : 0,
    receitaConfirmada: typeof receitaConfirmada === 'number' ? receitaConfirmada : 0,
  };
}
