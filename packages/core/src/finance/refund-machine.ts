// =============================================================================
// packages/core/src/finance/refund-machine.ts
//
// Máquina de estados PURA de reembolso — domínio (LEELA-S904-T1 · E09 · RN-341).
// A subcoleção física é `eventos/{eventoId}/reembolsos/{inscritoId}`; aqui vive
// SÓ a regra: quais transições são válidas e a trilha `transicoes[]`. A
// EXECUÇÃO financeira (estorno via `PaymentProvider.refund`) é da S904-T2, que
// REUSA o primitivo idempotente `estornarInscricaoCore` (FABLE-B) — esta
// máquina nunca move dinheiro, só governa o estado (Kleppmann: separar a regra
// da mutação).
//
// FRONTEIRA COM E04-S305: o ROTEAMENTO na abertura (aprovado_auto vs em_analise
// vs bloqueio de corte) é derivado por `rotearReembolso` (politicaVendas) — a
// máquina recebe o estado JÁ roteado; ela só valida as transições seguintes.
//
// GRAFO (RN-341):
//   solicitado    → aprovado_auto | em_analise        (roteamento na abertura)
//   em_analise    → aprovado | recusado               (decisão do organizador)
//   aprovado      → estornado                          (execução — S904-T2)
//   aprovado_auto → estornado                          (execução — S904-T2)
//   recusado      → ∅  (terminal)
//   estornado     → ∅  (terminal)
// Qualquer aresta fora do grafo é rejeitada (ex.: solicitado→estornado pula a
// decisão; recusado→qualquer é saída de terminal).
//
// A política incide POR INSCRITO dentro do pedido em grupo (ADR-011): um
// `reembolsos/{inscritoId}` por inscrito, nunca sobre o pedido inteiro.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Estados & comandos
// ---------------------------------------------------------------------------

export const ESTADOS_REEMBOLSO = [
  'solicitado',
  'aprovado_auto',
  'em_analise',
  'aprovado',
  'recusado',
  'estornado',
] as const;

export type EstadoReembolso = (typeof ESTADOS_REEMBOLSO)[number];

/** Estados terminais — nenhuma transição sai deles. */
export const ESTADOS_REEMBOLSO_TERMINAIS: readonly EstadoReembolso[] = [
  'recusado',
  'estornado',
] as const;

/** Estados a partir dos quais a EXECUÇÃO do estorno é elegível (S904-T2). */
export const ESTADOS_REEMBOLSO_EXECUTAVEIS: readonly EstadoReembolso[] = [
  'aprovado',
  'aprovado_auto',
] as const;

export function isEstadoReembolso(v: unknown): v is EstadoReembolso {
  return typeof v === 'string' && (ESTADOS_REEMBOLSO as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Grafo de transições (fonte única — a Function nunca re-deriva)
// ---------------------------------------------------------------------------

const TRANSICOES: Readonly<Record<EstadoReembolso, readonly EstadoReembolso[]>> = {
  solicitado: ['aprovado_auto', 'em_analise'],
  em_analise: ['aprovado', 'recusado'],
  aprovado: ['estornado'],
  aprovado_auto: ['estornado'],
  recusado: [],
  estornado: [],
};

export interface ResultadoTransicaoReembolso {
  ok: boolean;
  /** Preenchido só quando `ok === false`. */
  motivo?: string;
}

/**
 * A transição `de → para` é válida no grafo? (RN-341). Fonte única de verdade;
 * a Function decide o direito de QUEM executa (papel), a máquina decide se a
 * aresta EXISTE. @pure
 */
export function transicaoReembolsoValida(
  de: EstadoReembolso,
  para: EstadoReembolso
): boolean {
  return TRANSICOES[de].includes(para);
}

/**
 * Valida uma transição e devolve `{ok, motivo}` (espelho de `transitionRepasse`
 * — mensagem honesta para o organizador). @pure
 */
export function transitionReembolso(
  de: EstadoReembolso,
  para: EstadoReembolso
): ResultadoTransicaoReembolso {
  if (!isEstadoReembolso(de) || !isEstadoReembolso(para)) {
    return { ok: false, motivo: `Estado de reembolso inválido: '${de}'→'${para}'.` };
  }
  if (de === para) {
    return { ok: false, motivo: `Reembolso já está em '${de}' — transição no-op.` };
  }
  if (!transicaoReembolsoValida(de, para)) {
    return {
      ok: false,
      motivo: `Transição de reembolso inválida: '${de}' → '${para}' (RN-341).`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Entidade & trilha
// ---------------------------------------------------------------------------

/**
 * Origem da solicitação — quem pediu (auditoria RN-341). `plataforma` entrou
 * com a porta cross-tenant (T4 · decisão 43-b): o admin abre reembolso no
 * tenant alheio e o doc carrega a trilha do operador como origem — a fila
 * mostra a diferença em vez de fingir que foi o organizador.
 */
export type OrigemReembolso = 'organizador' | 'atleta' | 'plataforma';

/** Registro append-only de uma transição (trilha RN-341). */
export interface TransicaoReembolso {
  de: EstadoReembolso;
  para: EstadoReembolso;
  em: Timestamp;
  /** uid do ator (ou 'system' quando a transição é automática/roteamento). */
  por: string;
  papel: string;
}

/**
 * Solicitação de reembolso de UM inscrito do pedido em grupo (ADR-011).
 * `eventos/{eventoId}/reembolsos/{inscritoId}` — docId = inscritoId (um
 * reembolso ativo por inscrito, espelha o ledger de estornos de FABLE-B).
 */
export interface Reembolso {
  /** docId = inscritoId. */
  id: string;
  tenantId: string;
  eventoId: string;
  pedidoId: string;
  inscritoId: string;
  motivo: string;
  estado: EstadoReembolso;
  origem: OrigemReembolso;
  /** Valor que o inscrito PAGOU (linha + taxa repassada) — congelado na abertura. */
  valorSolicitado: number;
  /** Preenchido quando a execução (S904-T2) devolve o refund do gateway. */
  valorEstornado?: number;
  /** Prova do gateway (refundId) quando estornado. */
  refundId?: string;
  /** uid do organizador que decidiu (aprovou/recusou) — RN-340. */
  decididoPor?: string;
  /**
   * RN-376: o pedido entrou FURANDO o corte de véspera. Só a plataforma pode,
   * e o furo fica NO DOC — a fila e a auditoria leem daqui, não do log.
   */
  overrideCorte?: boolean;
  /** Justificativa do furo (obrigatória quando `overrideCorte` — RN-376). */
  motivoOverride?: string;
  /** uid do admin que furou o corte (RN-376). */
  overridePor?: string;
  /** Corte (em horas) vigente no momento do furo — congela a régua furada. */
  corteHorasNoOverride?: number;
  /** Trilha append-only (RN-341). */
  transicoes: TransicaoReembolso[];
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}
