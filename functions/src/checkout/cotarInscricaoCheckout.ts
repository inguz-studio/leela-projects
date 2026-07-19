// =============================================================================
// functions/src/checkout/cotarInscricaoCheckout.ts
//
// Cotação READ-ONLY do checkout (LEELA-S1203 · UI de 5 etapas). A etapa
// "Resumo" precisa exibir base → desconto → valorFinal → totalCobrado → opções
// de parcelamento ANTES do pagamento, mas `computeSaleState` depende dos
// commercialTerms do tenant (taxa/parcelamento — RN-330/RN-311), que são
// PRIVADOS (o leitor público não os expõe). Esta cotação roda a MESMA derivação
// no servidor e devolve só o que o COMPRADOR vê — a UI apenas RENDERIZA o
// resultado, sem somar um centavo (regra inviolável do brief). A `taxa` (repasse
// do organizador) NÃO sai daqui: é dado do termo privado, não do comprador.
//
// REUSO-FIRST: compõe `carregarInsumos` (evento/lotes/cupom/termo — a MESMA
// carga do produtor de escrita) + `computeSaleState` (fonte única de preço).
// NÃO escreve NADA — nenhum pedido, nenhuma cobrança. É o "preço na vitrine".
//
// ⚠️ FABLE-REVIEW (fiação de dinheiro): esta é a fonte dos números que a UI
// mostra no Resumo. O valor AUTORITATIVO da cobrança continua sendo o de
// `createInscricaoCharge` (que recomputa server-side na criação). A cotação é
// informativa/idempotente e read-only; conferir que nenhum caminho aqui escreve.
//
// CONFIDENCIALIDADE (fix Fable-review S1203): a cotação é PÚBLICA/anônima
// (loginAnonimo). Ela NÃO devolve a `taxa` da plataforma — `taxa =
// valorFinal × platformFeePct/100` revelaria o `platformFeePct` do termo do
// tenant (RN-330), que o firestore.rules restringe a owner/staff/platform_admin
// (RN-404 · leitura de commercialTerms). O comprador paga `totalCobrado` e nunca
// vê o repasse do organizador; expor a taxa aqui era um canal-lateral do termo
// privado para qualquer anônimo. Só sai o que o COMPRADOR enxerga no Resumo.
//
// RN-347 (taxa repassada): quando o EVENTO está em modo 'repassada', o
// comprador PAGA a taxa — o VALOR dela (`taxaServico`, R$) é público por
// necessidade (linha "Taxa de serviço" do Resumo) e já está embutido no
// `totalCobrado`. O `platformFeePct` do termo segue privado: sai só o valor,
// nunca o percentual (o fix 703db9c continua lei).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import {
  computeSaleState,
  isCodigoCupomValido,
  isFormaPagamento,
  meioDaForma,
  normalizarCodigoCupom,
  resolverTaxaMeio,
  type FormaPagamento,
  type SaleState,
} from '@leela/core';
import { carregarInsumos } from './createInscricaoCharge';
import { agoraCheckout } from './relogioCheckout';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Uma inscrição para cotar — modalidade (ADR-012) + kit opcional (RN-210/211). */
export interface CotarItemInput {
  modalidade: string;
  /** Id do kit real (`eventos/{id}/kits/{kitId}`) — soma o delta via o core. */
  kitId?: string;
}

/** Input da cotação read-only (validado no servidor — nunca confiar na UI). */
export interface CotarInscricaoCheckoutInput {
  eventoId: string;
  /** ≥ 1 inscrição (ADR-011 — auto-inscrição = 1). */
  itens: CotarItemInput[];
  forma: FormaPagamento;
  /** Parcelas escolhidas (1 = à vista; PIX exige 1). */
  parcelas: number;
  cupomCodigo?: string;
}

/** Uma linha resolvida da cotação (o que o Resumo lista por inscrito). */
export interface CotarItemResult {
  modalidade: string;
  /** Rótulo do lote vigente (ex.: "Lote 2") — nunca "tier". `null` = legado. */
  loteNome: string | null;
  /** Nome do kit escolhido (rótulo do Resumo) — `null` quando sem kit. */
  kitNome: string | null;
  /** Delta do kit já embutido em `preco` (0 sem kit; NEGATIVO = desconto). */
  kitPreco: number;
  /** Preço da inscrição em R$ (2 casas) — lote vigente + delta do kit. */
  preco: number;
}

/** Opção de parcelamento serializável (espelho de InstallmentOption). */
export interface CotarParcelaResult {
  parcelas: number;
  valorParcela: number;
  valorTotal: number;
}

/** Resultado da cotação — o CONTRATO que o Resumo (S1203) consome. */
export interface CotarInscricaoCheckoutResult {
  itens: CotarItemResult[];
  /** Σ preços das inscrições, ANTES de cupom. */
  valorBase: number;
  /** Desconto do cupom (0 quando sem cupom). */
  desconto: number;
  /** valorBase − desconto (o total à vista para o organizador). */
  valorFinal: number;
  cupomAplicado: { codigo: string; tipo: string; valor: number } | null;
  // NÃO expor `taxa`/`platformFeePct` aqui: cotação pública/anônima nunca
  // devolve o repasse do organizador (termo privado — RN-330/RN-404). O
  // comprador paga `totalCobrado`; o organizador vê a taxa no painel (auth).
  /**
   * Taxa de serviço paga pelo COMPRADOR (RN-347): 0 = evento 'incorporada'
   * (nenhuma linha no Resumo); > 0 = 'repassada' (a UI exibe "Taxa de
   * serviço R$ X,XX"). É o VALOR que o comprador desembolsa — já embutido em
   * `totalCobrado`/opções de parcelamento. NUNCA o `platformFeePct` (fix
   * 703db9c): em 'repassada' o valor é público por necessidade (o comprador
   * o paga); o percentual do termo segue privado.
   */
  taxaServico: number;
  /**
   * Total À VISTA do comprador SEM juros de parcelamento (RN-347):
   * valorFinal + taxaServico. É o "à vista sai por" do Resumo — a opção 1x
   * do CARTÃO carrega 1 mês de juros Price (modelo do termo) e não serve de
   * referência à vista. Em 'incorporada' == valorFinal.
   */
  totalAVista: number;
  /** Opções de parcelamento ofertáveis (termo — RN-311). PIX: só 1x. */
  opcoesParcelamento: CotarParcelaResult[];
  /** Opção escolhida (parcelas do input). */
  parcelamento: CotarParcelaResult;
  /** O que o COMPRADOR paga na forma/parcelas escolhidas. */
  totalCobrado: number;
  forma: FormaPagamento;
  /**
   * TAXAFLEX (RN-180 · S1210): total À VISTA do comprador POR OPÇÃO de meio
   * de pagamento — a UI exibe o total em cada opção ANTES de pagar (ex.:
   * PIX R$ 108,00 · Cartão R$ 110,30) quando a taxa é repassada e varia por
   * meio. SÓ VALORES em R$ (nunca percentual — confidencialidade 703db9c).
   * `null` num meio = aquela derivação falhou (a cotação principal nunca
   * degrada por causa do meio alternativo); em 'incorporada' os dois são
   * iguais ao face.
   */
  totaisPorMeio: { pix: number | null; cartao_credito: number | null };
}

// ---------------------------------------------------------------------------
// Validação pura do input
// ---------------------------------------------------------------------------

/** Valida o input bruto da cotação. Retorna lista de erros (vazia = válido). */
export function validarCotarInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  if (typeof input['eventoId'] !== 'string' || input['eventoId'].length === 0) {
    erros.push('"eventoId" é obrigatório.');
  }

  const itens = input['itens'];
  if (!Array.isArray(itens) || itens.length === 0) {
    erros.push('"itens" deve ter ≥ 1 inscrição (ADR-011).');
  } else {
    itens.forEach((item, i) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      if (typeof obj['modalidade'] !== 'string' || obj['modalidade'].length === 0) {
        erros.push(`itens[${i}]: "modalidade" é obrigatória.`);
      }
      if (
        obj['kitId'] !== undefined &&
        (typeof obj['kitId'] !== 'string' || obj['kitId'].length === 0)
      ) {
        erros.push(`itens[${i}]: "kitId" deve ser string não vazia.`);
      }
    });
  }

  if (!isFormaPagamento(input['forma'])) {
    erros.push('"forma" deve ser cartao_credito ou pix.');
  }

  const parcelas = input['parcelas'];
  if (!Number.isInteger(parcelas) || (parcelas as number) < 1) {
    erros.push('"parcelas" deve ser inteiro ≥ 1.');
  } else if (input['forma'] === 'pix' && (parcelas as number) > 1) {
    erros.push('PIX é à vista — "parcelas" deve ser 1.');
  }

  const cupomCodigo = input['cupomCodigo'];
  if (cupomCodigo !== undefined) {
    if (
      typeof cupomCodigo !== 'string' ||
      !isCodigoCupomValido(normalizarCodigoCupom(cupomCodigo))
    ) {
      erros.push('"cupomCodigo" fora do padrão A-Z0-9 (3–20).');
    }
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Cota a venda sem escrever nada. Fail-fast: erros de venda (fechada, cupom
 * fora de vigência, parcelas inválidas) viram `invalid-argument` com mensagem
 * acionável — o mesmo idioma de `computeSaleState`.
 *
 * @param agora relógio injetável (vigência de lote/cupom nos testes/demo)
 */
export async function cotarInscricaoCheckoutCore(
  db: Db,
  rawInput: unknown,
  agora: () => Date = () => new Date()
): Promise<CotarInscricaoCheckoutResult> {
  const erros = validarCotarInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `Cotação inválida: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as CotarInscricaoCheckoutInput;

  const insumos = await carregarInsumos(db, {
    eventoId: input.eventoId,
    inscritos: input.itens,
    ...(input.cupomCodigo !== undefined ? { cupomCodigo: input.cupomCodigo } : {}),
  });

  let sale: SaleState;
  try {
    sale = computeSaleState({
      itens: insumos.itens,
      cupom: insumos.cupom,
      forma: input.forma,
      parcelas: input.parcelas,
      installmentRules: insumos.terms.installmentRules,
      platformFeePct: insumos.terms.platformFeePct,
      // TAXAFLEX (RN-178/180): a MESMA resolução da cobrança (override >
      // global > legado) — o preço da vitrine É o preço da cobrança.
      taxaMeio: resolverTaxaMeio(
        meioDaForma(input.forma),
        insumos.taxaTabelaGlobal,
        insumos.terms.taxaTabela,
        insumos.terms.platformFeePct
      ),
      // RN-347: modo do DOC do evento (carregarInsumos) — nunca do input.
      // A cotação e a cobrança derivam do MESMO modo: o preço da vitrine é
      // o preço da cobrança.
      modoTaxa: insumos.modoTaxa,
      agora: agora(),
    });
  } catch (err) {
    throw new https.HttpsError(
      'invalid-argument',
      err instanceof Error ? err.message : 'Estado de venda inválido.'
    );
  }

  // TAXAFLEX (RN-180 · S1210): total à vista do MEIO ALTERNATIVO (parcelas
  // 1x), com a MESMA resolução por meio — a UI mostra o total por opção.
  // Falha do meio alternativo NUNCA degrada a cotação principal (null).
  const formaAlternativa: FormaPagamento =
    input.forma === 'pix' ? 'cartao_credito' : 'pix';
  let totalAlternativo: number | null = null;
  try {
    const saleAlt = computeSaleState({
      itens: insumos.itens,
      cupom: insumos.cupom,
      forma: formaAlternativa,
      parcelas: 1,
      installmentRules: insumos.terms.installmentRules,
      platformFeePct: insumos.terms.platformFeePct,
      taxaMeio: resolverTaxaMeio(
        meioDaForma(formaAlternativa),
        insumos.taxaTabelaGlobal,
        insumos.terms.taxaTabela,
        insumos.terms.platformFeePct
      ),
      modoTaxa: insumos.modoTaxa,
      agora: agora(),
    });
    // Total À VISTA (sem juros de parcelamento) — o comparável por opção.
    totalAlternativo = saleAlt.totalComprador;
  } catch {
    totalAlternativo = null;
  }
  const totaisPorMeio = {
    pix: input.forma === 'pix' ? sale.totalComprador : totalAlternativo,
    cartao_credito:
      input.forma === 'cartao_credito' ? sale.totalComprador : totalAlternativo,
  };

  return {
    itens: sale.itens.map((i) => ({
      modalidade: i.modalidade,
      loteNome: i.loteNome,
      kitNome: i.kitNome,
      kitPreco: i.kitPreco,
      preco: i.preco,
    })),
    valorBase: sale.valorBase,
    desconto: sale.desconto,
    valorFinal: sale.valorFinal,
    cupomAplicado: sale.cupomAplicado
      ? {
          codigo: sale.cupomAplicado.codigo,
          tipo: sale.cupomAplicado.tipo,
          valor: sale.cupomAplicado.valor,
        }
      : null,
    // RN-347: SÓ o valor pago pelo comprador (0 em 'incorporada') — nunca
    // `taxa` (repasse do organizador) nem `platformFeePct` (fix 703db9c).
    taxaServico: sale.taxaRepassada,
    totalAVista: sale.totalComprador,
    opcoesParcelamento: sale.opcoesParcelamento.map((o) => ({
      parcelas: o.parcelas,
      valorParcela: o.valorParcela,
      valorTotal: o.valorTotal,
    })),
    parcelamento: {
      parcelas: sale.parcelamento.parcelas,
      valorParcela: sale.parcelamento.valorParcela,
      valorTotal: sale.parcelamento.valorTotal,
    },
    totalCobrado: sale.totalCobrado,
    forma: sale.forma,
    totaisPorMeio,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `cotarInscricaoCheckout` — cotação read-only do checkout público (S1203). */
export const cotarInscricaoCheckout = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return cotarInscricaoCheckoutCore(admin.firestore(), data, agoraCheckout);
});
