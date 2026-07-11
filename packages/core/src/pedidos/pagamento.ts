// =============================================================================
// packages/core/src/pedidos/pagamento.ts
//
// Entidades Pagamento + Conciliacao — transação do pedido (ADR-011 · ADR-006
// · LEELA-FABLE-A-T1). Coleção: `pagamentos/{pagamentoId}` (root,
// tenant-scoped por campo — Rules já existentes: leitura pelo tenant,
// escrita de cliente NEGADA; TODO doc é escrito só por Function/webhook).
//
// Relação 1:1 com o pedido (pagamento ÚNICO — ADR-011): `pedidoRef` aqui e
// `pagamentoRef` lá. Conciliacao é EMBUTIDA no doc de pagamento (não é
// coleção): quem a escreve é o MESMO webhook que confirma o pagamento —
// um único write atômico de doc, nenhuma consistência cross-doc a manter.
//
// Campos servem o slide-in `[pag]` de LEELA-S203 §"Campos do slide-in":
// valor + lote, cupom/desconto, data do pagamento, valor final, forma
// (bandeira, 4 últimos, parcelamento), conciliação (id transação, gateway,
// taxa, repasse ao organizador, previsão de repasse).
//
// Gateway decidido = Asaas (D2, 2026-07-10) — enum canônico com 1 valor;
// a integração real fica em functions/src/payments (fora desta task).
// Parcelamento: juros 3,49% a.m. tabela Price REPASSADOS AO COMPRADOR
// (decisão 2026-07-05) — por isso `cartao.valorTotalComJuros` ≥ `valorFinal`
// ("à vista p/ organizador · parcelado p/ atleta").
// Taxa de serviço: percentual pura OU percentual + fixo por tenant (decisão
// 2026-07-05) — `taxaPct`/`taxaFixa` opcionais + `taxaValor` total em R$.
//
// Convenção monetária: REAIS (2 casas) — ver nota em pedido.ts.
// =============================================================================

import type { Timestamp } from '../index';
import { roundMoney } from '../finance/calc';
import {
  parseMoney,
  parseTimestamp,
  TOLERANCIA_CENTAVO,
  TOLERANCIA_MEIO_CENTAVO,
} from './validacao';

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/**
 * Forma de pagamento do checkout. SEM boleto (decisão 2026-07-05) — o
 * PaymentMethod do PaymentProvider (ADR-006) inclui 'boleto' por ser contrato
 * de gateway; o DOMÍNIO oferta só cartão e PIX. O adapter mapeia
 * cartao_credito→credit_card / pix→pix na borda.
 */
export type FormaPagamento = 'cartao_credito' | 'pix';

/** Lista canônica de formas de pagamento — única fonte para validação/UI */
export const FORMAS_PAGAMENTO: readonly FormaPagamento[] = [
  'cartao_credito',
  'pix',
];

/** Type guard de FormaPagamento */
export function isFormaPagamento(value: unknown): value is FormaPagamento {
  return (
    typeof value === 'string' &&
    (FORMAS_PAGAMENTO as readonly string[]).includes(value)
  );
}

/**
 * Ciclo de vida do pagamento — espelho PT do ChargeStatus do gateway
 * (pending/confirmed/failed/refunded/cancelled — ADR-006). O estorno
 * PARCIAL (por inscrito — RN-341) vive na máquina de `reembolsos` (S904),
 * não aqui: 'estornado' é o pagamento estornado por inteiro.
 */
export type StatusPagamento =
  | 'pendente'
  | 'confirmado'
  | 'falhou'
  | 'estornado'
  | 'cancelado';

/** Lista canônica de status de pagamento */
export const STATUS_PAGAMENTO: readonly StatusPagamento[] = [
  'pendente',
  'confirmado',
  'falhou',
  'estornado',
  'cancelado',
];

/** Type guard de StatusPagamento */
export function isStatusPagamento(value: unknown): value is StatusPagamento {
  return (
    typeof value === 'string' &&
    (STATUS_PAGAMENTO as readonly string[]).includes(value)
  );
}

/** Gateway de pagamento — Asaas decidido (D2, 2026-07-10) */
export type GatewayPagamento = 'asaas';

/** Lista canônica de gateways */
export const GATEWAYS_PAGAMENTO: readonly GatewayPagamento[] = ['asaas'];

/** Type guard de GatewayPagamento */
export function isGatewayPagamento(value: unknown): value is GatewayPagamento {
  return (
    typeof value === 'string' &&
    (GATEWAYS_PAGAMENTO as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Value objects
// ---------------------------------------------------------------------------

/** Cupom aplicado no checkout (slide-in: "código + % + Aplicado") */
export interface CupomAplicado {
  codigo: string;
  /** Percentual do cupom (0–100) — o valor em R$ fica em `desconto` */
  descontoPct?: number;
}

/**
 * Detalhe do cartão (slide-in: "Visa •••• 4821 · 12× de R$ 14,18").
 * Presente APENAS quando `forma === 'cartao_credito'`.
 */
export interface CartaoPagamento {
  /** Bandeira ("Visa", "Mastercard"…) */
  bandeira: string;
  /** 4 últimos dígitos (nunca o PAN — só o que o gateway expõe) */
  ultimos4: string;
  /** Número de parcelas (1 = à vista) */
  parcelas: number;
  /** Valor de cada parcela em R$ (juros Price repassados ao comprador) */
  valorParcela: number;
  /** Total pago pelo comprador em R$ (com juros) — ≥ valorFinal do pagamento */
  valorTotalComJuros: number;
}

/**
 * Conciliação da transação (slide-in §Conciliação) — escrita pelo MESMO
 * webhook que confirma o pagamento (write atômico de doc único).
 */
export interface Conciliacao {
  /** ID da transação no gateway (mono no slide-in) */
  idTransacao: string;
  gateway: GatewayPagamento;
  /** Adquirente informado pelo gateway, quando distinto */
  adquirente?: string;
  /** Componente percentual da taxa de serviço (0–100) — modelo por tenant */
  taxaPct?: number;
  /** Componente fixo da taxa em R$ (modelo "percentual + fixo" por tenant) */
  taxaFixa?: number;
  /** Taxa de serviço TOTAL em R$ (o "– R$" do slide-in) */
  taxaValor: number;
  /** Repasse ao organizador em R$ */
  repasseOrganizador: number;
  /** Previsão de repasse ("N dias após o evento") */
  repassePrevistoEm?: Timestamp;
}

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Pagamento — transação única do pedido (ADR-011/ADR-006).
 * Coleção: `pagamentos/{pagamentoId}` (root, tenant-scoped por campo).
 * Escrita EXCLUSIVA de Function — Rules negam TODO write de cliente.
 */
export interface Pagamento {
  id: string;
  /** Carimbo de isolamento multi-tenant (ADR-009) */
  tenantId: string;
  /** 🔁 Denormalizado — evento da venda (→ eventos/{eventoId}) */
  eventoId: string;
  /** Backlink 1:1 ao pedido (→ pedidos/{pedidoId}) */
  pedidoRef: string;
  status: StatusPagamento;
  forma: FormaPagamento;
  /** Valor da inscrição no lote em R$, ANTES de cupom (slide-in: "R$ + Lote") */
  valorBase: number;
  /** Lote da venda (→ eventos/{id}/lotes — E04); ausente até E04 existir */
  loteId?: string;
  /** 🔁 Rótulo do lote ("Lote 2 — Regular") p/ o slide-in sem join a E04 */
  loteNome?: string;
  cupom?: CupomAplicado;
  /** Desconto aplicado em R$ (0 quando sem cupom) */
  desconto: number;
  /** Valor final em R$ (base − desconto) — o que o organizador enxerga */
  valorFinal: number;
  /** Só quando forma === 'cartao_credito' */
  cartao?: CartaoPagamento;
  /** Data/hora da confirmação — ausente até o webhook confirmar */
  pagoEm?: Timestamp;
  /** Presente após a confirmação/liquidação no gateway */
  conciliacao?: Conciliacao;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/** Pagamento confirmado pelo gateway? @pure */
export function pagamentoConfirmado(
  pagamento: Pick<Pagamento, 'status'>
): boolean {
  return pagamento.status === 'confirmado';
}

/** Já existe conciliação da transação? @pure */
export function pagamentoConciliado(
  pagamento: Pick<Pagamento, 'conciliacao'>
): boolean {
  return pagamento.conciliacao !== undefined;
}

/**
 * Valor que o COMPRADOR paga: com juros no cartão parcelado, `valorFinal`
 * no PIX/à vista ("à vista p/ organizador · parcelado p/ atleta"). @pure
 */
export function valorPagoPeloComprador(
  pagamento: Pick<Pagamento, 'valorFinal' | 'cartao'>
): number {
  return pagamento.cartao?.valorTotalComJuros ?? pagamento.valorFinal;
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast)
// ---------------------------------------------------------------------------

/**
 * Parsing do bloco de conciliação (fail-fast). Quando `valorFinal` é
 * fornecido (caminho do parsePagamento), valida a invariante monetária
 * `repasseOrganizador ≈ valorFinal − taxaValor` (tolerância de 1 centavo —
 * arredondamento do gateway). @pure
 */
export function parseConciliacao(
  id: string,
  raw: unknown,
  valorFinal?: number
): Conciliacao {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`Pagamento ${id}: "conciliacao" inválida`);
  }
  const data = raw as Record<string, unknown>;

  if (typeof data['idTransacao'] !== 'string' || data['idTransacao'].length === 0) {
    throw new Error(`Pagamento ${id}: "conciliacao.idTransacao" inválido`);
  }
  if (!isGatewayPagamento(data['gateway'])) {
    throw new Error(
      `Pagamento ${id}: gateway "${String(data['gateway'])}" fora do enum (D2 — Asaas)`
    );
  }

  const ctx = `Pagamento ${id}`;
  const conciliacao: Conciliacao = {
    idTransacao: data['idTransacao'],
    gateway: data['gateway'],
    taxaValor: parseMoney(ctx, 'conciliacao.taxaValor', data['taxaValor']),
    repasseOrganizador: parseMoney(
      ctx,
      'conciliacao.repasseOrganizador',
      data['repasseOrganizador']
    ),
  };

  // Invariante (r1 fix 2d): repasse ao organizador = valorFinal − taxa,
  // com 1 centavo de folga (arredondamento do gateway). Só verificável
  // quando o chamador fornece o valorFinal do pagamento.
  if (valorFinal !== undefined) {
    const repasseEsperado = roundMoney(valorFinal - conciliacao.taxaValor);
    if (
      Math.abs(conciliacao.repasseOrganizador - repasseEsperado) >
      TOLERANCIA_CENTAVO + 1e-9
    ) {
      throw new Error(
        `${ctx}: "conciliacao.repasseOrganizador" (${conciliacao.repasseOrganizador}) ` +
          `≉ valorFinal − taxaValor (${repasseEsperado}) — invariante monetária violada`
      );
    }
  }

  if (typeof data['adquirente'] === 'string' && data['adquirente'].length > 0) {
    conciliacao.adquirente = data['adquirente'];
  }
  if (data['taxaPct'] !== undefined) {
    const pct = data['taxaPct'];
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error(`Pagamento ${id}: "conciliacao.taxaPct" deve estar entre 0 e 100`);
    }
    conciliacao.taxaPct = pct;
  }
  if (data['taxaFixa'] !== undefined) {
    conciliacao.taxaFixa = parseMoney(ctx, 'conciliacao.taxaFixa', data['taxaFixa']);
  }
  if (data['repassePrevistoEm'] !== undefined) {
    conciliacao.repassePrevistoEm = parseTimestamp(
      ctx,
      'conciliacao.repassePrevistoEm',
      data['repassePrevistoEm']
    );
  }

  return conciliacao;
}

/**
 * Parsing defensivo de um doc Firestore em `Pagamento` (fail-fast).
 * Mostrar dinheiro errado é pior que omitir — doc fora do contrato lança.
 * @pure
 */
export function parsePagamento(
  id: string,
  data: Record<string, unknown>
): Pagamento {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const pedidoRef = data['pedidoRef'];
  const status = data['status'];
  const forma = data['forma'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`Pagamento ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`Pagamento ${id}: campo "eventoId" inválido`);
  }
  if (typeof pedidoRef !== 'string' || pedidoRef.length === 0) {
    throw new Error(`Pagamento ${id}: campo "pedidoRef" inválido (ADR-011)`);
  }
  if (!isStatusPagamento(status)) {
    throw new Error(`Pagamento ${id}: status "${String(status)}" fora do enum`);
  }
  if (!isFormaPagamento(forma)) {
    throw new Error(
      `Pagamento ${id}: forma "${String(forma)}" fora do enum (sem boleto — decisão 2026-07-05)`
    );
  }

  const ctx = `Pagamento ${id}`;
  const pagamento: Pagamento = {
    id,
    tenantId,
    eventoId,
    pedidoRef,
    status,
    forma,
    valorBase: parseMoney(ctx, 'valorBase', data['valorBase']),
    desconto: parseMoney(ctx, 'desconto', data['desconto']),
    valorFinal: parseMoney(ctx, 'valorFinal', data['valorFinal']),
    criadoEm: parseTimestamp(ctx, 'criadoEm', data['criadoEm']),
    atualizadoEm: parseTimestamp(ctx, 'atualizadoEm', data['atualizadoEm']),
  };

  // Invariante (r1 fix 2a): valorFinal = valorBase − desconto (cent-exato;
  // meia-centavo de folga só para ruído de ponto flutuante).
  const valorFinalEsperado = roundMoney(pagamento.valorBase - pagamento.desconto);
  if (Math.abs(pagamento.valorFinal - valorFinalEsperado) > TOLERANCIA_MEIO_CENTAVO) {
    throw new Error(
      `${ctx}: "valorFinal" (${pagamento.valorFinal}) ≠ valorBase − desconto ` +
        `(${valorFinalEsperado}) — invariante monetária violada`
    );
  }

  if (typeof data['loteId'] === 'string' && data['loteId'].length > 0) {
    pagamento.loteId = data['loteId'];
  }
  if (typeof data['loteNome'] === 'string' && data['loteNome'].length > 0) {
    pagamento.loteNome = data['loteNome'];
  }

  if (data['cupom'] !== undefined) {
    const cupomRaw = data['cupom'];
    if (cupomRaw === null || typeof cupomRaw !== 'object') {
      throw new Error(`Pagamento ${id}: "cupom" inválido`);
    }
    const cupomData = cupomRaw as Record<string, unknown>;
    if (typeof cupomData['codigo'] !== 'string' || cupomData['codigo'].length === 0) {
      throw new Error(`Pagamento ${id}: "cupom.codigo" inválido`);
    }
    const cupom: CupomAplicado = { codigo: cupomData['codigo'] };
    if (cupomData['descontoPct'] !== undefined) {
      const pct = cupomData['descontoPct'];
      if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error(`Pagamento ${id}: "cupom.descontoPct" deve estar entre 0 e 100`);
      }
      cupom.descontoPct = pct;
    }
    pagamento.cupom = cupom;
  }

  if (data['cartao'] !== undefined) {
    if (forma !== 'cartao_credito') {
      throw new Error(
        `Pagamento ${id}: "cartao" só existe quando forma é cartao_credito`
      );
    }
    const cartaoRaw = data['cartao'];
    if (cartaoRaw === null || typeof cartaoRaw !== 'object') {
      throw new Error(`Pagamento ${id}: "cartao" inválido`);
    }
    const c = cartaoRaw as Record<string, unknown>;
    if (typeof c['bandeira'] !== 'string' || c['bandeira'].length === 0) {
      throw new Error(`Pagamento ${id}: "cartao.bandeira" inválida`);
    }
    if (typeof c['ultimos4'] !== 'string' || !/^\d{4}$/.test(c['ultimos4'])) {
      throw new Error(`Pagamento ${id}: "cartao.ultimos4" deve ter 4 dígitos`);
    }
    const parcelas = c['parcelas'];
    if (typeof parcelas !== 'number' || !Number.isInteger(parcelas) || parcelas < 1) {
      throw new Error(`Pagamento ${id}: "cartao.parcelas" deve ser inteiro ≥ 1`);
    }
    pagamento.cartao = {
      bandeira: c['bandeira'],
      ultimos4: c['ultimos4'],
      parcelas,
      valorParcela: parseMoney(ctx, 'cartao.valorParcela', c['valorParcela']),
      valorTotalComJuros: parseMoney(
        ctx,
        'cartao.valorTotalComJuros',
        c['valorTotalComJuros']
      ),
    };

    // Invariante (r1 fix 2b): juros são REPASSADOS ao comprador — o total
    // com juros nunca fica ABAIXO do valorFinal (à vista p/ organizador).
    if (
      pagamento.cartao.valorTotalComJuros <
      pagamento.valorFinal - TOLERANCIA_MEIO_CENTAVO
    ) {
      throw new Error(
        `${ctx}: "cartao.valorTotalComJuros" (${pagamento.cartao.valorTotalComJuros}) ` +
          `< valorFinal (${pagamento.valorFinal}) — juros repassados nunca reduzem o total`
      );
    }

    // Invariante (r1 fix 2c): parcelas × valorParcela ≈ valorTotalComJuros.
    // Tolerância coerente com buildInstallmentOptions: valorParcela é
    // arredondado half-up a centavos → erro máximo de meio centavo POR
    // parcela (parcelas × 0,005).
    const desvioParcelamento = Math.abs(
      parcelas * pagamento.cartao.valorParcela - pagamento.cartao.valorTotalComJuros
    );
    if (desvioParcelamento > parcelas * TOLERANCIA_MEIO_CENTAVO + 1e-9) {
      throw new Error(
        `${ctx}: ${parcelas} × valorParcela (${pagamento.cartao.valorParcela}) ` +
          `≉ valorTotalComJuros (${pagamento.cartao.valorTotalComJuros}) — ` +
          `desvio ${desvioParcelamento.toFixed(4)} excede a tolerância de ` +
          `meio centavo por parcela`
      );
    }
  }

  if (data['pagoEm'] !== undefined) {
    pagamento.pagoEm = parseTimestamp(ctx, 'pagoEm', data['pagoEm']);
  }
  if (data['conciliacao'] !== undefined) {
    pagamento.conciliacao = parseConciliacao(
      id,
      data['conciliacao'],
      pagamento.valorFinal
    );
  }

  // Coerência de estado (r1 fix 6): pagamento 'pendente' NÃO pode carregar
  // carimbo de confirmação nem conciliação — só o webhook que confirma
  // escreve esses campos (mesmo write atômico). Checado no parse porque é
  // dinheiro: exibir "pendente" com conciliação induz decisão errada.
  if (
    pagamento.status === 'pendente' &&
    (pagamento.pagoEm !== undefined || pagamento.conciliacao !== undefined)
  ) {
    throw new Error(
      `${ctx}: status "pendente" com ${
        pagamento.pagoEm !== undefined ? 'pagoEm' : 'conciliacao'
      } presente — estado financeiro incoerente (só o webhook de confirmação escreve esses campos)`
    );
  }

  return pagamento;
}
