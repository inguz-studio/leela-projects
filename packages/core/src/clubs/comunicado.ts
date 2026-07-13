// =============================================================================
// packages/core/src/clubs/comunicado.ts
//
// Entidade Comunicado — comunicação segmentada do clube (LEELA-E05 ·
// S108-T1). Subcoleção: `clubes/{clubId}/comunicados/{comunicadoId}`.
//
// E06-L1-T1 (extração Camada A): as primitivas AGNÓSTICAS de comunicação
// (canal/status/origem, PUSH_MAX_CHARS/PUSH_SEMANA_MAX, temCanalPush,
// truncarPush) moram em `core/comunicacao/` — fonte ÚNICA compartilhada com
// a campanha do evento (E06). Este arquivo RE-EXPORTA os símbolos (API
// pública do clube 100% estável — nenhum import de caller muda) e mantém
// APENAS o que é do domínio do clube: a taxonomia de segmento
// (por_desafio/por_pilar/por_engajamento) e a entidade Comunicado.
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
import type {
  CanalComunicado,
  OrigemComunicado,
  StatusComunicado,
} from '../comunicacao/canal';

// ---------------------------------------------------------------------------
// Camada A — re-export da fonte única (E06-L1-T1). NUNCA redeclarar aqui:
// um segundo literal de 160/4 reabriria a classe de drift que a extração
// eliminou (5 push/semana ou 161 chars numa superfície = bug de segurança).
// ---------------------------------------------------------------------------

export type {
  StatusComunicado,
  CanalComunicado,
  OrigemComunicado,
} from '../comunicacao/canal';
export {
  STATUS_COMUNICADO,
  CANAIS_COMUNICADO,
  ORIGENS_COMUNICADO,
  isStatusComunicado,
  isCanalComunicado,
  isOrigemComunicado,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  temCanalPush,
} from '../comunicacao/canal';

// ---------------------------------------------------------------------------
// Taxonomia de segmento do CLUBE (Camada C — específica deste domínio)
// ---------------------------------------------------------------------------

/** Tipo de segmentação do público-alvo (clube) */
export type TipoSegmento =
  | 'todos'
  | 'por_desafio'
  | 'por_pilar'
  | 'por_engajamento';

export const TIPOS_SEGMENTO: readonly TipoSegmento[] = [
  'todos',
  'por_desafio',
  'por_pilar',
  'por_engajamento',
];

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
