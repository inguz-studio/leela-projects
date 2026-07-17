// =============================================================================
// packages/core/src/assessoria/parceria-assessoria.ts
//
// Parceria de ASSESSORIA — vínculo organizador↔club parceiro (LEELA-E18 ·
// S1800/S1801/S1803 · RN-360..365).
//
// Subcoleção: `tenants/{tenantId}/parceirosAssessoria/{parceriaId}`
//   (o tenant é o ORGANIZADOR que cadastrou; o path já dá o isolamento
//    cross-tenant — mesmo padrão das coleções de repasse E09s).
//
// UNICIDADE POR CHAVE (RN-361): o docId da parceria É o documento normalizado
// (11 dígitos CPF / 14 CNPJ) — dedupe de assessoria dentro do tenant é
// estrutural, sem query de duplicidade (padrão cupom E04).
//
// A assessoria em si é um CLUBE (E05, RN-360) — `clubeRef` aponta para
// `clubes/{clubId}` com `ehAssessoriaParceira=true` + `documento` +
// `parceiroDeTenant`. A condição de desconto (RN-364) materializa-se como
// CUPOM escopado (`escopo='club_parceiro'`) criado pela Function
// `definirCondicaoDesconto` — NUNCA um segundo caminho de desconto (ADR-012).
//
// Status (RN-123 — MESMO enum da parceria de clube E05-S107):
//   convite_pendente → ativa → inativa (encerrada, RN-144: doc retido 90d).
//
// ESCRITA: EXCLUSIVA de Function (Rules write:false — PII de documento +
// e-mail; postura pós-19c8afe). LEITURA: tenant writer (owner/staff) apenas
// — promoter/athlete NÃO leem CPF/CNPJ de terceiros (LGPD, minimização).
// =============================================================================

import type { Timestamp } from '../index';
import type { TipoCupom } from '../eventos/cupom';
import {
  isTipoDocumento,
  type DocumentoAssessoria,
} from './documento';

// ---------------------------------------------------------------------------
// Constantes de caminho
// ---------------------------------------------------------------------------

/** Nome da subcoleção — `tenants/{tenantId}/parceirosAssessoria`. */
export const COLECAO_PARCEIROS_ASSESSORIA = 'parceirosAssessoria';

// ---------------------------------------------------------------------------
// Status (RN-123 — literal compartilhado com a parceria de clube)
// ---------------------------------------------------------------------------

/** Ciclo de vida do vínculo (RN-123): pendente → ativa → inativa. */
export type StatusParceriaAssessoria = 'convite_pendente' | 'ativa' | 'inativa';

export const STATUS_PARCERIA_ASSESSORIA: readonly StatusParceriaAssessoria[] = [
  'convite_pendente',
  'ativa',
  'inativa',
];

export function isStatusParceriaAssessoria(
  v: unknown
): v is StatusParceriaAssessoria {
  return STATUS_PARCERIA_ASSESSORIA.includes(v as StatusParceriaAssessoria);
}

/**
 * Transições válidas da máquina de estados do vínculo:
 *   convite_pendente → ativa   (aceite provisionado — RN-363)
 *   convite_pendente → inativa (organizador cancela antes do aceite)
 *   ativa            → inativa (encerrar parceria — RN-144)
 * `inativa` é TERMINAL (reativar = novo cadastro; o doc retido 90d é trilha).
 * @pure
 */
export function podeTransicionarParceria(
  de: StatusParceriaAssessoria,
  para: StatusParceriaAssessoria
): boolean {
  if (de === 'convite_pendente') return para === 'ativa' || para === 'inativa';
  if (de === 'ativa') return para === 'inativa';
  return false;
}

// ---------------------------------------------------------------------------
// Condição de desconto (RN-364) — referência ao cupom do kernel
// ---------------------------------------------------------------------------

/**
 * Condição de desconto do club parceiro — REFERÊNCIA ao cupom (kernel E04,
 * ADR-012), nunca uma máquina própria de desconto. Espelha tipo/valor para a
 * lista do painel sem join; a VERDADE de vigência/teto/usos vive no cupom.
 */
export interface CondicaoDesconto {
  /** Path do cupom: `eventos/{eventoId}/cupons/{CODIGO}` */
  cupomRef: string;
  /** Evento do cupom (denormalizado do path — lista sem parse) */
  eventoId: string;
  /** Código do cupom (== docId do cupom) */
  codigo: string;
  /** 🔁 Espelho do cupom (rótulo do painel) — verdade no doc do cupom */
  tipo: TipoCupom;
  /** 🔁 Espelho do cupom — % ou R$ */
  valor: number;
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Parceria de assessoria — `tenants/{tenantId}/parceirosAssessoria/{docId}`.
 * docId = documento normalizado (RN-361 — unicidade por chave).
 * Escrita EXCLUSIVA de Function.
 */
export interface ParceriaAssessoria {
  /** docId = documento normalizado (11 CPF / 14 CNPJ) */
  id: string;
  /** Tenant ORGANIZADOR (== segmento do path — redundância verificada) */
  tenantId: string;
  /** Nome da assessoria (exibição na lista S1803) */
  nome: string;
  documento: DocumentoAssessoria;
  /** docId do clube parceiro (`clubes/{clubId}`) — RN-360 */
  clubeRef: string;
  /** E-mail do responsável, lowercase (chave do convite — RN-106/362) */
  responsavelEmail: string;
  /** UID do responsável — presente após vínculo/aceite (RN-362/363) */
  responsavelUid?: string;
  status: StatusParceriaAssessoria;
  /** Condição de desconto vigente (RN-364) — ausente até S1802 definir */
  condicaoDesconto?: CondicaoDesconto;
  criadoEm: Timestamp;
  /** UID de quem cadastrou (organizador) */
  criadoPor: string;
  atualizadoEm: Timestamp;
  /** Carimbo do aceite (RN-363) — presente quando ativou via convite */
  aceitoEm?: Timestamp;
  /** Carimbo do encerramento (RN-144) — presente quando inativa */
  encerradaEm?: Timestamp;
  /** UID de quem encerrou */
  encerradaPor?: string;
}

// ---------------------------------------------------------------------------
// Parse fail-fast (borda de I/O do Firestore)
// ---------------------------------------------------------------------------

/** Parsing defensivo de um doc Firestore em `ParceriaAssessoria`. @pure */
export function parseParceriaAssessoria(
  id: string,
  data: Record<string, unknown>
): ParceriaAssessoria {
  const ctx = `ParceriaAssessoria ${id}`;

  const tenantId = data['tenantId'];
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`${ctx}: "tenantId" inválido (ADR-009)`);
  }
  const nome = data['nome'];
  if (typeof nome !== 'string' || nome.trim().length === 0) {
    throw new Error(`${ctx}: "nome" inválido`);
  }

  const docBruto = data['documento'];
  if (docBruto === null || typeof docBruto !== 'object' || Array.isArray(docBruto)) {
    throw new Error(`${ctx}: "documento" deve ser map {tipo, valor} (RN-361)`);
  }
  const doc = docBruto as Record<string, unknown>;
  if (!isTipoDocumento(doc['tipo'])) {
    throw new Error(`${ctx}: documento.tipo fora do enum cpf|cnpj (RN-361)`);
  }
  const valorDoc = doc['valor'];
  if (typeof valorDoc !== 'string' || !/^\d{11}$|^\d{14}$/.test(valorDoc)) {
    throw new Error(`${ctx}: documento.valor fora da forma canônica (RN-361)`);
  }
  // Unicidade por chave: o documento É o docId — divergência quebra o dedupe.
  if (valorDoc !== id) {
    throw new Error(`${ctx}: documento.valor (${valorDoc}) deve ser igual ao docId`);
  }

  const clubeRef = data['clubeRef'];
  if (typeof clubeRef !== 'string' || clubeRef.length === 0) {
    throw new Error(`${ctx}: "clubeRef" inválido (RN-360)`);
  }
  const responsavelEmail = data['responsavelEmail'];
  if (
    typeof responsavelEmail !== 'string' ||
    responsavelEmail.length === 0 ||
    responsavelEmail !== responsavelEmail.toLowerCase()
  ) {
    throw new Error(`${ctx}: "responsavelEmail" deve ser lowercase não-vazio`);
  }
  const status = data['status'];
  if (!isStatusParceriaAssessoria(status)) {
    throw new Error(`${ctx}: status "${String(status)}" fora do enum (RN-123)`);
  }

  const parceria: ParceriaAssessoria = {
    id,
    tenantId,
    nome,
    documento: { tipo: doc['tipo'], valor: valorDoc },
    clubeRef,
    responsavelEmail,
    status,
    criadoEm: data['criadoEm'] as Timestamp,
    criadoPor: String(data['criadoPor'] ?? ''),
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };

  const responsavelUid = data['responsavelUid'];
  if (typeof responsavelUid === 'string' && responsavelUid.length > 0) {
    parceria.responsavelUid = responsavelUid;
  }

  const condBruta = data['condicaoDesconto'];
  if (condBruta !== undefined && condBruta !== null) {
    if (typeof condBruta !== 'object' || Array.isArray(condBruta)) {
      throw new Error(`${ctx}: "condicaoDesconto" deve ser map (RN-364)`);
    }
    const cond = condBruta as Record<string, unknown>;
    if (
      typeof cond['cupomRef'] !== 'string' ||
      typeof cond['eventoId'] !== 'string' ||
      typeof cond['codigo'] !== 'string' ||
      (cond['tipo'] !== 'percentual' && cond['tipo'] !== 'fixo') ||
      typeof cond['valor'] !== 'number' ||
      !(cond['valor'] > 0)
    ) {
      throw new Error(`${ctx}: condicaoDesconto incompleta/inválida (RN-364)`);
    }
    parceria.condicaoDesconto = {
      cupomRef: cond['cupomRef'],
      eventoId: cond['eventoId'],
      codigo: cond['codigo'],
      tipo: cond['tipo'],
      valor: cond['valor'],
    };
  }

  if (data['aceitoEm'] !== undefined && data['aceitoEm'] !== null) {
    parceria.aceitoEm = data['aceitoEm'] as Timestamp;
  }
  if (data['encerradaEm'] !== undefined && data['encerradaEm'] !== null) {
    parceria.encerradaEm = data['encerradaEm'] as Timestamp;
  }
  if (typeof data['encerradaPor'] === 'string' && data['encerradaPor'].length > 0) {
    parceria.encerradaPor = data['encerradaPor'];
  }

  return parceria;
}
