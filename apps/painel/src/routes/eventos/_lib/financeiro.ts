// =============================================================================
// Derivações puras da tela Financeiro do evento (S207-T1). O cliente NUNCA
// recalcula receita — só LÊ o agregado `financeiro/current` (S207-T2) e formata
// / exporta.
//
// TAXA/MARGEM DA PLATAFORMA NÃO É EXPOSTA AO ORGANIZADOR (RN-404 + decisão do
// dono, fix-tema-clube): nem card, nem hint, nem coluna de CSV.
//
// DEC-0727C (verbatim do dono: *"o que devemos mostrar: Receita Total,
// Disponível para Repasse, Valor Repassado. nao complica essa porra. Faz o
// simples"*): a Caixa mostra TRÊS números. O card de retenção saiu da conta
// visível — a diferença entre a receita e os outros dois é retido + taxa, e
// fica implícita.
//
// A BASE do disponível é a MESMA do saque autoritativo (RN-367): líquido do
// produtor, retenção que libera no encerramento, menos os repasses vivos
// daquele evento. A conta inteira é do core (`computeDisponivelDoEvento`) — a
// Caixa não tem matemática própria. Até a DEC-0727C esta tela retinha 15% do
// BRUTO e o saque calculava sobre o LÍQUIDO: no mock canônico do repo a Caixa
// dizia 9.700 onde o modal aceitava 8.000 (review CAIXADISP-REV, vetor 3).
//
// O número autoritativo de SAQUE continua sendo o saldo consolidado do servidor
// (RN-350/351/357): a janela D+N (RN-348) é grandeza do TENANT, não do evento.
// =============================================================================

import type { FinanceiroEvento } from '@leela/api-client';
import type { StatusInscrito } from '@leela/core';
import { KITS_INSCRITO, STATUS_INSCRITO, computeDisponivelDoEvento, roundMoney } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';
import { celulaCsv } from './csv';

// ---------------------------------------------------------------------------
// Denominador de métrica de dinheiro (D-1008-R19)
// ---------------------------------------------------------------------------

/**
 * Status de inscrito cujo dinheiro ESTÁ dentro de `receitaBruta` — o único
 * denominador legítimo de uma média de dinheiro nesta tela (D-1008-R19, nas
 * palavras do dono: *"ticket médio é só por clientes que pagaram, e nao
 * pagamentos emitidos (pendentes + pagos)"*).
 *
 * POR QUE NÃO É `STATUS_QUE_CONTAM_VENDA` (`functions/src/eventos/virarLote.ts`,
 * = confirmado + estornado): aquela constante conta VAGA DE LOTE — estoque, não
 * caixa. Uma inscrição estornada consumiu um lugar do lote (e por isso conta
 * lá), mas `estornarInscricao` DEVOLVE o face em `eventos/{id}.receitaConfirmada`
 * — que é exatamente o número espelhado em `receitaBruta`. Somar o estornado ao
 * denominador dividiria uma receita já líquida de estorno por gente que não está
 * mais nela: o ticket cairia sozinho a cada reembolso, que é a MESMA classe de
 * mentira (denominador inflado) que a R19 manda matar. O cânone de dinheiro da
 * casa já decidiu isso uma vez: `computeCrmCliente` deixa a estornada no
 * histórico e FORA de `ltv`/`valorGasto` ("o dinheiro voltou").
 *
 * Se o dono quiser o estornado dentro da conta, é reabrir a régua — a mudança é
 * esta linha e o teste que a pina.
 */
export const STATUS_PAGANTE: StatusInscrito = 'confirmado';

/**
 * Quantos CLIENTES PAGARAM, pelo agregado `financeiro/current`. `null` =
 * indeterminado (agregado ainda não computado, ou contagem ausente no doc) — a
 * tela mostra "—", nunca cai para um denominador de conveniência. @pure
 */
export function contarPagantes(fin: FinanceiroEvento | null | undefined): number | null {
  if (fin === null || fin === undefined) return null;
  const pagantes = fin.inscritos.porStatus[STATUS_PAGANTE];
  return typeof pagantes === 'number' && Number.isFinite(pagantes) ? pagantes : null;
}

/**
 * Ticket médio do evento = receita confirmada ÷ clientes que PAGARAM (R19).
 *
 * Numerador e denominador saem do MESMO doc (`financeiro/current`): ler a
 * receita do `evento` e a contagem do agregado misturaria dois instantes do
 * mesmo número. Sem agregado, ou com zero pagante, o resultado é `null` — não
 * existe média de nenhum cliente, e 0 aqui leria como "ticket de R$ 0,00". @pure
 */
export function ticketMedioPorPagante(
  fin: FinanceiroEvento | null | undefined,
): number | null {
  const pagantes = contarPagantes(fin);
  if (fin === null || fin === undefined || pagantes === null || pagantes <= 0) return null;
  return roundMoney(fin.receitaBruta / pagantes);
}

/**
 * Σ dos repasses VIVOS associados a UM evento (shape estrutural de
 * `RepassesAssociados`, tipado aqui para o `_lib` não passar a depender do
 * módulo de repasses). `null`/`qtd === 0` = nenhum repasse associado.
 * "Vivo" = {solicitado, aprovado, pago} — a definição de `comprometeSaldo`
 * (RN-351), aplicada por `associarRepassesPorEvento`.
 */
export interface RepasseDoEvento {
  qtd: number;
  total: number;
}

/** Contexto do evento que a base do saque exige (RN-350/367). */
export interface ContextoRepasseEvento {
  /** `evento.status === 'encerrado'` — encerrar libera a retenção (RN-350). */
  encerrado: boolean;
  /** % de retenção do termo do tenant; ausente ⇒ default 15 do core (RN-350). */
  retencaoPct?: number;
  /**
   * Disponível CONSOLIDADO do tenant (`saldo/current.disponivel` — RN-351), o
   * número que o saque de fato aceita. Ausente/`null` = ainda não lido (o card
   * fica só com o número do evento). Item 49: o disponível do EVENTO não
   * conhece a janela D+N (RN-348), que é grandeza do TENANT — com um pagamento
   * confirmado hoje o card prometia R$ 8.500 onde o modal aceitava R$ 4.025.
   */
  disponivelTenant?: number | null;
}

/**
 * Monta o contexto da Caixa a partir do que os readers entregam — a borda onde
 * dado de I/O vira parâmetro de conta. Pura porque é aqui que moram DUAS
 * guardas de dinheiro que não podem depender de alguém lembrar delas na tela:
 *
 *   1. `Number.isFinite`, não `typeof === 'number'` (achado BAIXA da
 *      CAIXASIMPLES-REV): `NaN` É `number` e passava direto para o core, que
 *      então lançava RangeError no render em vez de cair no default de 15%. O
 *      consumidor irmão (`useRepassesPorEvento`) sempre usou `Number.isFinite`
 *      — os dois caminhos da MESMA conta agora concordam.
 *   2. teto do tenant ausente/ilegível NÃO limita nada (item 49): `null` é
 *      "não sei", e transformar "não sei" em 0 seria pior que o defeito que o
 *      teto corrige.
 * @pure
 */
export function contextoDaCaixa(params: {
  encerrado: boolean;
  /** `commercialTerms.retencaoRepassePct` cru, do jeito que o reader entrega. */
  retencaoPct?: unknown;
  /** `saldo/current.disponivel` cru — `null`/`undefined` = ainda não lido. */
  disponivelTenant?: unknown;
}): ContextoRepasseEvento {
  return {
    encerrado: params.encerrado,
    ...(Number.isFinite(params.retencaoPct)
      ? { retencaoPct: params.retencaoPct as number }
      : {}),
    disponivelTenant: Number.isFinite(params.disponivelTenant)
      ? (params.disponivelTenant as number)
      : null,
  };
}

/** Visão de repasse do organizador (sem taxa/margem da plataforma). */
export interface RepasseEvento {
  /** Receita total de vendas de ingressos (= receita bruta confirmada). */
  receitaTotal: number;
  /** Σ dos repasses VIVOS deste evento (ledger — RN-349 · DEC-0727). */
  repassado: number;
  /**
   * Disponível EXIBIDO: o menor entre o do evento e o do tenant (item 49);
   * `null` = tenant sem termo comercial — indeterminado, nunca zero (decisão
   * #7).
   */
  disponivel: number | null;
  /** Disponível do EVENTO, antes do teto do tenant (base do texto da nota). */
  disponivelDoEvento: number | null;
  /** O número exibido veio do TETO DO TENANT, não do evento (item 49). */
  limitadoPeloTenant: boolean;
  /** Quanto da Σ o disponível ABSORVEU (clamp RN-351 — review R-2). */
  absorvido: number;
  /** Sem termo comercial: disponível indeterminado ("—" honesto). */
  semTermo: boolean;
}

/**
 * Deriva a visão de repasse a partir do agregado + do repasse DAQUELE evento.
 *
 * Toda a matemática é do core (`computeDisponivelDoEvento` — RN-367): líquido
 * do produtor, retenção que libera no encerramento (RN-350), menos os repasses
 * vivos do evento (DEC-0727, verbatim do dono: *"disponivel tem que abater o
 * que já foi repassado"*). É a MESMA base que o `requestRepasse` relê no
 * servidor para autorizar o saque, então o número do card e o teto do modal são
 * o mesmo número — não dois cálculos que precisam ser mantidos iguais na mão.
 *
 * Nada é somado aqui: `repassado` chega pronto do ledger, pela mesma função
 * pura que alimenta `/eventos/repasses` (RN-357 — dinheiro é escrito só por
 * Function; o cliente lê e formata).
 *
 * Sem repasse associado (`undefined`/`null`/`qtd === 0`), `repassado = 0` e o
 * disponível é o de antes — nada é inventado quando não houve movimento. @pure
 */
export function derivarRepasse(
  fin: FinanceiroEvento,
  repasseDoEvento?: RepasseDoEvento | null,
  contexto: ContextoRepasseEvento = { encerrado: false },
): RepasseEvento {
  const repassado =
    repasseDoEvento && repasseDoEvento.qtd > 0 ? repasseDoEvento.total : 0;
  const doCore = computeDisponivelDoEvento({
    receitaLiquida: fin.receitaLiquida,
    encerrado: contexto.encerrado,
    repassadoVivo: repassado,
    ...(contexto.retencaoPct !== undefined
      ? { retencaoPct: contexto.retencaoPct }
      : {}),
  });
  // Item 49 · teto do TENANT. O disponível do evento não conhece a janela D+N
  // (RN-348), que vive no saldo consolidado do tenant: o card prometia mais do
  // que o modal de saque aceita. Exibir o MENOR dos dois nunca promete demais;
  // a explicação da janela continua na recusa do modal. Teto ausente (leitura
  // não chegou) NÃO limita nada — inventar 0 seria pior que o defeito.
  const tetoTenant = contexto.disponivelTenant;
  const limitadoPeloTenant =
    doCore.disponivel !== null &&
    typeof tetoTenant === 'number' &&
    Number.isFinite(tetoTenant) &&
    tetoTenant < doCore.disponivel;
  return {
    receitaTotal: fin.receitaBruta,
    repassado,
    disponivel: limitadoPeloTenant ? (tetoTenant as number) : doCore.disponivel,
    disponivelDoEvento: doCore.disponivel,
    limitadoPeloTenant,
    absorvido: doCore.absorvido,
    semTermo: doCore.semTermo,
  };
}

/** Marcador de valor indeterminado — o mesmo glifo da tela. */
export const SEM_VALOR = '—';

/**
 * Célula de dinheiro do CSV: número cru quando existe, o MESMO "—" da tela
 * quando o valor é indeterminado (sem termo). Célula vazia leria como zero na
 * planilha de conciliação, que é o modo de falha que a RN-235 fecha. @pure
 */
function celulaValor(valor: number | null): string | number {
  return valor === null ? SEM_VALOR : valor;
}

export interface LinhaBreakdown {
  categoria: string;
  item: string;
  valor: number;
}

/**
 * Breakdown das contagens do agregado: por kit, por modalidade e por status.
 * Só categorias com valor > 0 entram (evita ruído). @pure
 */
export function breakdownFinanceiro(fin: FinanceiroEvento): LinhaBreakdown[] {
  const linhas: LinhaBreakdown[] = [];
  for (const kit of KITS_INSCRITO) {
    const valor = fin.inscritos.porKit[kit] ?? 0;
    if (valor > 0) linhas.push({ categoria: 'Kit', item: kitInscritoLabel(kit), valor });
  }
  for (const [modalidade, valor] of Object.entries(fin.inscritos.porModalidade)) {
    if (valor > 0) linhas.push({ categoria: 'Modalidade', item: modalidade, valor });
  }
  for (const status of STATUS_INSCRITO) {
    const valor = fin.inscritos.porStatus[status] ?? 0;
    if (valor > 0) linhas.push({ categoria: 'Status', item: statusInscritoBadge(status).label, valor });
  }
  return linhas;
}

/**
 * Gera o CSV das linhas exibidas: resumo (repasse do organizador) + breakdown.
 * SEM taxa/margem da plataforma (RN-404) — mesma visão dos cards, agora os TRÊS
 * da DEC-0727C: Receita Total, Disponível para Repasse, Valor Repassado.
 * Números crus (machine-readable). As células passam pela sanitização
 * partilhada (`celulaCsv` · separador `,`): RFC 4180 + anti-injeção de fórmula
 * — a modalidade é texto livre público (mesma superfície de ataque do
 * inscritosCsv).
 *
 * `repasseDoEvento` entra na MESMA `derivarRepasse` que a tela usa, e as três
 * linhas do resumo saem todas dela — inclusive os rótulos, que são os mesmos
 * dos cards. Era aqui que vivia o achado A-1 da review IA-MENU (o export
 * imprimia `repassado = 0` ao lado do valor real na tela); a coerência tela↔CSV
 * é estrutural, não uma segunda regra que alguém precisa lembrar de atualizar
 * duas vezes. Omitido, o resultado é o do evento sem repasse associado. @pure
 */
export function gerarCsvFinanceiro(
  fin: FinanceiroEvento,
  repasseDoEvento?: RepasseDoEvento | null,
  contexto?: ContextoRepasseEvento,
): string {
  const rep = derivarRepasse(fin, repasseDoEvento, contexto);
  const linhas: (string | number)[][] = [['Categoria', 'Item', 'Valor']];
  linhas.push(['Resumo', 'Receita Total (R$)', rep.receitaTotal]);
  linhas.push(['Resumo', 'Disponível para Repasse (R$)', celulaValor(rep.disponivel)]);
  linhas.push(['Resumo', 'Valor Repassado (R$)', rep.repassado]);
  linhas.push(['Inscritos', 'Total', fin.inscritos.total]);
  for (const l of breakdownFinanceiro(fin)) {
    linhas.push([l.categoria, l.item, l.valor]);
  }
  return linhas.map((row) => row.map((c) => celulaCsv(c, ',')).join(',')).join('\r\n');
}
