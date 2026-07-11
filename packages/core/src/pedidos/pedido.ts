// =============================================================================
// packages/core/src/pedidos/pedido.ts
//
// Entidade Pedido — pedido em grupo (ADR-011 · LEELA-FABLE-A-T1).
// Coleção ROOT: `pedidos/{pedidoId}` — placement do próprio ADR-011 e do
// modelo canônico (§pedidos, top-level), com `tenantId` + `eventoId`
// DENORMALIZADOS: a guarda de tenant nas Rules lê `resource.data.tenantId`
// sem get() no pai (mesmo padrão de `pagamentos`), e o webhook de gateway
// localiza o pedido por id em O(1) sem conhecer o evento.
//
// ADR-011: um responsável/pagador + N inscritos; pagamento ÚNICO do pedido
// (um createCharge, um webhook); reembolso/cancelamento/titularidade operam
// POR INSCRITO (RN-337/341/345), nunca sobre o pedido inteiro.
// Auto-inscrição = pedido de 1 inscrito (caso particular, não outro modelo).
//
// Estado financeiro (status/valorTotal/pagamentoRef/…) tem escrita EXCLUSIVA
// de Cloud Function — cliente NUNCA escreve (Rules: write false em `pedidos`;
// espelha o padrão CAMPOS_FUNCTION_* de inscrito.ts).
//
// Convenção monetária: valores em REAIS (number, 2 casas) — consistente com
// finance/calc.ts e os agregados (`receitaConfirmada`). A conversão para
// centavos acontece SÓ na borda do gateway (PaymentProvider — ADR-006).
// =============================================================================

import type { Timestamp } from '../index';
import { isFormaPagamento, type FormaPagamento } from './pagamento';
import { parseMoney, parseTimestamp } from './validacao';

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/**
 * Ciclo de vida FINANCEIRO do pedido (espelho PT do ChargeStatus do gateway:
 * pending/confirmed/failed/cancelled). NÃO existe 'estornado' aqui de
 * propósito — estorno opera por inscrito (ADR-011/RN-341), não no pedido.
 */
export type StatusPedido = 'pendente' | 'pago' | 'falhou' | 'cancelado';

/** Lista canônica de status de pedido — única fonte para validação/UI */
export const STATUS_PEDIDO: readonly StatusPedido[] = [
  'pendente',
  'pago',
  'falhou',
  'cancelado',
];

/** Type guard de StatusPedido */
export function isStatusPedido(value: unknown): value is StatusPedido {
  return (
    typeof value === 'string' && (STATUS_PEDIDO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Responsável/pagador do pedido (ADR-011).
 * `nome`/`email` são 🔁 desnormalizados do atleta — a Function de e-mail do
 * pedido ("e-mail ao responsável listando todos os inscritos") não faz join.
 */
export interface ResponsavelPedido {
  /** Referência ao atleta pagador (→ atletas/{atletaId}) */
  atletaId: string;
  /** 🔁 Desnormalizado — mantido por Function */
  nome: string;
  /** 🔁 Desnormalizado — destino do e-mail do pedido */
  email: string;
}

/**
 * Pedido — a compra: um responsável e N inscritos (ADR-011).
 * Coleção: `pedidos/{pedidoId}` (root, tenant-scoped por campo).
 */
export interface Pedido {
  id: string;
  /** Carimbo de isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** 🔁 Denormalizado — o pedido pertence a UM evento (→ eventos/{eventoId}) */
  eventoId: string;
  /** Responsável/pagador do pedido (ADR-011) */
  responsavel: ResponsavelPedido;
  /**
   * Ids dos inscritos do pedido em `eventos/{eventoId}/inscritos/{id}`
   * (ADR-011 — sempre ≥ 1; auto-inscrição = exatamente 1).
   */
  inscritoRefs: string[];
  /**
   * Id do doc em `pagamentos/{id}` — null até a Function de checkout criar
   * a cobrança (dependência futura = opcional honesto, nunca valor fake).
   */
  pagamentoRef: string | null;
  /** Valor total do pedido em R$ (2 casas) — pagamento único (ADR-011) */
  valorTotal: number;
  status: StatusPedido;
  /** 🔁 Espelho de `pagamentos.forma` p/ listagem sem join — só pós-cobrança */
  formaPagamento?: FormaPagamento;
  /** 🔁 Espelho de `pagamentos.cartao.parcelas` (1 = à vista) — só pós-cobrança */
  parcelas?: number;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos do pedido com escrita EXCLUSIVA de Cloud Function (estado
 * financeiro — ADR-011). Nesta fase as Rules negam TODA escrita de cliente
 * em `pedidos`; quando o checkout (E12/E04) abrir alguma escrita, estes
 * campos permanecem intocáveis (espelhar nas Rules como em inscritos).
 */
export const CAMPOS_FUNCTION_PEDIDO = [
  'status',
  'valorTotal',
  'pagamentoRef',
  'formaPagamento',
  'parcelas',
] as const;

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/** Pedido de grupo? (N > 1; auto-inscrição é pedido de 1 — ADR-011) @pure */
export function pedidoDeGrupo(pedido: Pick<Pedido, 'inscritoRefs'>): boolean {
  return pedido.inscritoRefs.length > 1;
}

/** Pedido com pagamento confirmado? @pure */
export function pedidoPago(pedido: Pick<Pedido, 'status'>): boolean {
  return pedido.status === 'pago';
}

/** Inscrito pertence ao pedido? (fonte: inscritoRefs — ADR-011) @pure */
export function pedidoContemInscrito(
  pedido: Pick<Pedido, 'inscritoRefs'>,
  inscritoId: string
): boolean {
  return pedido.inscritoRefs.includes(inscritoId);
}

/**
 * Parsing defensivo de um doc Firestore em `Pedido` (fail-fast).
 * Dinheiro errado é pior que dinheiro ausente — doc fora do contrato lança.
 * @pure
 */
export function parsePedido(id: string, data: Record<string, unknown>): Pedido {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const responsavel = data['responsavel'];
  const inscritoRefs = data['inscritoRefs'];
  const pagamentoRef = data['pagamentoRef'];
  const valorTotal = data['valorTotal'];
  const status = data['status'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Pedido ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`Pedido ${id}: campo "eventoId" inválido (ADR-011)`);
  }
  if (responsavel === null || typeof responsavel !== 'object') {
    throw new Error(`Pedido ${id}: campo "responsavel" inválido (ADR-011)`);
  }
  const resp = responsavel as Record<string, unknown>;
  if (typeof resp['atletaId'] !== 'string' || resp['atletaId'].length === 0) {
    throw new Error(`Pedido ${id}: "responsavel.atletaId" inválido (ADR-011)`);
  }
  if (typeof resp['nome'] !== 'string' || resp['nome'].length === 0) {
    throw new Error(`Pedido ${id}: "responsavel.nome" inválido (ADR-011)`);
  }
  if (typeof resp['email'] !== 'string' || resp['email'].length === 0) {
    throw new Error(`Pedido ${id}: "responsavel.email" inválido (ADR-011)`);
  }
  if (
    !Array.isArray(inscritoRefs) ||
    inscritoRefs.length === 0 ||
    !inscritoRefs.every((r) => typeof r === 'string' && r.length > 0)
  ) {
    throw new Error(
      `Pedido ${id}: "inscritoRefs" deve ter ≥ 1 id de inscrito (ADR-011)`
    );
  }
  // r1 fix 5: id duplicado em inscritoRefs corrompe a contagem do pedido e
  // o split por inscrito (reembolso/afiliação operam POR INSCRITO — ADR-011).
  if (new Set(inscritoRefs).size !== inscritoRefs.length) {
    throw new Error(
      `Pedido ${id}: "inscritoRefs" contém ids duplicados — cada inscrito ` +
        `aparece exatamente 1 vez no pedido (ADR-011)`
    );
  }
  if (pagamentoRef !== null && pagamentoRef !== undefined && typeof pagamentoRef !== 'string') {
    throw new Error(`Pedido ${id}: "pagamentoRef" inválido (string|null — ADR-011)`);
  }
  if (!isStatusPedido(status)) {
    throw new Error(`Pedido ${id}: status "${String(status)}" fora do enum`);
  }

  const ctx = `Pedido ${id}`;
  const pedido: Pedido = {
    id,
    tenantId,
    eventoId,
    responsavel: {
      atletaId: resp['atletaId'],
      nome: resp['nome'],
      email: resp['email'],
    },
    inscritoRefs: inscritoRefs as string[],
    pagamentoRef: typeof pagamentoRef === 'string' ? pagamentoRef : null,
    valorTotal: parseMoney(ctx, 'valorTotal', valorTotal),
    status,
    // r1 fix 4: criadoEm é campo MÍNIMO do ADR-011 e chave do orderBy da
    // listagem — blind-cast aceitava undefined e o doc sumia em silêncio.
    criadoEm: parseTimestamp(ctx, 'criadoEm', data['criadoEm']),
    atualizadoEm: parseTimestamp(ctx, 'atualizadoEm', data['atualizadoEm']),
  };

  // Coerência de estado (r1 fix 6): pedido 'pago' sem cobrança criada é
  // impossível — a Function do webhook escreve status e pagamentoRef no
  // MESMO batch. Checado no parse porque é dinheiro (fail-fast).
  if (pedido.status === 'pago' && pedido.pagamentoRef === null) {
    throw new Error(
      `Pedido ${id}: status "pago" com pagamentoRef null — estado financeiro ` +
        `incoerente (confirmação escreve status + pagamentoRef no mesmo batch)`
    );
  }

  if (data['formaPagamento'] !== undefined) {
    if (!isFormaPagamento(data['formaPagamento'])) {
      throw new Error(
        `Pedido ${id}: formaPagamento "${String(data['formaPagamento'])}" fora do enum`
      );
    }
    pedido.formaPagamento = data['formaPagamento'];
  }
  if (data['parcelas'] !== undefined) {
    const parcelas = data['parcelas'];
    if (typeof parcelas !== 'number' || !Number.isInteger(parcelas) || parcelas < 1) {
      throw new Error(`Pedido ${id}: "parcelas" deve ser inteiro ≥ 1`);
    }
    pedido.parcelas = parcelas;
  }

  return pedido;
}
