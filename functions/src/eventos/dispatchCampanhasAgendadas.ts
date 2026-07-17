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
// VENCIDA (RN-136 · decisão 17 do Vitor, 2026-07-17 — "Se for agendada
// vencida, não dispara. Fica vencida"): `agendadoPara` além da TOLERÂNCIA
// de 2 ciclos do cron (10 min — `DISPARO_VENCIMENTO_TOLERANCIA_MS`, fonte
// única no core) NÃO dispara: transaciona agendado→'vencido' + carimbo
// `vencidoEm`, estado TERMINAL (Rules congelam p/ cliente; reagendar =
// decisão futura). A marca roda ANTES dos gates de tenant/evento — vencer é
// fato de RELÓGIO: campanha de tenant suspenso ou evento órfão também vence
// (elimina o hazard de reativação disparar backlog velho). Replay é inócuo:
// 'vencido' some da varredura (status != 'agendado') e a tx re-checa o snap
// fresco (anti-TOCTOU: adiada/retirada entre a query e a tx não é marcada).
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
//
// ⚠️ DIRECTIVE (review O3-L4 #9): a varredura é collection GROUP — qualquer
// subcoleção FUTURA chamada `campanhas` fora de `eventos/*` entraria aqui e
// seria tratada como campanha de evento. Hoje só `eventos/*/campanhas`
// existe (clube usa `comunicados`); criar outro path `campanhas` exige
// revisitar este cron.
// =============================================================================

import * as admin from 'firebase-admin';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { Timestamp } from 'firebase-admin/firestore';
import {
  CHAVE_LOG_COMUNICACAO_RE,
  COLECAO_CAMPANHAS,
  STATUS_CAMPANHA_VENCIDO,
  disparoVencido,
} from '@leela/core';
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
  /** Vencidas além da tolerância (RN-136): agendado→'vencido', SEM envio */
  vencidas: number;
  /** Bloqueadas pelo limite RN-133 (ficam agendadas — retry natural) */
  bloqueadasLimite: number;
  /** Segmento vazio (ficam agendadas — não inventar alcance) */
  segmentoVazio: number;
  /** Puladas por tenant não-ativo (RN-402) */
  tenantInativo: number;
  /** Deixaram de estar 'agendado'/vencidas entre a query e a tx (TOCTOU) */
  naoElegiveis: number;
  /** Erros por campanha (isoladas — não derrubam o lote) */
  erros: number;
}

/**
 * Teto de campanhas por rodada (review O3-L4 #2/#3): varredura BOUNDED —
 * backlog maior drena nas rodadas seguintes (5 min). Mantém a execução
 * dentro do timeout e limita o raio de uma rajada.
 */
export const DISPATCH_LOTE_MAX = 50;

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
    vencidas: 0,
    bloqueadasLimite: 0,
    segmentoVazio: 0,
    tenantInativo: 0,
    naoElegiveis: 0,
    erros: 0,
  };

  // Só campanhas VENCIDAS (agendadoPara <= agora), BOUNDED por rodada. A
  // ordenação implícita da range query (agendadoPara ASC) prioriza as mais
  // antigas; o guarda fino de status/vencimento roda DE NOVO dentro da tx
  // do envelope (anti-TOCTOU — review O3-L4 #1).
  const vencidas = await db
    .collectionGroup(COLECAO_CAMPANHAS)
    .where('status', '==', 'agendado')
    .where('agendadoPara', '<=', Timestamp.fromDate(agora))
    .limit(DISPATCH_LOTE_MAX)
    .get();

  resultado.encontradas = vencidas.size;
  if (vencidas.empty) return resultado;

  // Caches por rodada: evento pai (fonte da VERDADE do tenantId — review
  // O3-L4 #5: não confiar no tenantId do doc da campanha p/ o gate RN-402)
  // e status de tenant (1 leitura por tenant).
  const eventoTenantCache = new Map<string, string | null>();
  async function tenantDoEvento(
    eventoRef: admin.firestore.DocumentReference
  ): Promise<string | null> {
    const cache = eventoTenantCache.get(eventoRef.path);
    if (cache !== undefined) return cache;
    const snap = await eventoRef.get();
    const tenantId = snap.exists ? ((snap.get('tenantId') ?? '') as string) : '';
    const valor = tenantId.length > 0 ? tenantId : null;
    eventoTenantCache.set(eventoRef.path, valor);
    return valor;
  }

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

      // ── RN-136 (decisão 17): vencida além da tolerância NÃO dispara ─────
      // Classificação por RELÓGIO puro, ANTES de id/evento/tenant: vencer
      // independe do estado do tenant (suspenso não segura campanha viva
      // p/ disparar na reativação) e drena da varredura até docs
      // envenenados (id inválido/órfãos) que já venceram. A tx re-checa o
      // snap FRESCO (status ainda 'agendado' + ainda vencida) — adiamento/
      // retirada entre a query e a tx aborta a marca (anti-TOCTOU); replay
      // é no-op ('vencido' sai da query).
      const agendadoRaw = campanhaDoc.get('agendadoPara') as
        | { toMillis?: () => number }
        | null
        | undefined;
      if (
        typeof agendadoRaw?.toMillis === 'function' &&
        disparoVencido(agendadoRaw.toMillis(), agora.getTime())
      ) {
        const marcada = await db.runTransaction(async (tx) => {
          const snap = await tx.get(campanhaDoc.ref);
          if (!snap.exists || snap.get('status') !== 'agendado') return false;
          const quando = snap.get('agendadoPara') as
            | { toMillis?: () => number }
            | null
            | undefined;
          if (
            typeof quando?.toMillis !== 'function' ||
            !disparoVencido(quando.toMillis(), agora.getTime())
          ) {
            return false;
          }
          tx.update(campanhaDoc.ref, {
            status: STATUS_CAMPANHA_VENCIDO,
            vencidoEm: agora,
            atualizadoEm: agora,
          });
          return true;
        });
        if (marcada) resultado.vencidas += 1;
        else resultado.naoElegiveis += 1;
        continue; // NUNCA envia — terminal (reagendar = decisão futura)
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

      // Fonte da verdade do tenant = EVENTO PAI (ADR-009), não o campo do
      // doc da campanha (defesa em profundidade — review O3-L4 #5). Evento
      // inexistente (subcoleção órfã de delete sem cascata) NÃO dispara —
      // sem isso a campanha viraria 'enviado' com zero logs (#6).
      const tenantId = await tenantDoEvento(eventoRef);
      if (tenantId === null) {
        resultado.erros += 1;
        logger.error('dispatch_campanha_evento_orfao', {
          eventoId: eventoRef.id,
          campanhaId,
        });
        continue;
      }
      if (!(await tenantEstaAtivo(tenantId))) {
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
        agora,
        // Anti-TOCTOU (review O3-L4 #1): re-checa 'agendado' + vencimento
        // no snap FRESCO dentro da tx — campanha revertida p/ rascunho ou
        // adiada entre a query e o disparo NÃO envia.
        { exigirAgendadoVencido: true }
      );

      if ('ok' in r) {
        if (r.jaEnviada) resultado.jaEnviadas += 1;
        else resultado.disparadas += 1;
      } else if (r.bloqueado === 'limite_push') {
        resultado.bloqueadasLimite += 1;
      } else if (r.bloqueado === 'nao_elegivel') {
        resultado.naoElegiveis += 1;
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
 * `runWith` explícito (review O3-L4 #2): envio em massa (fan-out por
 * destinatário×canal) não cabe no timeout default de 60s do v1 — 540s é o
 * teto de pubsub v1; rodada morta no meio é curada pela seguinte
 * (crash-safety do pipeline) e o lote é bounded (DISPATCH_LOTE_MAX).
 */
export const dispatchCampanhasAgendadas = runWith({
  timeoutSeconds: 540,
  memory: '256MB',
})
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    await dispatchCampanhasAgendadasCore(admin.firestore());
    return null;
  });
