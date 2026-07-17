// =============================================================================
// @leela/api-client — callables do REPASSE do organizador (LEELA-E09s-L2)
//
// Wrappers tipados de `httpsCallable` para o fluxo de saque (E09-slim).
// SÓ transporte (padrão checkout.ts): validação, saldo, cifra e transições
// são decisão EXCLUSIVA do servidor (RN-352/353/354/357) — nenhum cálculo
// de dinheiro aqui. Contratos = espelho de functions/src/finance/*.
//
// LGPD (RN-354): `saveDadosBancarios` envia o dado em claro APENAS no
// callable (TLS) e recebe de volta SOMENTE a versão mascarada; o número
// completo nunca fica no cliente do organizador.
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import {
  isEstadoRepasse,
  isTipoContaBancaria,
  type DadosBancarios,
  type DadosBancariosSnapshot,
  type EstadoRepasse,
  type Repasse,
  type SaldoRepasse,
  type Timestamp,
  type TipoContaBancaria,
  type TransicaoRepasse,
} from '@leela/core';
import { getLeelaFunctions } from './firebase';

// ---------------------------------------------------------------------------
// Dados bancários (L2-T2 · RN-354 · ADR-014)
// ---------------------------------------------------------------------------

export type TipoContaBancariaInput = 'corrente' | 'poupanca';

export interface SaveDadosBancariosInput {
  banco: string;
  agencia: string;
  /** Número em claro — trafega SÓ no callable; o servidor cifra e mascara. */
  conta: string;
  tipo: TipoContaBancariaInput;
  pix?: string;
  titular: string;
  cpfCnpj: string;
}

/** Versão MASCARADA — a única que o cliente vê de volta (RN-354). */
export interface DadosBancariosMascarados {
  tenantId: string;
  banco: string;
  agencia: string;
  contaMascarada: string;
  tipo: TipoContaBancariaInput;
  pixMascarado: string | null;
  titular: string;
  cpfCnpjMascarado: string;
}

export interface SaveDadosBancariosResult {
  dadosBancarios: DadosBancariosMascarados;
}

/**
 * Cadastra/atualiza os dados bancários do tenant (tenant_owner). Reenvio
 * sobrescreve idempotente preservando `criadoEm`. Retorna SÓ o mascarado.
 */
export async function saveDadosBancarios(
  input: SaveDadosBancariosInput
): Promise<SaveDadosBancariosResult> {
  const fn = httpsCallable<SaveDadosBancariosInput, SaveDadosBancariosResult>(
    getLeelaFunctions(),
    'saveDadosBancarios'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// Solicitação e cancelamento de repasse (L2-T3 · RN-351/352/353 · decisão #11)
// ---------------------------------------------------------------------------

export interface RequestRepasseInput {
  /** Valor solicitado (R$, 2 casas). O ESPELHO client de RN-352 é só UX —
   *  o servidor relê o disponível e é autoritativo (failed-precondition). */
  valor: number;
  /**
   * RN-349 (LEELA-BEPEND-T2) — associa o repasse a UM evento do tenant.
   * OPCIONAL: ausente = repasse do saldo geral. O SERVIDOR valida (evento
   * inexistente/de outro tenant ⇒ rejeita); o campo gravado é congelado
   * pelas Rules — o cliente nunca escreve o doc.
   */
  eventoId?: string;
}

export interface RequestRepasseResult {
  repasseId: string;
  estado: 'solicitado';
  valor: number;
  /** Disponível APÓS comprometer esta solicitação (RN-351). */
  disponivel: number;
  /** Evento associado (RN-349) — null quando o repasse é do saldo geral. */
  eventoId: string | null;
}

/** Solicita um repasse (tenant_owner). Servidor valida contra o saldo. */
export async function requestRepasse(
  input: RequestRepasseInput
): Promise<RequestRepasseResult> {
  const fn = httpsCallable<RequestRepasseInput, RequestRepasseResult>(
    getLeelaFunctions(),
    'requestRepasse'
  );
  const { data } = await fn(input);
  return data;
}

export interface CancelRepasseInput {
  repasseId: string;
}

export interface CancelRepasseResult {
  repasseId: string;
  estado: 'cancelado';
  /** true = já estava cancelado (retry idempotente). */
  replay: boolean;
}

/** Cancela uma solicitação AINDA em 'solicitado' (só o tenant_owner). */
export async function cancelRepasse(
  input: CancelRepasseInput
): Promise<CancelRepasseResult> {
  const fn = httpsCallable<CancelRepasseInput, CancelRepasseResult>(
    getLeelaFunctions(),
    'cancelRepasse'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// Transições ADMIN + comprovante + retenção (L2-T4 · RN-353/355/356 · RN-404)
// Todas exigem claim platform_admin — o servidor nega o resto.
// ---------------------------------------------------------------------------

export type EstadoRepasseView =
  | 'solicitado'
  | 'aprovado'
  | 'recusado'
  | 'pago'
  | 'cancelado';

export interface TransicaoRepasseAdminInput {
  tenantId: string;
  repasseId: string;
}

export interface TransicaoRepasseAdminResult {
  repasseId: string;
  estado: EstadoRepasseView;
  /** true = já estava no estado-destino (retry idempotente). */
  replay: boolean;
}

export interface MarkRepassePagoResult extends TransicaoRepasseAdminResult {
  estado: 'pago';
  /** Comprovante GAPLESS por tenant (RN-355) — ex.: REP-2026-0007. */
  comprovanteNumero: string;
}

/** solicitado → aprovado (platform_admin). */
export async function approveRepasse(
  input: TransicaoRepasseAdminInput
): Promise<TransicaoRepasseAdminResult> {
  const fn = httpsCallable<TransicaoRepasseAdminInput, TransicaoRepasseAdminResult>(
    getLeelaFunctions(),
    'approveRepasse'
  );
  const { data } = await fn(input);
  return data;
}

/** solicitado → recusado (platform_admin) — devolve o valor ao disponível. */
export async function rejectRepasse(
  input: TransicaoRepasseAdminInput
): Promise<TransicaoRepasseAdminResult> {
  const fn = httpsCallable<TransicaoRepasseAdminInput, TransicaoRepasseAdminResult>(
    getLeelaFunctions(),
    'rejectRepasse'
  );
  const { data } = await fn(input);
  return data;
}

/**
 * aprovado → pago (platform_admin). Gera comprovante numerado gapless.
 * REGISTRO MANUAL (RN-356): nenhuma transferência bancária real é feita —
 * a UI deve avisar explicitamente.
 */
export async function markRepassePago(
  input: TransicaoRepasseAdminInput
): Promise<MarkRepassePagoResult> {
  const fn = httpsCallable<TransicaoRepasseAdminInput, MarkRepassePagoResult>(
    getLeelaFunctions(),
    'markRepassePago'
  );
  const { data } = await fn(input);
  return data;
}

export interface SetRetencaoRepasseInput {
  tenantId: string;
  /** % de retenção pós-evento (0..100 — RN-350). */
  retencaoRepassePct: number;
}

export interface SetRetencaoRepasseResult {
  tenantId: string;
  retencaoRepassePct: number;
  /** Versão nova do termo comercial (RN-404 — bump + snapshot). */
  versao: number;
}

/** Configura a retenção % do tenant no termo comercial (platform_admin). */
export async function setRetencaoRepasse(
  input: SetRetencaoRepasseInput
): Promise<SetRetencaoRepasseResult> {
  const fn = httpsCallable<SetRetencaoRepasseInput, SetRetencaoRepasseResult>(
    getLeelaFunctions(),
    'setRetencaoRepasse'
  );
  const { data } = await fn(input);
  return data;
}

// ---------------------------------------------------------------------------
// Leitura auditada do dado bancário completo (L2-T5 · RN-354 · decisão #8)
// ---------------------------------------------------------------------------

export interface GetBankDetailsInput {
  tenantId: string;
  repasseId: string;
}

export interface GetBankDetailsResult {
  tenantId: string;
  repasseId: string;
  /** Número COMPLETO — só existe neste retorno; o acesso É auditado. */
  conta: string;
  pix: string | null;
  banco: string;
  agencia: string;
  tipo: string;
  titular: string;
  cpfCnpjMascarado: string;
  /** Texto fixo para a UI exibir (L4-T2): acesso registrado. */
  avisoAuditoria: string;
}

/**
 * Retorna o dado bancário COMPLETO de um repasse 'aprovado' — SÓ
 * platform_admin; todo acesso (inclusive negado) é registrado (LGPD).
 * A UI DEVE exibir `avisoAuditoria` ao mostrar o número.
 */
export async function getBankDetailsForPayout(
  input: GetBankDetailsInput
): Promise<GetBankDetailsResult> {
  const fn = httpsCallable<GetBankDetailsInput, GetBankDetailsResult>(
    getLeelaFunctions(),
    'getBankDetailsForPayout'
  );
  const { data } = await fn(input);
  return data;
}

// =============================================================================
// LEITURAS do repasse (E09s-L3) — o painel do organizador LÊ os agregados que
// as Functions do L2 escrevem (RN-357: escrita SÓ por Function; a leitura do
// tenant_owner é liberada nas Rules do L1-T2). São reads tenant-scoped diretos
// (ADR-009): os 3 cards leem SÓ `saldo/current` (∑ do servidor — o cliente
// NUNCA soma eventos). Dados bancários (T2) e histórico (T4) crescem nesta
// seção. Nenhum cálculo de dinheiro aqui.
// =============================================================================

/** Timestamp sentinela p/ campo de data ilegível (nunca finge uma data real). */
const REPASSE_TS_ZERO: Timestamp = {
  seconds: 0,
  nanoseconds: 0,
  toDate: () => new Date(0),
  toMillis: () => 0,
};

/** Passa o Timestamp adiante quando legível (structural — Firestore Timestamp). */
function asRepasseTimestamp(v: unknown): Timestamp {
  return v !== null &&
    typeof v === 'object' &&
    typeof (v as Partial<Timestamp>).toDate === 'function'
    ? (v as Timestamp)
    : REPASSE_TS_ZERO;
}

function repasseNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function repasseStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function repasseTipoConta(v: unknown): TipoContaBancaria {
  return isTipoContaBancaria(v) ? v : 'corrente';
}

/**
 * Lê o saldo consolidado do tenant (`tenants/{tid}/saldo/current`) — a ÚNICA
 * fonte dos 3 cards (vendido/disponível/retido). ∑ do servidor (RN-350/351):
 * o cliente nunca varre eventos nem soma. `null` quando a Function ainda não
 * computou (tenant sem venda) — a tela mostra "Nenhuma movimentação" (§2.12),
 * não zeros ambíguos. Só o tenant_owner (ou platform_admin) lê — cross-tenant
 * vira permission-denied (RN-354).
 */
export async function getSaldoRepasse(
  db: Firestore,
  tenantId: string
): Promise<SaldoRepasse | null> {
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'saldo', 'current'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    tenantId: repasseStr(data['tenantId'], tenantId),
    vendidoBruto: repasseNum(data['vendidoBruto']),
    retido: repasseNum(data['retido']),
    disponivel: repasseNum(data['disponivel']),
    comprometido: repasseNum(data['comprometido']),
    dentroJanelaDN: repasseNum(data['dentroJanelaDN']),
    eventosSemTermo: repasseNum(data['eventosSemTermo']),
    atualizadoEm: asRepasseTimestamp(data['atualizadoEm']),
  };
}

/**
 * Lê os dados bancários MASCARADOS do tenant (`dadosBancarios/current`) — a
 * única versão legível pelo cliente (RN-354): nunca o número de conta/PIX em
 * claro (esse vive cifrado em `dadosBancariosSecret`, read:false até para o
 * owner). `null` quando o organizador ainda não cadastrou (a tela abre no form).
 */
export async function getDadosBancarios(
  db: Firestore,
  tenantId: string
): Promise<DadosBancarios | null> {
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'dadosBancarios', 'current'));
  if (!snap.exists()) return null;
  const data = snap.data();
  const pix = data['pixMascarado'];
  return {
    tenantId: repasseStr(data['tenantId'], tenantId),
    banco: repasseStr(data['banco']),
    agencia: repasseStr(data['agencia']),
    contaMascarada: repasseStr(data['contaMascarada']),
    tipo: repasseTipoConta(data['tipo']),
    pixMascarado: typeof pix === 'string' ? pix : null,
    titular: repasseStr(data['titular']),
    cpfCnpjMascarado: repasseStr(data['cpfCnpjMascarado']),
    criadoEm: asRepasseTimestamp(data['criadoEm']),
    atualizadoEm: asRepasseTimestamp(data['atualizadoEm']),
  };
}

/** Projeção MASCARADA congelada no repasse (RN-354 — nunca o número em claro). */
function parseSnapshotMascarado(raw: unknown): DadosBancariosSnapshot {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pix = d['pixMascarado'];
  return {
    tenantId: repasseStr(d['tenantId']),
    banco: repasseStr(d['banco']),
    agencia: repasseStr(d['agencia']),
    contaMascarada: repasseStr(d['contaMascarada']),
    tipo: repasseTipoConta(d['tipo']),
    pixMascarado: typeof pix === 'string' ? pix : null,
    titular: repasseStr(d['titular']),
    cpfCnpjMascarado: repasseStr(d['cpfCnpjMascarado']),
  };
}

/** Trilha append-only de transições (de→para/quando/quem) — auditoria RN-353. */
function parseTransicoes(raw: unknown): TransicaoRepasse[] {
  if (!Array.isArray(raw)) return [];
  const out: TransicaoRepasse[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const para = t['para'];
    if (!isEstadoRepasse(para)) continue;
    const de = t['de'];
    out.push({
      de: isEstadoRepasse(de) ? de : null,
      para,
      em: asRepasseTimestamp(t['em']),
      por: repasseStr(t['por']),
      papel: t['papel'] === 'platform_admin' ? 'platform_admin' : 'tenant_owner',
    });
  }
  return out;
}

/** Um repasse do histórico já parseado (id + snapshot mascarado + transições). */
function parseRepasse(id: string, raw: Record<string, unknown>): Repasse | null {
  const estado = raw['estado'];
  if (!isEstadoRepasse(estado)) return null; // doc corrompido — não mascara dinheiro
  const numero = raw['comprovanteNumero'];
  const base: Repasse = {
    id,
    tenantId: repasseStr(raw['tenantId']),
    valor: repasseNum(raw['valor']),
    estado: estado as EstadoRepasse,
    dadosBancariosSnapshot: parseSnapshotMascarado(raw['dadosBancariosSnapshot']),
    transicoes: parseTransicoes(raw['transicoes']),
    criadoEm: asRepasseTimestamp(raw['criadoEm']),
    atualizadoEm: asRepasseTimestamp(raw['atualizadoEm']),
  };
  if (typeof numero === 'string' && numero.length > 0) base.comprovanteNumero = numero;
  // RN-349 — associação exata repasse↔evento (docs antigos sem o campo
  // seguem válidos: ausência = "sem associação", a UI declara honesto).
  const eventoId = raw['eventoId'];
  if (typeof eventoId === 'string' && eventoId.length > 0) base.eventoId = eventoId;
  return base;
}

/**
 * Lista os repasses do tenant (`tenants/{tid}/repasses`), mais recentes
 * primeiro — o histórico da tela (T4). Um doc corrompido (estado fora da união)
 * é isolado + logado, não derruba a lista inteira (mesma disciplina de
 * `listarEventosDoOrganizador`). Só o tenant_owner (ou platform_admin) lê.
 */
export async function listRepasses(
  db: Firestore,
  tenantId: string
): Promise<Repasse[]> {
  const q = query(
    collection(db, 'tenants', tenantId, 'repasses'),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  const out: Repasse[] = [];
  for (const d of snap.docs) {
    const repasse = parseRepasse(d.id, d.data());
    if (repasse) {
      out.push(repasse);
    } else {
      console.error(`[listRepasses] repasse "${d.id}" corrompido — omitido do histórico`);
    }
  }
  return out;
}
