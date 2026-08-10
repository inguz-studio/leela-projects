// =============================================================================
// Ocupação dos últimos eventos (REDESIGN-DS · Visão Geral v3). Derivação PURA.
//
// O protótipo chama o bloco de "Ocupação dos últimos 5 eventos" e o subtitula
// "Inscritos sobre as vagas oferecidas em cada evento". É o único bloco novo da
// v3 que já tem dado real de ponta a ponta: `qtdInscritos` é agregado ∑ mantido
// por Function e `capacidade` vem direta do doc do evento — a MESMA fonte que a
// lista de eventos ativos e os KPIs já usam nesta tela. Nenhuma query nova
// entra por causa dele.
//
// DUAS DECISÕES DE HONESTIDADE, e as duas são do dado, não do desenho:
//
//   1. evento SEM capacidade conhecida fica FORA. Ocupação é uma razão; sem
//      denominador ela não existe. A resolução canônica evento|Σkits é
//      server-side (RN-210), então `capacidade: null` é um estado real em
//      produção, não um caso de teste. Em vez de assumir um denominador, o
//      bloco conta quantos ficaram de fora e a tela diz isso em uma linha.
//   2. "últimos" é por DATA DA PROVA, decrescente. A listagem do organizador
//      chega ordenada por data ascendente (a próxima prova primeiro), que é a
//      ordem certa para "o que vem aí" e a errada para "o que já rodou".
// =============================================================================

import { ocupacaoDoEvento, type Timestamp } from '@leela/core';

/** Recorte de evento que a ocupação precisa — subconjunto do que a tela já tem. */
export interface EventoOcupacaoInput {
  nome: string;
  slug: string;
  qtdInscritos: number;
  /** null = desconhecida (Σkits é server-side, RN-210) */
  capacidade: number | null;
  data?: Timestamp | null;
}

/** Uma barra do bloco: inscritos sobre vagas, com a razão já calculada. */
export interface EventoOcupacaoView {
  slug: string;
  nome: string;
  inscritos: number;
  capacidade: number;
  /** 0..1+ (passa de 1 em overbooking) — nunca null: sem capacidade a linha sai */
  ocupacao: number;
}

export interface OcupacaoDosEventos {
  linhas: EventoOcupacaoView[];
  /** Quantos eventos ficaram de fora por não ter capacidade conhecida. */
  semCapacidade: number;
}

/** Quantos eventos o bloco mostra (o protótipo pede 5). */
export const OCUPACAO_MAX_EVENTOS = 5;

function millis(t: Timestamp | null | undefined): number {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return 0;
}

/**
 * Deriva as barras de ocupação dos eventos mais recentes por data da prova.
 * Preserva a ordem relativa entre eventos sem data (todos com chave 0) — o
 * `sort` do JS é estável desde o ES2019.
 * @pure
 */
export function derivarOcupacao(
  eventos: readonly EventoOcupacaoInput[],
  max: number = OCUPACAO_MAX_EVENTOS
): OcupacaoDosEventos {
  const comCapacidade = eventos.filter(
    (e): e is EventoOcupacaoInput & { capacidade: number } =>
      typeof e.capacidade === 'number' && e.capacidade > 0
  );

  const linhas = [...comCapacidade]
    .sort((a, b) => millis(b.data) - millis(a.data))
    .slice(0, max)
    .map((e) => ({
      slug: e.slug,
      nome: e.nome,
      inscritos: e.qtdInscritos,
      capacidade: e.capacidade,
      // Reusa o core (fonte única da razão); o filtro acima garante o não-null.
      ocupacao: ocupacaoDoEvento(e) ?? 0,
    }));

  return { linhas, semCapacidade: eventos.length - comCapacidade.length };
}
