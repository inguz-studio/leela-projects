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
} from '@leela/core';

/** Recorte de um evento do produtor relevante para o bloco de eventos ativos. */
export interface EventoAtivoInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  qtdInscritos: number;
  /** null = desconhecida (doc sem capacidade direta — Σkits é server-side) */
  capacidade: number | null;
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
  /** rota de detalhe do evento (E03) — botão "Gerenciar" */
  href: string;
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
    .map((e) => ({
      slug: e.slug,
      nome: e.nome,
      status: e.status,
      qtdInscritos: e.qtdInscritos,
      capacidade: e.capacidade,
      vagasRestantes: vagasRestantesDoEvento(e),
      esgotando: emEsgotamento(e),
      href: `/eventos/${e.slug}`,
    }));
}
