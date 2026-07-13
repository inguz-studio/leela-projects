// =============================================================================
// packages/core/src/clubs/desafio.ts
//
// Entidade Desafio — motor de engajamento signature do módulo Clubs
// (LEELA-E05 · S105-T1). Subcoleção: `clubes/{clubId}/desafios/{desafioId}`.
// Junção N:N Desafio↔CatálogoAção: `desafios/{id}/acoes/{acaoId}`.
//
// RNs: RN-110 (3 modelos de conclusão), RN-111 (Modelo C = único que opera
//      os 3 pilares, exige mínimo por pilar), RN-112 (patrocínio vinculado),
//      RN-113 (vínculo a evento), RN-116 (4 recompensas), RN-117 (3 níveis
//      de visibilidade).
//
// Agregados ∑ (qtdParticipantes, progressoPct) são mantidos por Cloud
// Function (registros de ação chegam no E13 — App do Atleta); o cliente
// NUNCA os escreve (Rules negam). `clubes.qtdDesafiosAtivos` é recontado
// pela Function onDesafioWrite (mesmo padrão count() de membrosAggregates).
// =============================================================================

import type { Timestamp } from '../index';
import type { Pilar } from './catalogo-acoes';

// ---------------------------------------------------------------------------
// Literal types
// ---------------------------------------------------------------------------

/**
 * Modelo de conclusão do desafio (RN-110):
 *   A — meta por ação (cada ação obrigatória tem meta própria);
 *   B — meta de pontos (mix livre até a meta total);
 *   C — equilíbrio mínimo (meta total + mínimo em CADA pilar — RN-111,
 *       signature do produto).
 */
export type ModeloDesafio = 'A' | 'B' | 'C';

/** Ciclo de vida do desafio */
export type StatusDesafio = 'rascunho' | 'ativo' | 'encerrado';

/** Tipo de recompensa (RN-116) */
export type RecompensaTipo =
  | 'medalha_digital'
  | 'cupom'
  | 'medalha_fisica'
  | 'custom';

/** Visibilidade do desafio (RN-117) */
export type VisibilidadeDesafio = 'membros' | 'convite' | 'publico';

export const MODELOS_DESAFIO: readonly ModeloDesafio[] = ['A', 'B', 'C'];
export const STATUS_DESAFIO: readonly StatusDesafio[] = [
  'rascunho',
  'ativo',
  'encerrado',
];
export const RECOMPENSAS_DESAFIO: readonly RecompensaTipo[] = [
  'medalha_digital',
  'cupom',
  'medalha_fisica',
  'custom',
];
export const VISIBILIDADES_DESAFIO: readonly VisibilidadeDesafio[] = [
  'membros',
  'convite',
  'publico',
];

export function isModeloDesafio(v: unknown): v is ModeloDesafio {
  return MODELOS_DESAFIO.includes(v as ModeloDesafio);
}

export function isStatusDesafio(v: unknown): v is StatusDesafio {
  return STATUS_DESAFIO.includes(v as StatusDesafio);
}

export function isRecompensaTipo(v: unknown): v is RecompensaTipo {
  return RECOMPENSAS_DESAFIO.includes(v as RecompensaTipo);
}

export function isVisibilidadeDesafio(v: unknown): v is VisibilidadeDesafio {
  return VISIBILIDADES_DESAFIO.includes(v as VisibilidadeDesafio);
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Progresso agregado de um pilar dentro do desafio (∑ — só Function). */
export interface ProgressoPilar {
  /** Pontos acumulados no pilar (média coletiva) */
  atual: number;
  /** Meta do pilar (minimoPorPilar no Modelo C; referência nos demais) */
  meta: number;
}

/**
 * Anexo do desafio (E15 higiene · S105-hig · Onda 2 T2-L3 — decisão 7).
 * Tipo PREVISTO, não implementado: nenhum fluxo de upload/render existe na
 * V1 — o campo reserva o shape para o Creator Studio (biblioteca de
 * materiais gated, congelada até a V1 validar) SEM migração futura.
 */
export interface DesafioAnexo {
  /** Tipo do material (ex.: 'pdf', 'video', 'link') — enum nasce com o Creator Studio. */
  tipo: string;
  url: string;
  /** Rótulo de exibição opcional. */
  titulo?: string;
}

/**
 * Desafio — subcoleção `clubes/{clubId}/desafios/{desafioId}`.
 * Herda tenantId do clube pai (ADR-009).
 */
export interface Desafio {
  id: string;
  /** Propagado do clube pai (ADR-009) */
  tenantId: string;
  /**
   * Autor/dono do desafio (E15 higiene — decisão 7): generaliza o dono,
   * hoje implícito no path `clubes/{clubId}/desafios` (= ownerId do clube).
   * Prepara o Creator Studio sem migração cara. OBRIGATÓRIO: literal sem
   * autorId falha o type-check (aceite S105-hig).
   */
  autorId: string;
  nome: string;
  descricao: string;
  modelo: ModeloDesafio;
  dataInicio: Timestamp;
  dataFim: Timestamp;
  status: StatusDesafio;
  /** Parceria de patrocínio institucional vinculada (RN-112) */
  patrocinioId?: string;
  /** Evento vinculado — adiciona copy "(Preparação para …)" (RN-113) */
  eventoVinculadoId?: string;
  /** Meta total de pontos (modelos B e C) */
  metaTotalPontos?: number;
  /** Mínimo de pontos por pilar (Modelo C — RN-111) */
  minimoPorPilar?: Partial<Record<Pilar, number>>;
  recompensaTipo: RecompensaTipo;
  visibilidade: VisibilidadeDesafio;
  /** Material anexo (E15 — PREVISTO, sem fluxo na V1; ver DesafioAnexo). */
  anexo?: DesafioAnexo;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** ∑ Nº de membros participando — mantido por Cloud Function */
  qtdParticipantes: number;
  /** ∑ Progresso coletivo médio (0–100) — mantido por Cloud Function */
  progressoPct: number;
  /** ∑ Distribuição de progresso por pilar — mantido por Cloud Function */
  progressoPorPilar?: Partial<Record<Pilar, ProgressoPilar>>;
}

/** Campos ∑ do desafio — escrita exclusiva de Function (Rules negam). */
export const CAMPOS_AGREGADOS_DESAFIO = [
  'qtdParticipantes',
  'progressoPct',
  'progressoPorPilar',
] as const;

/**
 * Junção N:N Desafio ↔ CatálogoAção — `desafios/{id}/acoes/{acaoId}`
 * (docId = id da ação no catálogo global).
 * `meta` é obrigatória APENAS no Modelo A (validação em desafio-validacao.ts,
 * S106-T1); B/C não exigem meta por ação.
 */
export interface AcaoDesafio {
  /** Referência à ação no catálogo global `catalogoAcoes/{acaoId}` */
  acaoRef: string;
  /** Meta da ação, na unidade do catálogo (Modelo A) */
  meta?: number;
}

/** Um desafio conta no agregado ∑ `qtdDesafiosAtivos` quando está ativo. */
export function contaComoDesafioAtivo(status: StatusDesafio): boolean {
  return status === 'ativo';
}
