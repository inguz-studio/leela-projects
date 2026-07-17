// =============================================================================
// packages/core/src/finance/transfer.ts
//
// Transferência de titularidade / troca de ingresso — domínio PURO
// (LEELA-S904-T4 · E09 · RN-345/RN-343/RN-344 · ADR-011).
// Subcoleção física: `eventos/{eventoId}/transferencias/{transferenciaId}`.
//
// DOIS tipos (story S904-T4):
//   'titularidade' — muda QUEM corre (RN-343): executa na hora (Function),
//       pagamento permanece na MESMA inscrição, trilha `titularHistorico[]`
//       append-only no inscrito. Kit NÃO entregue ⇒ recoleta o tamanho do
//       novo titular; chip só vincula na entrega (RN-203). Kit JÁ entregue,
//       chip vinculado ou check-in feito ⇒ BLOQUEADA (RN-345 + objeção A5:
//       transferir após vínculo corromperia o resultado da prova).
//   'ingresso' — upgrade/downgrade de percurso do MESMO titular (RN-344):
//       aqui SÓ O REGISTRO com `diffCobrada` derivada do lote vigente; a
//       COBRANÇA (e a aplicação da troca no inscrito) é do fluxo de checkout
//       — trocar `modalidade` fora dele corromperia a contagem de vendidos
//       por lote (ADR-012/RN-300). Ver DIRECTIVE no requestTransfer.
//
// A política (flag/janela/taxa — RN-343/344) vem de S305 (politicaVendas);
// estas guardas APLICAM a política, nunca a redefinem. Relógio SEMPRE
// injetado (@pure). Opera POR INSCRITO dentro do pedido em grupo (ADR-011).
// =============================================================================

import type { Timestamp } from '../index';
import { roundMoney } from './calc';
import type { DadosPessoaisInscrito } from '../eventos/dadosPessoais';
import type { Inscrito } from '../eventos/inscrito';
import {
  transferenciaAberta,
  trocaIngressoAberta,
  type PoliticaTransferencia,
  type PoliticaTrocaIngresso,
} from '../eventos/politicaVendas';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export const TIPOS_TRANSFERENCIA = ['titularidade', 'ingresso'] as const;
export type TipoTransferencia = (typeof TIPOS_TRANSFERENCIA)[number];

export function isTipoTransferencia(v: unknown): v is TipoTransferencia {
  return (
    typeof v === 'string' &&
    (TIPOS_TRANSFERENCIA as readonly string[]).includes(v)
  );
}

/**
 * Estado do registro:
 *   'concluida'  — titularidade EXECUTADA (inscrito já reflete o novo titular);
 *   'registrada' — troca de ingresso REGISTRADA aguardando o fluxo de
 *                  checkout (cobrança da diferença + aplicação — RN-344).
 */
export type EstadoTransferencia = 'concluida' | 'registrada';

/** Dados do NOVO titular (recoletados na transferência — RN-345). */
export interface NovoTitularDados {
  nome: string;
  /** Bloco `[reg]` do novo titular quando recoletado (PII — Rules restritas). */
  dadosPessoais?: DadosPessoaisInscrito;
  /**
   * Tamanhos RECOLETADOS por item tamanhado (RN-223/RN-345) — OBRIGATÓRIO
   * quando o kit tem item tamanhado e ainda não foi entregue.
   */
  tamanhos?: Record<string, string>;
}

/**
 * Registro de transferência — `eventos/{eventoId}/transferencias/{id}`.
 * Escrita EXCLUSIVA de Function; leitura de gestão (Rules).
 */
export interface Transferencia {
  id: string;
  tenantId: string;
  eventoId: string;
  pedidoId: string;
  /** Inscrição alvo (o pagamento permanece nela — ADR-011). */
  inscritoId: string;
  tipo: TipoTransferencia;
  estado: EstadoTransferencia;
  /** Titular ANTERIOR (nome congelado no momento da transferência). */
  titularAnterior: { atletaId: string; nome: string };
  /** Presente em tipo='titularidade'. */
  novoTitular?: NovoTitularDados;
  /** Presente em tipo='ingresso' — percurso de destino (RN-344). */
  novaModalidade?: string;
  /**
   * Diferença/taxa A COBRAR em R$ (registro — a cobrança é do checkout):
   * titularidade → taxa da política (RN-343); ingresso → preço do lote
   * vigente do destino − valor da linha (downgrade sem
   * `permiteReembolsoDowngrade` trava em 0 — RN-344).
   */
  diffCobrada: number;
  criadoEm: Timestamp;
  /** uid do organizador que executou. */
  criadoPor: string;
}

export interface ResultadoGuardaTransferencia {
  ok: boolean;
  /** Preenchido só quando `ok === false` — motivo honesto para a UI. */
  motivo?: string;
}

// ---------------------------------------------------------------------------
// Guardas puras (RN-345/RN-343/RN-344 — relógio injetado)
// ---------------------------------------------------------------------------

type InscritoTransferivel = Pick<
  Inscrito,
  'status' | 'kitEntregueEm' | 'chipNumero' | 'checkinEm' | 'tamanhos'
>;

/**
 * A TITULARIDADE deste inscrito pode ser transferida agora? (RN-343/345 +
 * objeção A5.) Ordem das checagens: estado do inscrito → vínculos físicos
 * (kit/chip/check-in) → política (flag/janela). @pure
 */
export function podeTransferirTitularidade(
  inscrito: InscritoTransferivel,
  politica: PoliticaTransferencia,
  dataEvento: Timestamp,
  agora: Date
): ResultadoGuardaTransferencia {
  if (inscrito.status !== 'confirmado') {
    return {
      ok: false,
      motivo: `Inscrição está '${inscrito.status}' — só inscrição confirmada (paga) transfere.`,
    };
  }
  if (inscrito.kitEntregueEm !== undefined) {
    return {
      ok: false,
      motivo: 'Kit já foi entregue — transferência bloqueada (RN-345).',
    };
  }
  if (typeof inscrito.chipNumero === 'string' && inscrito.chipNumero.length > 0) {
    return {
      ok: false,
      motivo: 'Chip já vinculado — transferência corromperia o resultado (RN-203).',
    };
  }
  if (inscrito.checkinEm !== undefined) {
    return {
      ok: false,
      motivo: 'Check-in já realizado — transferência bloqueada.',
    };
  }
  if (!politica.habilitada) {
    return {
      ok: false,
      motivo: 'Transferência de titularidade desabilitada na política do evento (RN-343).',
    };
  }
  if (!transferenciaAberta(politica, dataEvento, agora)) {
    return {
      ok: false,
      motivo: `Janela de transferência encerrada (${politica.janelaHoras}h antes do evento — RN-343).`,
    };
  }
  return { ok: true };
}

/**
 * A TROCA DE INGRESSO (mesmo titular) pode ser registrada agora?
 * (RN-344.) @pure
 */
export function podeTrocarIngresso(
  inscrito: Pick<Inscrito, 'status' | 'modalidade'>,
  novaModalidade: string,
  modalidadesDoEvento: readonly string[],
  politica: PoliticaTrocaIngresso,
  dataEvento: Timestamp,
  agora: Date
): ResultadoGuardaTransferencia {
  if (inscrito.status !== 'confirmado') {
    return {
      ok: false,
      motivo: `Inscrição está '${inscrito.status}' — só inscrição confirmada troca.`,
    };
  }
  if (!modalidadesDoEvento.includes(novaModalidade)) {
    return {
      ok: false,
      motivo: `Modalidade '${novaModalidade}' não existe neste evento.`,
    };
  }
  if (novaModalidade === inscrito.modalidade) {
    return { ok: false, motivo: 'Troca para a MESMA modalidade é no-op.' };
  }
  if (!politica.habilitada) {
    return {
      ok: false,
      motivo: 'Troca de ingresso desabilitada na política do evento (RN-344).',
    };
  }
  if (!trocaIngressoAberta(politica, dataEvento, agora)) {
    return {
      ok: false,
      motivo: `Janela de troca encerrada (${politica.janelaHoras}h antes do evento — RN-344).`,
    };
  }
  return { ok: true };
}

/**
 * Precisa recoletar tamanhos do novo titular? (RN-345: kit não entregue com
 * item tamanhado ⇒ o tamanho é do CORPO do titular, nunca herdado.) @pure
 */
export function exigeRecoletaTamanhos(
  inscrito: Pick<Inscrito, 'tamanhos' | 'kitEntregueEm'>
): boolean {
  return (
    inscrito.kitEntregueEm === undefined &&
    Object.keys(inscrito.tamanhos).length > 0
  );
}

/**
 * Diferença a cobrar na troca de ingresso (RN-344): preço vigente do destino
 * − valor pago na linha. Downgrade (diff < 0) sem `permiteReembolsoDowngrade`
 * trava em 0 (sem reembolso); com a flag, retorna o negativo (reembolso da
 * diferença — execução no fluxo próprio). @pure
 */
export function diffTrocaIngresso(
  precoVigenteDestino: number,
  valorPagoLinha: number,
  politica: Pick<PoliticaTrocaIngresso, 'permiteReembolsoDowngrade'>
): number {
  const diff = roundMoney(precoVigenteDestino - valorPagoLinha);
  if (diff < 0 && !politica.permiteReembolsoDowngrade) return 0;
  return diff;
}
