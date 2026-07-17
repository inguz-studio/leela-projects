// =============================================================================
// functions/src/eventos/dispatchCampanhasAgendadas.ts
//
// SCHEDULER de campanhas agendadas (E06 · SCHED-T1 · Onda 3 Lote 4) —
// padrão ADR-015: wrapper v1 `pubsub.schedule` FINO + núcleo `*Core(db,
// agora)` puro, testável no Emulator SEM o scheduler (o Emulator
// --only firestore,auth não sobe pubsub). Precedente de cadência:
// `virarLoteCron` (every 5 minutes).
//
// O QUE FAZ: varre `campanhas` (collection group) com `status == 'agendado'`
// e `agendadoPara <= agora` e dispara cada uma REUSANDO o pipeline de envio
// existente (`executarDisparoCampanha` — E06-L2-T2/FABLE-G): envelope
// transacional (agendado→enviado + alcance + cota RN-133 na MESMA tx),
// fan-out no LOG de comunicação com docId determinístico
// `{inscritoRef}_{campanhaId}_{canal}` (RN-219). NUNCA um segundo mecanismo
// de envio (ADR-015 §consequência).
//
// IDEMPOTÊNCIA (por campanha + janela — aceite do brief O3-L4):
//   - a query só devolve `status == 'agendado'`; campanha carimbada some da
//     varredura seguinte;
//   - redelivery/replay do cron (at-least-once do Scheduler) cai no guarda
//     transacional do envelope ('ja_enviado' → no-op) e o fan-out colide no
//     docId do log ('ja_registrada') — NADA duplica (nem alcance, nem cota,
//     nem log). Crash no meio do fan-out: o retry CURA os logs faltantes
//     (crash-safety herdada do pipeline).
//
// FORA DA JANELA: `agendadoPara > agora` simplesmente não entra na query —
// não dispara antes da hora. Rascunho/enviado idem (status != 'agendado').
//
// CASOS QUE FICAM 'agendado' (retry natural na próxima varredura — decisão
// registrada no report):
//   - limite RN-133 estourado (4 push na janela de 7d): NÃO carimba, NÃO
//     consome cota; dispara sozinha quando a janela liberar;
//   - segmento vazio: não dispara nem carimba (não inventar alcance);
//   - tenant NÃO-ativo (RN-402): suspenso não dispara comunicação; volta a
//     disparar se reativar.
//
// PII (Schneier): nenhum dado de inscrito passa por aqui (o pipeline resolve
// destinatários com `.select()` sem campos; o log carrega assunto truncado,
// NUNCA corpo). Logs do cron: só ids e contadores.
//
// ⚠️ DEPLOY: a query exige índice COLLECTION_GROUP composto
// `campanhas(status ASC, agendadoPara ASC)` — declarado em
// firestore.indexes.json (o Emulator cria automático; validação real só no
// deploy — pendência operacional do lote).
// =============================================================================

import * as admin from 'firebase-admin';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { Timestamp } from 'firebase-admin/firestore';
import { CHAVE_LOG_COMUNICACAO_RE, COLECAO_CAMPANHAS } from '@leela/core';
import { executarDisparoCampanha } from './enviarCampanha';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface DispatchCampanhasResultado {
  /** Campanhas vencidas encontradas na varredura */
  encontradas: number;
  /** Disparadas AGORA (carimbo novo nesta rodada) */
  disparadas: number;
  /** Já estavam 'enviado' quando o disparo serializou (replay/corrida) */
  jaEnviadas: number;
  /** Bloqueadas pelo limite RN-133 (ficam agendadas — retry natural) */
  bloqueadasLimite: number;
  /** Segmento vazio (ficam agendadas — não inventar alcance) */
  segmentoVazio: number;
  /** Puladas por tenant não-ativo (RN-402) */
  tenantInativo: number;
  /** Erros por campanha (isoladas — não derrubam o lote) */
  erros: number;
}

// ---------------------------------------------------------------------------
// Núcleo (ADR-015 — testável no Emulator via Admin SDK, sem scheduler)
// ---------------------------------------------------------------------------

export async function dispatchCampanhasAgendadasCore(
  db: admin.firestore.Firestore,
  agora: Date = new Date()
): Promise<DispatchCampanhasResultado> {
  const resultado: DispatchCampanhasResultado = {
    encontradas: 0,
    disparadas: 0,
    jaEnviadas: 0,
    bloqueadasLimite: 0,
    segmentoVazio: 0,
    tenantInativo: 0,
    erros: 0,
  };

  // Só campanhas VENCIDAS (agendadoPara <= agora). O guarda fino de status/
  // idempotência é do envelope transacional — a query é o filtro barato.
  const vencidas = await db
    .collectionGroup(COLECAO_CAMPANHAS)
    .where('status', '==', 'agendado')
    .where('agendadoPara', '<=', Timestamp.fromDate(agora))
    .get();

  resultado.encontradas = vencidas.size;
  if (vencidas.empty) return resultado;

  // Cache de status de tenant por rodada (RN-402 — 1 leitura por tenant)
  const tenantAtivoCache = new Map<string, boolean>();
  async function tenantEstaAtivo(tenantId: string): Promise<boolean> {
    const cache = tenantAtivoCache.get(tenantId);
    if (cache !== undefined) return cache;
    const snap = await db.collection('tenants').doc(tenantId).get();
    const ativo = snap.exists && snap.get('status') === 'ativo';
    tenantAtivoCache.set(tenantId, ativo);
    return ativo;
  }

  // SERIAL por campanha (máquina 8GB / lotes pequenos por design — o fan-out
  // interno já paraleliza em lotes de 20). Erro em UMA campanha não derruba
  // as demais (isolamento por try/catch + contador).
  for (const campanhaDoc of vencidas.docs) {
    const campanhaId = campanhaDoc.id;
    const eventoRef = campanhaDoc.ref.parent.parent;
    try {
      if (eventoRef === null) {
        // collection group fora de eventos/* não existe no modelo — doc lixo.
        resultado.erros += 1;
        logger.error('dispatch_campanha_sem_evento_pai', { campanhaId });
        continue;
      }

      // Espelho do fail-fast do disparo manual: id incompatível com a chave
      // do log não tem como disparar idempotente — pula e registra.
      if (!CHAVE_LOG_COMUNICACAO_RE.test(campanhaId)) {
        resultado.erros += 1;
        logger.error('dispatch_campanha_id_invalido', {
          eventoId: eventoRef.id,
          campanhaId,
        });
        continue;
      }

      const tenantId = (campanhaDoc.get('tenantId') ?? '') as string;
      if (tenantId.length === 0 || !(await tenantEstaAtivo(tenantId))) {
        // RN-402: tenant suspenso/pending não dispara comunicação; a
        // campanha FICA agendada e dispara se o tenant reativar.
        resultado.tenantInativo += 1;
        continue;
      }

      const r = await executarDisparoCampanha(
        db,
        eventoRef,
        campanhaId,
        tenantId,
        agora
      );

      if ('ok' in r) {
        if (r.jaEnviada) resultado.jaEnviadas += 1;
        else resultado.disparadas += 1;
      } else if (r.bloqueado === 'limite_push') {
        resultado.bloqueadasLimite += 1;
      } else {
        resultado.segmentoVazio += 1;
      }
    } catch (err) {
      // Sem PII — só ids (LGPD). Campanha envenenada não bloqueia o lote.
      resultado.erros += 1;
      logger.error('dispatch_campanha_falha', {
        eventoId: eventoRef?.id ?? null,
        campanhaId,
        err,
      });
    }
  }

  logger.info('dispatch_campanhas_agendadas', { ...resultado });
  return resultado;
}

// ---------------------------------------------------------------------------
// Wrapper v1 fino (ADR-015) — cadência do precedente virarLoteCron
// ---------------------------------------------------------------------------

/**
 * Cron a cada 5 minutos: dispara campanhas `agendado` vencidas. At-least-once
 * safe — rerun/replay não duplica (envelope transacional + docId de log).
 */
export const dispatchCampanhasAgendadas = pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    await dispatchCampanhasAgendadasCore(admin.firestore());
    return null;
  });
