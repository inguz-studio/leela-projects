// =============================================================================
// functions/src/eventos/emitirIngressos.ts
//
// EMISSÃO DO INGRESSO DIGITAL (LEELA-S1206-T5 · RN-218 + RN-396).
//
// Toda inscrição CONFIRMADA de um pedido pago ganha, de uma vez só:
//   - `qrToken` — token opaco ASSINADO (RN-218/221/222), a única prova de
//     presença; reusa `assinarQrToken` (nada de segundo formato de QR);
//   - `codigoIngresso` — o código LEGÍVEL da RN-396, que a pessoa dita no
//     balcão e o organizador procura na lista (RN-397). NÃO é credencial;
//   - `ingressoEmitidoEm` — o carimbo.
//
// ONDE RODA: PÓS-CONFIRMAÇÃO, FORA da transação do dinheiro — os três
// confirmadores (`pagamentoWebhook`, `asaasWebhook`,
// `confirmarPagamentoSandbox`) chamam em modo BEST-EFFORT, exatamente como já
// fazem com `dispararContaSemFriccaoPosConfirmacao` (padrão reusado, não
// inventado). Motivo (Kleppmann): a transação da confirmação é de DINHEIRO e
// já é grande; reservar código único exige leituras extras cujo conflito
// forçaria retry de uma transação financeira. Ingresso não é dinheiro — e,
// sendo idempotente por inscrito, uma falha aqui é curada por reprocesso sem
// nenhum efeito duplicado.
//
// IDEMPOTÊNCIA POR INSCRITO (a exigência literal da RN-396: "reprocessar o
// webhook não troca o código"):
//   - inscrito que JÁ tem `qrToken` e `codigoIngresso` sai sem nenhuma
//     escrita — e o token NUNCA é re-assinado. Re-assinar seria inofensivo
//     hoje (a assinatura é determinística), mas depois de uma rotação de
//     chave produziria um token DIFERENTE do que já está no celular da
//     pessoa, e `classificarCheckinQr` compara com o gravado: o ingresso
//     emitido morreria por "qr_divergente" no dia do evento;
//   - doc com token e sem código (seed antigo, emissão interrompida no meio)
//     recebe SÓ o código que falta.
//
// UNICIDADE POR EVENTO — por CHAVE PRIMÁRIA, não por sorteio:
// `eventos/{eventoId}/ingressoCodigos/{codigo}` é um doc de reserva lido e
// criado DENTRO da transação que grava o inscrito. Sorteio de 6 símbolos em
// 31 tem colisão de aniversário real (~50% em ~37 mil códigos por evento);
// varrer a lista com uma query em vez disso apostaria no bloqueio de FAIXA
// de índice, que é justamente a garantia que o Firestore não promete para
// resultado vazio. Doc lido por id, ele promete: leitura de documento
// inexistente entra no read-set da transação e o commit falha se alguém o
// criar no meio. A reserva também dá, de graça, o caminho código→inscrito
// para o balcão futuro.
//
// QUANDO A EMISSÃO FALHA (item 54 · RN-382): o disparo pós-confirmação grava
// a pendência em `ingressosPendentes` e a varredura de 15 minutos
// (`varrerIngressosOrfaos`) re-tenta a emissão e fecha o e-mail. Sem ela, um
// pedido pago sem ingresso ficava órfão para sempre — nenhuma re-entrega do
// gateway volta a chamar este caminho (vetor 3 da INGQR-REV).
//
// A coleção `ingressoCodigos` NÃO tem `match` em firestore.rules DE
// PROPÓSITO: cai no deny-by-default. Nenhum cliente lê (a lista do
// organizador lê o código do próprio doc do inscrito) e nenhum cliente
// escreve (escrever seria reservar o código de outra pessoa antes dela).
// =============================================================================

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { gerarCodigoIngresso, isCodigoIngressoValido } from '@leela/core';
import { assinarQrToken, obterQrKeyring, type QrKeyring } from './qrToken';
import { registrarIngressoPendente } from './ingressosPendentes';
import { enviarEmailIngressos } from '../email/enviarIngressos';
import { selectEmailProvider } from '../email/selectEmailProvider';

type Db = admin.firestore.Firestore;

/** Subcoleção de RESERVA de código por evento (server-only — ver cabeçalho). */
export const INGRESSO_CODIGOS_SUBCOL = 'ingressoCodigos';

/**
 * Tentativas de sorteio antes de desistir de um inscrito. Com 887 milhões de
 * combinações, 8 falhas seguidas não são azar: são o sinal de que o evento
 * encheu o espaço ou de que algo está errado. Desistir de UM inscrito e
 * seguir é melhor que travar o pedido inteiro.
 */
export const TENTATIVAS_CODIGO_INGRESSO = 8;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Ingresso de um inscrito — insumo do e-mail (S1206-T6) e do log. */
export interface IngressoEmitido {
  inscritoId: string;
  /** Nome do titular (PII — nunca vai para log, só para o template). */
  nome: string;
  modalidade: string;
  qrToken: string;
  codigo: string;
  /** true = emitido NESTA chamada; false = já existia (replay). */
  novo: boolean;
}

export interface ResultadoEmissaoIngressos {
  /** false = nada a fazer (pedido inelegível, sem keyring). */
  processado: boolean;
  eventoId: string | null;
  /** Ingressos emitidos NESTA chamada. */
  emitidos: number;
  /** Inscritos que já tinham ingresso (idempotência). */
  jaEmitidos: number;
  /** Inscritos elegíveis que ficaram SEM ingresso (falha de reserva). */
  falhas: number;
  /** Todos os ingressos vivos do pedido, na ordem de `inscritoRefs`. */
  ingressos: IngressoEmitido[];
  motivo?: string;
}

// ---------------------------------------------------------------------------
// Emissão por inscrito (transacional)
// ---------------------------------------------------------------------------

interface EmissaoInscritoResult {
  ingresso: IngressoEmitido | null;
  motivo: 'emitido' | 'ja_emitido' | 'nao_confirmado' | 'inexistente' | 'sem_codigo_livre';
}

async function emitirIngressoDoInscrito(
  db: Db,
  eventoId: string,
  tenantId: string,
  inscritoId: string,
  keyring: QrKeyring,
  random: () => number
): Promise<EmissaoInscritoResult> {
  const eventoRef = db.collection('eventos').doc(eventoId);
  const inscritoRef = eventoRef.collection('inscritos').doc(inscritoId);

  return db.runTransaction(async (tx) => {
    // ── FASE DE LEITURA (nenhuma escrita antes do fim dela) ───────────────
    const snap = await tx.get(inscritoRef);
    if (!snap.exists) {
      return { ingresso: null, motivo: 'inexistente' as const };
    }
    // RN-218: ingresso é pós-pagamento. Inscrito que não flipou para
    // confirmado (cancelado antes de pagar, estornado) não recebe nada.
    if (snap.get('status') !== 'confirmado') {
      return { ingresso: null, motivo: 'nao_confirmado' as const };
    }

    const nome = (snap.get('atletaNome') as string | undefined) ?? '';
    const modalidade = (snap.get('modalidade') as string | undefined) ?? '';
    const tokenExistente = snap.get('qrToken') as string | undefined;
    const codigoExistente = snap.get('codigoIngresso') as string | undefined;

    // Replay puro: nada a escrever, e o token existente é preservado byte a
    // byte (ver a nota sobre rotação de chave no cabeçalho).
    if (
      typeof tokenExistente === 'string' &&
      tokenExistente.length > 0 &&
      isCodigoIngressoValido(codigoExistente)
    ) {
      return {
        ingresso: {
          inscritoId,
          nome,
          modalidade,
          qrToken: tokenExistente,
          codigo: codigoExistente,
          novo: false,
        },
        motivo: 'ja_emitido' as const,
      };
    }

    // Código: reserva por chave primária. Todas as leituras acontecem aqui,
    // antes de qualquer escrita — disciplina de transação do Firestore.
    let codigo: string | null = isCodigoIngressoValido(codigoExistente)
      ? codigoExistente
      : null;
    let reservaRef: admin.firestore.DocumentReference | null = null;
    if (codigo === null) {
      for (let i = 0; i < TENTATIVAS_CODIGO_INGRESSO; i++) {
        const candidato = gerarCodigoIngresso(random);
        const ref = eventoRef.collection(INGRESSO_CODIGOS_SUBCOL).doc(candidato);
        const reservado = await tx.get(ref);
        if (!reservado.exists) {
          codigo = candidato;
          reservaRef = ref;
          break;
        }
      }
    }
    if (codigo === null) {
      return { ingresso: null, motivo: 'sem_codigo_livre' as const };
    }

    // ── ESCRITAS ──────────────────────────────────────────────────────────
    // Token: só assina se ainda não existe. Preservar o emitido é o que
    // impede uma rotação de chave de invalidar ingresso que já saiu.
    const qrToken =
      typeof tokenExistente === 'string' && tokenExistente.length > 0
        ? tokenExistente
        : assinarQrToken({ inscritoId, eventoId, tenantId }, keyring);

    const agora = admin.firestore.FieldValue.serverTimestamp();
    if (reservaRef !== null) {
      // `create` (e não `set`): se outra transação reservou o mesmo código
      // entre a leitura e o commit, este commit falha em vez de sobrescrever
      // a reserva alheia. É a segunda tranca da unicidade.
      tx.create(reservaRef, { inscritoId, eventoId, tenantId, criadoEm: agora });
    }
    tx.update(inscritoRef, {
      qrToken,
      codigoIngresso: codigo,
      // Carimbo só na primeira emissão real — preencher o código de um doc
      // que já tinha token não é uma emissão nova.
      ...(typeof tokenExistente === 'string' && tokenExistente.length > 0
        ? {}
        : { ingressoEmitidoEm: agora }),
      atualizadoEm: agora,
    });

    return {
      ingresso: { inscritoId, nome, modalidade, qrToken, codigo, novo: true },
      motivo: 'emitido' as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Emissão do pedido
// ---------------------------------------------------------------------------

/**
 * Emite (ou recupera) o ingresso de cada inscrito de um pedido PAGO.
 *
 * Um inscrito por transação, de propósito: emissão não é dinheiro e não
 * precisa de atomicidade entre irmãos. Uma falha no terceiro inscrito deixa
 * os dois primeiros emitidos, e a próxima passagem completa o resto sem
 * duplicar nada — que é a definição operacional de idempotente por inscrito.
 *
 * @param random RNG injetável — os testes forçam colisão com ele.
 */
export async function emitirIngressosDoPedido(
  db: Db,
  pedidoId: string,
  keyring: QrKeyring | null,
  random: () => number = Math.random
): Promise<ResultadoEmissaoIngressos> {
  const vazio = (motivo: string): ResultadoEmissaoIngressos => ({
    processado: false,
    eventoId: null,
    emitidos: 0,
    jaEmitidos: 0,
    falhas: 0,
    ingressos: [],
    motivo,
  });

  // Fail-closed (mesma escolha do seed): sem keyring não existe assinatura, e
  // um ingresso sem token assinado não é ingresso — é enfeite que o balcão
  // recusaria. A compra segue intocada; a pendência fica no log.
  if (keyring === null) return vazio('sem_keyring');

  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) return vazio('pedido_inexistente');
  if (pedidoSnap.get('status') !== 'pago') return vazio('pedido_nao_pago');

  const eventoId = pedidoSnap.get('eventoId') as string | undefined;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    return vazio('pedido_sem_evento');
  }
  const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[] | undefined) ?? [];

  // tenantId vem do EVENTO, nunca do pedido nem do chamador (ADR-009) — é o
  // mesmo tenant que entra no payload assinado e que o balcão compara.
  const eventoSnap = await db.collection('eventos').doc(eventoId).get();
  if (!eventoSnap.exists) return vazio('evento_inexistente');
  const tenantId = eventoSnap.get('tenantId') as string | undefined;
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    return vazio('evento_sem_tenant');
  }

  const ingressos: IngressoEmitido[] = [];
  let emitidos = 0;
  let jaEmitidos = 0;
  let falhas = 0;

  for (const inscritoId of inscritoRefs) {
    try {
      const r = await emitirIngressoDoInscrito(
        db,
        eventoId,
        tenantId,
        inscritoId,
        keyring,
        random
      );
      if (r.ingresso !== null) {
        ingressos.push(r.ingresso);
        if (r.motivo === 'emitido') emitidos++;
        else jaEmitidos++;
      } else if (r.motivo === 'sem_codigo_livre') {
        falhas++;
        logger.error('ingresso_sem_codigo_livre', { eventoId, inscritoId });
      }
    } catch (err) {
      // Um inscrito que falha não derruba os irmãos; o reprocesso cura.
      falhas++;
      logger.error('ingresso_emissao_falhou', {
        eventoId,
        inscritoId,
        err: err instanceof Error ? err.message.slice(0, 200) : String(err),
      });
    }
  }

  return {
    processado: true,
    eventoId,
    emitidos,
    jaEmitidos,
    falhas,
    ingressos,
  };
}

// ---------------------------------------------------------------------------
// Disparo pós-confirmação (os 3 confirmadores chamam — best-effort)
// ---------------------------------------------------------------------------

/**
 * Emite os ingressos APÓS uma confirmação efetivada. Engole qualquer erro
 * com log: a resposta do webhook nunca falha por causa de ingresso (a fila
 * do Asaas pausa com 15 falhas), e a emissão é recuperável por reprocesso.
 *
 * Espelha `dispararContaSemFriccaoPosConfirmacao` — mesma guarda de
 * elegibilidade, mesma postura best-effort, mesmo formato de log sem PII.
 */
export async function dispararEmissaoIngressosPosConfirmacao(
  db: Db,
  resultado: {
    statusGateway: string;
    ignorado: boolean;
    duplicado: boolean;
    pedidoId: string;
  }
): Promise<ResultadoEmissaoIngressos | null> {
  if (
    resultado.statusGateway !== 'confirmed' ||
    resultado.ignorado ||
    resultado.duplicado
  ) {
    return null;
  }
  try {
    const r = await emitirIngressosDoPedido(
      db,
      resultado.pedidoId,
      obterQrKeyring()
    );
    logger.info('ingressos_emitidos', {
      pedidoId: resultado.pedidoId,
      eventoId: r.eventoId,
      emitidos: r.emitidos,
      jaEmitidos: r.jaEmitidos,
      falhas: r.falhas,
      ...(r.motivo !== undefined ? { motivo: r.motivo } : {}),
    });
    // S1206-T6 (RN-398): o e-mail ao responsável sai NA MESMA janela, com os
    // ingressos que acabaram de existir. A idempotência é a da RN-219 (log de
    // comunicação), independente da idempotência da emissão — reprocessar o
    // webhook não reenvia, e uma emissão que completou depois não duplica.
    //
    // MAS só com a emissão FECHADA (item 54 · RN-382). A RN-219 é at-most-once
    // por pedido: queimar a chave sobre uma lista PARCIAL condenaria quem ficou
    // de fora a nunca receber o ingresso por e-mail — a segunda passagem
    // derivaria o mesmo docId e seria suprimida. Com pendência aberta, quem
    // manda o e-mail é a varredura, depois de completar a emissão; e se a
    // re-tentativa esgotar, ela manda o que existe em vez de deixar o
    // comprador sem nada. A espera é limitada por construção.
    if (r.falhas === 0 && r.eventoId !== null && r.ingressos.length > 0) {
      await enviarEmailIngressos(
        db,
        {
          pedidoId: resultado.pedidoId,
          eventoId: r.eventoId,
          ingressos: r.ingressos,
        },
        selectEmailProvider()
      );
    }

    // O PONTO DA FALHA (item 54 · RN-382): pedido pago que não saiu com o
    // ingresso completo entra no extrato AQUI, na única janela em que o
    // sistema sabe que ele existe — nenhuma re-entrega do gateway volta a
    // chamar este caminho (vetor 3 da INGQR-REV). O registro é total de
    // propósito: qualquer desfecho que não seja "emissão processada e sem
    // falha" vira pendência, e é a varredura que separa o que se cura do que
    // nem era órfão. Nada não-tratado fica invisível.
    if (!r.processado || r.falhas > 0) {
      await registrarIngressoPendente(db, {
        pedidoId: resultado.pedidoId,
        eventoId: r.eventoId,
        motivo: r.processado ? 'emissao_incompleta' : 'emissao_nao_processada',
        falhas: r.falhas,
        ...(r.motivo !== undefined ? { detalhe: r.motivo } : {}),
      });
    }
    return r;
  } catch (err) {
    logger.error('ingressos_emissao_disparo_falhou', {
      pedidoId: resultado.pedidoId,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    // O erro continua engolido (a resposta do webhook não falha por causa de
    // ingresso), mas deixa de ser silencioso: vira pendência para a varredura.
    try {
      await registrarIngressoPendente(db, {
        pedidoId: resultado.pedidoId,
        eventoId: null,
        motivo: 'disparo_falhou',
        falhas: 0,
        detalhe: err instanceof Error ? err.message.slice(0, 200) : String(err),
      });
    } catch (erroExtrato) {
      logger.error('ingresso_pendencia_nao_registrada', {
        pedidoId: resultado.pedidoId,
        err:
          erroExtrato instanceof Error
            ? erroExtrato.message.slice(0, 200)
            : String(erroExtrato),
      });
    }
    return null;
  }
}
