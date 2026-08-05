// =============================================================================
// functions/src/email/incidenteEmail.ts
//
// FALHA DE E-MAIL TRANSACIONAL VIRA INCIDENTE (F5 · P2 do DIAG-PIXREAL).
//
// O que este módulo conserta: em 04/08 os DOIS e-mails do primeiro pagamento
// real falharam com 401 da Brevo, e o sistema reagiu como se nada tivesse
// acontecido — dois `logger.error` no meio de milhares de linhas, sem nenhum
// campo que uma política de alerta pudesse casar. Ninguém foi avisado. O dono
// descobriu porque o e-mail não chegou nele.
//
// O CONSERTO É UM CAMPO, NÃO UMA FERRAMENTA NOVA. Todo log de falha de envio
// transacional passa a carregar `alerta: "email_transacional_falhou"` e
// `severidade: "critico"`. Uma política de alerta no Cloud Logging casa o
// campo (`jsonPayload.alerta="email_transacional_falhou"`) e não a mensagem —
// por isso os NOMES dos eventos ficam exatamente como estavam
// (`email_ingressos_falhou`, `conta_sem_friccao_email_falhou`): quem já
// consulta por eles continua achando, e o diagnóstico de hoje continua
// reproduzível amanhã.
//
// O QUE ESTE MÓDULO NÃO FAZ, DE PROPÓSITO: não cria canal de alerta, não
// chama pager, não sobe serviço. Criar custo de infra recorrente é decisão do
// CTO humano, não desta lane — aqui fica o GANCHO pronto, com o formato
// estável que a política vai casar. Enquanto a política não existe, a evidência
// já está no lugar certo: o campo no log e o estado no pedido
// (`pedidos/{id}.emailIngressos`, escrito por `enviarEmailIngressos`).
//
// PII NUNCA entra: só ids, tipo, e a mensagem de erro TRUNCADA do provedor —
// o e-mail e o nome do comprador ficam fora (LGPD), como em todo log do repo.
// =============================================================================

import * as logger from 'firebase-functions/logger';

/** Valor que a política de alerta casa. Mudar isto quebra o alerta. */
export const ALERTA_EMAIL_TRANSACIONAL = 'email_transacional_falhou';

/** Qual e-mail transacional falhou — o rótulo que o runbook usa. */
export type TipoEmailTransacional =
  | 'ingressos'
  | 'conta_sem_friccao'
  | 'reenvio_ingressos'
  | 'reenvio_conta'
  /**
   * O NONO e-mail (RN-476 · S1229-T2). Entrou na doutrina pela review
   * REV-CONTAS-MOTOR: ele nasceu com `logger.error` cru, sem o campo que a
   * política casa, e é o ÚNICO e-mail da casa cuja falha deixa a pessoa sem
   * conseguir entrar — o incidente de 04/08 servido de novo, com uma
   * credencial no meio.
   */
  | 'codigo_de_acesso';

export interface IncidenteEmail {
  tipo: TipoEmailTransacional;
  /**
   * OPCIONAL desde a REV-CONTAS-MOTOR: o e-mail do código de acesso não nasce
   * de um pedido — ele é pedido por quem não consegue entrar, antes de haver
   * compra nenhuma. Ausente, a chave simplesmente não entra no payload; o
   * campo `alerta`, que é o que a política casa, não depende dela.
   */
  pedidoId?: string;
  eventoId?: string | null;
  erro: unknown;
}

/**
 * Monta o payload do incidente. PURO — é o contrato que a política de alerta
 * casa, e é por isso que ele é testável sem emulator e sem espionar o logger.
 */
export function montarIncidenteEmail(
  incidente: IncidenteEmail
): Record<string, unknown> {
  const { erro } = incidente;
  return {
    alerta: ALERTA_EMAIL_TRANSACIONAL,
    severidade: 'critico',
    canal: 'email',
    tipo: incidente.tipo,
    ...(incidente.pedidoId !== undefined ? { pedidoId: incidente.pedidoId } : {}),
    ...(incidente.eventoId !== undefined && incidente.eventoId !== null
      ? { eventoId: incidente.eventoId }
      : {}),
    err: erro instanceof Error ? erro.message.slice(0, 200) : String(erro),
  };
}

/**
 * Registra a falha de envio como INCIDENTE.
 *
 * @param evento nome do log — preservado dos eventos que já existiam, para
 *   que consulta antiga continue funcionando.
 */
export function registrarIncidenteEmail(
  evento: string,
  incidente: IncidenteEmail
): void {
  logger.error(evento, montarIncidenteEmail(incidente));
}
