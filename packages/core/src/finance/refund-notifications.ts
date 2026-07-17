// =============================================================================
// packages/core/src/finance/refund-notifications.ts
//
// Mapeamento PURO estado→notificações da máquina de reembolso
// (LEELA-S904-T3 · E09 · RN-342). Quem recebe o quê:
//   - ABERTURA (estado=solicitado, já roteado): organizador é notificado
//     IMEDIATAMENTE (obrigatório) e o atleta/responsável recebe recibo;
//   - CADA TRANSIÇÃO (aprovado_auto/aprovado/recusado/estornado/em_analise):
//     o atleta/responsável é notificado.
//
// O REGISTRO físico usa o log de comunicação (FABLE-G): docId determinístico
// `{destinatario.ref}_{chave}_{canal}` ⇒ idempotência por transição vem de
// GRAÇA (reprocessar não renotifica — RN-219/RN-342). Como a máquina RN-341
// não tem ciclos, cada estado é alcançado NO MÁXIMO uma vez por reembolso —
// a chave por estado é estável e única.
//
// Chaves NÃO carregam `_` (separador do docId — CHAVE_LOG_COMUNICACAO_RE):
// estados com underscore viram hífen ('aprovado_auto'→'aprovado-auto').
//
// O ENVIO físico (e-mail) é pendência externa (provider transacional não
// configurado) — o contrato desta task é o REGISTRO auditável e idempotente,
// mesmo padrão do repo (FABLE-G/E06). Sem corpo de mensagem: PII mínima.
// =============================================================================

import type { DestinatarioComunicacao } from '../comms/logComunicacao';
import type { EstadoReembolso } from './refund-machine';

/** Uma notificação a registrar no log de comunicação (canal e-mail). */
export interface NotificacaoReembolso {
  destinatario: DestinatarioComunicacao;
  /** Chave de idempotência (sem `_` — vira parte do docId determinístico). */
  chave: string;
  /** Assunto curto — NUNCA o corpo (PII mínima). */
  assunto: string;
  /** Template do conteúdo (o corpo mora no template, não no log). */
  templateRef: string;
}

/** 'aprovado_auto' → 'aprovado-auto' (chave não pode carregar `_`). @pure */
export function chaveTransicaoReembolso(estado: EstadoReembolso): string {
  return `reembolso-${estado.replace(/_/g, '-')}`;
}

const ASSUNTOS: Readonly<Record<EstadoReembolso, string>> = {
  solicitado: 'Solicitação de reembolso recebida',
  aprovado_auto: 'Reembolso aprovado automaticamente',
  em_analise: 'Reembolso em análise pelo organizador',
  aprovado: 'Reembolso aprovado',
  recusado: 'Reembolso recusado',
  estornado: 'Reembolso concluído — valor devolvido',
};

/**
 * Notificações da ABERTURA (RN-342): organizador (obrigatório) + recibo ao
 * atleta/responsável + a transição do roteamento inicial ao atleta.
 * Em pedido em grupo (ADR-011) o e-mail do "atleta" vai ao responsável —
 * resolução de endereço é do enviador; aqui o destinatário é o inscrito.
 * @pure
 */
export function notificacoesAberturaReembolso(
  inscritoId: string,
  organizadorUid: string,
  estadoRoteado: Extract<EstadoReembolso, 'aprovado_auto' | 'em_analise'>
): NotificacaoReembolso[] {
  return [
    {
      destinatario: { tipo: 'organizador', ref: organizadorUid },
      // Por-inscrito na chave: o ref do organizador é o MESMO para todos os
      // reembolsos do evento — sem o inscritoId, aberturas de inscritos
      // diferentes colidiriam no docId.
      chave: `reembolso-aberto-${inscritoId.replace(/_/g, '-')}`,
      assunto: ASSUNTOS.solicitado,
      templateRef: 'reembolso-organizador-abertura',
    },
    {
      destinatario: { tipo: 'inscrito', ref: inscritoId },
      chave: 'reembolso-recibo',
      assunto: ASSUNTOS.solicitado,
      templateRef: 'reembolso-atleta-recibo',
    },
    ...notificacoesTransicaoReembolso(inscritoId, estadoRoteado),
  ];
}

/**
 * Notificação de UMA transição ao atleta/responsável (RN-342). @pure
 */
export function notificacoesTransicaoReembolso(
  inscritoId: string,
  para: EstadoReembolso
): NotificacaoReembolso[] {
  return [
    {
      destinatario: { tipo: 'inscrito', ref: inscritoId },
      chave: chaveTransicaoReembolso(para),
      assunto: ASSUNTOS[para],
      templateRef: `reembolso-atleta-${para.replace(/_/g, '-')}`,
    },
  ];
}
