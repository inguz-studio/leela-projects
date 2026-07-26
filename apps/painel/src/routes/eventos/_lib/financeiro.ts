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
// =============================================================================

import type { FinanceiroEvento } from '@leela/api-client';
import { KITS_INSCRITO, STATUS_INSCRITO, roundMoney } from '@leela/core';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';
import { celulaCsv } from './csv';

/**
 * Retenção default: até 15% do total, liberada pós-evento. NEGOCIÁVEL por
 * cliente — quando o tenant tiver `commercialTerms`, o valor sai de lá. É a
 * visão do organizador (quanto fica retido), NUNCA a margem/taxa da plataforma.
 */
export const RETENCAO_MAX_PCT = 15;

/** Visão de repasse do organizador (sem taxa/margem da plataforma). */
export interface RepasseEvento {
  /** Receita total de vendas de ingressos (= receita bruta confirmada). */
  receitaTotal: number;
  /** Já transferido ao organizador (E09 — soma de transferências reais). */
  repassado: number;
  /** Disponível para saque agora (total − retenção − repassado). */
  disponivel: number;
  /** Retido, liberado pós-evento (retenção de até 15% do total). */
  aSerDisponibilizado: number;
  /**
   * `repassado` depende de E09 (módulo de repasses), ausente na V1 — o valor
   * real de transferências não existe ainda. Estado honesto: `repassado = 0`
   * (não inventamos transferências) e a UI mostra o hint de dependência.
   */
  repasseIndisponivel: boolean;
}

/**
 * Deriva a visão de repasse a partir do agregado. Retenção = 15% do total
 * (default negociável). `repassado` é 0 até E09 existir (NÃO inventa
 * transferência); `disponivel` = total − retenção − repassado. @pure
 */
export function derivarRepasse(fin: FinanceiroEvento): RepasseEvento {
  const receitaTotal = fin.receitaBruta;
  const aSerDisponibilizado = roundMoney(receitaTotal * (RETENCAO_MAX_PCT / 100));
  const repassado = 0; // E09 ausente — sem máquina de transferências (honesto).
  const disponivel = roundMoney(Math.max(0, receitaTotal - aSerDisponibilizado - repassado));
  return {
    receitaTotal,
    repassado,
    disponivel,
    aSerDisponibilizado,
    repasseIndisponivel: true,
  };
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
 * Σ dos repasses vivos associados a UM evento (shape estrutural de
 * `RepassesAssociados`, tipado aqui para o `_lib` não passar a depender do
 * módulo de repasses). `null`/`qtd === 0` = nenhum repasse associado.
 */
export interface RepasseDoEventoCsv {
  qtd: number;
  total: number;
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
 * `repasseDoEvento` (achado A-1 da review antagonista da IA-MENU): a partir do
 * IAM-T7 a Caixa exibe o repasse REAL daquele evento, lido do ledger, enquanto
 * `derivarRepasse().repassado` segue cravado em 0 (E09 ausente no agregado).
 * Sem este parâmetro o CSV exportado da MESMA tela contradiz o número que a
 * pessoa acabou de ler. O export passa a receber a mesma Σ que a tela mostra —
 * omitido, o comportamento anterior (0) é preservado. @pure
 */
export function gerarCsvFinanceiro(
  fin: FinanceiroEvento,
  repasseDoEvento?: RepasseDoEventoCsv | null,
): string {
  const rep = derivarRepasse(fin);
  const repassado =
    repasseDoEvento && repasseDoEvento.qtd > 0 ? repasseDoEvento.total : rep.repassado;
  const linhas: (string | number)[][] = [['Categoria', 'Item', 'Valor']];
  linhas.push(['Resumo', 'Receita total (R$)', rep.receitaTotal]);
  linhas.push(['Resumo', 'Valor repassado (R$)', repassado]);
  linhas.push(['Resumo', 'Valor disponível (R$)', rep.disponivel]);
  linhas.push(['Resumo', 'Valor a ser disponibilizado (R$)', rep.aSerDisponibilizado]);
  linhas.push(['Inscritos', 'Total', fin.inscritos.total]);
  for (const l of breakdownFinanceiro(fin)) {
    linhas.push([l.categoria, l.item, l.valor]);
  }
  return linhas.map((row) => row.map((c) => celulaCsv(c, ',')).join(',')).join('\r\n');
}
