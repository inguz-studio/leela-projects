// =============================================================================
// packages/core/src/clubs/parceria.ts
//
// Entidade Parceria — captura de valor do clube (LEELA-E05 · S107-T1).
// Subcoleção: `clubes/{clubId}/parcerias/{parceriaId}`.
// Union discriminada por `tipo`: evento_afiliado | patrocinador.
//
// RNs: RN-120 (comissão é do organizador; o clube só aceita/recusa),
//      RN-121 (programa de afiliação mora no painel do organizador — E04),
//      RN-122 (termos read-only para o clube),
//      RN-123 (patrocinador: financeiro ou permuta),
//      RN-125 (evento promovido = link master + cupom + comissão).
//
// Campos 🔁 espelhados do programa (comissaoPct, cupom, linkMaster,
// janelaAtribuicaoDias, termosEspelho) e agregados ∑ (conversoes,
// valorAReceber) são de escrita EXCLUSIVA de Function (Admin SDK) — o
// cliente só transiciona `status` (Rules garantem).
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Literal types
// ---------------------------------------------------------------------------

/** Tipo da parceria */
export type TipoParceria = 'evento_afiliado' | 'patrocinador';

/** Ciclo de vida da parceria (aceitar/recusar/pausar transitam aqui) */
export type StatusParceria = 'convite_pendente' | 'ativa' | 'inativa';

/** Modelo comercial do patrocinador (RN-123) */
export type ModeloComercial = 'financeiro' | 'permuta';

export const TIPOS_PARCERIA: readonly TipoParceria[] = [
  'evento_afiliado',
  'patrocinador',
];
export const STATUS_PARCERIA: readonly StatusParceria[] = [
  'convite_pendente',
  'ativa',
  'inativa',
];
export const MODELOS_COMERCIAIS: readonly ModeloComercial[] = [
  'financeiro',
  'permuta',
];

export function isTipoParceria(v: unknown): v is TipoParceria {
  return TIPOS_PARCERIA.includes(v as TipoParceria);
}

export function isStatusParceria(v: unknown): v is StatusParceria {
  return STATUS_PARCERIA.includes(v as StatusParceria);
}

export function isModeloComercial(v: unknown): v is ModeloComercial {
  return MODELOS_COMERCIAIS.includes(v as ModeloComercial);
}

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

/**
 * Espelho READ-ONLY dos termos do programa de afiliação (RN-121/122).
 * Cópia desnormalizada mantida por Function a partir de
 * `eventos/{id}/programaAfiliacao` — alimenta o modal de termos (S107-T5).
 */
export interface TermosEspelho {
  /** Critério de liberação da comissão (copy, ex.: "Após 28 Abr 2026") */
  criterioLiberacao: string;
  /** Prazo de repasse em dias úteis após liberação */
  prazoRepasseDiasUteis: number;
  /** Teto mensal de comissão — null = sem limite */
  tetoMensal: number | null;
}

interface ParceriaBase {
  id: string;
  /** Propagado do clube pai (ADR-009) */
  tenantId: string;
  status: StatusParceria;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Evento promovido pelo clube (afiliação — RN-125).
 * Campos 🔁 espelhados do programa e ∑ são de escrita exclusiva de Function.
 */
export interface ParceriaEventoAfiliado extends ParceriaBase {
  tipo: 'evento_afiliado';
  /** Evento promovido (docId = slug — E03) */
  eventoId: string;
  organizadorId: string;
  /** Path do programa de origem: eventos/{id}/programaAfiliacao/{doc} */
  programaAfiliacaoRef: string;
  /** 🔁 Comissão % definida pelo ORGANIZADOR (RN-120) — nunca pelo clube */
  comissaoPct: number;
  /** 🔁 Cupom exclusivo do clube — null quando o programa não oferece */
  cupom: string | null;
  /** 🔁 Link master rastreável (RN-125) */
  linkMaster: string;
  /** 🔁 Janela de atribuição da conversão, em dias */
  janelaAtribuicaoDias: number;
  /** 🔁 Termos completos espelhados (modal read-only — RN-122) */
  termosEspelho: TermosEspelho;
  /** ∑ Conversões atribuídas — mantido por Function (onConversao) */
  conversoes: number;
  /** ∑ Valor a receber (R$) — mantido por Function (onConversao) */
  valorAReceber: number;
}

/** Patrocinador institucional do clube (RN-123). */
export interface ParceriaPatrocinador extends ParceriaBase {
  tipo: 'patrocinador';
  nome: string;
  modeloComercial: ModeloComercial;
  /** Obrigatório quando modeloComercial == 'financeiro' (R$/ano) */
  valorAnual?: number;
  /** O que o patrocinador recebe/entrega (≥ 20 chars — SPEC-02) */
  contrapartida: string;
  contratoUrl?: string;
}

/** Union discriminada por `tipo`. */
export type Parceria = ParceriaEventoAfiliado | ParceriaPatrocinador;

// ---------------------------------------------------------------------------
// Guards do union
// ---------------------------------------------------------------------------

export function isParceriaEventoAfiliado(
  p: Parceria
): p is ParceriaEventoAfiliado {
  return p.tipo === 'evento_afiliado';
}

export function isParceriaPatrocinador(
  p: Parceria
): p is ParceriaPatrocinador {
  return p.tipo === 'patrocinador';
}

/** Campos ∑ da parceria — escrita exclusiva de Function (Rules negam). */
export const CAMPOS_AGREGADOS_PARCERIA = [
  'conversoes',
  'valorAReceber',
] as const;

/**
 * Campos espelhados do programa (RN-120/121/122) — o clube NUNCA os
 * escreve; junto com os ∑, formam o conjunto intocável pelo cliente.
 */
export const CAMPOS_ESPELHO_PARCERIA = [
  'comissaoPct',
  'cupom',
  'linkMaster',
  'janelaAtribuicaoDias',
  'termosEspelho',
  'programaAfiliacaoRef',
] as const;

// ---------------------------------------------------------------------------
// Janela de atribuição (RN-125)
// ---------------------------------------------------------------------------

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Uma conversão só é atribuída ao clube se aconteceu DENTRO da janela de
 * atribuição contada a partir do clique inicial (RN-125). Limite inclusivo:
 * converter exatamente no fim da janela ainda atribui.
 */
export function dentroDaJanelaAtribuicao(
  clicadoEm: Date,
  convertidoEm: Date,
  janelaAtribuicaoDias: number
): boolean {
  const delta = convertidoEm.getTime() - clicadoEm.getTime();
  if (delta < 0) return false; // conversão antes do clique = dado inválido
  return delta <= janelaAtribuicaoDias * DIA_MS;
}
