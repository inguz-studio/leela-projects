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
