// =============================================================================
// packages/core/src/pedidos/serieFormasPagamento.ts
//
// A SÉRIE FINANCEIRA POR FORMA DE PAGAMENTO (LEELA-E11 · S825-T1).
//
// O dono perguntou, na leva 25 de 17/08: *"por que nao temos esse agregado de
// pagamento se salvamos todas as formas de pagamento ?"*. Ele estava certo na
// premissa. A forma é gravada em cada `pagamentos/{id}.forma` e nada se perde;
// o que faltava era o DEGRAU DO MEIO — o resumo. Este módulo é o contrato
// desse resumo, e ele mora no core porque três camadas precisam do MESMO nome:
// a Function que soma (agregarFinanceiro), a derivação que consolida por
// organizador (overview/kpis) e a tela que desenha a rosca.
//
// TRÊS DECISÕES QUE VALEM MAIS QUE O CÓDIGO ABAIXO
//
// 1. `null` E `[]` SÃO ESTADOS DIFERENTES, e confundi-los é a mentira que
//    este módulo existe para impedir. `null` = "este agregado não sabe
//    responder" (doc gravado por servidor anterior à série); a tela mantém o
//    "em breve" honesto. Série presente com tudo zerado = "o servidor
//    respondeu: nenhuma venda confirmada"; a tela mostra o vazio honesto, que
//    é uma afirmação, não uma promessa. Um donut zerado desenhado sobre um
//    `null` afirmaria "ninguém pagou" quando a verdade é "ninguém somou".
//
// 2. A ORDEM É A CANÔNICA (`FORMAS_PAGAMENTO`), sempre, inclusive nas formas
//    sem venda. Cor categórica de dataviz é identidade: Pix precisa ser a
//    mesma cor no evento vazio e no evento cheio, senão a rosca de dois
//    eventos lado a lado conta histórias trocadas. Por isso a série nasce
//    COMPLETA (uma fatia por forma do enum) em vez de nascer com as formas
//    que apareceram.
//
// 3. O VALOR É LÍQUIDO DE ESTORNO PARCIAL (`valorFinal − estornadoTotal`,
//    clamp em 0) — a MESMA régua que `agregarFinanceiro` já usa para a fatia
//    coberta por carimbo. Estorno INTEGRAL flipa o status do pagamento e sai
//    do Σ inteiro pela porta do filtro `status == 'confirmado'`. Somar face
//    cheio aqui faria a rosca somar mais que a receita confirmada da mesma
//    tela — dois números do mesmo dinheiro discordando na mesma dobra.
//
// O QUE ESTA SÉRIE NÃO É: não é receita do evento. `receitaConfirmada` nasce
// no fluxo de pagamento e cobre TODA venda; a série cobre as vendas que têm
// doc de pagamento. Onde as duas divergirem, quem tem menos cobertura é esta,
// e a tela DEVE dizer isso em vez de deixar o organizador concluir que sumiu
// dinheiro (`cobertura` abaixo é o que autoriza a frase).
// =============================================================================

import { roundMoney } from '../finance/calc';
import { FORMAS_PAGAMENTO, isFormaPagamento, type FormaPagamento } from './pagamento';

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

/** Uma fatia da série: quanto entrou por esta forma, e em quantas vendas. */
export interface FatiaFormaPagamento {
  forma: FormaPagamento;
  /** Pagamentos CONFIRMADOS nesta forma (contagem de transações). */
  vendas: number;
  /** Σ `valorFinal − estornadoTotal` desses pagamentos, em R$. */
  valor: number;
}

/**
 * A série inteira — uma fatia por forma do enum, na ordem canônica.
 * `null` em qualquer contrato que a carregue significa "não computada"
 * (ver decisão 1 no cabeçalho), NUNCA "nenhuma venda".
 */
export type SerieFormasPagamento = readonly FatiaFormaPagamento[];

/**
 * Rótulo de tela de cada forma. Vive aqui (e não na tela) porque a rosca da
 * Visão geral, a análise do CRM e o financeiro do evento precisam escrever a
 * mesma palavra — "Cartão" numa e "Cartão de crédito" noutra é a duplicata
 * que vira inconsistência de produto na primeira revisão do dono.
 */
export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
};

// ---------------------------------------------------------------------------
// Construção e soma
// ---------------------------------------------------------------------------

/** Série completa zerada, na ordem canônica — o ponto de partida do acúmulo. */
export function serieZerada(): FatiaFormaPagamento[] {
  return FORMAS_PAGAMENTO.map((forma) => ({ forma, vendas: 0, valor: 0 }));
}

/**
 * Acumula UM pagamento confirmado na série, no lugar. Ignora forma fora do
 * enum e valor não-finito — doc corrompido não derruba o agregado inteiro
 * (a Function agrega em lote; lançar aqui travaria o rollup do evento todo
 * por causa de um doc). @impure (muta `serie`, de propósito — laço quente)
 */
export function acumularPagamento(
  serie: FatiaFormaPagamento[],
  forma: unknown,
  valorFinal: unknown,
  estornadoTotal: unknown = 0
): void {
  if (!isFormaPagamento(forma)) return;
  if (typeof valorFinal !== 'number' || !Number.isFinite(valorFinal)) return;
  const fatia = serie.find((f) => f.forma === forma);
  if (fatia === undefined) return;

  const estornado =
    typeof estornadoTotal === 'number' &&
    Number.isFinite(estornadoTotal) &&
    estornadoTotal > 0
      ? estornadoTotal
      : 0;

  fatia.vendas += 1;
  fatia.valor = roundMoney(fatia.valor + Math.max(0, roundMoney(valorFinal - estornado)));
}

/**
 * Soma duas séries fatia a fatia (consolidação por organizador: N eventos →
 * uma rosca). Determinística e pura — a ordem canônica sobrevive à soma. @pure
 */
export function somarSeries(
  a: SerieFormasPagamento,
  b: SerieFormasPagamento
): FatiaFormaPagamento[] {
  return FORMAS_PAGAMENTO.map((forma) => {
    const fa = a.find((f) => f.forma === forma);
    const fb = b.find((f) => f.forma === forma);
    return {
      forma,
      vendas: (fa?.vendas ?? 0) + (fb?.vendas ?? 0),
      valor: roundMoney((fa?.valor ?? 0) + (fb?.valor ?? 0)),
    };
  });
}

// ---------------------------------------------------------------------------
// Leituras derivadas
// ---------------------------------------------------------------------------

/** Σ do valor de todas as fatias (o número do centro da rosca). @pure */
export function totalValorDaSerie(serie: SerieFormasPagamento): number {
  return roundMoney(serie.reduce((soma, f) => soma + f.valor, 0));
}

/** Σ das vendas de todas as fatias. @pure */
export function totalVendasDaSerie(serie: SerieFormasPagamento): number {
  return serie.reduce((soma, f) => soma + f.vendas, 0);
}

/**
 * Existe venda confirmada nesta série? É o predicado que separa "desenhar a
 * rosca" de "mostrar o vazio honesto" — e ele olha VENDAS, não valor, porque
 * um evento de inscrição gratuita tem venda com valor zero e ainda assim tem
 * história para contar sobre forma de pagamento. @pure
 */
export function serieTemVenda(serie: SerieFormasPagamento): boolean {
  return totalVendasDaSerie(serie) > 0;
}

/**
 * Fração da receita confirmada que a série consegue explicar (0 a 1), ou
 * `null` quando não há receita com que comparar.
 *
 * Serve a UMA frase de tela: quando a série cobre menos que o todo, a rosca
 * está desenhando um pedaço e precisa dizer isso. O caso não é hipotético —
 * base com venda anterior ao doc de pagamento (ou seed) tem receita sem
 * transação, e uma rosca muda ali faria o organizador procurar dinheiro que
 * nunca sumiu. Clampada em 1: cobertura acima do todo é ruído de
 * arredondamento, não notícia. @pure
 */
export function coberturaDaSerie(
  serie: SerieFormasPagamento,
  receitaConfirmada: number | null
): number | null {
  if (receitaConfirmada === null || receitaConfirmada <= 0) return null;
  return Math.min(1, totalValorDaSerie(serie) / receitaConfirmada);
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fronteira Firestore → domínio)
// ---------------------------------------------------------------------------

/**
 * Lê a série de um doc do Firestore. Devolve `null` para ausente/ilegível —
 * a leitura Postel que sustenta a decisão 1 do cabeçalho: doc gravado antes
 * desta série não vira zero, vira "não sei".
 *
 * Normaliza para a série COMPLETA na ordem canônica (forma desconhecida no
 * doc é descartada; forma do enum ausente no doc entra zerada), então quem
 * consome nunca precisa tratar fatia faltante. @pure
 */
export function parseSerieFormasPagamento(raw: unknown): FatiaFormaPagamento[] | null {
  if (!Array.isArray(raw)) return null;
  const serie = serieZerada();
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue;
    const registro = item as Record<string, unknown>;
    const forma = registro['forma'];
    if (!isFormaPagamento(forma)) continue;
    const fatia = serie.find((f) => f.forma === forma);
    if (fatia === undefined) continue;
    const vendas = registro['vendas'];
    const valor = registro['valor'];
    if (typeof vendas === 'number' && Number.isFinite(vendas) && vendas >= 0) {
      fatia.vendas = Math.floor(vendas);
    }
    if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0) {
      fatia.valor = roundMoney(valor);
    }
  }
  return serie;
}
