// =============================================================================
// Derivações puras da tela Financeiro do evento (S207-T1). O cliente NUNCA
// recalcula receita — só LÊ o agregado `financeiro/current` (S207-T2) e formata
// / exporta.
//
// TAXA/MARGEM DA PLATAFORMA NÃO É EXPOSTA AO ORGANIZADOR (RN-404 + decisão do
// dono, fix-tema-clube): nem card, nem hint, nem coluna de CSV. A visão do
// organizador é de REPASSE — quanto entra (receita total), quanto já saiu
// (repassado), quanto pode sacar (disponível) e quanto fica retido até o
// pós-evento (a ser disponibilizado). A retenção default é NEGOCIÁVEL por
// cliente (sairá de `commercialTerms` do tenant quando existir).
//
// DEC-0727: o disponível ABATE os repasses vivos do evento — os quatro números
// da Caixa fecham entre si com o repasse real ao lado. O número autoritativo de
// SAQUE continua sendo o saldo consolidado do servidor (RN-350/351/357): aqui a
// base da retenção é a receita total exibida, e a janela D+N (RN-348) é grandeza
// do tenant, não do evento.
// =============================================================================

import type { FinanceiroEvento } from '@leela/api-client';
import { KITS_INSCRITO, STATUS_INSCRITO, computeDisponivelPorEvento, roundMoney } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';
import { celulaCsv } from './csv';

/**
 * Retenção default: até 15% do total, liberada pós-evento. NEGOCIÁVEL por
 * cliente — quando o tenant tiver `commercialTerms`, o valor sai de lá. É a
 * visão do organizador (quanto fica retido), NUNCA a margem/taxa da plataforma.
 */
export const RETENCAO_MAX_PCT = 15;

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

/** Visão de repasse do organizador (sem taxa/margem da plataforma). */
export interface RepasseEvento {
  /** Receita total de vendas de ingressos (= receita bruta confirmada). */
  receitaTotal: number;
  /** Σ dos repasses VIVOS deste evento (ledger — RN-349 · DEC-0727). */
  repassado: number;
  /** Disponível para saque agora (total − retenção − repassado vivo). */
  disponivel: number;
  /** Retido, liberado pós-evento (retenção de até 15% do total). */
  aSerDisponibilizado: number;
}

/**
 * Deriva a visão de repasse a partir do agregado + do repasse DAQUELE evento.
 * Retenção = 15% do total (default negociável, RN de retenção intacta);
 * `disponivel` = total − retenção − repasses vivos (DEC-0727, verbatim do
 * dono: *"disponivel tem que abater o que já foi repassado"*).
 *
 * O abatimento em si é do core (`computeDisponivelPorEvento`) — a MESMA função
 * que a visão macro usa na coluna por evento: as duas telas nunca divergem no
 * que abate. Nada é somado aqui: `repassado` chega pronto do ledger, pela
 * mesma função pura que alimenta `/eventos/repasses` (RN-337 — valor de
 * dinheiro sempre vem do backend).
 *
 * Sem repasse associado (`undefined`/`null`/`qtd === 0`), `repassado = 0` e o
 * disponível é o de antes — nada é inventado quando não houve movimento. @pure
 */
export function derivarRepasse(
  fin: FinanceiroEvento,
  repasseDoEvento?: RepasseDoEvento | null,
): RepasseEvento {
  const receitaTotal = fin.receitaBruta;
  const aSerDisponibilizado = roundMoney(receitaTotal * (RETENCAO_MAX_PCT / 100));
  const repassado =
    repasseDoEvento && repasseDoEvento.qtd > 0 ? repasseDoEvento.total : 0;
  const disponivel = computeDisponivelPorEvento(
    roundMoney(receitaTotal - aSerDisponibilizado),
    repassado,
  );
  return { receitaTotal, repassado, disponivel, aSerDisponibilizado };
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
 * SEM taxa/margem da plataforma (RN-404) — mesma visão dos cards: receita
 * total, valor repassado, disponível e a ser disponibilizado. Números crus
 * (machine-readable). As células passam pela sanitização partilhada
 * (`celulaCsv` · separador `,`): RFC 4180 + anti-injeção de fórmula — a
 * modalidade é texto livre público (mesma superfície de ataque do
 * inscritosCsv).
 *
 * `repasseDoEvento` entra na MESMA `derivarRepasse` que a tela usa, e as quatro
 * linhas do resumo saem todas dela. Era aqui que vivia o achado A-1 da review
 * IA-MENU (o export imprimia `repassado = 0` ao lado do valor real na tela);
 * agora a coerência tela↔CSV é estrutural, não uma segunda regra que alguém
 * precisa lembrar de atualizar duas vezes — inclusive no disponível, que a
 * DEC-0727 passou a abater. Omitido, o resultado é o do evento sem repasse
 * associado. @pure
 */
export function gerarCsvFinanceiro(
  fin: FinanceiroEvento,
  repasseDoEvento?: RepasseDoEvento | null,
): string {
  const rep = derivarRepasse(fin, repasseDoEvento);
  const linhas: (string | number)[][] = [['Categoria', 'Item', 'Valor']];
  linhas.push(['Resumo', 'Receita total (R$)', rep.receitaTotal]);
  linhas.push(['Resumo', 'Valor repassado (R$)', rep.repassado]);
  linhas.push(['Resumo', 'Valor disponível (R$)', rep.disponivel]);
  linhas.push(['Resumo', 'Valor a ser disponibilizado (R$)', rep.aSerDisponibilizado]);
  linhas.push(['Inscritos', 'Total', fin.inscritos.total]);
  for (const l of breakdownFinanceiro(fin)) {
    linhas.push([l.categoria, l.item, l.valor]);
  }
  return linhas.map((row) => row.map((c) => celulaCsv(c, ',')).join(',')).join('\r\n');
}
