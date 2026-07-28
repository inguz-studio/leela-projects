// =============================================================================
// packages/api-client/src/eventos/reembolsos.ts
//
// LEITURA de gestão da máquina de reembolso + transferências do evento (E09 ·
// S904-T5) e o callable de DECISÃO do organizador (`decideRefund`).
//
// Coleções (escrita EXCLUSIVA de Cloud Function — Rules negam todo write de
// cliente): `eventos/{id}/reembolsos/{inscritoId}` (máquina RN-341) e
// `eventos/{id}/transferencias/{id}` (titularidade/troca RN-343/344/345). A
// leitura é de GESTÃO (owner/staff + papel de evento organizador/financeiro —
// a fila vive na aba financeira). Esta camada só LÊ os docs e TRANSPORTA a
// decisão; VALORES e ESTADO vêm do servidor (RN-337) — nada recalculado aqui.
// Contratos = espelho de functions/src/finance/requestRefund.ts.
// =============================================================================

import {
  collection,
  getDocs,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  isEstadoReembolso,
  type EstadoReembolso,
  type Reembolso,
  type TipoTransferencia,
  type Timestamp,
  type Transferencia,
  type TrilhaOperacao,
} from '@leela/core';
import { getLeelaFunctions } from '../firebase';

// ---------------------------------------------------------------------------
// Helpers de parse defensivo (borda de I/O — doc corrompido é isolado, não
// derruba a lista; mesma disciplina de listRepasses).
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function ts(v: unknown): Timestamp {
  return v as Timestamp;
}

function isTipoTransferenciaLike(v: unknown): v is TipoTransferencia {
  return v === 'titularidade' || v === 'ingresso';
}

function isEstadoTransferenciaLike(v: unknown): v is Transferencia['estado'] {
  return v === 'concluida' || v === 'registrada';
}

/**
 * Parseia um reembolso (id = inscritoId). `estado` fora da união ⇒ null (doc
 * corrompido — não mascara dinheiro). Trilha e valores passam do servidor.
 *
 * Exportado como PROVA EXECUTÁVEL do contrato de leitura (RN-376): o teste da
 * fila admin verifica que `origem: 'plataforma'` e o furo do corte sobrevivem
 * à leitura — antes o parser coagia tudo para 'organizador' e a coluna
 * "aberto por" mentiria em produção. Não é API de tela; a tela usa
 * `listReembolsos`.
 */
export function parseReembolso(id: string, raw: Record<string, unknown>): Reembolso | null {
  const estado = raw['estado'];
  if (!isEstadoReembolso(estado)) return null;
  // T4 · decisão 43-b: a plataforma também abre reembolso (cross-tenant); o
  // default continua 'organizador' para doc antigo sem o campo.
  const origem =
    raw['origem'] === 'atleta' ? 'atleta' : raw['origem'] === 'plataforma' ? 'plataforma' : 'organizador';
  const transicoesRaw = raw['transicoes'];
  const transicoes = Array.isArray(transicoesRaw)
    ? transicoesRaw.flatMap((t): Reembolso['transicoes'] => {
        if (!t || typeof t !== 'object') return [];
        const item = t as Record<string, unknown>;
        const de = item['de'];
        const para = item['para'];
        if (!isEstadoReembolso(de) || !isEstadoReembolso(para)) return [];
        return [{ de, para, em: ts(item['em']), por: str(item['por']), papel: str(item['papel']) }];
      })
    : [];
  const base: Reembolso = {
    id,
    tenantId: str(raw['tenantId']),
    eventoId: str(raw['eventoId']),
    pedidoId: str(raw['pedidoId']),
    inscritoId: str(raw['inscritoId']) || id,
    motivo: str(raw['motivo']),
    estado,
    origem,
    valorSolicitado: num(raw['valorSolicitado']),
    transicoes,
    criadoEm: ts(raw['criadoEm']),
    atualizadoEm: ts(raw['atualizadoEm']),
  };
  if (typeof raw['valorEstornado'] === 'number') base.valorEstornado = raw['valorEstornado'];
  if (typeof raw['refundId'] === 'string') base.refundId = raw['refundId'];
  if (typeof raw['decididoPor'] === 'string') base.decididoPor = raw['decididoPor'];
  // RN-376: o furo do corte fica NO DOC — apagar na leitura seria esconder a
  // mão da plataforma da fila e da auditoria.
  if (raw['overrideCorte'] === true) base.overrideCorte = true;
  if (typeof raw['motivoOverride'] === 'string') base.motivoOverride = raw['motivoOverride'];
  if (typeof raw['overridePor'] === 'string') base.overridePor = raw['overridePor'];
  if (typeof raw['corteHorasNoOverride'] === 'number') {
    base.corteHorasNoOverride = raw['corteHorasNoOverride'];
  }
  return base;
}

/** Parseia uma transferência. `tipo`/`estado` inválidos ⇒ null (doc corrompido). */
function parseTransferencia(id: string, raw: Record<string, unknown>): Transferencia | null {
  const tipo = raw['tipo'];
  const estado = raw['estado'];
  if (!isTipoTransferenciaLike(tipo) || !isEstadoTransferenciaLike(estado)) return null;
  const anteriorRaw = (raw['titularAnterior'] ?? {}) as Record<string, unknown>;
  const base: Transferencia = {
    id,
    tenantId: str(raw['tenantId']),
    eventoId: str(raw['eventoId']),
    pedidoId: str(raw['pedidoId']),
    inscritoId: str(raw['inscritoId']),
    tipo,
    estado,
    titularAnterior: { atletaId: str(anteriorRaw['atletaId']), nome: str(anteriorRaw['nome']) },
    diffCobrada: num(raw['diffCobrada']),
    criadoEm: ts(raw['criadoEm']),
    criadoPor: str(raw['criadoPor']),
  };
  if (raw['novoTitular'] && typeof raw['novoTitular'] === 'object') {
    const nt = raw['novoTitular'] as Record<string, unknown>;
    base.novoTitular = { nome: str(nt['nome']) };
  }
  if (typeof raw['novaModalidade'] === 'string') base.novaModalidade = raw['novaModalidade'];
  return base;
}

// ---------------------------------------------------------------------------
// Leituras (gestão — fila do organizador)
// ---------------------------------------------------------------------------

/**
 * Lista os reembolsos do evento (mais recentes primeiro). A fila de análise é o
 * subconjunto `em_analise` (a tela filtra); os demais estados são exibidos com
 * seus valores autoritativos. Doc corrompido é omitido, não derruba a lista.
 */
export async function listReembolsos(db: Firestore, eventoId: string): Promise<Reembolso[]> {
  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'reembolsos'), orderBy('criadoEm', 'desc'))
  );
  const out: Reembolso[] = [];
  for (const d of snap.docs) {
    const r = parseReembolso(d.id, d.data());
    if (r) out.push(r);
    else console.error(`[listReembolsos] reembolso "${d.id}" corrompido — omitido`);
  }
  return out;
}

/** Lista as transferências do evento (mais recentes primeiro). */
export async function listTransferencias(
  db: Firestore,
  eventoId: string
): Promise<Transferencia[]> {
  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'transferencias'), orderBy('criadoEm', 'desc'))
  );
  const out: Transferencia[] = [];
  for (const d of snap.docs) {
    const t = parseTransferencia(d.id, d.data());
    if (t) out.push(t);
    else console.error(`[listTransferencias] transferência "${d.id}" corrompida — omitida`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Trilha de CANCELAMENTO SEM ESTORNO (T4 · RN-377/378) — leitura de gestão
// ---------------------------------------------------------------------------

/** Uma linha da trilha de cancelamento (docId = inscritoId). */
export interface CancelamentoInscricao {
  id: string;
  tenantId: string;
  eventoId: string;
  pedidoId: string;
  inscritoId: string;
  motivo: string;
  statusAnterior: string;
  /** Sempre false hoje — o nome do campo é a promessa da ação. */
  dinheiroDevolvido: boolean;
  trilha: TrilhaOperacao;
  por: string;
  papel: string;
  criadoEm: Timestamp;
}

function parseCancelamento(id: string, raw: Record<string, unknown>): CancelamentoInscricao | null {
  const trilha = raw['trilha'];
  if (trilha !== 'organizador' && trilha !== 'plataforma') return null;
  return {
    id,
    tenantId: str(raw['tenantId']),
    eventoId: str(raw['eventoId']),
    pedidoId: str(raw['pedidoId']),
    inscritoId: str(raw['inscritoId']),
    motivo: str(raw['motivo']),
    statusAnterior: str(raw['statusAnterior']),
    dinheiroDevolvido: raw['dinheiroDevolvido'] === true,
    trilha,
    por: str(raw['por']),
    papel: str(raw['papel']),
    criadoEm: ts(raw['criadoEm']),
  };
}

/** Lista os cancelamentos sem estorno do evento (mais recentes primeiro). */
export async function listCancelamentos(
  db: Firestore,
  eventoId: string
): Promise<CancelamentoInscricao[]> {
  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'cancelamentos'), orderBy('criadoEm', 'desc'))
  );
  const out: CancelamentoInscricao[] = [];
  for (const d of snap.docs) {
    const c = parseCancelamento(d.id, d.data());
    if (c) out.push(c);
    else console.error(`[listCancelamentos] cancelamento "${d.id}" corrompido — omitido`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Abertura (callable — a porta ÚNICA do estorno pelo painel · RN-375)
// ---------------------------------------------------------------------------

export interface RequestRefundInput {
  pedidoId: string;
  inscritoId: string;
  /** Motivo (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
  /**
   * FURAR o corte de véspera (RN-376). Só `platform_admin`, e só com
   * `motivoOverride`. Organizador que mandar isto leva permission-denied do
   * servidor — a tela do organizador não deve nem oferecer.
   */
  overrideCorte?: boolean;
  /** Justificativa do furo (obrigatória quando `overrideCorte`). */
  motivoOverride?: string;
}

export interface RequestRefundResult {
  eventoId: string;
  inscritoId: string;
  /**
   * Onde a solicitação parou. `estornado` = dinheiro devolvido;
   * `em_analise` = fora da janela, aguarda decisão do organizador;
   * `aprovado_auto`/`aprovado` com `aguardandoConfirmacao` = enviado ao
   * gateway, aguardando a confirmação dele (RN-372).
   */
  estado: EstadoReembolso;
  /** true = a chamada não produziu efeito novo (replay idempotente). */
  replay: boolean;
  refundId?: string;
  valorEstornado?: number;
  /** RN-372: o gateway aceitou e ainda não concluiu — não é erro. */
  aguardandoConfirmacao?: boolean;
}

/**
 * Abre o reembolso de UM inscrito pela máquina com POLÍTICA (callable
 * `requestRefund` — só organizador/owner do tenant do pedido).
 *
 * É por aqui que o painel estorna (RN-375): dentro da política a rota é
 * automática e o estorno sai na hora; fora dela a solicitação entra na fila
 * de análise; na véspera (RN-339) a abertura é recusada. O VALOR é decisão do
 * servidor (RN-337/373) — nunca enviado daqui. O erro sobe INTACTO (§2.12).
 */
export async function requestRefund(
  input: RequestRefundInput
): Promise<RequestRefundResult> {
  const fn = httpsCallable<RequestRefundInput, RequestRefundResult>(
    getLeelaFunctions(),
    'requestRefund'
  );
  const res = await fn(input);
  return res.data;
}

// ---------------------------------------------------------------------------
// Cancelar SEM estornar (callable — T4 · RN-377/378)
// ---------------------------------------------------------------------------

export interface CancelarInscricaoInput {
  pedidoId: string;
  inscritoId: string;
  /** Motivo (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

export interface CancelarInscricaoResult {
  eventoId: string;
  inscritoId: string;
  estado: 'cancelado';
  replay: boolean;
  trilha: TrilhaOperacao;
  statusAnterior: string;
}

/**
 * Tira o inscrito do evento SEM devolver dinheiro (callable
 * `cancelarInscricao` — RN-377). Cortesia, no-show e fraude entram por aqui;
 * quem quer devolver dinheiro usa `requestRefund`, que é outra porta.
 *
 * Admin da plataforma cancela qualquer coisa (decisão 45); organizador só
 * fora do corte de véspera (RN-339). O erro sobe INTACTO (§2.12).
 */
export async function cancelarInscricao(
  input: CancelarInscricaoInput
): Promise<CancelarInscricaoResult> {
  const fn = httpsCallable<CancelarInscricaoInput, CancelarInscricaoResult>(
    getLeelaFunctions(),
    'cancelarInscricao'
  );
  const res = await fn(input);
  return res.data;
}

// ---------------------------------------------------------------------------
// Decisão do organizador (callable — aprovar/recusar)
// ---------------------------------------------------------------------------

export interface DecideRefundInput {
  eventoId: string;
  inscritoId: string;
  /** 'aprovar' → executa o estorno; 'recusar' → terminal sem dinheiro. */
  decisao: 'aprovar' | 'recusar';
  /** Motivo da decisão (opcional; anexado à trilha se presente). */
  motivo?: string;
}

export interface DecideRefundResult {
  eventoId: string;
  inscritoId: string;
  estado: EstadoReembolso;
  /** true = replay idempotente (nenhum efeito novo). */
  replay: boolean;
  refundId?: string;
  valorEstornado?: number;
}

/**
 * Decide um reembolso em análise (callable `decideRefund` — só organizador/owner).
 * 'aprovar' dispara a execução do estorno (reusa FABLE-B); 'recusar' é terminal
 * sem dinheiro. O VALOR estornado é decisão do servidor (RN-337) — nunca enviado.
 * O erro (`failed-precondition` = transição inválida; `permission-denied`) sobe
 * INTACTO para a UI (§2.12).
 */
export async function decideRefund(input: DecideRefundInput): Promise<DecideRefundResult> {
  const fn = httpsCallable<DecideRefundInput, DecideRefundResult>(
    getLeelaFunctions(),
    'decideRefund'
  );
  const res = await fn(input);
  return res.data;
}
