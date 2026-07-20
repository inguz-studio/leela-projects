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
// TAXAFLEX (RN-179): enums do carimbo — runtime-safe (taxaPlataforma só
// importa TIPO de pagamento.ts; sem ciclo de runtime).
import {
  isMeioTaxa,
  isOrigemTaxaMeio,
  type MeioTaxa,
  type OrigemTaxaMeio,
} from '../finance/taxaPlataforma';
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
 * Validade da cobrança PIX em segundos (CK2-T5 · RN-157 · DEC-0719 D-6):
 * 30 minutos — validade da CHARGE (dinheiro/lifecycle), não só relógio de
 * UI. Fonte ÚNICA: a Function do checkout carimba `pixExpiraEm` com ela e o
 * provider recebe o mesmo valor (`CreateChargeParams.pixExpiraEmSegundos`).
 */
export const PIX_EXPIRACAO_SEGUNDOS = 30 * 60;

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

/**
 * Matriz CANÔNICA de transição de status do pagamento (re-review A9).
 * `pendente` é o único estado inicial mutável; `confirmado` só avança para
 * `estornado` (estorno INTEGRAL — o parcial por inscrito vive na máquina de
 * `reembolsos`, S904); `falhou`/`cancelado`/`estornado` são TERMINAIS.
 * O webhook (functions/checkout) é o único escritor e DEVE consultar esta
 * matriz — estado final nunca retrocede nem re-aplica efeito.
 */
export const TRANSICOES_STATUS_PAGAMENTO: Readonly<
  Record<StatusPagamento, readonly StatusPagamento[]>
> = {
  pendente: ['confirmado', 'falhou', 'cancelado'],
  confirmado: ['estornado'],
  falhou: [],
  estornado: [],
  cancelado: [],
};

/** Transição de status do pagamento permitida? (`confirmado ↛ pendente`) @pure */
export function podeTransicionarStatusPagamento(
  de: StatusPagamento,
  para: StatusPagamento
): boolean {
  return TRANSICOES_STATUS_PAGAMENTO[de].includes(para);
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
  /**
   * Atribuição ao CLUB PARCEIRO (RN-364 · E18) — presente quando o cupom
   * era `escopo='club_parceiro'`: o desconto fica atribuído ao clube no
   * doc de pagamento (sem split — RN-360).
   */
  clubeRef?: string;
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
 * TAXAFLEX (RN-179) — a linha de taxa RESOLVIDA (override > global > legado)
 * e CONGELADA no ATO DA COMPRA, na MESMA tx que cria pedido/pagamento.
 * Mudar a tabela depois NUNCA reprecifica este doc; o replay lê daqui e não
 * recomputa. A `conciliacao` (escrita na confirmação) COPIA estes valores —
 * nunca re-resolve a tabela. Mesmo padrão de congelamento do COMF2
 * (`comissaoConfig` no doc da conversão). Ausente = doc pré-TAXAFLEX
 * (leitura Postel; conciliação segue o comportamento vigente).
 */
export interface TaxaCongelada {
  /** Meio da tabela usado na resolução ('pix' | 'cartao'; boleto inerte). */
  meio: MeioTaxa;
  /** Percentual congelado (0–100). */
  percentual: number;
  /** Componente fixo congelado em CENTAVOS inteiros (≥ 0). */
  fixoCentavos: number;
  /** Taxa TOTAL da venda em R$ (round(face × pct) + fixo — RN-183). */
  valor: number;
  /** De onde a linha veio (rastro da resolução — union fechada). */
  origem: OrigemTaxaMeio;
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
  /**
   * Valor final em R$ (base − desconto) — o que o organizador enxerga.
   * EQUAÇÃO CANÔNICA (re-review A1): `valorFinal === pedido.valorTotal ===
   * Σ pedido.itens[].valorFinal` — provada no par de docs por
   * `pedidoCoerenteComPagamento` (pedido.ts). Juros de parcelamento NÃO
   * entram aqui (vivem em `cartao.valorTotalComJuros` — comprador).
   */
  valorFinal: number;
  /**
   * Taxa de serviço REPASSADA ao comprador em R$ (RN-347 — evento em modo
   * 'repassada'). AUSENTE em 'incorporada' (docs vigentes intocados). O
   * comprador paga `valorFinal + taxaRepassada` (+ juros no cartão parcelado);
   * o organizador segue enxergando `valorFinal` — a equação canônica A1
   * (`valorFinal === pedido.valorTotal === Σ itens.valorFinal`) NÃO muda.
   * É sempre o VALOR em R$, nunca o `platformFeePct` do termo (fix 703db9c).
   */
  taxaRepassada?: number;
  /**
   * TAXAFLEX (RN-179): linha de taxa congelada no ato da compra — ver
   * {@link TaxaCongelada}. Presente em TODO doc novo (inclusive caminho
   * legado pct-único, origem 'legado'); ausente = doc pré-TAXAFLEX.
   */
  taxaCongelada?: TaxaCongelada;
  /** Só quando forma === 'cartao_credito' */
  cartao?: CartaoPagamento;
  /**
   * Expiração da cobrança PIX (CK2-T5 · RN-157 · DEC-0719 D-6): 30 minutos
   * a partir da CRIAÇÃO do pedido (PIX_EXPIRACAO_SEGUNDOS), carimbada pela
   * Function do checkout com o relógio injetado. SÓ forma 'pix' (coerência
   * no parse); ausente = doc pré-RN157 (sem timer — leitura Postel). A UI
   * mostra o timer; expirar sem pagar ⇒ `expirarPixPendente` transiciona
   * pendente → cancelado (motivo pix_expirado) e o retry é NOVA cotação.
   */
  pixExpiraEm?: Timestamp;
  /** Data/hora da confirmação — ausente até o webhook confirmar */
  pagoEm?: Timestamp;
  /** Presente após a confirmação/liquidação no gateway */
  conciliacao?: Conciliacao;
  /**
   * Id do ÚLTIMO evento de webhook do gateway que APLICOU efeito neste
   * pagamento (re-review A9 — idempotência). Espelha o ledger
   * `pagamentos/{id}/webhookEventos/{eventId}`; ausente até o primeiro
   * evento com efeito. O webhook (functions/checkout) escreve na MESMA
   * transação do efeito.
   */
  webhookEventoId?: string;
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
 * Valor que o COMPRADOR paga: com juros no cartão parcelado (o bloco
 * `cartao.valorTotalComJuros` já parte do total com a taxa repassada quando
 * RN-347 'repassada'); no PIX/à vista é `valorFinal + taxaRepassada` (a taxa
 * repassada soma ao que o comprador desembolsa; 0/ausente em 'incorporada' —
 * comportamento vigente). @pure
 */
export function valorPagoPeloComprador(
  pagamento: Pick<Pagamento, 'valorFinal' | 'cartao' | 'taxaRepassada'>
): number {
  return (
    pagamento.cartao?.valorTotalComJuros ??
    roundMoney(pagamento.valorFinal + (pagamento.taxaRepassada ?? 0))
  );
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast)
// ---------------------------------------------------------------------------

/**
 * Parsing do bloco de conciliação (fail-fast). Quando `valorFinal` é
 * fornecido (caminho do parsePagamento), valida a invariante monetária
 * MODE-AWARE (TAXAFLEX/RN-182):
 *   `repasseOrganizador ≈ valorFinal − taxaValor + taxaRepassada`
 * — em 'incorporada' (taxaRepassada 0/ausente) é o `valorFinal − taxaValor`
 * vigente; em 'repassada' (taxaRepassada == taxaValor) o repasse é o FACE
 * (a taxa foi paga por fora pelo comprador e nunca entra no "a receber").
 * Tolerância de 1 centavo (arredondamento do gateway). @pure
 */
export function parseConciliacao(
  id: string,
  raw: unknown,
  valorFinal?: number,
  taxaRepassada: number = 0
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

  // Invariante (r1 fix 2d · mode-aware TAXAFLEX/RN-182): repasse ao
  // organizador = valorFinal − taxaValor + taxaRepassada, com 1 centavo de
  // folga (arredondamento do gateway). Em 'incorporada' taxaRepassada é 0
  // (fórmula vigente intocada); em 'repassada' taxaRepassada == taxaValor e
  // o repasse é o FACE. Só verificável quando o chamador fornece valorFinal.
  if (valorFinal !== undefined) {
    const repasseEsperado = roundMoney(
      valorFinal - conciliacao.taxaValor + taxaRepassada
    );
    if (
      Math.abs(conciliacao.repasseOrganizador - repasseEsperado) >
      TOLERANCIA_CENTAVO + 1e-9
    ) {
      throw new Error(
        `${ctx}: "conciliacao.repasseOrganizador" (${conciliacao.repasseOrganizador}) ` +
          `≉ valorFinal − taxaValor + taxaRepassada (${repasseEsperado}) — ` +
          `invariante monetária violada (RN-182)`
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
  // RN-347 — taxa de serviço repassada ao comprador (opcional; só existe em
  // evento modo 'repassada'). parseMoney nega negativo/sub-centavo.
  if (data['taxaRepassada'] !== undefined) {
    pagamento.taxaRepassada = parseMoney(ctx, 'taxaRepassada', data['taxaRepassada']);
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
    // Atribuição ao club parceiro (RN-364 · E18) — opcional; quando
    // presente, string não-vazia (docId do clube).
    if (cupomData['clubeRef'] !== undefined) {
      if (
        typeof cupomData['clubeRef'] !== 'string' ||
        cupomData['clubeRef'].length === 0
      ) {
        throw new Error(`Pagamento ${id}: "cupom.clubeRef" inválido`);
      }
      cupom.clubeRef = cupomData['clubeRef'];
    }
    if (cupomData['descontoPct'] !== undefined) {
      const pct = cupomData['descontoPct'];
      if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error(`Pagamento ${id}: "cupom.descontoPct" deve estar entre 0 e 100`);
      }
      cupom.descontoPct = pct;
    }
    pagamento.cupom = cupom;

    // Invariante cruzada do cupom percentual (re-review A6): o desconto em
    // R$ DEVE ser o percentual aplicado sobre a base (mesma aritmética de
    // descontoDoCupom/computeSaleState). Cupom fixo não carrega descontoPct
    // — sem cruzamento possível.
    if (cupom.descontoPct !== undefined) {
      const descontoEsperado = roundMoney(
        pagamento.valorBase * (cupom.descontoPct / 100)
      );
      if (Math.abs(pagamento.desconto - descontoEsperado) > TOLERANCIA_MEIO_CENTAVO) {
        throw new Error(
          `${ctx}: "desconto" (${pagamento.desconto}) ≠ valorBase × ` +
            `descontoPct/100 (${descontoEsperado}) — cupom percentual ` +
            `incoerente com o desconto aplicado`
        );
      }
    }
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

    // Invariante (r1 fix 2b, endurecida p/ RN-347): juros são REPASSADOS ao
    // comprador — o total com juros nunca fica ABAIXO do total à vista do
    // COMPRADOR (valorFinal + taxaRepassada; em 'incorporada' == valorFinal,
    // o mesmo piso de antes).
    const pisoComprador = roundMoney(
      pagamento.valorFinal + (pagamento.taxaRepassada ?? 0)
    );
    if (
      pagamento.cartao.valorTotalComJuros <
      pisoComprador - TOLERANCIA_MEIO_CENTAVO
    ) {
      throw new Error(
        `${ctx}: "cartao.valorTotalComJuros" (${pagamento.cartao.valorTotalComJuros}) ` +
          `< valorFinal + taxaRepassada (${pisoComprador}) — juros repassados ` +
          `nunca reduzem o total do comprador (RN-347)`
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

  // RN-157 (CK2-T5): expiração do PIX — presente EXIGE forma 'pix' (timer
  // em cobrança de cartão é estado incoerente; dinheiro = fail-fast).
  if (data['pixExpiraEm'] !== undefined) {
    if (pagamento.forma !== 'pix') {
      throw new Error(
        `${ctx}: "pixExpiraEm" presente com forma "${pagamento.forma}" — ` +
          `expiração é exclusiva de PIX (RN-157)`
      );
    }
    pagamento.pixExpiraEm = parseTimestamp(ctx, 'pixExpiraEm', data['pixExpiraEm']);
  }

  if (data['pagoEm'] !== undefined) {
    pagamento.pagoEm = parseTimestamp(ctx, 'pagoEm', data['pagoEm']);
  }
  if (data['conciliacao'] !== undefined) {
    pagamento.conciliacao = parseConciliacao(
      id,
      data['conciliacao'],
      pagamento.valorFinal,
      pagamento.taxaRepassada ?? 0
    );
  }
  // TAXAFLEX (RN-179): linha congelada no ato da compra — opcional (doc
  // pré-TAXAFLEX não tem). Quando presente, fail-fast em lixo (só Function
  // escreve; corrupção = bug, nunca mascarar em dinheiro).
  if (data['taxaCongelada'] !== undefined) {
    const tcRaw = data['taxaCongelada'];
    if (tcRaw === null || typeof tcRaw !== 'object') {
      throw new Error(`${ctx}: "taxaCongelada" inválida (RN-179)`);
    }
    const tc = tcRaw as Record<string, unknown>;
    const pct = tc['percentual'];
    const fixo = tc['fixoCentavos'];
    if (!isMeioTaxa(tc['meio'])) {
      throw new Error(`${ctx}: "taxaCongelada.meio" fora do enum (pix|cartao|boleto)`);
    }
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error(`${ctx}: "taxaCongelada.percentual" deve estar entre 0 e 100`);
    }
    if (!Number.isInteger(fixo) || (fixo as number) < 0) {
      throw new Error(`${ctx}: "taxaCongelada.fixoCentavos" deve ser inteiro ≥ 0`);
    }
    if (!isOrigemTaxaMeio(tc['origem'])) {
      throw new Error(
        `${ctx}: "taxaCongelada.origem" fora do enum (override|global|legado)`
      );
    }
    pagamento.taxaCongelada = {
      meio: tc['meio'],
      percentual: pct,
      fixoCentavos: fixo as number,
      valor: parseMoney(ctx, 'taxaCongelada.valor', tc['valor']),
      origem: tc['origem'],
    };
  }
  if (data['webhookEventoId'] !== undefined) {
    const eventoId = data['webhookEventoId'];
    if (typeof eventoId !== 'string' || eventoId.length === 0) {
      throw new Error(`${ctx}: "webhookEventoId" inválido (id do evento do gateway)`);
    }
    pagamento.webhookEventoId = eventoId;
  }

  // Matriz de coerência de estado COMPLETA (r1 fix 6 + re-review A3/A5) —
  // checada no parse porque é dinheiro: exibir estado incoerente induz
  // decisão financeira errada.
  //   pendente             ⇒ SEM pagoEm e SEM conciliacao
  //   confirmado|estornado ⇒ pagoEm PRESENTE (estornado já foi pago)
  //   falhou|cancelado     ⇒ SEM pagoEm e SEM conciliacao (nunca liquidou)
  //   confirmado + cartão  ⇒ bloco `cartao` PRESENTE (espelho do slide-in)
  if (
    (pagamento.status === 'pendente' ||
      pagamento.status === 'falhou' ||
      pagamento.status === 'cancelado') &&
    (pagamento.pagoEm !== undefined || pagamento.conciliacao !== undefined)
  ) {
    throw new Error(
      `${ctx}: status "${pagamento.status}" com ${
        pagamento.pagoEm !== undefined ? 'pagoEm' : 'conciliacao'
      } presente — estado financeiro incoerente (só a confirmação do webhook escreve esses campos)`
    );
  }
  if (
    (pagamento.status === 'confirmado' || pagamento.status === 'estornado') &&
    pagamento.pagoEm === undefined
  ) {
    throw new Error(
      `${ctx}: status "${pagamento.status}" sem pagoEm — a confirmação ` +
        `carimba pagoEm no MESMO write (estornado já foi pago antes)`
    );
  }
  if (
    pagamento.status === 'confirmado' &&
    pagamento.forma === 'cartao_credito' &&
    pagamento.cartao === undefined
  ) {
    throw new Error(
      `${ctx}: status "confirmado" no cartão SEM o bloco "cartao" — o ` +
        `slide-in exibe bandeira/parcelas do pagamento confirmado (A5); a ` +
        `confirmação de cartão DEVE persistir o bloco cartao`
    );
  }

  return pagamento;
}
