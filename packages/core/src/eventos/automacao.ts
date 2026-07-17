// =============================================================================
// packages/core/src/eventos/automacao.ts
//
// Entidade Automação — comunicação por GATILHO do evento (LEELA-S402-T1 ·
// E06 · RN-132). Subcoleção: `eventos/{eventoId}/automacoes/{automacaoId}`.
//
// Uma automação amarra um GATILHO a um TEMPLATE (campanha do MESMO evento
// com origem='automatizada' — RN-132). O disparo REUSA o pipeline único de
// envio (`executarDisparoCampanha` — DIRECTIVE dos boards; nunca um segundo
// mecanismo): cota RN-133, truncamento RN-134, tenant suspenso RN-402 e o
// log RN-219 valem de graça.
//
// GATILHOS (enum fechado — novos tipos exigem revisitar triggers + Rules):
//   novo_inscrito  — inscrito transiciona para 'confirmado' (trigger onWrite)
//   kit_disponivel — abre a PRIMEIRA janela de entrega do cronograma (cron;
//                    premissa registrada: "kit pronto p/ retirada" = janela
//                    de retirada aberta, não a entrega individual do balcão)
//   vespera_evento — `offsetHoras` ANTES de evento.data (cron; default 24h)
//   pos_evento     — `offsetHoras` DEPOIS de evento.data (cron; default 24h)
//
// IDEMPOTÊNCIA por (automação, alvo): o docId determinístico do log
// (`{inscritoRef}_{templateRef}_{canal}` — RN-219) É a chave; o carimbo
// 'enviado' do template segura o one-shot dos gatilhos de relógio, e o
// fan-out curador cobre o incremental do novo_inscrito.
//
// ∑ `disparos` = RECONTAGEM (writer-only por Function, postura pós-19c8afe):
// count() dos logs do template — replay nunca infla.
// =============================================================================

import type { Timestamp } from '../index';
import type { CanalCampanha } from './campanha';
import { isCanalComunicado } from '../comunicacao/canal';

// ---------------------------------------------------------------------------
// Constantes / enums
// ---------------------------------------------------------------------------

/** Nome da subcoleção — `eventos/{eventoId}/automacoes`. */
export const COLECAO_AUTOMACOES = 'automacoes';

/** Gatilhos suportados (V1 — sem gatilho custom). */
export type GatilhoAutomacao =
  | 'novo_inscrito'
  | 'kit_disponivel'
  | 'vespera_evento'
  | 'pos_evento';

export const GATILHOS_AUTOMACAO: readonly GatilhoAutomacao[] = [
  'novo_inscrito',
  'kit_disponivel',
  'vespera_evento',
  'pos_evento',
];

export function isGatilhoAutomacao(v: unknown): v is GatilhoAutomacao {
  return GATILHOS_AUTOMACAO.includes(v as GatilhoAutomacao);
}

/** Offset default dos gatilhos de relógio (véspera/pós) em horas. */
export const AUTOMACAO_OFFSET_HORAS_DEFAULT = 24;

/** Teto de sanidade do offset (30 dias) — espelhado nas Rules. */
export const AUTOMACAO_OFFSET_HORAS_MAX = 720;

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Automação — `eventos/{eventoId}/automacoes/{automacaoId}`.
 * Cliente cria/edita gatilho/template/canal/ativa/offset; ∑ `disparos` é
 * de escrita EXCLUSIVA de Function (recontagem — Rules espelham).
 */
export interface Automacao {
  id: string;
  /** Propagado do evento pai (ADR-009) */
  tenantId: string;
  gatilho: GatilhoAutomacao;
  /** docId da campanha-template DO MESMO evento (origem='automatizada') */
  templateRef: string;
  /** 🔁 Espelho do canal do template (card da tela sem join) */
  canal: CanalCampanha[];
  /** Toggle ativa/pausada — pausada NUNCA dispara */
  ativa: boolean;
  /** Horas de offset (véspera = antes; pós = depois). Default 24. */
  offsetHoras?: number;
  /** ∑ Disparos registrados — recontagem por Function (cliente nunca) */
  disparos: number;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** Campos de escrita exclusiva de Function (Rules negam cliente). */
export const CAMPOS_FUNCTION_AUTOMACAO = ['disparos'] as const;

// ---------------------------------------------------------------------------
// Validação pura (form do painel + fronteira da Function)
// ---------------------------------------------------------------------------

export interface AutomacaoInput {
  gatilho: GatilhoAutomacao;
  templateRef: string;
  canal: CanalCampanha[];
  ativa: boolean;
  offsetHoras?: number;
}

/** Valida o payload de automação. Retorna erros (vazio = válido). @pure */
export function validarAutomacao(input: AutomacaoInput): string[] {
  const erros: string[] = [];
  if (!isGatilhoAutomacao(input.gatilho)) {
    erros.push('gatilho fora do enum (novo_inscrito, kit_disponivel, vespera_evento, pos_evento)');
  }
  if (typeof input.templateRef !== 'string' || input.templateRef.trim().length === 0) {
    erros.push('templateRef é obrigatório (campanha origem=automatizada — RN-132)');
  }
  if (
    !Array.isArray(input.canal) ||
    input.canal.length < 1 ||
    input.canal.length > 2 ||
    input.canal.some((c) => !isCanalComunicado(c)) ||
    new Set(input.canal).size !== input.canal.length
  ) {
    erros.push('canal inválido (1..2 de push/email — RN-131)');
  }
  if (typeof input.ativa !== 'boolean') {
    erros.push('ativa deve ser boolean');
  }
  if (input.offsetHoras !== undefined) {
    if (
      !Number.isInteger(input.offsetHoras) ||
      input.offsetHoras < 1 ||
      input.offsetHoras > AUTOMACAO_OFFSET_HORAS_MAX
    ) {
      erros.push(`offsetHoras deve ser inteiro 1..${AUTOMACAO_OFFSET_HORAS_MAX}`);
    }
    if (input.gatilho === 'novo_inscrito' || input.gatilho === 'kit_disponivel') {
      erros.push('offsetHoras só se aplica a vespera_evento/pos_evento');
    }
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Derivação pura — momento do gatilho de relógio
// ---------------------------------------------------------------------------

/**
 * Momento em que um gatilho de RELÓGIO fica devido, a partir da data do
 * evento (véspera = data − offset; pós = data + offset). `null` = gatilho
 * não é de relógio (novo_inscrito/kit_disponivel têm fontes próprias). @pure
 */
export function momentoDoGatilho(
  gatilho: GatilhoAutomacao,
  dataEvento: Date,
  offsetHoras: number = AUTOMACAO_OFFSET_HORAS_DEFAULT
): Date | null {
  const offsetMs = offsetHoras * 60 * 60 * 1000;
  if (gatilho === 'vespera_evento') {
    return new Date(dataEvento.getTime() - offsetMs);
  }
  if (gatilho === 'pos_evento') {
    return new Date(dataEvento.getTime() + offsetMs);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `Automacao`. @pure */
export function parseAutomacao(
  id: string,
  data: Record<string, unknown>
): Automacao {
  const ctx = `Automacao ${id}`;

  const tenantId = data['tenantId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`${ctx}: "tenantId" inválido (ADR-009)`);
  }
  const gatilho = data['gatilho'];
  if (!isGatilhoAutomacao(gatilho)) {
    throw new Error(`${ctx}: gatilho "${String(gatilho)}" fora do enum`);
  }
  const templateRef = data['templateRef'];
  if (typeof templateRef !== 'string' || templateRef.length === 0) {
    throw new Error(`${ctx}: "templateRef" inválido (RN-132)`);
  }
  const canal = data['canal'];
  if (
    !Array.isArray(canal) ||
    canal.length < 1 ||
    canal.length > 2 ||
    canal.some((c) => !isCanalComunicado(c))
  ) {
    throw new Error(`${ctx}: "canal" inválido (1..2 de push/email — RN-131)`);
  }
  const ativa = data['ativa'];
  if (typeof ativa !== 'boolean') {
    throw new Error(`${ctx}: "ativa" deve ser boolean`);
  }
  const offsetHoras = data['offsetHoras'];
  if (
    offsetHoras !== undefined &&
    (!Number.isInteger(offsetHoras) ||
      (offsetHoras as number) < 1 ||
      (offsetHoras as number) > AUTOMACAO_OFFSET_HORAS_MAX)
  ) {
    throw new Error(`${ctx}: "offsetHoras" fora de 1..${AUTOMACAO_OFFSET_HORAS_MAX}`);
  }
  const disparos = data['disparos'];
  if (
    disparos !== undefined &&
    (typeof disparos !== 'number' || !Number.isInteger(disparos) || disparos < 0)
  ) {
    throw new Error(`${ctx}: "disparos" deve ser inteiro ≥ 0 (∑ de Function)`);
  }

  const automacao: Automacao = {
    id,
    tenantId,
    gatilho,
    templateRef,
    canal: canal as CanalCampanha[],
    ativa,
    disparos: typeof disparos === 'number' ? disparos : 0,
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
  if (typeof offsetHoras === 'number') automacao.offsetHoras = offsetHoras;
  return automacao;
}
