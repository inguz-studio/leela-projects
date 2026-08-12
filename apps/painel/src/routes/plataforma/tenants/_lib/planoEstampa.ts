// =============================================================================
// Puros do PLANO APLICADO × TERMO VIGENTE (ADMIN-VISAO onda 2 · S1613-T6 ·
// RN-541).
//
// Aplicar um plano COPIA os números dele para `commercialTerms/current` e grava
// `planoAplicadoId` + `planoAplicadoEm`. Não existe vínculo vivo — o próprio
// `AplicarPlanoModal` já diz isso ao administrador na hora de aplicar. A
// consequência que ninguém tinha escrito: se o termo for editado à mão depois,
// `planoAplicadoId` continua apontando para um plano que não descreve mais o
// que está cobrando.
//
// A COMPARAÇÃO É A DO SERVIDOR. `estampaIdentica`
// (`functions/src/platform/aplicarPlano.ts:70-102`) decide se aplicar de novo é
// no-op olhando exatamente quatro eixos, e são os únicos comparáveis porque são
// os únicos que o plano CARREGA (`planoParaTerms`): taxa por método
// (credit_card e pix), tabela por parcela ('2'..'12') e mensalidade SaaS.
// `platformFeePct`, `retencaoRepassePct`, `taxaTabela`, `modoTaxaDefault` e o
// resto do termo não vêm do plano — divergir neles não é divergência, é o termo
// tendo campos que o plano nunca teve. Comparar isso acenderia o aviso em todo
// tenant e o aviso morreria de tanto piscar.
//
// O SINAL É DE LEITURA, NÃO DE BLOQUEIO (RN-541). Nada aqui impede a edição
// manual, que é legítima. O que estes puros impedem é o dono ler "plano Padrão"
// e cobrar com número diferente do Padrão.
// =============================================================================

import type { CommercialTerms, PlanoCobranca, TabelaTaxasParcela } from '@leela/core';
import { planoParaTerms } from '@leela/core';

/** Unidade do eixo — decide como a tela formata os dois lados. */
export type UnidadeDoEixo = 'pct' | 'brl';

/** Um eixo comparável cujo valor vigente saiu de cima da estampa. */
export interface DivergenciaDeEstampa {
  /** Rótulo do eixo, na língua do operador. */
  eixo: string;
  unidade: UnidadeDoEixo;
  /** Valor que o plano estampou. `null` = o plano não carrega este eixo. */
  doPlano: number | null;
  /** Valor vigente no termo. `null` = o termo não carrega este eixo. */
  vigente: number | null;
}

/**
 * O que a ficha tem para dizer sobre o plano de cobrança deste tenant.
 * Cada caso é uma frase diferente na tela — nenhum deles é "—".
 */
export type EstadoDoPlanoAplicado =
  | { tipo: 'sem_termo' }
  | { tipo: 'sem_plano' }
  | { tipo: 'plano_fora_do_catalogo'; planoId: string }
  | { tipo: 'identica'; plano: PlanoCobranca }
  | { tipo: 'divergente'; plano: PlanoCobranca; divergencias: DivergenciaDeEstampa[] };

/** Chaves de parcela presentes em qualquer dos dois lados, em ordem numérica. */
function chavesDeParcela(
  a: TabelaTaxasParcela | undefined,
  b: TabelaTaxasParcela
): string[] {
  const todas = new Set([...Object.keys(a ?? {}), ...Object.keys(b)]);
  return [...todas].sort((x, y) => Number(x) - Number(y));
}

/**
 * Os eixos em que o termo vigente saiu de cima da estampa do plano. Lista
 * vazia = estampa idêntica, na mesma semântica do `estampaIdentica` do
 * servidor. @pure
 */
export function compararEstampa(
  terms: Pick<CommercialTerms, 'taxaPorMetodo' | 'tabelaTaxasParcela' | 'saasMonthlyFee'>,
  plano: Pick<
    PlanoCobranca,
    'taxaPix' | 'taxaCartaoAVista' | 'tabelaTaxasParcela' | 'saasMonthlyFee'
  >
): DivergenciaDeEstampa[] {
  const estampa = planoParaTerms(plano);
  const divergencias: DivergenciaDeEstampa[] = [];

  // Taxa por método. O termo SEM `taxaPorMetodo` é divergência de verdade: o
  // plano sempre estampa os dois, então a ausência significa que alguém tirou.
  const vigenteCartao = terms.taxaPorMetodo?.credit_card ?? null;
  if (vigenteCartao !== estampa.taxaPorMetodo.credit_card) {
    divergencias.push({
      eixo: 'Taxa de cartão à vista',
      unidade: 'pct',
      doPlano: estampa.taxaPorMetodo.credit_card,
      vigente: vigenteCartao,
    });
  }

  const vigentePix = terms.taxaPorMetodo?.pix ?? null;
  if (vigentePix !== estampa.taxaPorMetodo.pix) {
    divergencias.push({
      eixo: 'Taxa de PIX',
      unidade: 'pct',
      doPlano: estampa.taxaPorMetodo.pix,
      vigente: vigentePix,
    });
  }

  // Tabela por parcela: linha a linha, para o operador ver QUAL parcela mudou
  // em vez de "a tabela está diferente".
  for (const chave of chavesDeParcela(terms.tabelaTaxasParcela, estampa.tabelaTaxasParcela)) {
    const doPlano = estampa.tabelaTaxasParcela[chave] ?? null;
    const vigente = terms.tabelaTaxasParcela?.[chave] ?? null;
    if (doPlano !== vigente) {
      divergencias.push({ eixo: `Taxa em ${chave}x`, unidade: 'pct', doPlano, vigente });
    }
  }

  if (terms.saasMonthlyFee !== estampa.saasMonthlyFee) {
    divergencias.push({
      eixo: 'Mensalidade SaaS',
      unidade: 'brl',
      doPlano: estampa.saasMonthlyFee,
      vigente: terms.saasMonthlyFee,
    });
  }

  return divergencias;
}

/**
 * O estado do plano deste tenant, a partir do termo vigente e do catálogo.
 *
 * `planoAplicadoId` apontando para plano que não está mais no catálogo NÃO é
 * erro: o id é referência morta por desenho (rastro de auditoria), e o plano
 * pode ter sido removido depois. A tela diz isso em vez de fingir que nenhum
 * plano foi aplicado. @pure
 */
export function estadoDoPlanoAplicado(
  terms: CommercialTerms | null,
  planos: PlanoCobranca[] | null
): EstadoDoPlanoAplicado {
  if (terms === null) return { tipo: 'sem_termo' };

  const planoId = terms.planoAplicadoId;
  if (planoId === undefined || planoId === '') return { tipo: 'sem_plano' };

  const plano = (planos ?? []).find((p) => p.id === planoId);
  if (!plano) return { tipo: 'plano_fora_do_catalogo', planoId };

  const divergencias = compararEstampa(terms, plano);
  return divergencias.length === 0
    ? { tipo: 'identica', plano }
    : { tipo: 'divergente', plano, divergencias };
}
