// =============================================================================
// packages/core/src/checkout/saleState.ts
//
// Estado de venda do checkout — derivação PURA (LEELA-E12 · fundação).
//
// `computeSaleState` deriva a cadeia monetária completa da venda:
//   preço vigente (lote ativo da modalidade — RN-301/ADR-012)
//   → desconto (cupom vigente — E04)
//   → valorFinal (o que o organizador enxerga — "à vista p/ organizador")
//   → taxa/líquido (termo do tenant — RN-330/RN-406)
//   → parcelamento (Price do termo — RN-311; juros repassados ao comprador)
//   → totalCobrado (o que o COMPRADOR paga na forma/parcelas escolhidas).
//
// REUSO-FIRST (regra do brief): nada de aritmética própria — compõe
// `loteAtivo`/`precoVigente` (eventos/lote), `cupomNaJanela`/`cupomNoTeto`/
// `descontoDoCupom` (eventos/cupom) e `roundMoney`/`computeTaxa`/
// `computeReceitaLiquida`/`buildInstallmentOptions` (finance/calc).
//
// Fail-fast (dinheiro): venda fechada (modalidade com lotes e NENHUM ativo —
// janela-morta, espelho de `precoVigente`/S300 #1; ou sem lotes e sem preço
// legado), cupom fora de vigência/teto, parcelas fora das opções do termo, pedido
// gratuito (valorFinal ≤ 0 — cobrança de R$ 0 não existe; fluxo gratuito é
// outro lote) — tudo LANÇA com mensagem acionável, nunca degrada em silêncio.
//
// Convenção monetária: REAIS (2 casas) — ver pedido.ts. A conversão para
// centavos acontece SÓ na borda do gateway (createInscricaoCharge).
// `agora` é INJETADO (@pure — testável sem relógio).
// =============================================================================

import type { Lote } from '../eventos/lote';
import type { Kit } from '../eventos/kit';
import type { Cupom, TipoCupom } from '../eventos/cupom';
import type { FormaPagamento } from '../pedidos/pagamento';
import type { InstallmentRules } from '../platform/commercialTerms';
import { loteAtivo } from '../eventos/lote';
import { precoKitValido } from '../eventos/kit';
import { cupomNaJanela, cupomNoTeto, descontoDoCupom } from '../eventos/cupom';
import {
  buildInstallmentOptions,
  computeReceitaLiquida,
  computeTaxa,
  roundMoney,
  type InstallmentOption,
} from '../finance/calc';

// ---------------------------------------------------------------------------
// Contratos de entrada (Picks estruturais — aceitam o doc parseado inteiro)
// ---------------------------------------------------------------------------

/** Subconjunto do Lote necessário para derivar o preço vigente + rótulo. */
export type LoteVenda = Pick<
  Lote,
  'id' | 'nome' | 'ordem' | 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite' | 'preco'
>;

/** Subconjunto do Cupom necessário para vigência + desconto. */
export type CupomVenda = Pick<
  Cupom,
  'codigo' | 'tipo' | 'valor' | 'tetoUso' | 'usos' | 'inicioEm' | 'fimEm'
>;

/**
 * Subconjunto do Kit necessário para precificar e validar a oferta por
 * modalidade (RN-210/211). `preco` é o DELTA sobre o lote (negativo = desconto).
 */
export type KitVenda = Pick<Kit, 'nome' | 'preco' | 'modalidades'>;

/** Uma inscrição da venda: a modalidade e os lotes DELA (ADR-012). */
export interface ItemVendaInput {
  /** Modalidade/percurso escolhido pelo inscrito (ex.: '10k'). */
  modalidade: string;
  /** Lotes da MODALIDADE (query `where modalidade == X` — ADR-012). */
  lotesDaModalidade: readonly LoteVenda[];
  /**
   * Kit escolhido para ESTA inscrição (RN-210/211) — OPCIONAL. Quando presente,
   * o `preco` do kit (delta; NEGATIVO = desconto, RN-211) soma ao preço do lote,
   * e a modalidade DEVE constar de `kit.modalidades` (fail-fast — kit não
   * ofertado para a modalidade nunca precifica; espelha o filtro da UI, defesa
   * em profundidade). Ausente = sem kit, sem delta.
   */
  kit?: KitVenda;
  /**
   * Preço-base LEGADO (`percurso.preco` — S201) para evento SEM lotes
   * configurados — schema evolution, nunca 0 fake. IGNORADO quando a
   * modalidade TEM lotes: com todos encerrados/esgotados a venda está
   * FECHADA e o legado não reabre (espelho de `precoVigente` — S300 #1).
   */
  precoLegado?: number;
}

/** Parâmetros de `computeSaleState`. Tudo injetado — @pure. */
export interface ComputeSaleStateParams {
  /** Inscrições do pedido (ADR-011 — ≥ 1; auto-inscrição = exatamente 1). */
  itens: readonly ItemVendaInput[];
  /** Cupom JÁ carregado (doc parseado) — `null`/ausente = sem cupom. */
  cupom?: CupomVenda | null;
  /** Forma de pagamento do domínio (sem boleto — decisão 2026-07-05). */
  forma: FormaPagamento;
  /** Parcelas escolhidas (1 = à vista). PIX exige 1. */
  parcelas: number;
  /** Regras de parcelamento do TERMO do tenant (RN-311/RN-406). */
  installmentRules: InstallmentRules;
  /** Taxa da plataforma do TERMO do tenant (RN-330/RN-406) — nunca constante. */
  platformFeePct: number;
  /** Instante da venda — injetado (testável; vigência de lote/cupom). */
  agora: Date;
}

// ---------------------------------------------------------------------------
// Contratos de saída
// ---------------------------------------------------------------------------

/** Preço resolvido de UMA inscrição (lote vigente ou preço legado). */
export interface ItemVendaState {
  modalidade: string;
  /** Lote que precificou o item — `null` = fallback do preço legado. */
  loteId: string | null;
  /** 🔁 Rótulo do lote p/ o slide-in `[pag]` sem join (ex.: "Lote 2"). */
  loteNome: string | null;
  /** Nome do kit escolhido (rótulo p/ o resumo) — `null` quando sem kit. */
  kitNome: string | null;
  /** Delta do kit já somado ao `preco` (0 sem kit; NEGATIVO = desconto). */
  kitPreco: number;
  /** Preço da inscrição em R$ (2 casas) — lote vigente + delta do kit. */
  preco: number;
}

/** Cupom efetivamente aplicado na venda (ecoado p/ o doc de pagamento). */
export interface CupomAplicadoVenda {
  codigo: string;
  tipo: TipoCupom;
  /** Valor do cupom — % quando percentual, R$ quando fixo. */
  valor: number;
}

/**
 * Estado de venda derivado — o CONTRATO que a UI do checkout (S1203) e o
 * `createInscricaoCharge` consomem. Todos os valores em R$ (2 casas).
 */
export interface SaleState {
  itens: readonly ItemVendaState[];
  /** Σ preços das inscrições, ANTES de cupom. */
  valorBase: number;
  /** Desconto do cupom sobre o total (0 quando sem cupom). */
  desconto: number;
  /** valorBase − desconto — o que o organizador enxerga (à vista). */
  valorFinal: number;
  /** Cupom aplicado — `null` quando a venda não usou cupom. */
  cupomAplicado: CupomAplicadoVenda | null;
  /** Taxa Leela sobre o valorFinal (RN-330) — informativa (organizador). */
  taxa: number;
  /** Líquido do organizador (valorFinal − taxa). */
  receitaLiquidaOrganizador: number;
  /** Opções de parcelamento ofertáveis (termo — RN-311). PIX: só 1x. */
  opcoesParcelamento: readonly InstallmentOption[];
  /** A opção ESCOLHIDA (parcelas do input, validada contra as opções). */
  parcelamento: InstallmentOption;
  /**
   * O que o COMPRADOR paga: `parcelamento.valorTotal` (com juros Price no
   * cartão parcelado; = valorFinal no PIX/à vista). É este valor que vira
   * centavos na borda do gateway.
   */
  totalCobrado: number;
  forma: FormaPagamento;
}

// ---------------------------------------------------------------------------
// Derivação
// ---------------------------------------------------------------------------

/**
 * Piso monetário do item (RN-211): o preço da inscrição (lote + delta do kit)
 * NUNCA é negativo. Um kit-desconto que excede o preço do lote é config
 * incoerente — LANÇA (fail-fast, invalid-argument no chamador) em vez de
 * deixar um item negativo escapar do guard GLOBAL `valorFinal ≤ 0` (que só
 * enxerga o total do pedido) e detonar 'internal' 500 no rateio (parseMoney).
 */
function guardPrecoNaoNegativo(
  preco: number,
  modalidade: string,
  loteNome: string | null,
  precoBase: number,
  kitPreco: number
): void {
  if (preco < 0) {
    const origem = loteNome !== null ? `lote "${loteNome}"` : 'preço legado';
    throw new Error(
      `computeSaleState: preço da inscrição "${modalidade}" ficou NEGATIVO ` +
        `(${origem} R$ ${precoBase} + kit R$ ${kitPreco} = R$ ${preco}) — ` +
        `kit-desconto não pode exceder o preço da inscrição (RN-211)`
    );
  }
}

/**
 * Resolve o preço de UM item: lote ativo → (modalidade SEM lotes) preço
 * legado → venda fechada. Espelho do `precoVigente` (re-review S300 #1):
 * com lotes configurados e NENHUM ativo (janela-morta) o legado NÃO se
 * aplica — reabriria a venda ao preço-base sem teto de vaga (RN-300).
 */
function resolverItem(item: ItemVendaInput, agora: Date): ItemVendaState {
  if (typeof item.modalidade !== 'string' || item.modalidade.length === 0) {
    throw new Error('computeSaleState: item sem "modalidade" (ADR-012)');
  }

  // Kit da inscrição (RN-210/211): valida a oferta por modalidade e resolve o
  // DELTA antes de precificar. Ausente = sem delta (kitPreco 0, kitNome null).
  // O kit indisponível para a modalidade LANÇA (espelha o filtro da UI — kit
  // que não serve à modalidade nunca deveria chegar aqui; se chegar, é venda
  // incoerente, e dinheiro errado é pior que erro explícito).
  let kitPreco = 0;
  let kitNome: string | null = null;
  if (item.kit !== undefined) {
    if (!precoKitValido(item.kit.preco)) {
      throw new Error(
        `computeSaleState: kit "${item.kit.nome}" com preço inválido (RN-211)`
      );
    }
    if (!item.kit.modalidades.includes(item.modalidade)) {
      throw new Error(
        `computeSaleState: kit "${item.kit.nome}" não é ofertado para a ` +
          `modalidade "${item.modalidade}" (RN-210) — seleção inconsistente`
      );
    }
    kitPreco = roundMoney(item.kit.preco);
    kitNome = item.kit.nome;
  }

  const ativo = loteAtivo(item.lotesDaModalidade, agora);
  if (ativo !== null) {
    const preco = roundMoney(ativo.preco + kitPreco);
    // Piso do item (RN-211): kit-desconto NUNCA excede o lote. Sem este guard
    // um item negativo passa despercebido em pedido de GRUPO (o guard global
    // `valorFinal ≤ 0` só olha o TOTAL) e explode como 'internal' 500 lá no
    // parseMoney do rateio — fail-fast aqui, com mensagem acionável.
    guardPrecoNaoNegativo(preco, item.modalidade, ativo.nome, ativo.preco, kitPreco);
    return {
      modalidade: item.modalidade,
      loteId: ativo.id,
      loteNome: ativo.nome,
      kitNome,
      kitPreco,
      preco,
    };
  }

  // Legado SÓ quando a modalidade NÃO tem lotes configurados. Com lotes e
  // nenhum ativo (janela-morta) a venda está FECHADA — cair no legado
  // venderia ao preço-base sem teto de vaga (espelho do S300 #1 em
  // `precoVigente`, que devolve `null` nesse caso).
  if (item.lotesDaModalidade.length === 0 && item.precoLegado !== undefined) {
    if (
      typeof item.precoLegado !== 'number' ||
      !Number.isFinite(item.precoLegado) ||
      item.precoLegado < 0
    ) {
      throw new Error(
        `computeSaleState: "precoLegado" inválido para a modalidade "${item.modalidade}"`
      );
    }
    const preco = roundMoney(item.precoLegado + kitPreco);
    guardPrecoNaoNegativo(preco, item.modalidade, null, item.precoLegado, kitPreco);
    return {
      modalidade: item.modalidade,
      loteId: null,
      loteNome: null,
      kitNome,
      kitPreco,
      preco,
    };
  }

  // Venda fechada para a modalidade (RN-300): com lotes e nenhum ativo
  // (antes do 1º início, esgotado, ou depois do último — o legado NUNCA
  // reabre) ou sem lotes configurados e sem preço legado.
  throw new Error(
    `computeSaleState: venda fechada para a modalidade "${item.modalidade}" — ` +
      (item.lotesDaModalidade.length > 0
        ? 'todos os lotes encerraram/esgotaram e o preço legado não reabre a venda (RN-300/RN-301)'
        : 'sem lotes configurados e sem preço legado (RN-300/RN-301)')
  );
}

/**
 * Deriva o estado de venda completo do checkout.
 * Fail-fast em toda violação — dinheiro errado é pior que erro explícito.
 * @pure (relógio injetado via `agora`)
 */
export function computeSaleState(params: ComputeSaleStateParams): SaleState {
  const { itens, cupom, forma, parcelas, installmentRules, platformFeePct, agora } = params;

  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('computeSaleState: a venda exige ≥ 1 inscrição (ADR-011)');
  }
  if (!Number.isInteger(parcelas) || parcelas < 1) {
    throw new Error('computeSaleState: "parcelas" deve ser inteiro ≥ 1');
  }
  if (forma !== 'cartao_credito' && parcelas > 1) {
    throw new Error(
      `computeSaleState: parcelamento (${parcelas}x) só existe no cartão de crédito — ` +
        `forma "${forma}" é à vista`
    );
  }

  // 1. Preço vigente por item (lote ativo da modalidade — RN-301/ADR-012)
  const itensResolvidos = itens.map((item) => resolverItem(item, agora));
  const valorBase = roundMoney(
    itensResolvidos.reduce((soma, item) => soma + item.preco, 0)
  );

  // 2. Cupom — vigência verificada AQUI (fail-fast, mensagens distintas)
  let desconto = 0;
  let cupomAplicado: CupomAplicadoVenda | null = null;
  if (cupom !== undefined && cupom !== null) {
    if (!cupomNaJanela(cupom, agora)) {
      throw new Error(
        `computeSaleState: cupom "${cupom.codigo}" fora da janela de validade`
      );
    }
    if (cupomNoTeto(cupom)) {
      throw new Error(
        `computeSaleState: cupom "${cupom.codigo}" atingiu o teto de usos`
      );
    }
    desconto = descontoDoCupom(cupom, valorBase);
    cupomAplicado = { codigo: cupom.codigo, tipo: cupom.tipo, valor: cupom.valor };
  }

  // 3. valorFinal — invariante monetária de parsePagamento (base − desconto)
  const valorFinal = roundMoney(valorBase - desconto);
  if (valorFinal <= 0) {
    // Cobrança de R$ 0 não existe no gateway; inscrição gratuita é fluxo
    // próprio (fora da fundação E12) — nunca fabricar cobrança de 0.
    throw new Error(
      'computeSaleState: valorFinal ≤ 0 — pedido gratuito está fora do fluxo ' +
        'de cobrança (fundação E12 cobre apenas vendas pagas)'
    );
  }

  // 4. Taxa/líquido do organizador — % do TERMO (RN-330/RN-406)
  const taxa = computeTaxa(valorFinal, platformFeePct);
  const receitaLiquidaOrganizador = computeReceitaLiquida(valorFinal, platformFeePct);

  // 5. Parcelamento — opções do TERMO (RN-311); PIX é sempre 1x sem juros
  const opcoesParcelamento: readonly InstallmentOption[] =
    forma === 'cartao_credito'
      ? buildInstallmentOptions(valorFinal, installmentRules)
      : [{ parcelas: 1, valorParcela: valorFinal, valorTotal: valorFinal }];

  const parcelamento = opcoesParcelamento.find((o) => o.parcelas === parcelas);
  if (parcelamento === undefined) {
    throw new Error(
      `computeSaleState: ${parcelas}x não é uma opção válida para ` +
        `R$ ${valorFinal.toFixed(2)} — termo oferta até ` +
        `${opcoesParcelamento[opcoesParcelamento.length - 1]?.parcelas ?? 1}x ` +
        '(RN-311: parcela mínima/máximo do termo)'
    );
  }

  return {
    itens: itensResolvidos,
    valorBase,
    desconto,
    valorFinal,
    cupomAplicado,
    taxa,
    receitaLiquidaOrganizador,
    opcoesParcelamento,
    parcelamento,
    totalCobrado: parcelamento.valorTotal,
    forma,
  };
}
