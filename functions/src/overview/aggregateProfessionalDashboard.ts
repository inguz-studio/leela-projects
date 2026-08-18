// =============================================================================
// functions/src/overview/aggregateProfessionalDashboard.ts
//
// Agregado ∑ do dashboard do profissional (LEELA-S600-T2 · E02).
// Fan-out: writes em `eventos/{id}` e `clubes/{id}` recalculam e gravam
// `profissionais/{profId}/dashboard/current` (snapshot desnormalizado dos
// KPIs + alertas — evita varredura a cada carregamento do painel).
//
// Idempotência (aceite do lote E02-L1):
//   - o doc é RECOMPUTADO do zero a partir dos ∑ de origem e gravado por
//     SUBSTITUIÇÃO TOTAL (set sem merge) — nunca increment. Reprocessar o
//     mesmo gatilho (retry at-least-once) produz o MESMO conteúdo;
//   - a derivação é pura (@leela/core overview/kpis+alerts) e determinística
//     para um mesmo instante `agora`.
//
// Sem loop de trigger: o write de destino (profissionais/…/dashboard) não
// dispara os gatilhos de origem (eventos/clubes).
//
// E02 é último consumidor — lê SÓ campos canônicos (não cria campo de
// domínio em eventos/clubes/inscritos).
// =============================================================================

import * as admin from 'firebase-admin';
// Estáticos do Firestore via import MODULAR (não `admin.firestore.Timestamp`):
// o Functions Emulator (firebase-tools ≥15) intercepta o módulo firebase-admin
// com um Proxy cujo `get` devolve `firestore.bind(target)` — e `.bind()` cria
// uma função NOVA sem as propriedades estáticas (Timestamp/FieldValue ficam
// undefined SÓ dentro do runtime emulado). O import modular não passa pelo
// proxy e funciona igual em produção.
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { firestore } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  derivarAlertas,
  derivarKpis,
  parseSerieFormasPagamento,
  PENDENTE_ALERTA_HORAS,
  type EventoAlertaInput,
  type EventoKpiInput,
  type FatiaFormaPagamento,
  type OverviewAlert,
  type OverviewKPIs,
  type StatusEvento,
  isStatusEvento,
  STATUS_PAGANTE,
} from '@leela/core';

// ---------------------------------------------------------------------------
// Contrato do doc `profissionais/{profId}/dashboard/current`
// ---------------------------------------------------------------------------

/** Janela dos trends de inscrição (7d atual vs. 7d anterior). */
export const TREND_JANELA_DIAS = 7;

/** Doc considerado fresco por este intervalo — depois o getOverview recomputa. */
export const DASHBOARD_STALE_MS = 5 * 60 * 1000;

/** Shape persistido em `dashboard/current` (KPIs + alertas + carimbos). */
export interface DashboardCurrent extends OverviewKPIs {
  alerts: OverviewAlert[];
  /** Millis UTC do instante da computação (staleness — comparável no cliente) */
  computadoEm: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers de leitura defensiva
// ---------------------------------------------------------------------------

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toDateOrNull(value: unknown): Date | null {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate(): Date }).toDate();
  }
  return null;
}

/**
 * Capacidade total do evento — resolução canônica (mesma fonte para KPI,
 * badge e alerta): `eventos/{id}.capacidade` quando numérica, senão
 * Σ`kits[].capacidade` da subcoleção (RN-210); sem kits → null (desconhecida,
 * o evento fica fora de vagas/risco — não inventa capacidade).
 */
async function resolverCapacidade(
  eventoDoc: FirebaseFirestore.QueryDocumentSnapshot
): Promise<number | null> {
  const direta = eventoDoc.get('capacidade') as unknown;
  if (typeof direta === 'number' && Number.isFinite(direta) && direta > 0) {
    return direta;
  }

  const kits = await eventoDoc.ref.collection('kits').get();
  if (kits.empty) return null;

  let total = 0;
  for (const kit of kits.docs) {
    total += asNumber(kit.get('capacidade'));
  }
  return total > 0 ? total : null;
}

/**
 * Clientes PAGANTES do evento (D-1008-R19) — `count()` sobre `inscritos`
 * filtrado pela régua ÚNICA `STATUS_PAGANTE` (@leela/core). Contagem da
 * FONTE, no MESMO índice single-field de `status` que a query de pendentes já
 * usa: nenhum índice novo, nenhuma leitura de espelho.
 *
 * Existe separada de `qtdInscritos` porque as duas respondem perguntas
 * diferentes: quem está na lista × quem pagou. O funil e toda métrica de
 * dinheiro fecham nesta, nunca naquela.
 *
 * Exportada para o teste de integração pinar a exclusão de
 * pendente/cancelado/estornado com dado real no Emulator.
 */
export async function resolverPagantes(
  eventoRef: FirebaseFirestore.DocumentReference
): Promise<number> {
  const agg = await eventoRef
    .collection('inscritos')
    .where('status', 'in', [...STATUS_PAGANTE])
    .count()
    .get();
  return agg.data().count;
}

/**
 * Série por forma de pagamento DO EVENTO (E11 · S825-T1) — leitura pontual de
 * `eventos/{id}/financeiro/current`, o agregado que já apura a venda.
 *
 * POR QUE UM POINT READ E NÃO UMA VARREDURA AQUI. Este dashboard recomputa a
 * CADA write de evento ou clube do organizador. Varrer `pagamentos` neste
 * laço custaria uma leitura por venda a cada write — num organizador com dez
 * eventos vendidos, milhares de leituras para redesenhar uma rosca. O
 * `financeiro/current` é UM doc por evento e já foi pago pelo gatilho de
 * inscrito. É o mesmo raciocínio que fez o E02 nascer lendo ∑ canônicos em
 * vez de recontar a base.
 *
 * `null` (doc ausente ou sem o campo) sobe intacto como "não sei" — quem
 * decide o que fazer com isso é `derivarKpis`, num lugar só.
 */
async function lerSerieFormasPagamento(
  eventoRef: FirebaseFirestore.DocumentReference
): Promise<FatiaFormaPagamento[] | null> {
  const snap = await eventoRef.collection('financeiro').doc('current').get();
  if (!snap.exists) return null;
  return parseSerieFormasPagamento(snap.get('formasPagamento'));
}

// ---------------------------------------------------------------------------
// Recomputação (núcleo testável no Emulator via Admin SDK — padrão triggers v1)
// ---------------------------------------------------------------------------

/**
 * Recalcula o dashboard do profissional a partir dos agregados ∑ canônicos
 * e grava `profissionais/{profId}/dashboard/current` por substituição total.
 * Idempotente: rodar N vezes com o mesmo estado produz o mesmo conteúdo.
 */
export async function recomputeProfessionalDashboard(
  db: admin.firestore.Firestore,
  profId: string,
  agora: Date = new Date()
): Promise<DashboardCurrent> {
  const [eventosSnap, clubesSnap] = await Promise.all([
    db.collection('eventos').where('organizadorId', '==', profId).get(),
    db.collection('clubes').where('ownerId', '==', profId).get(),
  ]);

  const corte24h = new Date(agora.getTime() - PENDENTE_ALERTA_HORAS * 60 * 60 * 1000);
  const inicioJanelaAtual = new Date(agora.getTime() - TREND_JANELA_DIAS * DIA_MS);
  const inicioJanelaAnterior = new Date(agora.getTime() - 2 * TREND_JANELA_DIAS * DIA_MS);

  const kpiInputs: EventoKpiInput[] = [];
  const alertaInputs: EventoAlertaInput[] = [];
  let pendentesQtd = 0;
  let pendenteMaisRecente: Date | null = null;
  let janelaAtual = 0;
  let janelaAnterior = 0;

  for (const eventoDoc of eventosSnap.docs) {
    const statusBruto = eventoDoc.get('status') as unknown;
    const status: StatusEvento = isStatusEvento(statusBruto) ? statusBruto : 'rascunho';
    const nome = typeof eventoDoc.get('nome') === 'string' ? (eventoDoc.get('nome') as string) : eventoDoc.id;
    const slug = typeof eventoDoc.get('slug') === 'string' ? (eventoDoc.get('slug') as string) : eventoDoc.id;
    const qtdInscritos = asNumber(eventoDoc.get('qtdInscritos'));
    const receitaConfirmada = asNumber(eventoDoc.get('receitaConfirmada'));

    const [
      capacidade,
      pendentesSnap,
      pagantes,
      countAtual,
      countAnterior,
      formasPagamento,
    ] = await Promise.all([
        resolverCapacidade(eventoDoc),
        // Pendências (RN-204): equality em `status` (índice single-field
        // automático); corte de 24h filtrado em memória — volume de pendentes
        // por evento é pequeno e dispensa índice composto.
        eventoDoc.ref.collection('inscritos').where('status', '==', 'pendente').get(),
        // D-1008-R19: clientes PAGANTES do evento (numerador do funil).
        resolverPagantes(eventoDoc.ref),
        // Janelas de trend: range só em `criadoEm` (single-field automático).
        eventoDoc.ref
          .collection('inscritos')
          .where('criadoEm', '>=', Timestamp.fromDate(inicioJanelaAtual))
          .count()
          .get(),
        eventoDoc.ref
          .collection('inscritos')
          .where('criadoEm', '>=', Timestamp.fromDate(inicioJanelaAnterior))
          .where('criadoEm', '<', Timestamp.fromDate(inicioJanelaAtual))
          .count()
          .get(),
        // S825-T1: a série por forma vem PRONTA do agregado do evento.
        lerSerieFormasPagamento(eventoDoc.ref),
      ]);

    for (const pendente of pendentesSnap.docs) {
      const criadoEm = toDateOrNull(pendente.get('criadoEm'));
      if (criadoEm && criadoEm.getTime() <= corte24h.getTime()) {
        pendentesQtd++;
        if (!pendenteMaisRecente || criadoEm > pendenteMaisRecente) {
          pendenteMaisRecente = criadoEm;
        }
      }
    }

    janelaAtual += countAtual.data().count;
    janelaAnterior += countAnterior.data().count;

    kpiInputs.push({
      nome,
      slug,
      status,
      qtdInscritos,
      pagantes,
      receitaConfirmada,
      capacidade,
      formasPagamento,
    });
    alertaInputs.push({
      nome,
      slug,
      status,
      qtdInscritos,
      capacidade,
      dataProva: toDateOrNull(eventoDoc.get('data')),
      atualizadoEm: toDateOrNull(eventoDoc.get('atualizadoEm')),
    });
  }

  const clubeInputs = clubesSnap.docs.map((clubeDoc) => ({
    qtdMembrosAtivos: asNumber(clubeDoc.get('qtdMembrosAtivos')),
    qtdDesafiosAtivos: asNumber(clubeDoc.get('qtdDesafiosAtivos')),
  }));

  // taxaConversaoPct: sem dado de visitas até E12 → null (decisão nº 7 Onda 1)
  const kpis = derivarKpis(
    kpiInputs,
    clubeInputs,
    { atual: janelaAtual, anterior: janelaAnterior },
    null
  );
  const alerts = derivarAlertas(
    alertaInputs,
    { qtd: pendentesQtd, maisRecenteEm: pendenteMaisRecente },
    agora
  );

  const current: DashboardCurrent = {
    ...kpis,
    alerts,
    computadoEm: agora.getTime(),
  };

  // Substituição total (set SEM merge) — estado velho nunca sobrevive;
  // `atualizadoEm` de servidor para auditoria (o cliente usa computadoEm).
  await db
    .collection('profissionais')
    .doc(profId)
    .collection('dashboard')
    .doc('current')
    .set({
      ...current,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

  return current;
}

// ---------------------------------------------------------------------------
// Triggers de fan-out (padrão v1 do repo — onMembroWrite/itemKitIndex)
// ---------------------------------------------------------------------------

/** Extrai os profissionais afetados por um write (before ∪ after). */
function profissionaisAfetados(
  change: { before: FirebaseFirestore.DocumentSnapshot; after: FirebaseFirestore.DocumentSnapshot },
  campo: 'organizadorId' | 'ownerId'
): Set<string> {
  const afetados = new Set<string>();
  for (const snap of [change.before, change.after]) {
    if (!snap.exists) continue;
    const id = snap.get(campo) as unknown;
    if (typeof id === 'string' && id.length > 0) afetados.add(id);
  }
  return afetados;
}

/**
 * Fan-out eventos → dashboard. Cobre create/update/delete e transferência
 * de organizador (recomputa o antigo E o novo dono).
 */
export const onEventoWriteDashboard = firestore
  .document('eventos/{eventoId}')
  .onWrite(async (change) => {
    const db = admin.firestore();
    for (const profId of profissionaisAfetados(change, 'organizadorId')) {
      await recomputeProfessionalDashboard(db, profId);
      logger.info('dashboard_recomputado', { profId, origem: 'eventos' });
    }
  });

/** Fan-out clubes → dashboard (∑ de membros/desafios — E05). */
export const onClubeWriteDashboard = firestore
  .document('clubes/{clubeId}')
  .onWrite(async (change) => {
    const db = admin.firestore();
    for (const profId of profissionaisAfetados(change, 'ownerId')) {
      await recomputeProfessionalDashboard(db, profId);
      logger.info('dashboard_recomputado', { profId, origem: 'clubes' });
    }
  });
