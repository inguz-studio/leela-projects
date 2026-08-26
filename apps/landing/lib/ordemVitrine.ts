// =============================================================================
// apps/landing/lib/ordemVitrine.ts
//
// A ORDEM da vitrine da home. Módulo próprio, puro e sem `firebase-admin`, para
// que a regra seja testável sem subir leitor nenhum.
//
// O que ele conserta: `listarEventosPublicados` ordenava por NOME e deixava
// escrito no próprio código que aquilo era provisório — "Mais próximos primeiro
// seria ideal; ordenamos por nome estável por ora." O efeito visível, medido no
// seed do mock em 26/08: a grade abria com "[Mock] - Campeche Run", que está com
// INSCRIÇÕES ENCERRADAS, enquanto duas experiências abertas caíam para depois.
// Numa home de marketplace, a primeira linha é a curadoria — e ela estava
// dizendo "chegou tarde" para quem acabou de chegar.
//
// A regra tem três degraus, nesta ordem:
//
//   1. VENDÁVEL PRIMEIRO. `aberto` antes de `esgotado`, `esgotado` antes de
//      `encerrado`. Esgotado fica no meio de propósito: ele ainda é notícia
//      (o evento acontece, a pessoa pode querer a próxima edição ou a lista de
//      espera de um dia), enquanto encerrado é arquivo.
//   2. DENTRO DO GRUPO, PROXIMIDADE. O que vem por vir (`futuro`) antes do que
//      já passou; entre futuros, a data MAIS PRÓXIMA primeiro (é a decisão que
//      a pessoa consegue tomar); entre passados, a MAIS RECENTE primeiro (o
//      arquivo lê-se do fim para o começo).
//   3. EMPATE, NOME. Determinismo — duas execuções seguidas com o mesmo dado
//      produzem a mesma página, o que importa para SSR/ISR e para o diff de
//      screenshot do gate visual.
//
// Não decide o que ENTRA na vitrine (isso é o gate de publicação do leitor),
// só em que ordem sai.
// =============================================================================

import type { EstadoVenda } from './tipos';

/** O mínimo que a ordenação precisa saber — qualquer resumo compatível serve. */
export interface ItemOrdenavel {
  nome: string;
  dataISO: string;
  futuro: boolean;
  estadoVenda: EstadoVenda;
}

/** Degrau 1: quanto menor, mais alto na página. */
const PESO_ESTADO: Record<EstadoVenda, number> = {
  aberto: 0,
  esgotado: 1,
  encerrado: 2,
};

/**
 * Ordena a vitrine pública. Não muta a entrada — devolve um array novo, porque
 * o chamador é um Server Component e mutar o resultado do leitor esconde a
 * origem da ordem de quem lê a página depois.
 */
export function ordenarVitrine<T extends ItemOrdenavel>(itens: readonly T[]): T[] {
  return [...itens].sort((a, b) => {
    const porEstado = PESO_ESTADO[a.estadoVenda] - PESO_ESTADO[b.estadoVenda];
    if (porEstado !== 0) return porEstado;

    if (a.futuro !== b.futuro) return a.futuro ? -1 : 1;

    const ta = Date.parse(a.dataISO);
    const tb = Date.parse(b.dataISO);
    // Data ilegível não derruba a página nem embaralha a grade: cai para o
    // desempate por nome, junto com os empates legítimos.
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
      return a.futuro ? ta - tb : tb - ta;
    }

    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

/**
 * O DESTAQUE da home: a experiência que o hero convida a fazer.
 *
 * É o primeiro item VENDÁVEL e FUTURO da vitrine já ordenada — nunca um evento
 * encerrado (convidar para o que não aceita inscrição é a promessa que o rótulo
 * "Ver experiência" já tinha quebrado uma vez, no achado G6). Sem nenhum evento
 * aberto no ar, devolve `null` e o hero volta a ser de uma coluna só: slot sem
 * dado não vira slot com dado inventado.
 */
export function destaqueDaVitrine<T extends ItemOrdenavel>(ordenados: readonly T[]): T | null {
  return ordenados.find((e) => e.estadoVenda === 'aberto' && e.futuro) ?? null;
}
