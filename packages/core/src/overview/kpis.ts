// =============================================================================
// packages/core/src/overview/kpis.ts
//
// KPIs consolidados da Visão Geral do profissional (LEELA-S600-T2 · E02).
// Derivação PURA — o servidor (Cloud Function) monta os inputs a partir dos
// agregados ∑ canônicos e grava `profissionais/{profId}/dashboard/current`;
// o cliente NUNCA soma nem infere KPI (só consome o retorno de `getOverview`).
//
// Fontes canônicas (E02 é último consumidor — não cria campo de domínio):
//   eventos/{id} — ∑`qtdInscritos`, ∑`receitaConfirmada` (E03)
//   clubes/{id}  — ∑`qtdMembrosAtivos`, ∑`qtdDesafiosAtivos` (E05)
//
// Limiar de "Esgotando"/"Últimas vagas": FONTE ÚNICA aqui (LIMIAR_ESGOTANDO),
// reusada por S601-T1 (badge da lista) e S602-T1 (countdown) — não duplicar.
//
// `taxaConversaoPct` = null até existir dado de visitas (E12/analytics) —
// decisão nº 7 da Onda 1 (onda1-decisoes.md): a UI trata null como "—",
// nunca inventa número. Trends idem: sem janela anterior, null (não 0).
// =============================================================================

import type { StatusEvento } from '../eventos/evento';
import { eventoPublico } from '../eventos/evento';

// ---------------------------------------------------------------------------
// Constantes de negócio (fonte única)
// ---------------------------------------------------------------------------

/**
 * Ocupação a partir da qual o evento está "Esgotando" (KPI de vagas,
 * badge "Últimas vagas" — S601-T1, alerta de ocupação — S602-T2).
 */
export const LIMIAR_ESGOTANDO = 0.9;

// ---------------------------------------------------------------------------
// Tipos de input (montados pelo servidor a partir dos docs canônicos)
// ---------------------------------------------------------------------------

/** Recorte de um evento do profissional relevante para os KPIs. */
export interface EventoKpiInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  /** Agregado ∑ mantido por Function (E03) */
  qtdInscritos: number;
  /** Agregado ∑ mantido por Function (E03) */
  receitaConfirmada: number;
  /**
   * Capacidade total do evento resolvida pelo servidor:
   * `eventos/{id}.capacidade` quando existir, senão Σ`kits[].capacidade`.
   * `null` = desconhecida — o evento fica FORA de vagasRestantes/risco
   * (não inventa capacidade).
   */
  capacidade: number | null;
}

/** Recorte de um clube do profissional relevante para a visão consolidada. */
export interface ClubeKpiInput {
  /** Agregado ∑ mantido por Function (E05 · recontagem) */
  qtdMembrosAtivos: number;
  /** Agregado ∑ (Function mantenedora nasce no E05-L2 · S105-T1) */
  qtdDesafiosAtivos: number;
}

/** Contagens de inscrições por janela (7d atual vs. 7d anterior). */
export interface JanelaInscricoes {
  atual: number;
  anterior: number;
}

// ---------------------------------------------------------------------------
// Contrato de saída (doc `dashboard/current` + retorno de `getOverview`)
// ---------------------------------------------------------------------------

/**
 * KPIs consolidados do profissional (S600-T2).
 * Campos indisponíveis são `null` — a UI renderiza "—" (nunca 0 falso).
 * `membrosAtivosTotais`/`desafiosAtivosTotais` consolidam os ∑ de E05
 * (visão única eventos+clubes — objetivo do épico).
 */
export interface OverviewKPIs {
  inscricoesTotais: number;
  /** % vs. janela anterior de 7d; null sem base de comparação */
  inscricoesTrendPct: number | null;
  receitaConfirmada: number;
  /** null até haver série financeira por janela (inscrito não carrega valor na Onda 1) */
  receitaTrendPct: number | null;
  /** Σ max(0, capacidade − qtdInscritos) dos eventos PÚBLICOS com capacidade conhecida */
  vagasRestantes: number;
  /** Evento público de maior ocupação ≥ LIMIAR_ESGOTANDO; null se nenhum */
  eventoEmRisco: { nome: string; slug: string } | null;
  /** null até existir dado de visitas (E12) — decisão nº 7 Onda 1 */
  taxaConversaoPct: number | null;
  /** Vazio até existir série de conversão (E12) */
  conversaoSparkline: number[];
  membrosAtivosTotais: number;
  desafiosAtivosTotais: number;
}

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/**
 * Ocupação do evento (0..1+, pode passar de 1 em overbooking).
 * null quando a capacidade é desconhecida ou não-positiva.
 * @pure
 */
export function ocupacaoDoEvento(
  evento: Pick<EventoKpiInput, 'qtdInscritos' | 'capacidade'>
): number | null {
  if (evento.capacidade === null || evento.capacidade <= 0) return null;
  return evento.qtdInscritos / evento.capacidade;
}

/**
 * Vagas restantes do evento (clamp em 0 — overbooking não vira vaga negativa).
 * null quando a capacidade é desconhecida.
 * @pure
 */
export function vagasRestantesDoEvento(
  evento: Pick<EventoKpiInput, 'qtdInscritos' | 'capacidade'>
): number | null {
  if (evento.capacidade === null || evento.capacidade <= 0) return null;
  return Math.max(0, evento.capacidade - evento.qtdInscritos);
}

/**
 * Evento "Esgotando"? (badge "Últimas vagas" — S601-T1; alerta — S602-T2).
 * Só evento PÚBLICO (vendendo) com ocupação ≥ LIMIAR_ESGOTANDO.
 * @pure
 */
export function emEsgotamento(
  evento: Pick<EventoKpiInput, 'status' | 'qtdInscritos' | 'capacidade'>
): boolean {
  if (!eventoPublico(evento.status)) return false;
  const ocupacao = ocupacaoDoEvento(evento);
  return ocupacao !== null && ocupacao >= LIMIAR_ESGOTANDO;
}

/**
 * Variação percentual entre janelas (1 casa decimal).
 * null quando não há base de comparação (anterior ≤ 0) — "—" na UI, nunca 0.
 * @pure
 */
export function derivarTrendPct(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

/**
 * Taxa de conversão (%) — confirmadas / visitas.
 * null sem dado de visitas (E12 fora da Onda 1 — decisão nº 7).
 * @pure
 */
export function derivarTaxaConversao(
  confirmadas: number,
  visitas: number | null
): number | null {
  if (visitas === null || visitas <= 0) return null;
  return Math.round((confirmadas / visitas) * 1000) / 10;
}

/**
 * Deriva os KPIs consolidados do profissional a partir dos agregados ∑
 * canônicos. Determinística: mesmos inputs → mesmo resultado (a idempotência
 * do agregado do dashboard decorre daqui + escrita por substituição total).
 *
 * - `inscricoesTotais`/`receitaConfirmada`: soma de TODOS os eventos do
 *   profissional (rascunho incluso — é o total do negócio);
 * - `vagasRestantes`/`eventoEmRisco`: só eventos PÚBLICOS (publicado/ao_vivo)
 *   com capacidade conhecida — rascunho não vende vaga;
 * - empate de risco: maior ocupação vence; empate exato → primeiro da lista.
 * @pure
 */
export function derivarKpis(
  eventos: readonly EventoKpiInput[],
  clubes: readonly ClubeKpiInput[],
  janelaInscricoes: JanelaInscricoes | null = null,
  visitas: number | null = null
): OverviewKPIs {
  let inscricoesTotais = 0;
  let receitaConfirmada = 0;
  let vagasRestantes = 0;
  let emRisco: { nome: string; slug: string } | null = null;
  let maiorOcupacao = -1;

  for (const evento of eventos) {
    inscricoesTotais += evento.qtdInscritos;
    receitaConfirmada += evento.receitaConfirmada;

    if (!eventoPublico(evento.status)) continue;

    const vagas = vagasRestantesDoEvento(evento);
    if (vagas !== null) vagasRestantes += vagas;

    const ocupacao = ocupacaoDoEvento(evento);
    if (
      ocupacao !== null &&
      ocupacao >= LIMIAR_ESGOTANDO &&
      ocupacao > maiorOcupacao
    ) {
      maiorOcupacao = ocupacao;
      emRisco = { nome: evento.nome, slug: evento.slug };
    }
  }

  let membrosAtivosTotais = 0;
  let desafiosAtivosTotais = 0;
  for (const clube of clubes) {
    membrosAtivosTotais += clube.qtdMembrosAtivos;
    desafiosAtivosTotais += clube.qtdDesafiosAtivos;
  }

  return {
    inscricoesTotais,
    inscricoesTrendPct: janelaInscricoes
      ? derivarTrendPct(janelaInscricoes.atual, janelaInscricoes.anterior)
      : null,
    receitaConfirmada,
    // Inscrito não carrega `valor` no modelo canônico da Onda 1 — sem série
    // financeira por janela, o trend de receita fica null (UI mostra "—").
    receitaTrendPct: null,
    vagasRestantes,
    eventoEmRisco: emRisco,
    taxaConversaoPct: derivarTaxaConversao(inscricoesTotais, visitas),
    conversaoSparkline: [],
    membrosAtivosTotais,
    desafiosAtivosTotais,
  };
}
