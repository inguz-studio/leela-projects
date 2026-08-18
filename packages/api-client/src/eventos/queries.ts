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
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  isKitInscrito,
  isStatusEvento,
  isStatusInscrito,
  parseEvento,
  parseSerieFormasPagamento,
  type Evento,
  type FatiaFormaPagamento,
  type KitInscrito,
  type StatusInscrito,
  type Timestamp,
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

/**
 * Lista TODOS os eventos de um tenant, sem filtrar por organizador (T4 —
 * back-office da plataforma). O admin não sabe quem organiza o quê; ele entra
 * pelo tenant.
 *
 * SEM `orderBy` de propósito: a query fica no índice de campo único que já
 * existe (`tenantId`), sem índice composto novo — a mesma disciplina do
 * fan-out de repasses. A ordenação é do chamador, sobre uma lista pequena.
 *
 * Rules: só o tenant dono ou `platform_admin` lê.
 */
export async function listarEventosDoTenant(
  db: Firestore,
  tenantId: string,
  pageLimit = 50
): Promise<Evento[]> {
  const snap = await getDocs(
    query(collection(db, 'eventos'), where('tenantId', '==', tenantId), firestoreLimit(pageLimit))
  );
  return snap.docs.map((d) => {
    try {
      return parseEvento(d.id, d.data());
    } catch (err) {
      console.error(`[listarEventosDoTenant] evento "${d.id}" corrompido — placeholder`, err);
      return eventoDegradado(d.id, d.data(), tenantId, '');
    }
  });
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
  // F1 (review r1): UM doc envenenado NÃO pode derrubar a lista inteira do
  // tenant. `parseEvento` é fail-fast (lança em janela/faixa/campo malformado);
  // na LISTAGEM isolamos cada doc — o que falha vira placeholder degradado +
  // telemetria (o organizador ainda VÊ que o evento existe — sumir da lista =
  // pânico — e sabe que precisa de atenção). A leitura O(1) de UM evento
  // (`getEvento`/`getCronogramaEntrega`) mantém o fail-fast de propósito: é
  // leitura pontual, o chamador trata o throw.
  return snap.docs.map((d) => {
    try {
      return parseEvento(d.id, d.data());
    } catch (err) {
      console.error(
        `[listarEventosDoOrganizador] evento "${d.id}" corrompido — ` +
          `exibindo placeholder degradado`,
        err
      );
      return eventoDegradado(d.id, d.data(), tenantId, organizadorId);
    }
  });
}

// Timestamp sentinela p/ o placeholder degradado: um doc ilegível não tem datas
// confiáveis. Epoch 0 (1970) sinaliza "sem dado" e ordena no início sem inventar
// um valor plausível — nunca finge uma data real.
const TIMESTAMP_ZERO: Timestamp = {
  seconds: 0,
  nanoseconds: 0,
  toDate: () => new Date(0),
  toMillis: () => 0,
};

/**
 * Passa o Timestamp adiante quando legível; senão devolve o sentinela.
 *
 * Exportado (INSCRITOS-READ-FIX · 17/08) para o resgate F1 da lista de
 * INSCRITOS reusar o MESMO sentinela — helper interno do pacote, fora do
 * barrel público. Duas versões do "sem dado" divergiriam na primeira ordenação.
 */
export function timestampSeguro(v: unknown): Timestamp {
  return v !== null &&
    typeof v === 'object' &&
    typeof (v as Partial<Timestamp>).toDate === 'function'
    ? (v as Timestamp)
    : TIMESTAMP_ZERO;
}

/**
 * Placeholder degradado para um doc de evento que NÃO parseia (F1 · review r1).
 * A IDENTIDADE é confiável: `id` é o docId real e `tenantId`/`organizadorId` vêm
 * do FILTRO da query (todo doc retornado casa com eles — ADR-009). O CONTEÚDO é
 * best-effort: aproveita o primitivo quando o tipo confere, senão cai num default
 * neutro; cronograma/faixa (fontes mais prováveis do defeito) degradam para
 * vazio. NUNCA lança — é o caminho de resgate da listagem.
 *
 * Exportado (ONDA1-FIX · D-2) para os readers admin de `platform/`
 * (tenantEventosClubs, listasGlobais) reaproveitarem o MESMO caminho de
 * resgate — helper interno do pacote, fora do barrel público.
 */
export function eventoDegradado(
  id: string,
  raw: Record<string, unknown>,
  tenantId: string,
  organizadorId: string
): Evento {
  const nomeRaw = raw['nome'];
  const localRaw = raw['local'];
  const statusRaw = raw['status'];
  const qtd = raw['qtdInscritos'];
  const receita = raw['receitaConfirmada'];
  return {
    id,
    tenantId,
    organizadorId,
    nome:
      typeof nomeRaw === 'string' && nomeRaw.length > 0
        ? nomeRaw
        : '(evento com dados inválidos)',
    data: timestampSeguro(raw['data']),
    local: typeof localRaw === 'string' ? localRaw : '',
    modalidades: [],
    percursos: [],
    slug: id,
    status: isStatusEvento(statusRaw) ? statusRaw : 'rascunho',
    usaChip: raw['usaChip'] === true,
    criadoEm: timestampSeguro(raw['criadoEm']),
    atualizadoEm: timestampSeguro(raw['atualizadoEm']),
    qtdInscritos: typeof qtd === 'number' && Number.isFinite(qtd) ? qtd : 0,
    receitaConfirmada:
      typeof receita === 'number' && Number.isFinite(receita) ? receita : 0,
    capacidade: null,
    janelasEntrega: [],
    faixaChips: null,
  };
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
  /**
   * Série por forma de pagamento do evento (E11 · S825-T1). `null` = o
   * agregado ainda não a carrega (doc anterior ao deploy), e é ESSE null que
   * mantém o "em breve" honesto na tela — nunca uma rosca zerada. Série
   * presente com tudo zerado significa "somado, sem venda".
   *
   * OPCIONAL aqui e OBRIGATÓRIA no servidor, de propósito: a Function sempre
   * escreve o campo, mas o cliente lê docs gravados antes dela existir
   * (leitura Postel, igual aos analytics opcionais acima). Ausente e `null`
   * significam a MESMA coisa para quem consome — sempre com `?? null`.
   */
  formasPagamento?: FatiaFormaPagamento[] | null;
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
 * Parse defensivo do doc `financeiro/current` → FinanceiroEvento. Fonte ÚNICA de
 * parsing (reusada pelo get one-shot e pelo observe realtime): NUNCA recalcula
 * receita — só LÊ os campos ∑ que a Function computou (RN-2xx).
 */
function parseFinanceiroDoc(data: DocumentData): FinanceiroEvento {
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
    // S825-T1: parsing ÚNICO, no core — a fronteira Firestore→domínio da
    // série é a mesma para o servidor e para o cliente, senão "não computada"
    // vira "sem venda" numa das duas pontas e ninguém percebe.
    formasPagamento: parseSerieFormasPagamento(data['formasPagamento']),
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
  return parseFinanceiroDoc(snap.data());
}

/** Handlers do observador realtime (onSnapshot) — next a cada mudança, error 1x. */
export interface ObservarHandlers<T> {
  next: (value: T) => void;
  error?: (err: Error) => void;
}

/**
 * OBSERVA o agregado financeiro do evento em TEMPO REAL (`financeiro/current`).
 * Superfície VIVA (S207, UX-DADOS): o painel financeiro reflete cada recomputo
 * do gatilho sem revisitar a tela. Reusa `parseFinanceiroDoc` (mesmo parsing do
 * get one-shot). `next(null)` quando o doc ainda não existe (ausência honesta,
 * nunca zero fake). Devolve o `Unsubscribe` — o caller o chama no cleanup.
 * Listener de UM doc (O(1)): barato, ao contrário de superfícies densas.
 */
export function observarFinanceiroEvento(
  db: Firestore,
  eventoId: string,
  handlers: ObservarHandlers<FinanceiroEvento | null>
): Unsubscribe {
  return onSnapshot(
    doc(db, 'eventos', eventoId, 'financeiro', 'current'),
    (snap) => handlers.next(snap.exists() ? parseFinanceiroDoc(snap.data()) : null),
    (err) => handlers.error?.(err)
  );
}
