// =============================================================================
// packages/core/src/clubs/comunicado.ts
//
// Entidade Comunicado — comunicação segmentada do clube (LEELA-E05 ·
// S108-T1). Subcoleção: `clubes/{clubId}/comunicados/{comunicadoId}`.
//
// RNs: RN-130 (3 estados: enviado/agendado/rascunho),
//      RN-131 (2 canais: push/email, ou ambos),
//      RN-132 (2 origens: manual/automatizada),
//      RN-133 (limite do clube: 4 push/semana — validado por Function),
//      RN-134 (push ≤ 160 chars no corpo),
//      RN-135 (email suporta imagem de capa; push não).
//
// Agregados ∑ (alcance, aberturasPct) + carimbo de envio (status='enviado',
// enviadoEm) são de escrita EXCLUSIVA da Function de envio
// (onComunicadoEnvio) — o cliente cria/edita apenas rascunho/agendado.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Literal types
// ---------------------------------------------------------------------------

/** Estado do comunicado (RN-130) */
export type StatusComunicado = 'rascunho' | 'agendado' | 'enviado';

/** Canal de disparo (RN-131) — `canal[]` aceita um ou ambos */
export type CanalComunicado = 'push' | 'email';

/** Origem do disparo (RN-132) */
export type OrigemComunicado = 'manual' | 'automatizada';

/** Tipo de segmentação do público-alvo */
export type TipoSegmento =
  | 'todos'
  | 'por_desafio'
  | 'por_pilar'
  | 'por_engajamento';

export const STATUS_COMUNICADO: readonly StatusComunicado[] = [
  'rascunho',
  'agendado',
  'enviado',
];
export const CANAIS_COMUNICADO: readonly CanalComunicado[] = ['push', 'email'];
export const ORIGENS_COMUNICADO: readonly OrigemComunicado[] = [
  'manual',
  'automatizada',
];
export const TIPOS_SEGMENTO: readonly TipoSegmento[] = [
  'todos',
  'por_desafio',
  'por_pilar',
  'por_engajamento',
];

export function isStatusComunicado(v: unknown): v is StatusComunicado {
  return STATUS_COMUNICADO.includes(v as StatusComunicado);
}

export function isCanalComunicado(v: unknown): v is CanalComunicado {
  return CANAIS_COMUNICADO.includes(v as CanalComunicado);
}

export function isOrigemComunicado(v: unknown): v is OrigemComunicado {
  return ORIGENS_COMUNICADO.includes(v as OrigemComunicado);
}

export function isTipoSegmento(v: unknown): v is TipoSegmento {
  return TIPOS_SEGMENTO.includes(v as TipoSegmento);
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Segmento embutido no comunicado: quem recebe.
 * `referencia` aponta o desafio (por_desafio), o pilar (por_pilar) ou a
 * janela de engajamento (por_engajamento: '7d' | '14d' | '30d').
 * `tamanhoEstimado` é calculado on-demand na composição (estimarAlcance —
 * S109-T1) e persistido como fotografia do momento do envio.
 */
export interface Segmento {
  tipo: TipoSegmento;
  referencia?: string;
  tamanhoEstimado?: number;
}

/**
 * Comunicado — subcoleção `clubes/{clubId}/comunicados/{comunicadoId}`.
 * Herda tenantId do clube pai (ADR-009).
 */
export interface Comunicado {
  id: string;
  /** Propagado do clube pai (ADR-009) */
  tenantId: string;
  /** ≥ 5 chars (validação em comunicado-validacao.ts — S109-T1) */
  titulo: string;
  /** ≥ 10 chars; push ≤ 160 (RN-134) */
  conteudo: string;
  /** Imagem de capa — APENAS email (RN-135) */
  capaUrl?: string;
  /** 1..2 canais (RN-131) */
  canal: CanalComunicado[];
  origem: OrigemComunicado;
  status: StatusComunicado;
  segmento: Segmento;
  /** Obrigatório quando status == 'agendado' */
  agendadoPara?: Timestamp;
  /** ∑ Carimbo do envio — escrito APENAS pela Function */
  enviadoEm?: Timestamp;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  /** ∑ Destinatários alcançados no envio — mantido por Function */
  alcance: number;
  /** ∑ % de aberturas (webhooks de entrega) — mantido por Function */
  aberturasPct?: number;
}

/** Campos de escrita exclusiva da Function de envio (Rules negam cliente). */
export const CAMPOS_FUNCTION_COMUNICADO = [
  'alcance',
  'aberturasPct',
  'enviadoEm',
] as const;

// ---------------------------------------------------------------------------
// Limites (RN-133/134) — fonte única; Function e validação importam daqui
// ---------------------------------------------------------------------------

/** Máximo de caracteres do corpo de um push (RN-134) */
export const PUSH_MAX_CHARS = 160;

/** Máximo de comunicados push por clube por semana (RN-133) */
export const PUSH_SEMANA_MAX = 4;

/** O comunicado dispara push? (o limite RN-133 só se aplica a estes) */
export function temCanalPush(canal: readonly CanalComunicado[]): boolean {
  return canal.includes('push');
}
