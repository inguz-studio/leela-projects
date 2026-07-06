// =============================================================================
// Derivação dos "seus eventos ativos" da Visão Geral (S601-T1). Pura.
//
// Reusa `emEsgotamento`/`vagasRestantesDoEvento` de @leela/core (fonte única do
// limiar — NÃO duplica LIMIAR_ESGOTANDO). Evento "ativo" = qualquer status que
// não seja `encerrado` (rascunho aparece — é do negócio do produtor).
//
// Capacidade: `parseEvento` expõe a capacidade DIRETA do doc (S600-T2-fix);
// a resolução canônica evento|Σkits segue no servidor (RN-210). Aqui ela entra
// como input nullable (null = desconhecida) — sem capacidade não há razão de
// ocupação nem badge "Últimas vagas", coerente com o core (capacidade null →
// fora de vagas/risco).
// =============================================================================

import {
  emEsgotamento,
  vagasRestantesDoEvento,
  type StatusEvento,
  type Timestamp,
} from '@leela/core';
import type { EventThumbVariant } from '@leela/design-system';
import { formatDataCurta } from './format';

/** Recorte de um evento do produtor relevante para o bloco de eventos ativos. */
export interface EventoAtivoInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  qtdInscritos: number;
  /** null = desconhecida (doc sem capacidade direta — Σkits é server-side) */
  capacidade: number | null;
  /** Data da prova (meta da event-row: "27 Abr · Local") */
  data?: Timestamp | null;
  /** Local da prova (meta da event-row) */
  local?: string;
  /** Percursos/modalidades — entrada da heurística de thumb */
  modalidades?: readonly string[];
}

/** Linha renderizável do bloco de eventos ativos. */
export interface EventoAtivoView {
  slug: string;
  nome: string;
  status: StatusEvento;
  qtdInscritos: number;
  capacidade: number | null;
  /** null quando capacidade desconhecida */
  vagasRestantes: number | null;
  /** ocupação ≥ limiar (evento público com capacidade) → badge "Últimas vagas" */
  esgotando: boolean;
  /** capacidade conhecida e ZERO vagas → badge "Esgotado" (QA m2; substitui "Últimas vagas") */
  esgotado: boolean;
  /** rota de detalhe do evento (E03) — botão "Gerenciar" */
  href: string;
  /** "27 Abr · Florianópolis/SC" (null quando não há data nem local) */
  quando: string | null;
  /** Variante do thumb do EventRow (heurística de APRESENTAÇÃO, ver abaixo) */
  thumbVariant: EventThumbVariant;
}

// ---------------------------------------------------------------------------
// Heurística de thumb — APRESENTAÇÃO, não dado: escolhe o gradiente do
// EventRow por palavras-chave das modalidades/nome. O domínio LEELA é corrida
// (default); os demais só acendem com sinal explícito. Errar aqui muda uma
// COR decorativa, nunca um número.
// ---------------------------------------------------------------------------

const THUMB_KEYWORDS: ReadonlyArray<[RegExp, EventThumbVariant]> = [
  [/mtb|bike|cicli|pedal/i, 'ciclismo'],
  [/yoga|bem-estar|retiro/i, 'yoga'],
  [/virtual/i, 'virtual'],
  [/crossfit|\bwod\b/i, 'crossfit'],
];

/** Variante de thumb do evento a partir de modalidades + nome. @pure */
export function thumbVariantDoEvento(
  modalidades: readonly string[],
  nome: string
): EventThumbVariant {
  const alvo = [...modalidades, nome].join(' ');
  for (const [re, variant] of THUMB_KEYWORDS) {
    if (re.test(alvo)) return variant;
  }
  return 'corrida';
}

function millis(t: Timestamp | null | undefined): number | null {
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return null;
}

/** "27 Abr · Florianópolis/SC" — data curta e/ou local; null sem ambos. @pure */
export function quandoDoEvento(
  data: Timestamp | null | undefined,
  local: string | undefined
): string | null {
  const ms = millis(data);
  const partes = [
    ms !== null ? formatDataCurta(new Date(ms)) : null,
    local && local.length > 0 ? local : null,
  ].filter((p): p is string => p !== null);
  return partes.length > 0 ? partes.join(' · ') : null;
}

/**
 * Deriva os eventos ativos (não encerrados) preservando a ordem recebida
 * (a listagem do organizador já vem por data asc). Anota vagas + esgotamento.
 * @pure
 */
export function derivarEventosAtivos(
  eventos: readonly EventoAtivoInput[]
): EventoAtivoView[] {
  return eventos
    .filter((e) => e.status !== 'encerrado')
    .map((e) => {
      const vagasRestantes = vagasRestantesDoEvento(e);
      return {
        slug: e.slug,
        nome: e.nome,
        status: e.status,
        qtdInscritos: e.qtdInscritos,
        capacidade: e.capacidade,
        vagasRestantes,
        esgotando: emEsgotamento(e),
        esgotado: e.capacidade !== null && vagasRestantes === 0,
        href: `/eventos/${e.slug}`,
        quando: quandoDoEvento(e.data, e.local),
        thumbVariant: thumbVariantDoEvento(e.modalidades ?? [], e.nome),
      };
    });
}
