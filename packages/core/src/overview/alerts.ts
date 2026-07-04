// =============================================================================
// packages/core/src/overview/alerts.ts
//
// Alertas operacionais da Visão Geral (LEELA-S602-T2 · derivação server-side
// entregue pelo lote E02-L1, dono do backend do overview — brief E02).
//
// Regras PURAS — a Cloud Function monta os inputs (varredura fica no servidor,
// nunca no cliente) e devolve a lista via `getOverview -> { ...KPIs, alerts[] }`
// (decisão pendente nº 3 do brief: contrato único, 1 round-trip).
//
// Regras derivadas na Onda 1:
//   1. ocupação ≥ LIMIAR_ESGOTANDO (evento público)      → warn
//   2. inscrições `pendente` há mais de 24h (RN-204)      → info
//   3. evento rascunho com prova a ≤ 14 dias              → warn
// Fora da Onda 1: repasse confirmado (ok) — depende do financeiro (E09);
// a severidade 'ok' já está no contrato para o L3 não quebrar quando chegar.
// =============================================================================

import type { StatusEvento } from '../eventos/evento';
import { emEsgotamento, ocupacaoDoEvento } from './kpis';

// ---------------------------------------------------------------------------
// Constantes de negócio
// ---------------------------------------------------------------------------

/** Pendência de pagamento vira alerta após este prazo (RN-204). */
export const PENDENTE_ALERTA_HORAS = 24;

/** Rascunho com prova a ≤ N dias vira alerta de publicação. */
export const PRAZO_PUBLICACAO_DIAS = 14;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type SeveridadeAlerta = 'warn' | 'info' | 'ok';

/** Alerta operacional do painel (contrato S602-T2). */
export interface OverviewAlert {
  id: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  /** Tempo relativo pt-BR calculado na derivação ("há 2h", "ontem"…) */
  quando: string;
  /** ISO-8601 do fato que ancora o alerta — permite reformatar na UI */
  em: string;
  href?: string;
}

/** Recorte de um evento do profissional relevante para alertas. */
export interface EventoAlertaInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  qtdInscritos: number;
  /** Mesma resolução de capacidade dos KPIs (evento ou Σ kits; null = desconhecida) */
  capacidade: number | null;
  /** Data da prova; null quando ausente/malformada */
  dataProva: Date | null;
  /** Último write do doc — âncora temporal do alerta de ocupação/publicação */
  atualizadoEm: Date | null;
}

/** Pendências de pagamento > 24h agregadas cross-evento (RN-204). */
export interface PendentesAlertaInput {
  qtd: number;
  /** criadoEm da pendência mais RECENTE dentro do corte (âncora temporal) */
  maisRecenteEm: Date | null;
}

// ---------------------------------------------------------------------------
// Formatação de tempo relativo (pt-BR)
// ---------------------------------------------------------------------------

const MIN_MS = 60_000;
const HORA_MS = 60 * MIN_MS;
const DIA_MS = 24 * HORA_MS;

/**
 * Tempo relativo pt-BR ("agora", "há 35min", "há 2h", "ontem", "há 3 dias").
 * @pure
 */
export function formatarRelativo(em: Date, agora: Date): string {
  const delta = agora.getTime() - em.getTime();
  if (delta < MIN_MS) return 'agora';
  if (delta < HORA_MS) return `há ${Math.floor(delta / MIN_MS)}min`;
  if (delta < DIA_MS) return `há ${Math.floor(delta / HORA_MS)}h`;
  if (delta < 2 * DIA_MS) return 'ontem';
  return `há ${Math.floor(delta / DIA_MS)} dias`;
}

// ---------------------------------------------------------------------------
// Derivação
// ---------------------------------------------------------------------------

const PESO_SEVERIDADE: Record<SeveridadeAlerta, number> = {
  warn: 2,
  info: 1,
  ok: 0,
};

/**
 * Deriva os alertas operacionais do profissional. Determinística: ordena por
 * recência (desc), empate por severidade (warn > info > ok) e id.
 * @pure
 */
export function derivarAlertas(
  eventos: readonly EventoAlertaInput[],
  pendentes: PendentesAlertaInput,
  agora: Date
): OverviewAlert[] {
  const alertas: OverviewAlert[] = [];

  for (const evento of eventos) {
    // 1. Ocupação ≥ limiar — mesmo limiar do KPI/badge (fonte única em kpis.ts)
    if (emEsgotamento(evento)) {
      const ocupacao = ocupacaoDoEvento(evento);
      const pct = Math.min(100, Math.floor((ocupacao ?? 0) * 100));
      const em = evento.atualizadoEm ?? agora;
      alertas.push({
        id: `ocupacao-${evento.slug}`,
        severidade: 'warn',
        titulo: `${evento.nome} está com ${pct}% das vagas preenchidas`,
        quando: formatarRelativo(em, agora),
        em: em.toISOString(),
        href: `/eventos/${evento.slug}`,
      });
    }

    // 3. Rascunho com prova próxima — prazo de publicação
    if (evento.status === 'rascunho' && evento.dataProva) {
      const diasRestantes = Math.ceil(
        (evento.dataProva.getTime() - agora.getTime()) / DIA_MS
      );
      if (diasRestantes >= 0 && diasRestantes <= PRAZO_PUBLICACAO_DIAS) {
        const em = evento.atualizadoEm ?? agora;
        alertas.push({
          id: `publicacao-${evento.slug}`,
          severidade: 'warn',
          titulo:
            `${evento.nome} ainda não foi publicado · prazo ` +
            `${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`,
          quando: formatarRelativo(em, agora),
          em: em.toISOString(),
          href: `/eventos/${evento.slug}`,
        });
      }
    }
  }

  // 2. Pendências de pagamento > 24h (RN-204 — cross-evento)
  if (pendentes.qtd > 0) {
    const em = pendentes.maisRecenteEm ?? agora;
    const plural = pendentes.qtd > 1;
    alertas.push({
      id: 'pendentes-24h',
      severidade: 'info',
      titulo: plural
        ? `${pendentes.qtd} inscrições pendentes aguardam pagamento há mais de ${PENDENTE_ALERTA_HORAS}h`
        : `1 inscrição pendente aguarda pagamento há mais de ${PENDENTE_ALERTA_HORAS}h`,
      quando: formatarRelativo(em, agora),
      em: em.toISOString(),
    });
  }

  return alertas.sort((a, b) => {
    const porRecencia = b.em.localeCompare(a.em);
    if (porRecencia !== 0) return porRecencia;
    const porSeveridade = PESO_SEVERIDADE[b.severidade] - PESO_SEVERIDADE[a.severidade];
    if (porSeveridade !== 0) return porSeveridade;
    return a.id.localeCompare(b.id);
  });
}
