// =============================================================================
// packages/core/src/eventos/politicaVendas.ts
//
// Política de reembolso, transferência e troca de ingresso — domínio puro
// (LEELA-S305-T1 · E04). Subcoleção: `eventos/{eventoId}/politicaVendas/{config}`
// — doc ÚNICO por evento (docId canônico `config`, mesmo truque de
// paginaVendas: 1-por-evento vive na CHAVE, não em comentário).
//
// FRONTEIRA COM E09 (épico E04 §S305): aqui vive SÓ a POLÍTICA (parâmetros,
// janelas, flags). A máquina de estados, a fila de análise, a execução do
// estorno (`PaymentProvider.refund`) e as notificações são de E09-S904 — que
// ORQUESTRA estas derivações, nunca as reimplementa. A política incide POR
// INSCRITO dentro do pedido em grupo (ADR-011), nunca sobre o pedido inteiro.
//
// RNs parametrizadas (a execução é S904):
//   RN-338 — janela de arrependimento: reembolso integral AUTOMÁTICO em até
//            `janelaArrependimentoDias` dias corridos da COMPRA, desde que
//            faltem mais de `corteHoras` para o evento (CDC Art. 49).
//   RN-339 — corte: solicitação a menos de `corteHoras` do evento é BLOQUEADA
//            por padrão (override explícito e registrado do organizador é
//            superfície de S904, nunca desta derivação).
//   RN-340 — fora da janela e antes do corte: decisão do organizador
//            (em análise), dentro de `slaAnaliseDias`.
//   RN-343 — transferência de titularidade: flag + janela (default 72h) +
//            taxa configurável (default 0).
//   RN-344 — troca de ingresso (mesmo titular): flag + janela (default 48h);
//            downgrade sem reembolso salvo `permiteReembolsoDowngrade`.
//
// ESCRITA (Rules): SÓ o OWNER do tenant do evento grava a política (staff/
// papéis de evento NÃO — política de reembolso é contrato legal do
// organizador). Relógio SEMPRE injetado (`agora`) — derivação de dinheiro
// nunca lê o relógio da máquina (@pure, testável).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** docId canônico da política de vendas (1 doc por evento). */
export const POLITICA_VENDAS_DOC_ID = 'config';

/** Defaults legais (Brasil — CDC Art. 49): 7 dias corridos / corte 48h. */
export const JANELA_ARREPENDIMENTO_DIAS_DEFAULT = 7;
export const CORTE_HORAS_DEFAULT = 48;
export const SLA_ANALISE_DIAS_DEFAULT = 3;
export const TRANSFERENCIA_JANELA_HORAS_DEFAULT = 72;
export const TROCA_JANELA_HORAS_DEFAULT = 48;

/** Tetos sanitários (payload direto não vira política absurda). */
export const JANELA_ARREPENDIMENTO_DIAS_MAX = 90;
export const CORTE_HORAS_MAX = 24 * 30; // 30 dias
export const SLA_ANALISE_DIAS_MAX = 30;
export const JANELA_HORAS_MAX = 24 * 90; // 90 dias
export const TAXA_TRANSFERENCIA_MAX = 10_000; // R$ — teto sanitário

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/** Bloco de reembolso (RN-338/339/340). */
export interface PoliticaReembolso {
  /** Dias corridos da COMPRA com reembolso integral automático (RN-338). */
  janelaArrependimentoDias: number;
  /** Horas antes do EVENTO em que solicitações são bloqueadas (RN-339). */
  corteHoras: number;
  /** SLA (dias) para o organizador decidir o que cai em análise (RN-340). */
  slaAnaliseDias: number;
}

/** Bloco de transferência de titularidade (RN-343). */
export interface PoliticaTransferencia {
  habilitada: boolean;
  /** Horas antes do EVENTO até quando a transferência abre (default 72). */
  janelaHoras: number;
  /** Taxa de transferência em R$ (default 0). */
  taxa: number;
}

/** Bloco de troca de ingresso do MESMO titular (RN-344). */
export interface PoliticaTrocaIngresso {
  habilitada: boolean;
  /** Horas antes do EVENTO até quando a troca abre (default 48). */
  janelaHoras: number;
  /** Downgrade gera reembolso da diferença? (default false — RN-344). */
  permiteReembolsoDowngrade: boolean;
}

/**
 * Política de vendas do evento — doc único
 * `eventos/{eventoId}/politicaVendas/config`.
 */
export interface PoliticaVendas {
  /** docId canônico (`config`). */
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009). */
  tenantId: string;
  reembolso: PoliticaReembolso;
  transferencia: PoliticaTransferencia;
  trocaIngresso: PoliticaTrocaIngresso;
  atualizadoEm: Timestamp;
}

/**
 * Política padrão (defaults legais). Flags de transferência/troca nascem
 * DESLIGADAS (opt-in do organizador — RN-343/344); janelas/taxa já vêm nos
 * defaults para a UI não inventar número.
 */
export function politicaVendasPadrao(): Omit<PoliticaVendas, 'id' | 'tenantId' | 'atualizadoEm'> {
  return {
    reembolso: {
      janelaArrependimentoDias: JANELA_ARREPENDIMENTO_DIAS_DEFAULT,
      corteHoras: CORTE_HORAS_DEFAULT,
      slaAnaliseDias: SLA_ANALISE_DIAS_DEFAULT,
    },
    transferencia: {
      habilitada: false,
      janelaHoras: TRANSFERENCIA_JANELA_HORAS_DEFAULT,
      taxa: 0,
    },
    trocaIngresso: {
      habilitada: false,
      janelaHoras: TROCA_JANELA_HORAS_DEFAULT,
      permiteReembolsoDowngrade: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Validação (payload de escrita — espelhada nas Rules e na UI)
// ---------------------------------------------------------------------------

function intEntre(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Valida o SHAPE de uma política (payload de escrita). Retorna a lista de
 * erros (vazia = válido). Inteiros com teto sanitário; taxa em R$ ≥ 0. @pure
 */
export function validarPoliticaVendas(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Política é obrigatória.'];
  }
  const p = raw as Record<string, unknown>;
  const erros: string[] = [];

  const reembolso = p['reembolso'] as Record<string, unknown> | undefined;
  if (!reembolso || typeof reembolso !== 'object') {
    erros.push('Bloco "reembolso" é obrigatório.');
  } else {
    if (!intEntre(reembolso['janelaArrependimentoDias'], 0, JANELA_ARREPENDIMENTO_DIAS_MAX)) {
      erros.push(`"janelaArrependimentoDias" deve ser inteiro 0..${JANELA_ARREPENDIMENTO_DIAS_MAX}.`);
    }
    if (!intEntre(reembolso['corteHoras'], 0, CORTE_HORAS_MAX)) {
      erros.push(`"corteHoras" deve ser inteiro 0..${CORTE_HORAS_MAX}.`);
    }
    if (!intEntre(reembolso['slaAnaliseDias'], 0, SLA_ANALISE_DIAS_MAX)) {
      erros.push(`"slaAnaliseDias" deve ser inteiro 0..${SLA_ANALISE_DIAS_MAX}.`);
    }
  }

  const transferencia = p['transferencia'] as Record<string, unknown> | undefined;
  if (!transferencia || typeof transferencia !== 'object') {
    erros.push('Bloco "transferencia" é obrigatório.');
  } else {
    if (typeof transferencia['habilitada'] !== 'boolean') {
      erros.push('"transferencia.habilitada" deve ser boolean.');
    }
    if (!intEntre(transferencia['janelaHoras'], 1, JANELA_HORAS_MAX)) {
      erros.push(`"transferencia.janelaHoras" deve ser inteiro 1..${JANELA_HORAS_MAX}.`);
    }
    const taxa = transferencia['taxa'];
    if (
      typeof taxa !== 'number' ||
      !Number.isFinite(taxa) ||
      taxa < 0 ||
      taxa > TAXA_TRANSFERENCIA_MAX
    ) {
      erros.push(`"transferencia.taxa" deve ser número 0..${TAXA_TRANSFERENCIA_MAX} (R$).`);
    }
  }

  const troca = p['trocaIngresso'] as Record<string, unknown> | undefined;
  if (!troca || typeof troca !== 'object') {
    erros.push('Bloco "trocaIngresso" é obrigatório.');
  } else {
    if (typeof troca['habilitada'] !== 'boolean') {
      erros.push('"trocaIngresso.habilitada" deve ser boolean.');
    }
    if (!intEntre(troca['janelaHoras'], 1, JANELA_HORAS_MAX)) {
      erros.push(`"trocaIngresso.janelaHoras" deve ser inteiro 1..${JANELA_HORAS_MAX}.`);
    }
    if (typeof troca['permiteReembolsoDowngrade'] !== 'boolean') {
      erros.push('"trocaIngresso.permiteReembolsoDowngrade" deve ser boolean.');
    }
  }

  return erros;
}

/**
 * Parseia o doc Firestore em `PoliticaVendas` (fail-fast: shape inválido
 * lança — política corrompida NUNCA parametriza a máquina de dinheiro). @pure
 */
export function parsePoliticaVendas(
  id: string,
  data: Record<string, unknown>
): PoliticaVendas {
  const erros = validarPoliticaVendas(data);
  if (erros.length > 0) {
    throw new Error(`politicaVendas/${id} inválida: ${erros.join(' ')}`);
  }
  if (typeof data['tenantId'] !== 'string' || data['tenantId'].length === 0) {
    throw new Error(`politicaVendas/${id} sem tenantId (ADR-009).`);
  }
  const d = data as unknown as {
    tenantId: string;
    reembolso: PoliticaReembolso;
    transferencia: PoliticaTransferencia;
    trocaIngresso: PoliticaTrocaIngresso;
    atualizadoEm: Timestamp;
  };
  return {
    id,
    tenantId: d.tenantId,
    reembolso: {
      janelaArrependimentoDias: d.reembolso.janelaArrependimentoDias,
      corteHoras: d.reembolso.corteHoras,
      slaAnaliseDias: d.reembolso.slaAnaliseDias,
    },
    transferencia: {
      habilitada: d.transferencia.habilitada,
      janelaHoras: d.transferencia.janelaHoras,
      taxa: d.transferencia.taxa,
    },
    trocaIngresso: {
      habilitada: d.trocaIngresso.habilitada,
      janelaHoras: d.trocaIngresso.janelaHoras,
      permiteReembolsoDowngrade: d.trocaIngresso.permiteReembolsoDowngrade,
    },
    atualizadoEm: d.atualizadoEm,
  };
}

// ---------------------------------------------------------------------------
// Derivações (parametrizam a máquina de S904 — relógio SEMPRE injetado)
// ---------------------------------------------------------------------------

const MS_HORA = 3_600_000;
const MS_DIA = 24 * MS_HORA;

/** Roteamento de uma solicitação de reembolso pela política (RN-338/339/340). */
export type RoteamentoReembolso = 'aprovado_auto' | 'em_analise' | 'bloqueado_corte';

/**
 * Decide o destino de uma solicitação de reembolso NO MOMENTO da abertura:
 *   'bloqueado_corte' — faltam ≤ `corteHoras` para o evento (RN-339; o
 *       override do organizador é ação explícita de S904, nunca daqui);
 *   'aprovado_auto'   — dentro de `janelaArrependimentoDias` da compra E
 *       antes do corte (RN-338, CDC Art. 49);
 *   'em_analise'      — fora da janela e antes do corte (RN-340).
 * `agora` injetado (@pure). Evento já ocorrido conta como corte.
 */
export function rotearReembolso(
  politica: PoliticaReembolso,
  compradoEm: Timestamp,
  dataEvento: Timestamp,
  agora: Date
): RoteamentoReembolso {
  const t = agora.getTime();
  const msAteEvento = dataEvento.toMillis() - t;
  if (msAteEvento <= politica.corteHoras * MS_HORA) {
    return 'bloqueado_corte';
  }
  const msDesdeCompra = t - compradoEm.toMillis();
  if (msDesdeCompra <= politica.janelaArrependimentoDias * MS_DIA) {
    return 'aprovado_auto';
  }
  return 'em_analise';
}

/**
 * Transferência de titularidade está ABERTA agora? (RN-343: flag ligada E
 * faltando MAIS que `janelaHoras` para o evento.) @pure
 */
export function transferenciaAberta(
  politica: PoliticaTransferencia,
  dataEvento: Timestamp,
  agora: Date
): boolean {
  if (!politica.habilitada) return false;
  return dataEvento.toMillis() - agora.getTime() > politica.janelaHoras * MS_HORA;
}

/**
 * Troca de ingresso (mesmo titular) está ABERTA agora? (RN-344: flag ligada
 * E faltando MAIS que `janelaHoras` para o evento.) @pure
 */
export function trocaIngressoAberta(
  politica: PoliticaTrocaIngresso,
  dataEvento: Timestamp,
  agora: Date
): boolean {
  if (!politica.habilitada) return false;
  return dataEvento.toMillis() - agora.getTime() > politica.janelaHoras * MS_HORA;
}
