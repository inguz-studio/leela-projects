// =============================================================================
// Derivação dos "seus eventos ativos" da Visão Geral (S601-T1). Pura.
//
// Reusa `emEsgotamento`/`vagasRestantesDoEvento` de @leela/core (fonte única do
// limiar — NÃO duplica LIMIAR_ESGOTANDO). Evento "ativo" = qualquer status que
// não seja `encerrado` (rascunho aparece — é do negócio do produtor).
//
// ⚠ Capacidade: o `Evento` do cliente NÃO carrega `capacidade` (parseEvento não
// a expõe; a resolução canônica evento|Σkits vive no servidor). Aqui ela entra
// como input opcional (null = desconhecida) — sem capacidade não há razão de
// ocupação nem badge "Últimas vagas", coerente com o core (capacidade null →
// fora de vagas/risco). Ver SUMMARY §handoff.
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
  /** null = desconhecida (Onda 1 — cliente não tem o campo) */
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
