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
import { roundMoney } from '../finance/calc';

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

/** Bloco de reembolso (RN-338/339/340/351/352). */
export interface PoliticaReembolso {
  /** Dias corridos da COMPRA com reembolso integral automático (RN-338). */
  janelaArrependimentoDias: number;
  /** Horas antes do EVENTO em que solicitações são bloqueadas (RN-339). */
  corteHoras: number;
  /** SLA (dias) para o organizador decidir o que cai em análise (RN-340). */
  slaAnaliseDias: number;
  /**
   * FORA da janela de arrependimento, a taxa de serviço volta ao comprador?
   * (RN-352 — decisão 42 do dono: "aceito a proposta dos 7 dias").
   *
   * Default `false`: fora do art. 49 a retenção é o padrão de mercado (5 de 6
   * plataformas no BENCHMARK-REEMBOLSO). DENTRO da janela a taxa volta
   * SEMPRE e isso NÃO é parametrizável — reter no prazo de arrependimento é
   * exatamente o que rendeu à Ingresse a multa de R$ 300.047,34 do Procon-MG.
   *
   * Ausente no doc (política legada) ⇒ `false` na leitura (Postel).
   */
  devolveTaxaForaDaJanela: boolean;
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
  /**
   * Versão VIGENTE da política (CKMOD · paralelo RN-149 do regulamento):
   * MONOTÔNICA, bump em edição MATERIAL (blocos reembolso/transferencia/
   * trocaIngresso — ver materialPoliticaVendas), escrita EXCLUSIVA
   * server-side (trigger versionarPoliticaVendas; Rules congelam p/ cliente).
   * Ausente = doc legado pré-CKMOD ⇒ vigente 1 (versaoPoliticaVendas):
   * a versão 1 é a política em vigor — defaults legais CDC quando não há
   * doc, ou o doc legado como publicado.
   */
  versao?: number;
  /** Carimbo do último bump de versão (server-side). */
  versaoAtualizadaEm?: Timestamp;
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
      // RN-352: fora do art. 49, a taxa fica retida (decisão 42).
      devolveTaxaForaDaJanela: false,
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
    // RN-352: campo NOVO — ausente é válido (doc legado ⇒ false na leitura);
    // presente tem de ser boolean (lixo em doc de dinheiro nunca passa).
    if (
      reembolso['devolveTaxaForaDaJanela'] !== undefined &&
      typeof reembolso['devolveTaxaForaDaJanela'] !== 'boolean'
    ) {
      erros.push('"reembolso.devolveTaxaForaDaJanela" deve ser boolean.');
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
  // Versão (CKMOD): leitura Postel — doc legado sem campo segue válido
  // (vigente = 1 via versaoPoliticaVendas); presente deve ser inteiro ≥ 1.
  const versaoRaw = data['versao'];
  if (
    versaoRaw !== undefined &&
    (typeof versaoRaw !== 'number' || !Number.isInteger(versaoRaw) || versaoRaw < 1)
  ) {
    throw new Error(`politicaVendas/${id} com "versao" inválida (inteiro ≥ 1 — CKMOD).`);
  }
  return {
    id,
    tenantId: d.tenantId,
    reembolso: {
      janelaArrependimentoDias: d.reembolso.janelaArrependimentoDias,
      corteHoras: d.reembolso.corteHoras,
      slaAnaliseDias: d.reembolso.slaAnaliseDias,
      devolveTaxaForaDaJanela: d.reembolso.devolveTaxaForaDaJanela === true,
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
    ...(versaoRaw !== undefined ? { versao: versaoRaw as number } : {}),
    ...(data['versaoAtualizadaEm'] !== undefined
      ? { versaoAtualizadaEm: data['versaoAtualizadaEm'] as Timestamp }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Versão vigente (CKMOD · paralelo RN-149) — consumida pelo checkout (aceite
// dos termos) e pelo leitor público da landing (modal "termos da compra")
// ---------------------------------------------------------------------------

/**
 * Campos da política com escrita EXCLUSIVA server-side (trigger
 * versionarPoliticaVendas) — espelhados nas Rules: cliente nem cria nem toca.
 * Forjar `versao` invalidaria a prova de aceite (RN-149 pattern).
 */
export const CAMPOS_FUNCTION_POLITICA_VENDAS = [
  'versao',
  'versaoAtualizadaEm',
  'politicaTextoHash',
] as const;

/**
 * Versão VIGENTE da política de um evento. Diferente do regulamento (versão
 * 0 = nada publicado), a política SEMPRE vige: sem doc/doc legado sem campo
 * ⇒ versão 1 (defaults legais CDC Art. 49 ou o doc como publicado). @pure
 */
export function versaoPoliticaVendas(versao: number | undefined): number {
  return typeof versao === 'number' && Number.isInteger(versao) && versao > 0
    ? versao
    : 1;
}

/**
 * Projeção MATERIAL da política — o que, mudando, exige NOVO aceite
 * (RN-149 pattern): os 3 blocos paramétricos, serializados em ordem FIXA de
 * chaves (string canônica p/ hash de idempotência do bump). `tenantId`/
 * carimbos ficam FORA — mudá-los não é edição material. @pure
 */
export function materialPoliticaVendas(
  p: Pick<PoliticaVendas, 'reembolso' | 'transferencia' | 'trocaIngresso'>
): string {
  return JSON.stringify({
    reembolso: {
      janelaArrependimentoDias: p.reembolso.janelaArrependimentoDias,
      corteHoras: p.reembolso.corteHoras,
      slaAnaliseDias: p.reembolso.slaAnaliseDias,
      // RN-352: mudar o destino da taxa é edição MATERIAL — quem comprou sob
      // "a taxa volta" não fica preso a "a taxa fica" sem novo aceite.
      devolveTaxaForaDaJanela: p.reembolso.devolveTaxaForaDaJanela === true,
    },
    transferencia: {
      habilitada: p.transferencia.habilitada,
      janelaHoras: p.transferencia.janelaHoras,
      taxa: p.transferencia.taxa,
    },
    trocaIngresso: {
      habilitada: p.trocaIngresso.habilitada,
      janelaHoras: p.trocaIngresso.janelaHoras,
      permiteReembolsoDowngrade: p.trocaIngresso.permiteReembolsoDowngrade,
    },
  });
}

/**
 * O aceite registrado no pedido ainda vale para a versão vigente? (RN-149:
 * aceite de versão ANTERIOR não vale para a vigente; `undefined` = nunca
 * aceitou ⇒ sempre precisa — a política sempre vige, vigente ≥ 1.) @pure
 */
export function precisaNovoAceiteTermos(
  aceitaVersao: number | undefined,
  eventoVersao: number | undefined
): boolean {
  const vigente = versaoPoliticaVendas(eventoVersao);
  const aceita =
    typeof aceitaVersao === 'number' && Number.isInteger(aceitaVersao) && aceitaVersao > 0
      ? aceitaVersao
      : 0;
  return aceita < vigente;
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
 * A compra está DENTRO da janela de arrependimento? (RN-351 · CDC Art. 49 —
 * `janelaArrependimentoDias` dias corridos contados da COMPRA.)
 *
 * Separado de `rotearReembolso` de propósito: o direito do art. 49 é do
 * relógio da COMPRA e não some porque o evento está na véspera. Um estorno
 * autorizado pelo admin dentro dos 7 dias devolve a taxa mesmo quando a
 * solicitação normal estaria bloqueada pelo corte (RN-339). @pure
 */
export function dentroDaJanelaArrependimento(
  politica: PoliticaReembolso,
  compradoEm: Timestamp,
  agora: Date
): boolean {
  const msDesdeCompra = agora.getTime() - compradoEm.toMillis();
  return msDesdeCompra <= politica.janelaArrependimentoDias * MS_DIA;
}

/** O que volta ao comprador e o que a plataforma retém (RN-351/352). */
export interface DevolucaoEstorno {
  /** Total devolvido ao COMPRADOR em R$ (face + taxa devolvida). */
  valorDevolvido: number;
  /** Porção FACE — a contabilidade do organizador (RN-347). */
  valorFace: number;
  /** Fatia da taxa de serviço que VOLTA ao comprador. */
  taxaDevolvida: number;
  /** Fatia da taxa de serviço RETIDA pela plataforma. */
  taxaRetida: number;
  /** Regra aplicada (trilha do ledger e texto honesto na tela). */
  dentroDaJanela: boolean;
}

/**
 * Decide, cent-exato, quanto volta ao comprador num estorno (RN-351/352 —
 * decisão 42 do dono):
 *   - DENTRO da janela de arrependimento (art. 49): volta face + taxa
 *     INTEGRAL. Não parametrizável — reter aqui é a autuação do Procon.
 *   - FORA da janela: volta o face; a taxa segue `devolveTaxaForaDaJanela`
 *     (default `false` = retida, padrão de mercado).
 * A taxa só existe em evento de taxa REPASSADA; em 'incorporada' o argumento
 * chega 0 e as duas rotas coincidem — comportamento vigente byte a byte.
 * @pure
 */
export function calcularDevolucaoEstorno(
  politica: PoliticaReembolso,
  valorFace: number,
  taxaRepassada: number,
  dentroDaJanela: boolean
): DevolucaoEstorno {
  const face = roundMoney(valorFace);
  const taxa = roundMoney(Math.max(0, taxaRepassada));
  const devolveTaxa = dentroDaJanela || politica.devolveTaxaForaDaJanela;
  const taxaDevolvida = devolveTaxa ? taxa : 0;
  return {
    valorDevolvido: roundMoney(face + taxaDevolvida),
    valorFace: face,
    taxaDevolvida,
    taxaRetida: roundMoney(taxa - taxaDevolvida),
    dentroDaJanela,
  };
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
