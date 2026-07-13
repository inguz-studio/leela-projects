// =============================================================================
// functions/src/eventos/encerrarEventos.ts
//
// Cron de ENCERRAMENTO AUTOMÁTICO de eventos (LEELA-E09s-L2-T6 · RN-350 ·
// decisão #6 do consolidador — resolve o único pré-requisito ausente do
// E09-slim: nenhuma Function transicionava para 'encerrado').
//
// RACIONAL ANTI-FRAUDE (consolidador): a retenção de 15% é contingência —
// o organizador NÃO PODE encerrar o próprio evento para liberar o próprio
// retido. Por isso:
//   - o encerramento é AUTOMÁTICO POR DATA (cron diário 03:10, padrão
//     ADR-007: wrapper v1 pubsub.schedule + core puro testável);
//   - não existe botão de self-close no painel nesta onda;
//   - a trincheira nas Rules JÁ existe e é anterior a este arquivo:
//     `statusIntocado()` (ADR-005, review #18) — cliente NUNCA grava
//     `status`; teste antagonista aqui REPROVA a tentativa.
//
// REGRA DO CORTE: evento `publicado`/`ao_vivo` cujo DIA CIVIL da data
// (fuso America/Sao_Paulo — FUSO_EVENTO) é ANTERIOR ao dia civil de
// `agora` ⇒ `status='encerrado'` + carimbo `encerradoEm` (uma única vez).
// O dia DA PROVA não encerra (evento às 07h continua 'ao_vivo' à noite —
// encerra na madrugada seguinte, 03:10). Evento sem `data` válida fica
// INTOCADO (dado corrompido não ganha transição automática — fail-safe).
// V1 = data única (o modelo de evento não tem data-fim; brief: "data-fim
// (ou data única)").
//
// IDEMPOTENTE: o flip só acontece se o status AINDA for publicado/ao_vivo
// (recheck em transação por evento); rerun no mesmo dia ⇒ query não
// devolve mais o evento (status mudou) ⇒ zero write, `encerradoEm` nunca
// reescrito, nenhuma transição dupla.
//
// EFEITO NO REPASSE (RN-350): após encerrar, o cron dispara o recompute
// de saldo (T1) POR TENANT AFETADO — `retido → 0` do evento encerrado sem
// esperar o próximo write de financeiro/repasse. NÃO toca virarLote.ts /
// agregarFinanceiro.ts (pasta compartilhada com E03 — arquivo NOVO, zero
// edição nos vizinhos).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { dataLocalISO, FUSO_EVENTO } from '@leela/core';
import { recomputarSaldoRepasse } from '../finance/updateSaldoRepasse';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Statuses elegíveis ao encerramento automático por data. */
export const STATUS_ENCERRAVEIS = ['publicado', 'ao_vivo'] as const;

export interface EventoEncerrado {
  eventoId: string;
  tenantId: string;
  statusAnterior: string;
}

export interface ResultadoEncerrarEventos {
  /** Eventos publicado/ao_vivo inspecionados. */
  candidatos: number;
  /** Transições materializadas NESTA execução (rerun ⇒ lista vazia). */
  encerrados: EventoEncerrado[];
  /** Tenants cujo saldo foi recomputado (retido→0 — RN-350). */
  tenantsRecomputados: string[];
}

/**
 * O evento deve encerrar? Dia civil da data (FUSO_EVENTO) ANTERIOR ao dia
 * civil de agora — o dia da prova NÃO encerra. @pure
 */
export function deveEncerrar(dataEvento: Date, agora: Date): boolean {
  return dataLocalISO(dataEvento, FUSO_EVENTO) < dataLocalISO(agora, FUSO_EVENTO);
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator — chamado direto nos testes)
// ---------------------------------------------------------------------------

export async function encerrarEventosCore(
  db: Db,
  agora: Date = new Date()
): Promise<ResultadoEncerrarEventos> {
  // 'in' é filtro de igualdade — servido por índice single-field, sem
  // entrada nova em firestore.indexes.json (corte por data é em memória:
  // o volume de eventos ABERTOS por vez é pequeno por construção).
  const snap = await db
    .collection('eventos')
    .where('status', 'in', [...STATUS_ENCERRAVEIS])
    .get();

  const encerrados: EventoEncerrado[] = [];

  for (const doc of snap.docs) {
    const data = doc.get('data');
    if (!(data instanceof Timestamp)) {
      // Sem data válida não há critério — INTOCADO (nunca encerrar por
      // palpite; observável no log para correção manual).
      logger.warn('encerrar_eventos_sem_data', { eventoId: doc.id });
      continue;
    }
    if (!deveEncerrar(data.toDate(), agora)) continue; // futuro/dia da prova

    // Transação por evento: recheck do status — corrida com rerun/retry
    // não produz transição dupla nem regrava o carimbo.
    const transicionado = await db.runTransaction(async (tx) => {
      const fresco = await tx.get(doc.ref);
      const status = fresco.get('status') as string;
      if (!(STATUS_ENCERRAVEIS as readonly string[]).includes(status)) {
        return null; // já encerrado por execução concorrente — no-op
      }
      tx.update(doc.ref, {
        status: 'encerrado',
        encerradoEm: FieldValue.serverTimestamp(), // carimbo único (auditoria)
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return status;
    });

    if (transicionado !== null) {
      encerrados.push({
        eventoId: doc.id,
        tenantId: (doc.get('tenantId') as string) ?? '',
        statusAnterior: transicionado,
      });
    }
  }

  // RN-350: retido→0 dos eventos encerrados — recompute (T1) por tenant.
  const tenantsRecomputados = [
    ...new Set(encerrados.map((e) => e.tenantId).filter((t) => t.length > 0)),
  ];
  for (const tenantId of tenantsRecomputados) {
    await recomputarSaldoRepasse(db, tenantId, agora);
  }

  if (encerrados.length > 0) {
    // Sem PII — só ids (LGPD)
    logger.info('eventos_encerrados', {
      encerrados: encerrados.map((e) => e.eventoId),
      tenantsRecomputados,
    });
  }

  return { candidatos: snap.size, encerrados, tenantsRecomputados };
}

// ---------------------------------------------------------------------------
// Cron (ADR-007 — wrapper v1 fino; 03:10 escalonado após 03:00/03:05)
// ---------------------------------------------------------------------------

export const encerrarEventos = pubsub
  .schedule('10 3 * * *')
  .timeZone(FUSO_EVENTO)
  .onRun(async () => {
    const resultado = await encerrarEventosCore(admin.firestore());
    logger.info('encerrar_eventos_cron', {
      candidatos: resultado.candidatos,
      encerrados: resultado.encerrados.length,
    });
    return null;
  });
