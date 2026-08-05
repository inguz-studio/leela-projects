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
// QUEM NÃO SAI COM INGRESSO — DUAS COISAS DIFERENTES (RF2-1 · REV-F2F5): um
// inscrito que não está `confirmado` na janela da emissão pode ser
//   (a) TERMINAL — `cancelado`/`estornado`: a matriz da RN-204/RN-341 não tem
//       aresta de volta para `confirmado`, então ele NUNCA terá ingresso e a
//       lista SEM ele está COMPLETA; ou
//   (b) REVERSÍVEL — `pendente` (e qualquer status que a matriz não conheça):
//       o organizador ainda pode confirmar (acerto manual, transferência,
//       reprocesso), e a lista sem ele é PARCIAL.
// A distinção decide se a chave at-most-once da RN-219 pode ser queimada, e é
// por isso que ela sai da matriz canônica do core (`podeTransicionarStatusInscrito`)
// em vez de uma lista de status escrita aqui — status novo no core não pode
// nascer valendo como "terminal" por omissão. O caso (b) conta em `aguardando`,
// abre pendência e SEGURA o e-mail; o (a) conta em `naoElegiveis` e não segura
// nada. Antes desta lane os dois eram o mesmo `nao_confirmado` invisível: o
// e-mail saía pela metade, a chave queimava e ninguém abria pendência.
//
// `listaCompleta` é o predicado que autoriza o envio automático. Ele existe no
// RESULTADO, e não na cabeça de cada chamador, porque são dois (o disparo do
// webhook e a varredura) e o defeito acima nasceu exatamente de um chamador
// re-derivando "está fechado" a partir de `falhas === 0`.
//
// A coleção `ingressoCodigos` NÃO tem `match` em firestore.rules DE
// PROPÓSITO: cai no deny-by-default. Nenhum cliente lê (a lista do
// organizador lê o código do próprio doc do inscrito) e nenhum cliente
// escreve (escrever seria reservar o código de outra pessoa antes dela).
// =============================================================================

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  gerarCodigoIngresso,
  isCodigoIngressoValido,
  isStatusInscrito,
  podeTransicionarStatusInscrito,
} from '@leela/core';
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

/**
 * O inscrito ainda PODE virar `confirmado` — e portanto ainda pode ter
 * ingresso? (RF2-1)
 *
 * Sai da matriz canônica do core (`TRANSICOES_STATUS_INSCRITO`), nunca de uma
 * lista local: a disciplina que o próprio módulo do inscrito impõe é
 * "Functions que mudam status DEVEM consultar esta matriz — nunca re-derivar
 * transições localmente", e ler dela vale o mesmo. Hoje isso é `pendente` sim,
 * `cancelado`/`estornado` não (os dois são terminais desde a RN-341).
 *
 * FAIL-CLOSED no desconhecido: status fora do enum (dado corrompido, campo
 * ausente, status novo que ainda não desceu para cá) conta como REVERSÍVEL. O
 * erro barato é segurar um e-mail que a varredura manda 15 minutos depois; o
 * caro é queimar a chave at-most-once da RN-219 sobre uma lista pela metade,
 * que não tem volta. @pure
 */
export function inscritoAindaPodeConfirmar(status: unknown): boolean {
  return (
    !isStatusInscrito(status) || podeTransicionarStatusInscrito(status, 'confirmado')
  );
}

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
  /**
   * Inscritos RECUSADOS: não pertencem a este pedido (defesa em profundidade)
   * ou o doc não existe mais. Anomalia de dado — re-tentar não conserta.
   */
  rejeitados: number;
  /**
   * Inscritos que ainda PODEM confirmar e por isso não têm ingresso AGORA
   * (RF2-1). A lista de `ingressos` está parcial enquanto isto for > 0.
   */
  aguardando: number;
  /**
   * Inscritos em status TERMINAL (`cancelado`/`estornado`): nunca terão
   * ingresso, e a lista sem eles está completa. Contados para que "sumiram do
   * e-mail" seja um número, não um silêncio.
   */
  naoElegiveis: number;
  /**
   * `ingressos` cobre TODO inscrito que ainda pode ter ingresso?
   *
   * É ESTE o predicado que autoriza queimar a chave at-most-once da RN-219 —
   * nunca `falhas === 0`, que foi como o e-mail parcial saiu (RF2-1). Recusa
   * NÃO entra: inscrito de outro pedido não é deste e-mail, e inscrito
   * apagado não tem cura nem destinatário.
   */
  listaCompleta: boolean;
  /** Todos os ingressos vivos do pedido, na ordem de `inscritoRefs`. */
  ingressos: IngressoEmitido[];
  motivo?: string;
}

// ---------------------------------------------------------------------------
// Emissão por inscrito (transacional)
// ---------------------------------------------------------------------------

interface EmissaoInscritoResult {
  ingresso: IngressoEmitido | null;
  motivo:
    | 'emitido'
    | 'ja_emitido'
    /** Status TERMINAL (cancelado/estornado): não recebe, e está certo. */
    | 'nao_elegivel'
    /** Status REVERSÍVEL (pendente/desconhecido): pode receber DEPOIS. */
    | 'aguardando_confirmacao'
    | 'inexistente'
    | 'pedido_divergente'
    | 'sem_codigo_livre';
}

async function emitirIngressoDoInscrito(
  db: Db,
  eventoId: string,
  pedidoId: string,
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
    // DEFESA EM PROFUNDIDADE (achado 4 da INGQR-REV): a relação pedido↔inscrito
    // é conferida DOS DOIS LADOS. A emissão varre `pedido.inscritoRefs`; aqui o
    // inscrito tem de apontar de volta para ESTE pedido. Hoje inexplorável —
    // `pedidos` é `write: false` para cliente e `inscritoRefs` só é escrito pela
    // Function do checkout —, mas o custo é uma condição e o que ela impede é
    // grave: um inscrito de outro pedido na lista sairia com ingresso emitido E
    // com o QR dentro do e-mail de um terceiro. Vem ANTES do status de
    // propósito: identidade primeiro, estado depois.
    if (snap.get('pedidoRef') !== pedidoId) {
      return { ingresso: null, motivo: 'pedido_divergente' as const };
    }
    // RN-218: ingresso é pós-pagamento. Inscrito que não flipou para
    // confirmado não recebe nada — mas o que isso SIGNIFICA depende do status,
    // e a diferença é a que decide se o e-mail do pedido pode sair (RF2-1).
    const status = snap.get('status') as unknown;
    if (status !== 'confirmado') {
      return {
        ingresso: null,
        motivo: inscritoAindaPodeConfirmar(status)
          ? ('aguardando_confirmacao' as const)
          : ('nao_elegivel' as const),
      };
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
    rejeitados: 0,
    aguardando: 0,
    naoElegiveis: 0,
    // Emissão que nem rodou não fecha lista nenhuma: `processado: false` já
    // segura o e-mail nos dois chamadores, e o predicado concorda com eles.
    listaCompleta: false,
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
  let rejeitados = 0;
  let aguardando = 0;
  let naoElegiveis = 0;

  for (const inscritoId of inscritoRefs) {
    try {
      const r = await emitirIngressoDoInscrito(
        db,
        eventoId,
        pedidoId,
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
      } else if (r.motivo === 'aguardando_confirmacao') {
        // NÃO é falha de emissão (não há o que re-tentar enquanto o inscrito
        // não confirmar) e NÃO é recusa (ele ainda pode ter ingresso). É a
        // terceira coisa, e é ela que SEGURA o e-mail: mandar agora queimaria
        // a chave at-most-once da RN-219 sobre uma lista pela metade, e quem
        // ficou de fora nunca mais receberia (RF2-1). A pendência aberta pelo
        // chamador leva o caso à varredura, que fecha o e-mail quando a
        // emissão completar — e, se esgotar, manda o que existe com alerta.
        aguardando++;
        logger.warn('ingresso_inscrito_aguardando_confirmacao', {
          eventoId,
          pedidoId,
          inscritoId,
        });
      } else if (r.motivo === 'nao_elegivel') {
        // Terminal (cancelado/estornado): a lista SEM ele está completa. Conta
        // só para o e-mail sem ele ser um número, e não um silêncio.
        naoElegiveis++;
      } else if (r.motivo === 'inexistente') {
        // Mesmo juízo do `pedido_divergente`: re-tentar não faz nascer doc que
        // o organizador apagou (`allow delete` de inscrito existe nas Rules), e
        // não há a quem entregar. Recusa, com grito — a transação da
        // confirmação recusa pedido com inscrito inexistente (409), então
        // chegar aqui é dado que mudou DEPOIS do dinheiro.
        rejeitados++;
        logger.error('ingresso_inscrito_inexistente', {
          eventoId,
          pedidoId,
          inscritoId,
        });
      } else if (r.motivo === 'pedido_divergente') {
        // NÃO conta como falha: falha é pendência que a varredura re-tenta, e
        // re-tentar não conserta uma lista corrompida. Conta como recusa, e
        // grita — inscrito de outro pedido em `inscritoRefs` é anomalia de
        // dado, não estado normal do sistema.
        rejeitados++;
        logger.error('ingresso_inscrito_de_outro_pedido', {
          eventoId,
          pedidoId,
          inscritoId,
        });
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
    rejeitados,
    aguardando,
    naoElegiveis,
    listaCompleta: falhas === 0 && aguardando === 0,
    ingressos,
  };
}

// ---------------------------------------------------------------------------
// Leitura pura (F2 · reenvio) — NUNCA emite
// ---------------------------------------------------------------------------

/** Fotografia dos ingressos que JÁ existem num pedido. */
export interface IngressosVivosDoPedido {
  eventoId: string | null;
  /** Ingressos já emitidos, na ordem de `inscritoRefs`. `novo` é sempre false. */
  ingressos: IngressoEmitido[];
  /** Inscritos CONFIRMADOS que ainda NÃO têm ingresso (emissão pendente). */
  semIngresso: string[];
  motivo?: string;
}

/**
 * Lê os ingressos vivos de um pedido — SEM emitir, SEM assinar, SEM escrever.
 *
 * É o insumo do reenvio administrativo (F2): reenviar tem de entregar o MESMO
 * `qrToken` que está no celular da pessoa. Re-assinar produziria um token
 * diferente depois de uma rotação de chave e mataria o ingresso no balcão por
 * `qr_divergente` (a mesma razão do replay puro lá em cima) — e o link do
 * e-mail é amarrado ao token, então re-emitir também mataria o link antigo
 * (RN-420).
 *
 * `semIngresso` existe para que o chamador NUNCA mande um e-mail de compra com
 * a lista pela metade: emissão incompleta é caso da varredura
 * (`varrerIngressosOrfaos`), não do reenvio.
 *
 * ASSIMETRIA DELIBERADA com a emissão (RF2-1) — não "conserte" sem ler: aqui
 * inscrito que ainda pode confirmar (`pendente`) é SILÊNCIO, não `semIngresso`.
 * As duas funções respondem perguntas diferentes. A emissão pergunta "posso
 * gastar a chave at-most-once da RN-219?" e responde fail-closed, porque
 * gastá-la sobre lista parcial não tem volta. Esta pergunta é "o que existe
 * para entregar AGORA, a pedido explícito de um admin, sob a chave da PRÓPRIA
 * operação?" — e ali a resposta certa é entregar o que existe, porque nenhuma
 * chave de uso único é queimada e o caso segue aberto em `ingressosPendentes`
 * até a emissão completar.
 */
export async function lerIngressosVivosDoPedido(
  db: Db,
  pedidoId: string
): Promise<IngressosVivosDoPedido> {
  const vazio = (motivo: string): IngressosVivosDoPedido => ({
    eventoId: null,
    ingressos: [],
    semIngresso: [],
    motivo,
  });

  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) return vazio('pedido_inexistente');
  const eventoId = pedidoSnap.get('eventoId') as string | undefined;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    return vazio('pedido_sem_evento');
  }
  const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[] | undefined) ?? [];

  const col = db.collection('eventos').doc(eventoId).collection('inscritos');
  const ingressos: IngressoEmitido[] = [];
  const semIngresso: string[] = [];
  for (const inscritoId of inscritoRefs) {
    const snap = await col.doc(inscritoId).get();
    // Mesma defesa em profundidade da emissão: inscrito de OUTRO pedido na
    // lista nunca tem o QR entregue no e-mail de um terceiro.
    if (!snap.exists || snap.get('pedidoRef') !== pedidoId) continue;
    if (snap.get('status') !== 'confirmado') continue;
    const qrToken = snap.get('qrToken') as string | undefined;
    const codigo = snap.get('codigoIngresso') as string | undefined;
    if (
      typeof qrToken !== 'string' ||
      qrToken.length === 0 ||
      !isCodigoIngressoValido(codigo)
    ) {
      semIngresso.push(inscritoId);
      continue;
    }
    ingressos.push({
      inscritoId,
      nome: (snap.get('atletaNome') as string | undefined) ?? '',
      modalidade: (snap.get('modalidade') as string | undefined) ?? '',
      qrToken,
      codigo,
      novo: false,
    });
  }

  return { eventoId, ingressos, semIngresso };
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
      rejeitados: r.rejeitados,
      aguardando: r.aguardando,
      naoElegiveis: r.naoElegiveis,
      listaCompleta: r.listaCompleta,
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
    //
    // ⚠ RF2-1: a guarda era `r.falhas === 0`, e `falhas` NÃO contava o inscrito
    // que ainda podia confirmar. O predicado agora vem do resultado
    // (`listaCompleta`), que é o único lugar onde a conta de "quem ainda pode
    // ter ingresso" é feita — chamador não re-deriva fecho de emissão.
    if (r.listaCompleta && r.eventoId !== null && r.ingressos.length > 0) {
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
    //
    // ⚠ RF2-1: `aguardando > 0` entra aqui pelo mesmo motivo que entra na
    // guarda do e-mail — é inscrito que ainda pode ter ingresso e não tem.
    // Sem esta linha, o único gerador provável do estado ficava fora da
    // coleção que a varredura enxerga, e o reenvio administrativo recusava
    // `ingresso_incompleto` apontando para uma ferramenta que não ia agir
    // (o beco que a REV-F2F5 fechou do lado do reenvio — a doutrina é a
    // mesma: pendência aberta NO PONTO DA DESCOBERTA).
    if (!r.processado || r.falhas > 0 || r.aguardando > 0) {
      const detalhe =
        r.motivo ?? (r.aguardando > 0 ? 'aguardando_confirmacao' : undefined);
      await registrarIngressoPendente(db, {
        pedidoId: resultado.pedidoId,
        eventoId: r.eventoId,
        motivo: r.processado ? 'emissao_incompleta' : 'emissao_nao_processada',
        falhas: r.falhas,
        aguardando: r.aguardando,
        ...(detalhe !== undefined ? { detalhe } : {}),
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
