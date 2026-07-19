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
import { roundMoney } from '../finance/calc';
import { telefoneValido } from '../eventos/dadosPessoais';
import { parseAceitesPedido, type AceitesPedido } from './aceites';
import { parseEnderecoPedido, type EnderecoPedido } from './endereco';
import { isFormaPagamento, type FormaPagamento, type Pagamento } from './pagamento';
import { parseMoney, parseTimestamp, TOLERANCIA_MEIO_CENTAVO } from './validacao';

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

/**
 * Matriz CANÔNICA de transição de status do pedido (re-review A9).
 * Só 'pendente' transiciona; todo estado final é TERMINAL:
 *   - `pago` não retrocede (estorno opera POR INSCRITO — ADR-011/RN-341,
 *     nunca devolve o pedido a 'pendente');
 *   - `falhou`/`cancelado` não ressuscitam (nova tentativa de pagamento =
 *     NOVO pedido com idempotencyKey nova — mudar isto é decisão de matriz,
 *     não de chamador).
 * O webhook (functions/checkout) é o único escritor e DEVE consultar esta
 * matriz — nunca re-derivar transições localmente.
 */
export const TRANSICOES_STATUS_PEDIDO: Readonly<
  Record<StatusPedido, readonly StatusPedido[]>
> = {
  pendente: ['pago', 'falhou', 'cancelado'],
  pago: [],
  falhou: [],
  cancelado: [],
};

/** Transição de status do pedido permitida? (`pago ↛ pendente`) @pure */
export function podeTransicionarStatusPedido(
  de: StatusPedido,
  para: StatusPedido
): boolean {
  return TRANSICOES_STATUS_PEDIDO[de].includes(para);
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
  /**
   * Telefone celular do RESPONSÁVEL — canal de contato do pedido (CKMOD ·
   * spec §5.1 item 1). PII: leitura já restrita (tenant writer). Ausente =
   * pedido pré-CKMOD ou UI antiga (schema evolution — leitura Postel).
   */
  telefone?: string;
}

/**
 * Uma LINHA do pedido — a decomposição monetária POR INSCRITO (re-review A2).
 * O ADR-011 manda reembolso/cancelamento/titularidade operarem por inscrito:
 * a máquina de reembolso (S904/RN-341) calcula o estorno de 1 inscrito
 * lendo a linha dele aqui — um pedido de grupo com lotes/preços distintos
 * é irrepresentável sem esta decomposição.
 * Invariantes (provadas em parsePedido):
 *   - 1 item por inscrito (`itens[i].inscritoRef` ↔ `inscritoRefs`, 1:1);
 *   - `valorFinal === roundMoney(valorBase − desconto)` por item;
 *   - `Σ itens.valorFinal === pedido.valorTotal`.
 */
export interface ItemPedido {
  /** Id do inscrito da linha (→ eventos/{eventoId}/inscritos/{id}) */
  inscritoRef: string;
  /** Lote que precificou a linha — ausente = preço legado (schema evolution) */
  loteId?: string;
  /** Preço do inscrito em R$, ANTES de cupom */
  valorBase: number;
  /** Fatia do desconto do pedido rateada a esta linha (0 sem cupom) */
  desconto: number;
  /** valorBase − desconto — a BASE do estorno por inscrito (S904/RN-341) */
  valorFinal: number;
  /**
   * Fatia da taxa de serviço REPASSADA ao comprador rateada a esta linha
   * (RN-347 — evento em modo 'repassada'; rateio cent-exato proporcional ao
   * valorFinal, maior resto). AUSENTE em 'incorporada' (docs vigentes ficam
   * intocados — schema evolution). O estorno por inscrito devolve
   * `valorFinal + taxaRepassada` (o que o inscrito PAGOU), mas a reversão de
   * `receitaConfirmada` usa SÓ `valorFinal` (a taxa nunca foi receita do
   * organizador). Σ itens.taxaRepassada === pagamento.taxaRepassada por
   * construção (montarItensDoPedido).
   */
  taxaRepassada?: number;
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
   * Decomposição monetária POR INSCRITO (1 item por entrada de
   * `inscritoRefs` — ver invariantes em {@link ItemPedido}).
   */
  itens: ItemPedido[];
  /**
   * Id do doc em `pagamentos/{id}` — null até a Function de checkout criar
   * a cobrança (dependência futura = opcional honesto, nunca valor fake).
   */
  pagamentoRef: string | null;
  /**
   * Valor total do pedido em R$ (2 casas) — pagamento único (ADR-011).
   * EQUAÇÃO CANÔNICA (re-review A1):
   *   `valorTotal === Σ itens[].valorFinal === pagamento.valorFinal`
   * ("à vista p/ organizador" — juros de parcelamento vivem SÓ em
   * `pagamento.cartao.valorTotalComJuros`, nunca aqui). As duas primeiras
   * igualdades são provadas por `parsePedido` (mesmo doc); a terceira, por
   * {@link pedidoCoerenteComPagamento} (o par de docs que o slide-in carrega).
   */
  valorTotal: number;
  status: StatusPedido;
  /**
   * Endereço do COMPRADOR/responsável — 1× por pedido (CKMOD · spec §5.1
   * item 3; morada ratificável: PEDIDO, nunca por inscrito). PII com
   * minimização RN-172: o CRM NÃO agrega endereço. Ausente = pedido
   * pré-CKMOD/UI antiga. Escrita SÓ pela Function do checkout (Rules:
   * write false em pedidos).
   */
  endereco?: EnderecoPedido;
  /**
   * Aceites versionados do pagar (CKMOD · spec §5.3 · RN-149 pattern):
   * termos da compra (versão vigente da politicaVendas) + termo de saúde
   * (TERMO_SAUDE_VERSAO_VIGENTE), ambos com timestamp de SERVIDOR. Versão e
   * carimbo são do servidor — o cliente só confirma booleans. Ausente =
   * pedido pré-CKMOD (a obrigatoriedade flipa no lote de UI do checkout).
   */
  aceites?: AceitesPedido;
  /** 🔁 Espelho de `pagamentos.forma` p/ listagem sem join — só pós-cobrança */
  formaPagamento?: FormaPagamento;
  /**
   * 🔁 Espelho de `pagamentos.cartao.parcelas` — só pós-cobrança e SÓ quando
   * `formaPagamento === 'cartao_credito'` (cartao.parcelas não existe no
   * PIX; espelhar 1 fake violaria o espelho — re-review A5).
   */
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
  'itens',
  'pagamentoRef',
  'formaPagamento',
  'parcelas',
  // CKMOD: endereço do comprador (PII) e aceites versionados (prova legal
  // RN-149 pattern) — escritos SÓ pela Function do checkout; cliente
  // forjando aceite simularia consentimento que não houve.
  'endereco',
  'aceites',
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
 * Pedido e pagamento formam um PAR coerente? (equação canônica A1:
 * `pedido.valorTotal === pagamento.valorFinal` + backlinks 1:1 íntegros).
 * O slide-in `[pag]` carrega os dois docs — este checker é a guarda do par
 * (docs individualmente válidos podem ainda divergir ENTRE si). Igualdade
 * ESTRITA de valor: ambos os campos são cent-exatos por parse (doubles
 * canônicos por valor de centavo). @pure
 */
export function pedidoCoerenteComPagamento(
  pedido: Pick<Pedido, 'id' | 'pagamentoRef' | 'valorTotal'>,
  pagamento: Pick<Pagamento, 'id' | 'pedidoRef' | 'valorFinal'>
): boolean {
  return (
    pedido.pagamentoRef === pagamento.id &&
    pagamento.pedidoRef === pedido.id &&
    pedido.valorTotal === pagamento.valorFinal
  );
}

// ---------------------------------------------------------------------------
// Montagem dos itens (produtor — Function de checkout)
// ---------------------------------------------------------------------------

/** Insumo de uma linha na montagem dos itens do pedido. */
export interface ItemPedidoInput {
  /** Id do inscrito da linha */
  inscritoRef: string;
  /** Lote que precificou (null/ausente = preço legado) */
  loteId?: string | null;
  /** Preço do inscrito em R$ (cent-exato), ANTES de cupom */
  valorBase: number;
}

/**
 * Monta os `itens[]` do pedido rateando `descontoTotal` pelas linhas,
 * PROPORCIONAL ao preço e CENT-EXATO (método do maior resto em centavos
 * inteiros — determinístico, empate resolve pelo índice menor).
 * Garante por construção: `Σ itens.desconto === descontoTotal` e
 * `Σ itens.valorFinal === Σ valorBase − descontoTotal` — a invariante
 * `Σ itens.valorFinal === valorTotal` de parsePedido nunca quebra por
 * arredondamento de rateio. Fail-fast em insumo fora do contrato.
 *
 * `taxaRepassadaTotal` (RN-347 — evento em modo 'repassada'): a taxa de
 * serviço paga pelo COMPRADOR é rateada pelas linhas com o MESMO método
 * (maior resto, cent-exato), proporcional ao `valorFinal` da linha (a taxa
 * incide sobre o valor pós-desconto — computeTaxa(valorFinal)). Linha 100%
 * descontada (valorFinal 0) nunca recebe taxa. `Σ itens.taxaRepassada ===
 * taxaRepassadaTotal` por construção — o estorno por inscrito (RN-341)
 * devolve a linha COM a fatia de taxa dela sem quebrar centavo. 0/ausente =
 * modo 'incorporada': nenhuma linha ganha o campo (docs vigentes idênticos).
 * @pure
 */
export function montarItensDoPedido(
  itens: readonly ItemPedidoInput[],
  descontoTotal: number,
  taxaRepassadaTotal: number = 0
): ItemPedido[] {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('montarItensDoPedido: pedido exige ≥ 1 item (ADR-011)');
  }
  const basesCentavos = itens.map((item, i) => {
    if (typeof item.inscritoRef !== 'string' || item.inscritoRef.length === 0) {
      throw new Error(`montarItensDoPedido: itens[${i}].inscritoRef inválido`);
    }
    parseMoney('montarItensDoPedido', `itens[${i}].valorBase`, item.valorBase);
    return Math.round(item.valorBase * 100);
  });
  parseMoney('montarItensDoPedido', 'descontoTotal', descontoTotal);
  const totalBaseCentavos = basesCentavos.reduce((soma, c) => soma + c, 0);
  const descontoCentavos = Math.round(descontoTotal * 100);
  if (descontoCentavos > totalBaseCentavos) {
    throw new Error(
      `montarItensDoPedido: descontoTotal (${descontoTotal}) excede a soma ` +
        `dos itens (${roundMoney(totalBaseCentavos / 100)}) — desconto nunca ` +
        `deixa o pedido negativo`
    );
  }

  // Piso proporcional por linha + sobra distribuída pelo MAIOR resto
  // (1 centavo por vez; linha já saturada em 100% de desconto não recebe).
  const alocado = basesCentavos.map((base) =>
    totalBaseCentavos === 0 ? 0 : Math.floor(descontoCentavos * (base / totalBaseCentavos))
  );
  let sobra = descontoCentavos - alocado.reduce((soma, c) => soma + c, 0);
  if (sobra > 0) {
    const porResto = basesCentavos
      .map((base, i) => ({
        i,
        resto:
          totalBaseCentavos === 0
            ? 0
            : descontoCentavos * (base / totalBaseCentavos) - (alocado[i] ?? 0),
      }))
      .sort((a, b) => b.resto - a.resto || a.i - b.i);
    for (const { i } of porResto) {
      if (sobra === 0) break;
      const aloc = alocado[i] ?? 0;
      const base = basesCentavos[i] ?? 0;
      if (aloc >= base) continue; // linha saturada — nunca desconto > base
      alocado[i] = aloc + 1;
      sobra -= 1;
    }
    if (sobra !== 0) {
      // Inalcançável com descontoCentavos ≤ totalBaseCentavos — guarda de FP
      throw new Error(
        'montarItensDoPedido: rateio não fechou cent-exato — insumos corrompidos'
      );
    }
  }

  // ── Rateio da taxa REPASSADA (RN-347) — proporcional ao valorFinal ──────
  // Mesmo método do desconto (piso proporcional + maior resto, centavos
  // inteiros, determinístico). Linha com valorFinal 0 NUNCA recebe taxa
  // (taxa sobre linha gratuita não existe — e o estorno dela é cancelamento).
  parseMoney('montarItensDoPedido', 'taxaRepassadaTotal', taxaRepassadaTotal);
  const finaisCentavos = basesCentavos.map((base, i) => base - (alocado[i] ?? 0));
  const totalFinalCentavos = finaisCentavos.reduce((soma, c) => soma + c, 0);
  const taxaCentavos = Math.round(taxaRepassadaTotal * 100);
  if (taxaCentavos > 0 && totalFinalCentavos === 0) {
    throw new Error(
      'montarItensDoPedido: taxaRepassadaTotal > 0 com pedido 100% descontado — ' +
        'taxa sem base de rateio (RN-347; venda gratuita não cobra taxa)'
    );
  }
  const taxaAlocada = finaisCentavos.map((fin) =>
    totalFinalCentavos === 0 ? 0 : Math.floor(taxaCentavos * (fin / totalFinalCentavos))
  );
  let sobraTaxa = taxaCentavos - taxaAlocada.reduce((soma, c) => soma + c, 0);
  if (sobraTaxa > 0) {
    const porResto = finaisCentavos
      .map((fin, i) => ({
        i,
        resto:
          totalFinalCentavos === 0
            ? 0
            : taxaCentavos * (fin / totalFinalCentavos) - (taxaAlocada[i] ?? 0),
      }))
      .sort((a, b) => b.resto - a.resto || a.i - b.i);
    for (const { i } of porResto) {
      if (sobraTaxa === 0) break;
      if ((finaisCentavos[i] ?? 0) === 0) continue; // linha gratuita: sem taxa
      taxaAlocada[i] = (taxaAlocada[i] ?? 0) + 1;
      sobraTaxa -= 1;
    }
    if (sobraTaxa !== 0) {
      throw new Error(
        'montarItensDoPedido: rateio da taxa repassada não fechou cent-exato — ' +
          'insumos corrompidos (RN-347)'
      );
    }
  }

  return itens.map((item, i) => {
    const baseCentavos = basesCentavos[i] ?? 0;
    const descontoLinha = alocado[i] ?? 0;
    const linha: ItemPedido = {
      inscritoRef: item.inscritoRef,
      valorBase: roundMoney(baseCentavos / 100),
      desconto: roundMoney(descontoLinha / 100),
      valorFinal: roundMoney((baseCentavos - descontoLinha) / 100),
    };
    if (typeof item.loteId === 'string' && item.loteId.length > 0) {
      linha.loteId = item.loteId;
    }
    // Campo SÓ no modo 'repassada' (taxa > 0) — docs 'incorporada' idênticos
    // aos vigentes (schema evolution, zero migração).
    if (taxaCentavos > 0) {
      linha.taxaRepassada = roundMoney((taxaAlocada[i] ?? 0) / 100);
    }
    return linha;
  });
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
  // CKMOD: telefone do responsável — OPCIONAL (Postel: pedido antigo não
  // tem); presente deve ser plausível (telefoneValido — fonte única). Não
  // ecoar o valor na mensagem (PII — LGPD).
  if (resp['telefone'] !== undefined && !telefoneValido(resp['telefone'])) {
    throw new Error(`Pedido ${id}: "responsavel.telefone" inválido (10–13 dígitos)`);
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
  const valorTotalParsed = parseMoney(ctx, 'valorTotal', valorTotal);

  // Decomposição POR INSCRITO (re-review A2): itens é tão obrigatório
  // quanto valorTotal — sem a linha do inscrito, o estorno por inscrito
  // (S904/RN-341) do ADR-011 é incalculável. 1 item por inscritoRef.
  const itensRaw = data['itens'];
  if (!Array.isArray(itensRaw) || itensRaw.length === 0) {
    throw new Error(
      `${ctx}: "itens" ausente — todo pedido decompõe o valor POR INSCRITO ` +
        `(estorno por inscrito — ADR-011/S904)`
    );
  }
  if (itensRaw.length !== inscritoRefs.length) {
    throw new Error(
      `${ctx}: "itens" tem ${itensRaw.length} linha(s) para ` +
        `${inscritoRefs.length} inscrito(s) — a decomposição é 1:1 (ADR-011)`
    );
  }
  const refsDosItens = new Set<string>();
  let somaValorFinal = 0;
  const itens: ItemPedido[] = itensRaw.map((raw, i) => {
    if (raw === null || typeof raw !== 'object') {
      throw new Error(`${ctx}: "itens[${i}]" inválido`);
    }
    const item = raw as Record<string, unknown>;
    const inscritoRef = item['inscritoRef'];
    if (typeof inscritoRef !== 'string' || inscritoRef.length === 0) {
      throw new Error(`${ctx}: "itens[${i}].inscritoRef" inválido (ADR-011)`);
    }
    if (!(inscritoRefs as string[]).includes(inscritoRef)) {
      throw new Error(
        `${ctx}: "itens[${i}].inscritoRef" (${inscritoRef}) não está em ` +
          `"inscritoRefs" — linha órfã (ADR-011)`
      );
    }
    if (refsDosItens.has(inscritoRef)) {
      throw new Error(
        `${ctx}: "itens" tem linha DUPLICADA para o inscrito ${inscritoRef} — ` +
          `cada inscrito tem exatamente 1 linha (ADR-011)`
      );
    }
    refsDosItens.add(inscritoRef);

    const linha: ItemPedido = {
      inscritoRef,
      valorBase: parseMoney(ctx, `itens[${i}].valorBase`, item['valorBase']),
      desconto: parseMoney(ctx, `itens[${i}].desconto`, item['desconto']),
      valorFinal: parseMoney(ctx, `itens[${i}].valorFinal`, item['valorFinal']),
    };
    // Invariante por linha: valorFinal = valorBase − desconto (cent-exato)
    const valorFinalEsperado = roundMoney(linha.valorBase - linha.desconto);
    if (Math.abs(linha.valorFinal - valorFinalEsperado) > TOLERANCIA_MEIO_CENTAVO) {
      throw new Error(
        `${ctx}: "itens[${i}].valorFinal" (${linha.valorFinal}) ≠ ` +
          `valorBase − desconto (${valorFinalEsperado}) — invariante monetária violada`
      );
    }
    if (typeof item['loteId'] === 'string' && item['loteId'].length > 0) {
      linha.loteId = item['loteId'];
    }
    // RN-347 — fatia da taxa repassada (opcional; só existe em evento modo
    // 'repassada'). parseMoney já nega negativo/não-finito/sub-centavo.
    if (item['taxaRepassada'] !== undefined) {
      linha.taxaRepassada = parseMoney(
        ctx,
        `itens[${i}].taxaRepassada`,
        item['taxaRepassada']
      );
    }
    somaValorFinal += linha.valorFinal;
    return linha;
  });
  // Invariante do agregado (equação canônica A1): Σ itens.valorFinal = valorTotal
  if (Math.abs(roundMoney(somaValorFinal) - valorTotalParsed) > TOLERANCIA_MEIO_CENTAVO) {
    throw new Error(
      `${ctx}: Σ itens.valorFinal (${roundMoney(somaValorFinal)}) ≠ valorTotal ` +
        `(${valorTotalParsed}) — decomposição por inscrito incoerente (ADR-011/S904)`
    );
  }

  const pedido: Pedido = {
    id,
    tenantId,
    eventoId,
    responsavel: {
      atletaId: resp['atletaId'],
      nome: resp['nome'],
      email: resp['email'],
      // exactOptionalPropertyTypes: só entra quando o doc carrega
      ...(typeof resp['telefone'] === 'string' ? { telefone: resp['telefone'] } : {}),
    },
    inscritoRefs: inscritoRefs as string[],
    itens,
    pagamentoRef: typeof pagamentoRef === 'string' ? pagamentoRef : null,
    valorTotal: valorTotalParsed,
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

  // CKMOD: endereço e aceites — OPCIONAIS (schema evolution: pedidos
  // pré-CKMOD não têm); presentes, o parse é fail-fast (PII/prova legal
  // corrompida é pior que ausente).
  if (data['endereco'] !== undefined) {
    pedido.endereco = parseEnderecoPedido(ctx, data['endereco']);
  }
  if (data['aceites'] !== undefined) {
    pedido.aceites = parseAceitesPedido(ctx, data['aceites']);
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

  // Coerência dos espelhos (re-review A5): espelho é PÓS-cobrança — sem
  // pagamentoRef não existe pagamento para espelhar; e `parcelas` espelha
  // `cartao.parcelas`, que só existe no cartão (PIX não tem parcelas).
  if (
    (pedido.formaPagamento !== undefined || pedido.parcelas !== undefined) &&
    pedido.pagamentoRef === null
  ) {
    throw new Error(
      `${ctx}: espelho de pagamento (formaPagamento/parcelas) com ` +
        `pagamentoRef null — espelho só existe PÓS-cobrança (ADR-011)`
    );
  }
  if (pedido.parcelas !== undefined && pedido.formaPagamento !== 'cartao_credito') {
    throw new Error(
      `${ctx}: "parcelas" presente com formaPagamento ` +
        `"${String(pedido.formaPagamento)}" — parcelas espelha cartao.parcelas ` +
        `(só cartão de crédito)`
    );
  }

  return pedido;
}
