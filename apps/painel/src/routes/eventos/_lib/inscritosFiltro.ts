// =============================================================================
// Filtragem pura da lista de inscritos (S203-T2 · §2.5/§2.7).
// Busca por nome (case/acento-insensível) + filtros por status/kit/modalidade.
// Sem React/DOM — 100% testável. A tela pagina o resultado (18/página).
// =============================================================================

import type { Inscrito, KitInscrito, StatusInscrito } from '@leela/core';
import { STATUS_INSCRITO } from '@leela/core';

export interface FiltroInscritos {
  /** Texto de busca por nome do atleta (opcional) */
  busca?: string;
  /** null/undefined = todos */
  status?: StatusInscrito | null;
  kit?: KitInscrito | null;
  modalidade?: string | null;
}

/** Normaliza para busca: minúsculas, sem acento, sem espaços nas pontas. */
export function normalizarBusca(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Aplica busca + filtros. Ordem preservada (já vem ordenado por nome). @pure */
export function filtrarInscritos(
  inscritos: readonly Inscrito[],
  filtro: FiltroInscritos,
): Inscrito[] {
  const alvo = filtro.busca ? normalizarBusca(filtro.busca) : '';
  return inscritos.filter((i) => {
    if (alvo && !normalizarBusca(i.atletaNome).includes(alvo)) return false;
    if (filtro.status && i.status !== filtro.status) return false;
    if (filtro.kit && i.kit !== filtro.kit) return false;
    if (filtro.modalidade && i.modalidade !== filtro.modalidade) return false;
    return true;
  });
}

/** Texto do contador "mostrando X de Y" (X = filtrados, Y = total). @pure */
export function contadorInscritos(exibidos: number, total: number): string {
  return `Mostrando ${new Intl.NumberFormat('pt-BR').format(exibidos)} de ${new Intl.NumberFormat('pt-BR').format(total)}`;
}

/** Recorta a página `pagina` (1-based) de `pageSize` itens. @pure */
export function paginar<T>(itens: readonly T[], pagina: number, pageSize: number): T[] {
  const inicio = (pagina - 1) * pageSize;
  return itens.slice(inicio, inicio + pageSize);
}

// ---------------------------------------------------------------------------
// Visibilidade de pagamento (dor #1 do Organizador: "inadimplência invisível —
// não sei quem pagou sem checar manual"). O sinal de pagamento no modelo é
// `status`: 'pendente' = ainda não pagou (deve). Estas derivações são puras e
// alimentam as contagens dos filtros e o banner de inadimplência.
// ---------------------------------------------------------------------------

export type ContagemStatus = Record<StatusInscrito, number> & { total: number };

/** Conta inscritos por status (+ total). Base das contagens dos filtros. @pure */
export function contarPorStatus(inscritos: readonly Inscrito[]): ContagemStatus {
  const base = { total: inscritos.length } as ContagemStatus;
  for (const s of STATUS_INSCRITO) base[s] = 0;
  for (const i of inscritos) base[i.status] += 1;
  return base;
}

/** Inscritos com pagamento pendente (status='pendente' = quem deve). @pure */
export function inadimplentes(inscritos: readonly Inscrito[]): Inscrito[] {
  return inscritos.filter((i) => i.status === 'pendente');
}

const HORAS_INADIMPLENCIA = 72;
const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Quantos pendentes já passaram de `horas` desde a inscrição (`criadoEm`) — o
 * recorte "há mais de 72h" do banner. `agora` é injetado (determinismo em
 * teste). Timestamps sem `toMillis` são ignorados (defensivo). @pure
 */
export function contarPendentesAntigos(
  inscritos: readonly Inscrito[],
  agora: Date,
  horas: number = HORAS_INADIMPLENCIA,
): number {
  const limiteMs = agora.getTime() - horas * MS_POR_HORA;
  return inadimplentes(inscritos).filter((i) => {
    const criado = i.criadoEm;
    if (!criado || typeof criado.toMillis !== 'function') return false;
    return criado.toMillis() <= limiteMs;
  }).length;
}
