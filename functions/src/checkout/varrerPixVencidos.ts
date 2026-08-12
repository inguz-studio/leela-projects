// =============================================================================
// functions/src/checkout/varrerPixVencidos.ts
//
// Varredura do PIX pendente VENCIDO (LEELA-S322-T2 · RN-545 · RN-157 ·
// ADR-015 · trace leela-redesign-v2-20260810, lane ESTOURO-BUILD).
//
// O BURACO QUE ELA FECHA, medido em 10/08: o vencimento do PIX não tinha
// executor automático nenhum. `expirarPixPendente` é `https.onCall` do DONO
// do pedido — só roda se o comprador reabrir a tela. O OVERDUE do Asaas
// chega, mas com granularidade de DIA (`dueDate` é por dia, e o próprio
// adapter documenta que "o enforcement fino dos 30 minutos é da
// PLATAFORMA"). Resultado: PIX abandonado ficava `'pendente'` até o dia
// seguinte, ou para sempre.
//
// POR QUE ELA VEM ANTES DA RESERVA (RN-543), e não junto: sob a reserva,
// cada pendente eterno é uma VAGA PRESA. Subir a reserva sem esta varredura
// seria trocar o estouro por um jeito novo de perder venda — pior que o
// estado atual. As duas peças sobem juntas ou nenhuma, e a ordem entre elas
// não pode inverter.
//
// REUSO, NÃO SEGUNDA MÁQUINA: o efeito por item é `expirarPixPendenteCore`
// com o chamador de sistema (S322-T1). Gateway-primeiro, fail-safe,
// anti-abuso de relógio e releitura transacional são HERDADOS — não há uma
// segunda implementação do cancelamento para divergir da primeira.
// Precedente: `encerrarPixAnteriorNaCriacao` já reusa o mesmo core.
//
// AGENDAMENTO COM MINUTO EXPLÍCITO (lição paga pela REV da Onda 1 em
// 10/08): `every N minutes` NÃO fixa minuto nenhum — o Cloud Scheduler
// escolhe o horário-base e o cron pode aterrissar em cima do bloco noturno
// 03:00-03:20. A expressão `3-58/5 * * * *` fixa a grade
// :03/:08/:13/…/:58, que passa ao largo dos quatro instantes de partida dos
// noturnos. Trava em `varrerPixVencidosAgendamento.test.ts`.
//
// CADÊNCIA: 5 minutos sobre um vencimento de 30 — atraso máximo de ~5 min
// na devolução da vaga, que é o mesmo compromisso do
// `expirarCarrinhosAbandonados`.
//
// O QUE ELA NÃO FAZ: não decide prazo (quem decide é `pixExpiraEm`,
// carimbado na criação com o relógio da plataforma), não cancela pagamento
// confirmado (cobrança paga não é cancelável no gateway, e a releitura
// in-tx é a segunda linha), e não inventa retry manual — recusa do gateway
// conta na rodada e volta na seguinte.
// =============================================================================

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { PaymentProvider } from '@leela/core';
import { selectPaymentProvider } from '../payments/selectProvider';
import { agoraCheckout } from './relogioCheckout';
import {
  expirarPixPendenteCore,
  MOTIVO_CANCELAMENTO_GATEWAY_FALHOU,
} from './expirarPixPendente';

type Db = admin.firestore.Firestore;

/**
 * Teto por rodada (mesma disciplina do `CARRINHOS_LOTE_MAX`): varredura
 * BOUNDED — backlog maior drena nas rodadas seguintes, e uma rajada de
 * abandono não estoura o timeout da Function. Rodada de 5 minutos com teto
 * de 200 drena 2.400 pendências por hora.
 */
export const PIX_VENCIDOS_LOTE_MAX = 200;

export interface VarrerPixVencidosResultado {
  /** Pagamentos vencidos que a query devolveu nesta rodada. */
  encontrados: number;
  /** Expirados AGORA por esta rodada (pendente → cancelado). */
  expirados: number;
  /** O gateway recusou o cancelamento — pedido segue VIVO, retenta depois. */
  recusadosGateway: number;
  /** Saíram de 'pendente' entre a query e a tx (webhook venceu a corrida). */
  naoElegiveis: number;
  /** Erros isolados por item (não derrubam o lote). */
  erros: number;
}

/** O erro é a recusa TIPADA do gateway (fail-safe), não uma falha nossa? */
function ehRecusaDoGateway(err: unknown): boolean {
  const e = err as { code?: string; details?: { motivo?: unknown } };
  return (
    e?.code === 'failed-precondition' &&
    e?.details?.motivo === MOTIVO_CANCELAMENTO_GATEWAY_FALHOU
  );
}

// ---------------------------------------------------------------------------
// Núcleo (ADR-015 — testável no Emulator via Admin SDK, sem scheduler)
// ---------------------------------------------------------------------------

/**
 * @param teto máximo de itens POR RODADA. Injetado (default
 * `PIX_VENCIDOS_LOTE_MAX`) pela mesma razão que `agora` é injetado no molde
 * ADR-015: sem a costura, provar que a varredura é BOUNDED exigiria semear
 * 201 pedidos no Emulator — e o teste caro é o teste que ninguém roda.
 * Produção nunca passa o argumento.
 */
export async function varrerPixVencidosCore(
  db: Db,
  provider: PaymentProvider,
  agora: Date = new Date(),
  teto: number = PIX_VENCIDOS_LOTE_MAX
): Promise<VarrerPixVencidosResultado> {
  const resultado: VarrerPixVencidosResultado = {
    encontrados: 0,
    expirados: 0,
    recusadosGateway: 0,
    naoElegiveis: 0,
    erros: 0,
  };

  // A query exige o índice composto (status, pixExpiraEm) declarado em
  // `firestore.indexes.json` — o PRIMEIRO da coleção `pagamentos`, e o
  // desvio nomeado do "zero índice novo" das rodadas vizinhas. Sem ele o
  // Firestore recusa a query inteira (não degrada em varredura completa),
  // então a falta apareceria na primeira rodada, não em silêncio.
  //
  // `pixExpiraEm <= agora` também FILTRA A FORMA de graça: só doc de PIX
  // carrega o campo, então cartão nunca entra na varredura (a exclusividade
  // do timer é da RN-157 e já é gate do core).
  const vencidos = await db
    .collection('pagamentos')
    .where('status', '==', 'pendente')
    .where('pixExpiraEm', '<=', Timestamp.fromDate(agora))
    .limit(teto)
    .get();

  resultado.encontrados = vencidos.size;
  if (vencidos.empty) return resultado;

  for (const doc of vencidos.docs) {
    const pedidoId = doc.get('pedidoRef') as unknown;
    if (typeof pedidoId !== 'string' || pedidoId.length === 0) {
      // Pagamento sem backlink ao pedido é dado corrompido — conta como
      // erro e segue; a varredura nunca adivinha a qual pedido pertence.
      resultado.erros += 1;
      logger.error('pix_varredura_item_falhou', {
        pagamentoId: doc.id,
        erro: 'pagamento sem pedidoRef',
      }); // sem PII
      continue;
    }

    try {
      const r = await expirarPixPendenteCore(
        db,
        provider,
        { pedidoId },
        // O chamador de sistema (S322-T1): a varredura não tem dono a
        // apresentar. Tudo o mais do core roda idêntico à porta pública.
        { sistema: true },
        () => agora
      );
      if (r.expirado) resultado.expirados += 1;
      else resultado.naoElegiveis += 1;
    } catch (err) {
      if (ehRecusaDoGateway(err)) {
        // FAIL-SAFE HERDADO: a cobrança continua válida lá fora, então o
        // pedido continua VIVO aqui. Não é erro nosso, não vira alarme de
        // falha, e a rodada seguinte retenta sozinha — sem retry manual e
        // sem estado novo para representar "tentando de novo".
        resultado.recusadosGateway += 1;
        continue;
      }
      resultado.erros += 1;
      logger.error('pix_varredura_item_falhou', {
        pedidoId,
        erro: err instanceof Error ? err.message.slice(0, 200) : String(err),
      }); // sem PII
    }
  }

  // OBSERVABILIDADE, e o limite dito em voz alta: a plataforma não tem
  // política de alerta (pendência do CTO registrada em DECISOES-ABERTAS —
  // "o gancho de incidente existe e do outro lado não há ninguém"). Este
  // log é casável pela doutrina de incidente e NÃO é alerta: varredura
  // parada aparece na AUSÊNCIA das linhas de rodada. Nenhum heartbeat novo
  // foi inventado sem o dono pedir.
  //
  // A linha sai SEMPRE que houve algo a contar — inclusive rodada de zero
  // achados fica de fora, para o silêncio não custar quota. Rodada com
  // recusa do gateway é `warn`: dinheiro que a plataforma tentou matar e
  // não conseguiu não desce ao nível de rotina.
  if (resultado.encontrados > 0) {
    const linha = { ...resultado }; // sem PII
    if (resultado.recusadosGateway > 0 || resultado.erros > 0) {
      logger.warn('pix_varredura_rodada', linha);
    } else {
      logger.info('pix_varredura_rodada', linha);
    }
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Wrapper (ADR-015 — fino de propósito)
// ---------------------------------------------------------------------------

/**
 * `varrerPixVencidos` — o executor automático do prazo do PIX (RN-545).
 *
 * `secrets` no molde `varrerEstornosOrfaos`: este cron FALA COM O GATEWAY
 * (cancela a cobrança antes de flipar os docs), e sem o binding o Cloud
 * Functions não injeta a chave — o Emulator passaria verde e a produção
 * falharia em silêncio (a lição `QR_TOKEN_KEYS` do `asaasWebhook`). O
 * `secretsBinding.contract.test.ts` cobre esta function automaticamente a
 * partir do export em `index.ts`.
 */
export const varrerPixVencidos = runWith({
  secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
})
  .pubsub.schedule('3-58/5 * * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    await varrerPixVencidosCore(
      admin.firestore(),
      selectPaymentProvider(),
      agoraCheckout()
    );
    return null;
  });
