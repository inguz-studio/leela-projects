// =============================================================================
// Puros da ECONOMIA do tenant na ficha do painel master (ADMIN-VISAO onda 2 ·
// S1613-T2).
//
// RN-537 — a regra que este módulo existe para tornar difícil de burlar: a
// visão master LÊ O CARIMBO e nunca recalcula dinheiro. Não há aqui, nem em
// nenhum outro ponto da aba Vendas, uma subtração `valorFinal − taxa`.
//
// É assim que a RN-182 mode-aware é obedecida de graça. Num evento em modo
// `repassada` o comprador pagou a taxa por fora e a confirmação já gravou o
// FACE CHEIO em `conciliacao.repasseOrganizador` (RN-179 congela na compra).
// Uma tela que subtraísse acertaria o modo `incorporada` e erraria TODO evento
// repassado — e `Evento.taxaModo` existe por evento, com
// `commercialTerms.modoTaxaDefault` por tenant, então a mistura é o caso
// normal, não a exceção.
//
// AUSÊNCIA NÃO É ZERO. Pagamento sem `conciliacao` (pendente, falhou,
// cancelado) devolve `null`, e null vira vazio COM RÓTULO na tela. Zero é um
// número e diz "a Leela não ganhou nada nesta venda"; ausência diz "esta venda
// ainda não liquidou". Confundir os dois é exatamente o defeito que a RN-537
// nomeia.
// =============================================================================

import type { FormaPagamento, Pagamento, StatusPagamento, Timestamp } from '@leela/core';

// ---------------------------------------------------------------------------
// As duas cifras da venda — lidas, nunca calculadas
// ---------------------------------------------------------------------------

/**
 * O SERVIÇO da venda (a taxa da Leela) em R$, lido de
 * `conciliacao.taxaValor`. `null` quando o pagamento não tem carimbo.
 *
 * "Serviço" é o nome da taxa em toda superfície (decisão SERV-3 do dono,
 * 11/08) — o campo continua sendo `taxaValor` no doc; o que muda é a palavra
 * que o operador lê.
 * @pure
 */
export function servicoDaVenda(pagamento: Pick<Pagamento, 'conciliacao'>): number | null {
  return pagamento.conciliacao?.taxaValor ?? null;
}

/**
 * O LÍQUIDO DO PRODUTOR em R$, lido de `conciliacao.repasseOrganizador`.
 * `null` quando o pagamento não tem carimbo.
 *
 * Em evento `repassada` este número É o `valorFinal` cheio, porque foi isso
 * que a confirmação gravou. A tela mostra o que está escrito.
 * @pure
 */
export function liquidoDoProdutor(pagamento: Pick<Pagamento, 'conciliacao'>): number | null {
  return pagamento.conciliacao?.repasseOrganizador ?? null;
}

/**
 * O rótulo que ocupa a célula de economia quando o carimbo não existe. Ele
 * diz a CAUSA, porque a causa é o que decide se o operador espera ou age.
 * @pure
 */
export function rotuloEconomiaAusente(status: StatusPagamento): string {
  switch (status) {
    case 'pendente':
      return 'Aguarda confirmação';
    case 'falhou':
      return 'Não liquidou';
    case 'cancelado':
      return 'Cancelada';
    case 'estornado':
      return 'Sem conciliação';
    default:
      return 'Sem conciliação';
  }
}

// ---------------------------------------------------------------------------
// Vocabulário da linha de venda
// ---------------------------------------------------------------------------

/**
 * Rótulos de forma e de status. As palavras são as MESMAS do slide-in do
 * inscrito (`routes/eventos/inscritos/InscritoSlideIn.tsx`), onde os mapas são
 * locais e não exportados: o administrador lê o mesmo vocabulário que o
 * organizador vê na casa dele.
 */
export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  cartao_credito: 'Cartão',
  pix: 'PIX',
};

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  falhou: 'Falhou',
  estornado: 'Estornado',
  cancelado: 'Cancelado',
};

/**
 * Parcelas da venda. O parcelamento vive SÓ em `cartao.parcelas` — PIX não
 * tem parcela no modelo, então a ausência do cartão é "à vista" de fato, e
 * não um dado que faltou. @pure
 */
export function rotuloParcelas(pagamento: Pick<Pagamento, 'cartao'>): string {
  const parcelas = pagamento.cartao?.parcelas;
  return typeof parcelas === 'number' && parcelas > 0 ? `${parcelas}x` : 'À vista';
}

/**
 * O substantivo do contador da aba Vendas.
 *
 * Régua R19 (precedente da onda 4, em que o agregado `qtdInscritos` conta
 * cancelada inclusive e por isso a coluna virou "Inscrições"): o contador aqui
 * conta LINHAS de cobrança, não pessoas pagantes. Um pedido de grupo é uma
 * linha e vários inscritos. "Vendas" é o que a lista tem; "pagantes" seria
 * outro número, que esta tela não computa.
 */
export const SUBSTANTIVO_VENDAS = { singular: 'venda', plural: 'vendas' } as const;

// ---------------------------------------------------------------------------
// Idade do retrato macro (RN-538)
// ---------------------------------------------------------------------------

/**
 * Quantas horas o retrato de `platform/rollups` pode ter antes de a tela
 * declarar que ele está velho.
 *
 * O número não é arbitrário: desde a onda 1 o recompute tem cron próprio, no
 * minuto 15 de CADA HORA (`agendarRecomputePlatformRollups`,
 * `functions/src/platform/rollups.ts`). Um retrato com mais de três horas
 * significa que pelo menos duas execuções não aconteceram — é sinal de que o
 * agendamento parou, não de cadência normal. Um limiar de uma hora acenderia
 * o aviso na janela legítima entre duas execuções; um de um dia esconderia
 * vinte e três falhas seguidas.
 */
export const LIMIAR_ROLLUP_OBSOLETO_HORAS = 3;

const UMA_HORA_MS = 60 * 60 * 1000;

/**
 * Idade do retrato em HORAS. `null` quando não há carimbo legível — e null é
 * "não sei quando isto foi medido", que a tela diz com essas palavras em vez
 * de exibir uma idade inventada. @pure
 */
export function idadeDoRollupEmHoras(
  atualizadoEm: Timestamp | null | undefined,
  agora: Date
): number | null {
  if (!atualizadoEm || typeof atualizadoEm.toDate !== 'function') return null;
  const medidoEm = atualizadoEm.toDate().getTime();
  if (!Number.isFinite(medidoEm)) return null;
  return (agora.getTime() - medidoEm) / UMA_HORA_MS;
}

/**
 * O retrato passou do limiar de frescor? Carimbo ausente conta como OBSOLETO:
 * um número macro sem data conhecida é o caso que a RN-538 existe para
 * impedir de passar por atual. @pure
 */
export function rollupObsoleto(
  atualizadoEm: Timestamp | null | undefined,
  agora: Date
): boolean {
  const idade = idadeDoRollupEmHoras(atualizadoEm, agora);
  if (idade === null) return true;
  return idade > LIMIAR_ROLLUP_OBSOLETO_HORAS;
}
