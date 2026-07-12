// =============================================================================
// apps/landing/lib/tipos.ts
//
// View-models PÚBLICOS da landing (aceite S1200-T2: "só campos públicos").
// Estes tipos são a projeção segura que sai do leitor server-side para os
// Server Components — nenhum campo sensível (organizadorId, tenantId, códigos
// de convite, etc.) cruza para a árvore de render. Datas já vêm formatadas em
// pt-BR (fuso America/Sao_Paulo) para evitar recomputo/serialização no render.
// =============================================================================

import type { CanalSecao } from '@leela/core';

/** Estado público de venda derivado (S1201-T3). */
export type EstadoVenda = 'aberto' | 'encerrado' | 'esgotado';

/** Modalidade/percurso com preço vigente derivado (RN-301 / ADR-012). */
export interface ModalidadePublica {
  /** Nome/rótulo da modalidade (ex.: '5k', '10k', '21k'). */
  nome: string;
  /**
   * Preço vigente em R$ (lote ativo da modalidade) OU `null` quando a venda
   * daquela modalidade está fechada. NUNCA fabricado — vem de `precoVigente`.
   */
  precoVigente: number | null;
}

/**
 * Kit público do evento (RN-210/211) — projeção do doc `eventos/{id}/kits`.
 * `preco` é o DELTA sobre a inscrição (NEGATIVO = desconto). `modalidades` é a
 * chave da FILTRAGEM do checkout: o kit só aparece nas modalidades que oferta.
 */
export interface KitPublico {
  id: string;
  nome: string;
  preco: number;
  modalidades: string[];
  capacidade: number;
}

/** Uma janela de retirada de kit (espelho público do cronograma). */
export interface JanelaRetiradaPublica {
  diaLabel: string;
  horaInicio: string;
  horaFim: string;
  local: string;
}

/** Seção ativa da página, na ordem publicada (dirige o SectionRenderer). */
export interface SecaoPublica {
  id: string;
  canal: CanalSecao;
}

/** Evento publicado — projeção pública completa para a página `/{slug}`. */
export interface EventoPublico {
  slug: string;
  nome: string;
  /** Data da prova em ISO (para <time dateTime>). */
  dataISO: string;
  /** Ex.: "27 de abril de 2026". */
  dataLabel: string;
  /** Ex.: "dom.". */
  diaSemanaLabel: string;
  /** Ex.: "07:00". */
  horaLabel: string;
  local: string;
  usaChip: boolean;
  /** ∑ mantido por Function — prova social honesta ("453 inscritos"). */
  qtdInscritos: number;
  imagemUrl?: string;
  modalidades: ModalidadePublica[];
  /** Kits do evento (RN-210) — o checkout filtra por modalidade. `[]` se nenhum. */
  kits: KitPublico[];
  /** Menor preço vigente entre as modalidades ("a partir de"), ou null. */
  precoMinimo: number | null;
  janelasRetirada: JanelaRetiradaPublica[];
  /** Seções ativas na ordem publicada (config-driven — S1201-T1). */
  secoes: SecaoPublica[];
  seo: { titulo: string; descricao: string };
  estadoVenda: EstadoVenda;
}

/** Resumo de evento para o card da home marketplace. */
export interface EventoResumo {
  slug: string;
  nome: string;
  dataLabel: string;
  diaLabel: string;
  mesLabel: string;
  local: string;
  modalidades: string[];
  precoMinimo: number | null;
  estadoVenda: EstadoVenda;
  imagemUrl?: string;
}
