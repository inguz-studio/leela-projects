// =============================================================================
// packages/api-client/src/eventos/queries.ts
//
// Queries de leitura da coleção `eventos` (LEELA-S200-T1 · E03).
//
// ADR-009: toda query de coleção tenant-scoped FILTRA por tenantId — além de
// obrigatório para isolamento, é o que torna a query provável pelas Security
// Rules (read exige claim.tenantId == resource.data.tenantId).
// Escrita de evento passa por Cloud Function (`criarEvento` — S201-T2);
// agregados ∑ nunca são escritos pelo cliente.
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  isKitInscrito,
  isStatusInscrito,
  parseEvento,
  type Evento,
  type KitInscrito,
  type StatusInscrito,
} from '@leela/core';

/**
 * Lê UM evento pelo slug — leitura direta O(1) (docId = slug).
 * Retorna null quando não existe. A Security Rule garante que só o tenant
 * dono (ou platform_admin) consegue ler — cross-tenant vira permission-denied.
 *
 * Contrato pedido pelo L3 (layout do evento S202-T1 — ver _data/eventos.ts).
 */
export async function getEvento(
  db: Firestore,
  slug: string
): Promise<Evento | null> {
  const snap = await getDoc(doc(db, 'eventos', slug));
  if (!snap.exists()) return null;
  return parseEvento(snap.id, snap.data());
}

/** Parâmetros de listagem de eventos do organizador */
export interface ListarEventosDoOrganizadorParams {
  /** Tenant do claim do usuário (ADR-009 — obrigatório) */
  tenantId: string;
  /** UID do profissional organizador */
  organizadorId: string;
  /** Máximo de eventos retornados (default 50) */
  pageLimit?: number;
}

/**
 * Lista os eventos de um organizador, ordenados por data da prova (asc).
 *
 * Query: `eventos where tenantId == claim && organizadorId == uid orderBy data`.
 * Índice composto correspondente em `firestore.indexes.json`
 * (tenantId ASC, organizadorId ASC, data ASC).
 *
 * Security Rule garante: só docs do tenant do caller (ou platform_admin).
 */
export async function listarEventosDoOrganizador(
  db: Firestore,
  params: ListarEventosDoOrganizadorParams
): Promise<Evento[]> {
  const { tenantId, organizadorId, pageLimit = 50 } = params;

  const q = query(
    collection(db, 'eventos'),
    where('tenantId', '==', tenantId),
    where('organizadorId', '==', organizadorId),
    orderBy('data', 'asc'),
    firestoreLimit(pageLimit)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => parseEvento(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Financeiro do evento — leitura do agregado (S207-T1 · lê S207-T2)
// ---------------------------------------------------------------------------

/** Contagens de inscritos do agregado financeiro (espelha o servidor). */
export interface ContagemInscritos {
  total: number;
  porStatus: Record<StatusInscrito, number>;
  porKit: Record<KitInscrito, number>;
  /** Chaves = percursos configurados no evento */
  porModalidade: Record<string, number>;
}

/**
 * Shape do doc `eventos/{id}/financeiro/current` (S207-T2).
 * taxa/líquido são `null` quando o tenant não tem termos (RN-406, sem
 * fallback). O cliente NUNCA recalcula receita — só lê este agregado.
 */
export interface FinanceiroEvento {
  tenantId: string;
  /** Receita bruta confirmada (R$) — espelho do ∑ `receitaConfirmada` */
  receitaBruta: number;
  /** % do termo do tenant (RN-406) — null quando o tenant não tem termos */
  taxaPct: number | null;
  /** Taxa Leela (R$) — null quando não há termo */
  taxaValor: number | null;
  /** Líquido do produtor (R$) — null quando não há termo */
  receitaLiquida: number | null;
  inscritos: ContagemInscritos;
  /**
   * Analytics do Overview que a Onda 1 ainda NÃO computa (dependem de dados de
   * VISITAS/série temporal — gap E12, mesmo caso da conversão do dashboard). São
   * OPCIONAIS: ausentes em produção (o agregado real não os grava) → o Overview
   * degrada (esconde sparkline/conversão/donut). No preview, o seed-extra os
   * injeta por cima de `financeiro/current` p/ provar a tela (ver preview-seed-extra).
   */
  /** % de conversão visitantes→inscritos (null = indisponível). */
  taxaConversaoPct?: number | null;
  /** Δ de receita confirmada na última semana (R$; null = indisponível). */
  receitaSemana?: number | null;
  /** Série curta do ticket médio p/ a Sparkline (vazio = sem série). */
  ticketSparkline?: number[];
  /** Receita (R$) por modalidade p/ o donut (chaves = percursos do evento). */
  receitaPorModalidade?: Record<string, number>;
}

function toNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function toNumOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function parseContagem(raw: unknown): ContagemInscritos {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const porStatus = {} as Record<StatusInscrito, number>;
  const statusRaw = (data['porStatus'] ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(statusRaw)) {
    if (isStatusInscrito(k)) porStatus[k] = toNum(v);
  }
  const porKit = {} as Record<KitInscrito, number>;
  const kitRaw = (data['porKit'] ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(kitRaw)) {
    if (isKitInscrito(k)) porKit[k] = toNum(v);
  }
  const porModalidade: Record<string, number> = {};
  const modRaw = (data['porModalidade'] ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(modRaw)) {
    porModalidade[k] = toNum(v);
  }
  return { total: toNum(data['total']), porStatus, porKit, porModalidade };
}

/**
 * Lê o agregado financeiro do evento (`financeiro/current`). Retorna null
 * quando ainda não foi computado (evento sem inscritos / gatilho não rodou).
 * Só o tenant dono (ou platform_admin) lê — cross-tenant vira permission-denied.
 */
export async function getFinanceiroEvento(
  db: Firestore,
  eventoId: string
): Promise<FinanceiroEvento | null> {
  const snap = await getDoc(doc(db, 'eventos', eventoId, 'financeiro', 'current'));
  if (!snap.exists()) return null;
  const data = snap.data();

  // Analytics opcionais (preview/E12): só entram se presentes no doc.
  const sparkRaw = data['ticketSparkline'];
  const ticketSparkline = Array.isArray(sparkRaw)
    ? sparkRaw.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    : undefined;
  const modRaw = data['receitaPorModalidade'];
  let receitaPorModalidade: Record<string, number> | undefined;
  if (modRaw && typeof modRaw === 'object' && !Array.isArray(modRaw)) {
    receitaPorModalidade = {};
    for (const [k, v] of Object.entries(modRaw as Record<string, unknown>)) {
      receitaPorModalidade[k] = toNum(v);
    }
  }

  return {
    tenantId: typeof data['tenantId'] === 'string' ? data['tenantId'] : '',
    receitaBruta: toNum(data['receitaBruta']),
    taxaPct: toNumOrNull(data['taxaPct']),
    taxaValor: toNumOrNull(data['taxaValor']),
    receitaLiquida: toNumOrNull(data['receitaLiquida']),
    inscritos: parseContagem(data['inscritos']),
    ...(data['taxaConversaoPct'] !== undefined
      ? { taxaConversaoPct: toNumOrNull(data['taxaConversaoPct']) }
      : {}),
    ...(data['receitaSemana'] !== undefined
      ? { receitaSemana: toNumOrNull(data['receitaSemana']) }
      : {}),
    ...(ticketSparkline ? { ticketSparkline } : {}),
    ...(receitaPorModalidade ? { receitaPorModalidade } : {}),
  };
}
