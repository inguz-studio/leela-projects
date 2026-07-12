// =============================================================================
// Derivações puras de Distribuição e Estoque de kits (S205-T4 · §2.5).
// Distribuição = retiradas (presença) por kit/modalidade — dado REAL dos
// inscritos. Estoque = saldo por kit via `Kit.capacidade` (o modelo não tem
// estoque físico por item — degradação graciosa quando capacidade ausente).
// =============================================================================

import {
  KITS_INSCRITO,
  presencaRegistrada,
  type Inscrito,
  type Kit,
  type KitInscrito,
} from '@leela/core';
import { kitInscritoLabel } from './kitLabels';

/** % inteira de retirada; 0 quando não há total. @pure */
export function pct(retirados: number, total: number): number {
  return total > 0 ? Math.round((retirados / total) * 100) : 0;
}

// CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): `Kit.id` canônico É o valor do enum
// `KitInscrito` (`kit_ouro`) — o join `inscrito.kit === kit.id` casa DIRETO.
// A ponte de delimitador (`kitCasa`, que reconciliava `kit-ouro`↔`kit_ouro`)
// foi REMOVIDA junto com o seed legado de hífen.

export interface ProgressoKit {
  kit: KitInscrito;
  label: string;
  total: number;
  retirados: number;
  pct: number;
}

/** Retiradas por kit (só confirmados; presença = retirada). @pure */
export function distribuicaoPorKit(inscritos: readonly Inscrito[]): ProgressoKit[] {
  return KITS_INSCRITO.map((kit) => {
    let total = 0;
    let retirados = 0;
    for (const i of inscritos) {
      if (i.status !== 'confirmado' || i.kit !== kit) continue;
      total += 1;
      if (presencaRegistrada(i)) retirados += 1;
    }
    return { kit, label: kitInscritoLabel(kit), total, retirados, pct: pct(retirados, total) };
  });
}

export interface ProgressoModalidade {
  modalidade: string;
  total: number;
  retirados: number;
  pct: number;
}

/** Retiradas por modalidade/percurso configurado. @pure */
export function distribuicaoPorModalidade(
  inscritos: readonly Inscrito[],
  modalidades: readonly string[],
): ProgressoModalidade[] {
  return modalidades.map((modalidade) => {
    let total = 0;
    let retirados = 0;
    for (const i of inscritos) {
      if (i.status !== 'confirmado' || i.modalidade !== modalidade) continue;
      total += 1;
      if (presencaRegistrada(i)) retirados += 1;
    }
    return { modalidade, total, retirados, pct: pct(retirados, total) };
  });
}

export interface EstoqueKit {
  id: string;
  nome: string;
  /** Capacidade configurada; null quando ausente no modelo (degradação). */
  capacidade: number | null;
  retirados: number;
  /** Saldo = capacidade − retirados; null quando capacidade indefinida. */
  saldo: number | null;
  /** Sem saldo (esgotado) — dispara card crítico Vulcão. */
  esgotado: boolean;
}

/**
 * Saldo por kit: junta `Kit` (capacidade) com as retiradas dos inscritos
 * (join por `Kit.id === inscrito.kit`). Capacidade 0/ausente → saldo null
 * ("—"), NUNCA um número fabricado. @pure
 */
export function estoquePorKit(
  kits: readonly Kit[],
  inscritos: readonly Inscrito[],
): EstoqueKit[] {
  return kits.map((kit) => {
    let retirados = 0;
    for (const i of inscritos) {
      if (i.status === 'confirmado' && i.kit === kit.id && presencaRegistrada(i)) {
        retirados += 1;
      }
    }
    const capacidade = kit.capacidade > 0 ? kit.capacidade : null;
    const saldo = capacidade === null ? null : capacidade - retirados;
    return {
      id: kit.id,
      nome: kit.nome,
      capacidade,
      retirados,
      saldo,
      esgotado: saldo !== null && saldo <= 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Agregado de topo do Estoque (KPIs). Sobre o dado REAL (capacidade + presença).
// Capacidade desconhecida NÃO entra no total/disponíveis (null → "—" na UI):
// nunca inventamos um denominador. @pure
// ---------------------------------------------------------------------------

export interface ResumoEstoque {
  /** Σ capacidade dos kits com capacidade conhecida; null se nenhuma. */
  totalCapacidade: number | null;
  /** Σ retiradas (presença) — dado real, independe de capacidade. */
  retirados: number;
  /** Σ saldo dos kits com capacidade conhecida; null se nenhuma. */
  disponiveis: number | null;
  /** Nº de kits esgotados (saldo ≤ 0 com capacidade conhecida). */
  emRisco: number;
}

export function resumoEstoque(
  kits: readonly Kit[],
  inscritos: readonly Inscrito[],
): ResumoEstoque {
  const linhas = estoquePorKit(kits, inscritos);
  const conhecidas = linhas.filter((l) => l.capacidade !== null);
  const retirados = linhas.reduce((s, l) => s + l.retirados, 0);
  const totalCapacidade = conhecidas.length
    ? conhecidas.reduce((s, l) => s + (l.capacidade ?? 0), 0)
    : null;
  const disponiveis = conhecidas.length
    ? conhecidas.reduce((s, l) => s + (l.saldo ?? 0), 0)
    : null;
  const emRisco = linhas.filter((l) => l.esgotado).length;
  return { totalCapacidade, retirados, disponiveis, emRisco };
}

// ---------------------------------------------------------------------------
// Matriz kit × modalidade — a visão densa que serve "não errar o kit": mostra,
// por kit e por modalidade, a DEMANDA (confirmados) e o RETIRADO (presença).
// Ambas as dimensões são dado real (Inscrito tem kit E modalidade). A dimensão
// TAMANHO do mockup NÃO é modelada (nem em Inscrito nem em Kit) → fica como
// dependência de backend na UI, sem números fabricados. @pure
// ---------------------------------------------------------------------------

export interface CelulaMatriz {
  modalidade: string;
  /** Kit é oferecido nesta modalidade (Kit.modalidades)? */
  oferecido: boolean;
  confirmados: number;
  retirados: number;
}

export interface LinhaMatriz {
  id: string;
  nome: string;
  celulas: CelulaMatriz[];
  totalConfirmados: number;
  totalRetirados: number;
  capacidade: number | null;
  saldo: number | null;
  esgotado: boolean;
}

export function matrizEstoque(
  kits: readonly Kit[],
  inscritos: readonly Inscrito[],
  modalidades: readonly string[],
): LinhaMatriz[] {
  return kits.map((kit) => {
    const celulas: CelulaMatriz[] = modalidades.map((modalidade) => {
      let confirmados = 0;
      let retirados = 0;
      for (const i of inscritos) {
        if (i.status === 'confirmado' && i.kit === kit.id && i.modalidade === modalidade) {
          confirmados += 1;
          if (presencaRegistrada(i)) retirados += 1;
        }
      }
      return {
        modalidade,
        oferecido: kit.modalidades.includes(modalidade),
        confirmados,
        retirados,
      };
    });
    const totalConfirmados = celulas.reduce((s, c) => s + c.confirmados, 0);
    const totalRetirados = celulas.reduce((s, c) => s + c.retirados, 0);
    const capacidade = kit.capacidade > 0 ? kit.capacidade : null;
    const saldo = capacidade === null ? null : capacidade - totalRetirados;
    return {
      id: kit.id,
      nome: kit.nome,
      celulas,
      totalConfirmados,
      totalRetirados,
      capacidade,
      saldo,
      esgotado: saldo !== null && saldo <= 0,
    };
  });
}
