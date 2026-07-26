// =============================================================================
// functions/src/checkout/expirarCarrinhosAbandonados.ts
//
// Varredura dos carrinhos vencidos (LEELA-PIX-CARRINHO-T2 · RN-158 ·
// ADR-015).
//
// PADRÃO ADR-015 SEM DESVIO: wrapper v1 `pubsub.schedule` FINO + núcleo
// `*Core(db, agora)` puro, testável no Emulator sem o scheduler (o Emulator
// `--only firestore,auth` não sobe pubsub). Cadência CONTÍNUA de 5 minutos,
// como `virarLoteCron` e `dispatchCampanhasAgendadas` — nada de slot diário:
// o carrinho vence em 15 minutos e um carimbo de madrugada não serviria a
// ninguém.
//
// O QUE ESTE CRON NÃO FAZ — e é a diferença que importa em relação à decisão
// 17 (RN-136), de onde a mecânica veio. Lá a TOLERÂNCIA decide (disparo
// vencido além dela não acontece). Aqui ela não decide nada: quem recusa uma
// conclusão fora do prazo é o gate transacional de `createInscricaoCharge`,
// contra o relógio do servidor, no instante da conclusão. Este cron só
// MATERIALIZA o estado terminal. Consequência prática: rodada atrasada (ou
// morta) não abre janela nenhuma para concluir fora do prazo — atrasa apenas
// o carimbo, e o atraso fica mensurável porque `expiraEmMillis` (quando
// venceu) e `expiradoEmMillis` (quando foi carimbado) são gravados
// separados.
//
// IDEMPOTÊNCIA (obrigatória no padrão): a query só vê `status == 'aberto'` e
// a transação relê o estado FRESCO antes de escrever (anti-TOCTOU — o
// carrinho pode ter concluído entre a query e a tx). Rerodar a mesma rodada
// N vezes produz o mesmo estado.
// =============================================================================

import * as admin from 'firebase-admin';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { STATUS_CARRINHO_EXPIRADO, carrinhoNoPrazo } from '@leela/core';
import { COLECAO_CARRINHOS } from './carrinhoCheckout';
import { agoraCheckout } from './relogioCheckout';

type Db = admin.firestore.Firestore;

/**
 * Teto por rodada (mesma disciplina do `DISPATCH_LOTE_MAX`): varredura
 * BOUNDED — backlog maior drena nas rodadas seguintes, e uma rajada de
 * abandono não estoura o timeout da Function.
 */
export const CARRINHOS_LOTE_MAX = 200;

export interface ExpirarCarrinhosResultado {
  /** Carrinhos vencidos encontrados na varredura. */
  encontrados: number;
  /** Carimbados AGORA (transição aberto → expirado_sem_concluir). */
  expirados: number;
  /** Deixaram de ser elegíveis entre a query e a tx (concluíram/reabriram). */
  naoElegiveis: number;
  /** Erros isolados por carrinho (não derrubam o lote). */
  erros: number;
}

// ---------------------------------------------------------------------------
// Núcleo (ADR-015 — testável no Emulator via Admin SDK, sem scheduler)
// ---------------------------------------------------------------------------

export async function expirarCarrinhosAbandonadosCore(
  db: Db,
  agora: Date = new Date()
): Promise<ExpirarCarrinhosResultado> {
  const resultado: ExpirarCarrinhosResultado = {
    encontrados: 0,
    expirados: 0,
    naoElegiveis: 0,
    erros: 0,
  };
  const agoraMs = agora.getTime();

  const vencidos = await db
    .collection(COLECAO_CARRINHOS)
    .where('status', '==', 'aberto')
    .where('expiraEmMillis', '<=', agoraMs)
    .limit(CARRINHOS_LOTE_MAX)
    .get();

  resultado.encontrados = vencidos.size;
  if (vencidos.empty) return resultado;

  for (const doc of vencidos.docs) {
    try {
      const marcou = await db.runTransaction(async (tx) => {
        const fresco = await tx.get(doc.ref);
        if (!fresco.exists) return false;
        const status = fresco.get('status') as unknown;
        const expiraEmMillis = fresco.get('expiraEmMillis') as unknown;
        if (
          status !== 'aberto' ||
          typeof expiraEmMillis !== 'number' ||
          carrinhoNoPrazo(expiraEmMillis, agoraMs)
        ) {
          return false;
        }
        tx.update(doc.ref, {
          status: STATUS_CARRINHO_EXPIRADO,
          expiradoEmMillis: agoraMs,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
      });
      if (marcou) resultado.expirados += 1;
      else resultado.naoElegiveis += 1;
    } catch (err) {
      resultado.erros += 1;
      logger.error('carrinho_expiracao_falhou', {
        carrinhoId: doc.id,
        erro: err instanceof Error ? err.message : String(err),
      }); // sem PII
    }
  }

  if (resultado.expirados > 0 || resultado.erros > 0) {
    logger.info('carrinhos_abandonados_varridos', { ...resultado }); // sem PII
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Wrapper (ADR-015 — fino de propósito)
// ---------------------------------------------------------------------------

/** `expirarCarrinhosAbandonados` — varredura contínua do prazo (RN-158). */
export const expirarCarrinhosAbandonados = pubsub
  .schedule('every 5 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    await expirarCarrinhosAbandonadosCore(admin.firestore(), agoraCheckout());
    return null;
  });
