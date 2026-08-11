// =============================================================================
// Agenda da Visão Geral (HIFI-REC · protótipo "Visao Geral v3"). Pura.
//
// O protótipo põe um calendário mensal na coluna direita: pontos nos dias com
// evento e a lista do dia selecionado embaixo. A fonte REAL é a MESMA lista de
// eventos do organizador que a tela já busca (countdown/ocupação) — nenhuma
// query nova na primeira tela depois do login.
//
// O protótipo também pinta pontos de DESAFIOS. Desafio vive por club e não há
// agregado por dia legível num round-trip só — impedimento nomeado no handoff
// da lane; a agenda nasce só com eventos e a legenda diz só o que desenha.
//
// Datas em dias CIVIS no fuso do produto (`dataLocalISO`/FUSO_EVENTO) — mesma
// régua do countdown; meia-noite local × UTC não desloca o ponto do calendário.
// =============================================================================

import { dataLocalISO, type StatusEvento, type Timestamp } from '@leela/core';

/** Recorte de um evento para a agenda. */
export interface EventoAgendaInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  data: Timestamp | null;
  local: string;
}

/** Um evento ancorado num dia civil ("2026-09-21"). */
export interface ItemDaAgenda {
  slug: string;
  nome: string;
  local: string;
  status: StatusEvento;
  /** Dia civil ISO no fuso do produto. */
  iso: string;
}

function toMillis(t: Timestamp | null): number | null {
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return null;
}

/**
 * Eventos com data viram itens de agenda; sem data, ficam de fora (um ponto
 * sem dia não existe). Ordenados por dia. @pure
 */
export function derivarAgenda(eventos: readonly EventoAgendaInput[]): ItemDaAgenda[] {
  const itens: ItemDaAgenda[] = [];
  for (const evento of eventos) {
    const ms = toMillis(evento.data);
    if (ms === null) continue;
    itens.push({
      slug: evento.slug,
      nome: evento.nome,
      local: evento.local,
      status: evento.status,
      iso: dataLocalISO(new Date(ms)),
    });
  }
  return itens.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
}

/** Índice dia → itens (consulta O(1) por célula do calendário). @pure */
export function itensPorDia(itens: readonly ItemDaAgenda[]): Map<string, ItemDaAgenda[]> {
  const mapa = new Map<string, ItemDaAgenda[]>();
  for (const item of itens) {
    const lista = mapa.get(item.iso);
    if (lista) lista.push(item);
    else mapa.set(item.iso, [item]);
  }
  return mapa;
}

/** Molde de um mês para a grade (7 colunas, domingo primeiro). */
export interface MesDaAgenda {
  ano: number;
  /** 0-11 (convenção Date). */
  mes: number;
  /** "Agosto 2026" (pt-BR, capitalizado — o protótipo nomeia assim). */
  rotulo: string;
  /** Dias no mês (28-31). */
  dias: number;
  /** Dia da semana do dia 1 (0=domingo) — células vazias antes dele. */
  offset: number;
}

/** "2026-08-06" → { ano: 2026, mes: 7 }. @pure */
export function anoMesDoISO(iso: string): { ano: number; mes: number } {
  return { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) - 1 };
}

/** ISO civil de (ano, mes 0-11, dia). @pure */
export function isoDoDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Molde do mês. Datas civis em UTC — dia civil não tem fuso. @pure */
export function mesDaAgenda(ano: number, mes: number): MesDaAgenda {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(
    primeiro
  );
  return {
    ano,
    mes,
    rotulo: `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`,
    dias: new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate(),
    offset: primeiro.getUTCDay(),
  };
}

/** Mês vizinho (delta ±1 atravessa dezembro/janeiro). @pure */
export function mesVizinho(
  ano: number,
  mes: number,
  delta: 1 | -1
): { ano: number; mes: number } {
  const d = new Date(Date.UTC(ano, mes + delta, 1));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() };
}

/** "2026-08-06" → "6 de Agosto 2026" (título do dia no protótipo). @pure */
export function rotuloDoDia(iso: string): string {
  const { ano, mes } = anoMesDoISO(iso);
  const dia = Number(iso.slice(8, 10));
  return `${dia} de ${mesDaAgenda(ano, mes).rotulo}`;
}

/** Letras da linha de dias da semana do protótipo (domingo primeiro). */
export const DIAS_DA_SEMANA: readonly string[] = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Rótulo do status para a etiqueta do item ("Publicado" — real, sem inventar). */
export const ROTULO_STATUS: Record<StatusEvento, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  ao_vivo: 'Ao vivo',
  encerrado: 'Encerrado',
};
