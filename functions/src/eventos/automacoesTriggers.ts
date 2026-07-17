// =============================================================================
// functions/src/eventos/automacoesTriggers.ts
//
// GATILHOS DE AUTOMAÇÃO do evento (LEELA-S402-T1 · E06 · Onda 3 Lote 3).
//
// DIRECTIVE dos boards (inviolável): TODO disparo REUSA
// `executarDisparoCampanha` — o caminho transacional endurecido em `23bc077`
// (envelope RN-133 + carimbo + fan-out RN-219 com docId determinístico).
// NUNCA um segundo mecanismo de envio (ADR-015 §consequência).
//
// DUAS FONTES DE GATILHO:
//   1. `onInscritoWriteAutomacao` — trigger onWrite de inscritos: transição
//      para 'confirmado' dispara as automações `novo_inscrito` ATIVAS do
//      evento. O template (campanha origem='automatizada') é carimbado
//      'enviado' no 1º disparo; os seguintes caem em 'ja_enviado' e o
//      FAN-OUT CURADOR registra SÓ o log do inscrito novo (docId
//      `{inscritoRef}_{templateRef}_{canal}` — idempotência por
//      (automação, alvo), aceite da task). Cota RN-133 é consumida só no 1º.
//   2. `dispatchAutomacoes` — cron 5min (ADR-015, padrão SCHED-T1): varre
//      automações ativas de relógio e dispara quando o momento vence:
//        vespera_evento — evento.data − offsetHoras (default 24h)
//        pos_evento     — evento.data + offsetHoras (default 24h)
//        kit_disponivel — abertura da PRIMEIRA janela de entrega do
//                         cronograma (dia+horaInicio em FUSO_EVENTO).
//                         PREMISSA registrada: o épico grafou "onWrite
//                         entrega", mas a entrega individual do balcão é o
//                         kit JÁ RETIRADO — "kit pronto p/ retirada" é a
//                         janela ABERTA; a fonte é o cronograma (S204).
//      One-shot: o carimbo 'enviado' do template segura o replay do cron
//      (ja_enviado ⇒ nada duplica — mesma disciplina do scheduler).
//
// TENANT (RN-402): fonte da verdade = EVENTO PAI (nunca o doc da automação);
// tenant não-ativo não dispara (fica para quando reativar) — mesma
// disciplina do dispatchCampanhasAgendadas.
//
// ∑ `disparos` = RECONTAGEM idempotente (postura pós-19c8afe): count() dos
// logs de comunicação com `templateRef` da automação — replay nunca infla.
//
// ⚠️ DEPLOY (pendência operacional): índices em firestore.indexes.json —
// composite COLLECTION_GROUP `automacoes(ativa, gatilho)` p/ a varredura do
// cron (o Emulator cria automático; validação real só no deploy).
// =============================================================================

import * as admin from 'firebase-admin';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  AUTOMACAO_OFFSET_HORAS_DEFAULT,
  CHAVE_LOG_COMUNICACAO_RE,
  COLECAO_AUTOMACOES,
  dataHoraLocalParaDate,
  isDataHoraLocalISO,
  ordenarJanelasEntrega,
  momentoDoGatilho,
  type GatilhoAutomacao,
  type JanelaEntrega,
} from '@leela/core';
import { executarDisparoCampanha } from './enviarCampanha';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface DispatchAutomacoesResultado {
  /** Automações ativas de relógio encontradas na varredura */
  encontradas: number;
  /** Templates disparados AGORA (carimbo novo) */
  disparadas: number;
  /** Já estavam 'enviado' (one-shot cumprido — replay/rodadas seguintes) */
  jaEnviadas: number;
  /** Momento do gatilho ainda no futuro (ou cronograma ausente) */
  foraDaJanela: number;
  /** Bloqueadas pelo limite RN-133 (retry natural na próxima rodada) */
  bloqueadasLimite: number;
  /** Segmento vazio (não dispara, não carimba) */
  segmentoVazio: number;
  /** Puladas por tenant não-ativo (RN-402) */
  tenantInativo: number;
  /** Erros por automação (isolados — não derrubam o lote) */
  erros: number;
}

export interface NovoInscritoResultado {
  automacoes: number;
  disparos: number;
  erros: number;
}

/** Teto por rodada do cron (varredura BOUNDED — padrão DISPATCH_LOTE_MAX). */
export const AUTOMACOES_LOTE_MAX = 50;

/** Gatilhos servidos pelo CRON (novo_inscrito tem trigger próprio). */
const GATILHOS_RELOGIO: readonly GatilhoAutomacao[] = [
  'kit_disponivel',
  'vespera_evento',
  'pos_evento',
];

// ---------------------------------------------------------------------------
// Helpers compartilhados
// ---------------------------------------------------------------------------

/** Tenant ativo? — fonte = doc do tenant (RN-402). */
async function tenantAtivo(
  db: admin.firestore.Firestore,
  tenantId: string
): Promise<boolean> {
  const snap = await db.collection('tenants').doc(tenantId).get();
  return snap.exists && snap.get('status') === 'ativo';
}

/**
 * Recontagem idempotente do ∑ `disparos` (postura pós-19c8afe): count() dos
 * logs de comunicação do TEMPLATE. Replay nunca infla; escrita exclusiva
 * desta Function (Rules negam cliente).
 */
export async function recontarDisparos(
  eventoRef: admin.firestore.DocumentReference,
  automacaoRef: admin.firestore.DocumentReference,
  templateRef: string
): Promise<number> {
  const c = await eventoRef
    .collection('comunicacoes')
    .where('templateRef', '==', templateRef)
    .count()
    .get();
  const disparos = c.data().count;
  await automacaoRef.update({ disparos });
  return disparos;
}

/**
 * Momento devido de um gatilho de RELÓGIO para um evento. `null` = ainda não
 * derivável (sem data / sem cronograma) — a automação fica quieta.
 */
export function momentoDaAutomacao(
  gatilho: GatilhoAutomacao,
  dataEvento: Date | null,
  janelasEntrega: readonly JanelaEntrega[],
  offsetHoras: number = AUTOMACAO_OFFSET_HORAS_DEFAULT
): Date | null {
  if (gatilho === 'kit_disponivel') {
    const primeira = ordenarJanelasEntrega(janelasEntrega)[0];
    if (primeira === undefined) return null;
    const isoLocal = `${primeira.dia}T${primeira.horaInicio}`;
    return isDataHoraLocalISO(isoLocal) ? dataHoraLocalParaDate(isoLocal) : null;
  }
  if (dataEvento === null) return null;
  return momentoDoGatilho(gatilho, dataEvento, offsetHoras);
}

/** Dispara UMA automação reusando o pipeline único; devolve o desfecho. */
async function dispararAutomacao(
  db: admin.firestore.Firestore,
  eventoRef: admin.firestore.DocumentReference,
  automacaoDoc: admin.firestore.QueryDocumentSnapshot,
  tenantId: string,
  agora: Date
): Promise<'disparada' | 'ja_enviada' | 'limite' | 'segmento_vazio' | 'nao_elegivel'> {
  const templateRef = (automacaoDoc.get('templateRef') ?? '') as string;
  const r = await executarDisparoCampanha(
    db,
    eventoRef,
    templateRef,
    tenantId,
    agora
  );
  if ('ok' in r) {
    // ∑ por recontagem — roda no disparo E no ja_enviada (fan-out curador
    // pode ter registrado logs novos, ex.: inscrito novo no novo_inscrito).
    await recontarDisparos(eventoRef, automacaoDoc.ref, templateRef);
    return r.jaEnviada ? 'ja_enviada' : 'disparada';
  }
  if (r.bloqueado === 'limite_push') return 'limite';
  if (r.bloqueado === 'nao_elegivel') return 'nao_elegivel';
  return 'segmento_vazio';
}

// ---------------------------------------------------------------------------
// Fonte 1 — novo_inscrito (trigger onWrite de inscritos)
// ---------------------------------------------------------------------------

/**
 * Núcleo do gatilho `novo_inscrito` (testável no Emulator sem o trigger):
 * dispara as automações ativas do evento quando um inscrito CONFIRMA.
 */
export async function processarNovoInscritoCore(
  db: admin.firestore.Firestore,
  eventoId: string,
  agora: Date = new Date()
): Promise<NovoInscritoResultado> {
  const resultado: NovoInscritoResultado = { automacoes: 0, disparos: 0, erros: 0 };
  const eventoRef = db.collection('eventos').doc(eventoId);

  const automacoes = await eventoRef
    .collection(COLECAO_AUTOMACOES)
    .where('gatilho', '==', 'novo_inscrito')
    .where('ativa', '==', true)
    .get();
  resultado.automacoes = automacoes.size;
  if (automacoes.empty) return resultado;

  // Tenant (RN-402) — fonte = evento pai; evento órfão não dispara.
  const eventoSnap = await eventoRef.get();
  const tenantId = (eventoSnap.get('tenantId') ?? '') as string;
  if (!eventoSnap.exists || tenantId.length === 0) {
    resultado.erros += 1;
    logger.error('automacao_evento_orfao', { eventoId });
    return resultado;
  }
  if (!(await tenantAtivo(db, tenantId))) return resultado;

  for (const doc of automacoes.docs) {
    try {
      const templateRef = (doc.get('templateRef') ?? '') as string;
      if (!CHAVE_LOG_COMUNICACAO_RE.test(templateRef)) {
        resultado.erros += 1;
        logger.error('automacao_template_invalido', {
          eventoId,
          automacaoId: doc.id,
        });
        continue;
      }
      const desfecho = await dispararAutomacao(db, eventoRef, doc, tenantId, agora);
      if (desfecho === 'disparada' || desfecho === 'ja_enviada') {
        resultado.disparos += 1;
      }
    } catch (err) {
      resultado.erros += 1;
      logger.error('automacao_novo_inscrito_falha', {
        eventoId,
        automacaoId: doc.id,
        err,
      });
    }
  }

  logger.info('automacao_novo_inscrito', { eventoId, ...resultado });
  return resultado;
}

/**
 * Trigger: inscrito transiciona PARA 'confirmado' (create já confirmado ou
 * update pendente→confirmado). Redelivery at-least-once é inócua: o fan-out
 * colide no docId do log ('ja_registrada') e a recontagem é idempotente.
 */
export const onInscritoWriteAutomacao = runWith({ memory: '256MB' })
  .firestore.document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (change, context) => {
    const antes = change.before.exists ? change.before.get('status') : null;
    const depois = change.after.exists ? change.after.get('status') : null;
    if (depois !== 'confirmado' || antes === 'confirmado') return null;
    await processarNovoInscritoCore(
      admin.firestore(),
      context.params['eventoId'] as string
    );
    return null;
  });

// ---------------------------------------------------------------------------
// Fonte 2 — gatilhos de relógio (cron ADR-015, padrão SCHED-T1)
// ---------------------------------------------------------------------------

export async function dispatchAutomacoesCore(
  db: admin.firestore.Firestore,
  agora: Date = new Date()
): Promise<DispatchAutomacoesResultado> {
  const resultado: DispatchAutomacoesResultado = {
    encontradas: 0,
    disparadas: 0,
    jaEnviadas: 0,
    foraDaJanela: 0,
    bloqueadasLimite: 0,
    segmentoVazio: 0,
    tenantInativo: 0,
    erros: 0,
  };

  // Varredura BOUNDED (padrão DISPATCH_LOTE_MAX): só ativas; o filtro fino
  // de gatilho/momento roda em código (offset por automação não é query).
  // ⚠️ collection GROUP — vale a mesma diretriz do scheduler (review O3-L4
  // #9): outra subcoleção futura chamada `automacoes` entraria aqui.
  const ativas = await db
    .collectionGroup(COLECAO_AUTOMACOES)
    .where('ativa', '==', true)
    .where('gatilho', 'in', [...GATILHOS_RELOGIO])
    .limit(AUTOMACOES_LOTE_MAX)
    .get();

  resultado.encontradas = ativas.size;
  if (ativas.empty) return resultado;

  // Caches por rodada (1 leitura por evento/tenant — padrão SCHED-T1)
  const eventoCache = new Map<string, admin.firestore.DocumentSnapshot>();
  const tenantCache = new Map<string, boolean>();

  for (const doc of ativas.docs) {
    const eventoRef = doc.ref.parent.parent;
    try {
      if (eventoRef === null) {
        resultado.erros += 1;
        logger.error('automacao_sem_evento_pai', { automacaoId: doc.id });
        continue;
      }
      const templateRef = (doc.get('templateRef') ?? '') as string;
      if (!CHAVE_LOG_COMUNICACAO_RE.test(templateRef)) {
        resultado.erros += 1;
        logger.error('automacao_template_invalido', {
          eventoId: eventoRef.id,
          automacaoId: doc.id,
        });
        continue;
      }

      let eventoSnap = eventoCache.get(eventoRef.path);
      if (eventoSnap === undefined) {
        eventoSnap = await eventoRef.get();
        eventoCache.set(eventoRef.path, eventoSnap);
      }
      const tenantId = (eventoSnap.get('tenantId') ?? '') as string;
      if (!eventoSnap.exists || tenantId.length === 0) {
        resultado.erros += 1;
        logger.error('automacao_evento_orfao', {
          eventoId: eventoRef.id,
          automacaoId: doc.id,
        });
        continue;
      }

      let ativo = tenantCache.get(tenantId);
      if (ativo === undefined) {
        ativo = await tenantAtivo(db, tenantId);
        tenantCache.set(tenantId, ativo);
      }
      if (!ativo) {
        resultado.tenantInativo += 1;
        continue;
      }

      // Momento devido do gatilho (data do evento / cronograma / offset)
      const dataRaw = eventoSnap.get('data') as
        | { toDate?: () => Date }
        | undefined;
      const dataEvento =
        typeof dataRaw?.toDate === 'function' ? dataRaw.toDate() : null;
      const janelas = (eventoSnap.get('janelasEntrega') ?? []) as JanelaEntrega[];
      const offset = doc.get('offsetHoras') as number | undefined;
      const momento = momentoDaAutomacao(
        doc.get('gatilho') as GatilhoAutomacao,
        dataEvento,
        Array.isArray(janelas) ? janelas : [],
        typeof offset === 'number' ? offset : AUTOMACAO_OFFSET_HORAS_DEFAULT
      );
      if (momento === null || momento.getTime() > agora.getTime()) {
        resultado.foraDaJanela += 1;
        continue;
      }

      const desfecho = await dispararAutomacao(db, eventoRef, doc, tenantId, agora);
      if (desfecho === 'disparada') resultado.disparadas += 1;
      else if (desfecho === 'ja_enviada') resultado.jaEnviadas += 1;
      else if (desfecho === 'limite') resultado.bloqueadasLimite += 1;
      else if (desfecho === 'segmento_vazio') resultado.segmentoVazio += 1;
    } catch (err) {
      resultado.erros += 1;
      logger.error('automacao_dispatch_falha', {
        eventoId: eventoRef?.id ?? null,
        automacaoId: doc.id,
        err,
      });
    }
  }

  logger.info('dispatch_automacoes', { ...resultado });
  return resultado;
}

/**
 * Cron 5min (ADR-015 — cadência do precedente SCHED-T1): dispara automações
 * de relógio devidas. At-least-once safe — one-shot pelo carimbo 'enviado'
 * do template + fan-out curador + recontagem idempotente.
 */
export const dispatchAutomacoes = runWith({
  timeoutSeconds: 540,
  memory: '256MB',
})
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    await dispatchAutomacoesCore(admin.firestore());
    return null;
  });
