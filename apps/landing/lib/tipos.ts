// =============================================================================
// apps/landing/lib/tipos.ts
//
// View-models PÚBLICOS da landing (aceite S1200-T2: "só campos públicos").
// Estes tipos são a projeção segura que sai do leitor server-side para os
// Server Components — nenhum campo sensível (organizadorId, tenantId, códigos
// de convite, etc.) cruza para a árvore de render. Datas já vêm formatadas em
// pt-BR (fuso America/Sao_Paulo) para evitar recomputo/serialização no render.
// =============================================================================

import type { CanalSecao, GradeCorte } from '@leela/core';

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
 *
 * VISÃO DE COMPRA (R9-C · RN-227/RN-230): `descricao`/`itens`/`imagemUrl`
 * vêm do doc real quando preenchidos; `null`/`[]` = sem dado → o checkout
 * cai no fallback mock rico (`kitDetalheDados`), nunca vazio. `imagemUrl`
 * já passou pela fronteira http(s) do core (`parseKit`) — seguro p/ <img>.
 */
export interface KitPublico {
  id: string;
  nome: string;
  preco: number;
  modalidades: string[];
  capacidade: number;
  descricao: string | null;
  itens: string[];
  imagemUrl: string | null;
}


/**
 * Item TAMANHADO público do evento (RN-231 · TAMANHOS-GRADE) — projeção
 * mínima do catálogo `itensKit` para o checkout coletar corte→tamanho POR
 * inscrito. `grade` é a grade EFETIVA (legado `tamanhosDisponiveis` já vem
 * normalizado como corte unissex pelo leitor). Sem PII: id/nome/kits/grade.
 */
export interface ItemTamanhadoPublico {
  id: string;
  nome: string;
  /** Ids dos kits que incluem o item (RN-215) — filtra por kit escolhido. */
  kits: string[];
  grade: GradeCorte[];
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

/**
 * Resumo PÚBLICO do organizador para o bloco "Organizado por" (LEELA-R12 ·
 * Frente 3). Só campos já expostos pela projeção pública do perfil (E17 ·
 * `projetarPerfilPublico`) — `handle`/`nome`/`avatarUrl`. NUNCA `ownerUid`/
 * `tenantId`/`organizadorId` (a fronteira de PII de `tipos.ts` continua de pé;
 * o `tenantId` é lido no servidor só para RESOLVER o handle e não atravessa).
 */
export interface OrganizadorPublico {
  handle: string;
  nome: string;
  avatarUrl?: string;
}

/**
 * Política de vendas PÚBLICA (CKMOD · spec §5.3a — resolve o A-1): os
 * PARÂMETROS que o modal "termos da compra + política de cancelamento"
 * renderiza em linguagem humana (RN-338/339/340/343/344) + a versão vigente
 * que o aceite carimba. SEM PII e SEM tenantId — projeção fechada; defaults
 * legais (CDC Art. 49) quando o organizador não configurou.
 */
export interface PoliticaVendasPublica {
  /** Versão VIGENTE (RN-149 pattern) — 1 = defaults legais/doc legado. */
  versao: number;
  reembolso: {
    janelaArrependimentoDias: number;
    corteHoras: number;
    slaAnaliseDias: number;
  };
  transferencia: { habilitada: boolean; janelaHoras: number; taxa: number };
  trocaIngresso: {
    habilitada: boolean;
    janelaHoras: number;
    permiteReembolsoDowngrade: boolean;
  };
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
  /**
   * MODALIDADE ESPORTIVA do evento (corrida/MTB/trail/bem-estar) — o QUE se
   * pratica, distinto do PERCURSO (a distância). LEELA-R12 · Frente 2. Vem de
   * `modalidadeEsporte` no doc quando presente; senão é derivada do nome +
   * distâncias (`esporteDoEvento`). Nunca vazio (default "Corrida de rua").
   */
  modalidadeEsporte: string;
  usaChip: boolean;
  /** ∑ mantido por Function — prova social honesta ("453 inscritos").
   *  LEELA-R12: o DADO permanece; a EXIBIÇÃO foi suprimida (plataforma jovem). */
  qtdInscritos: number;
  imagemUrl?: string;
  /** Organizador público (bloco "Organizado por" → `/@handle`), ou `null`. */
  organizador: OrganizadorPublico | null;
  modalidades: ModalidadePublica[];
  /** Kits do evento (RN-210) — o checkout filtra por modalidade. `[]` se nenhum. */
  kits: KitPublico[];
  /** Itens tamanhados com grade (RN-231) — o checkout coleta corte→tamanho. */
  itensTamanhados: ItemTamanhadoPublico[];
  /** Menor preço vigente entre as modalidades ("a partir de"), ou null. */
  precoMinimo: number | null;
  janelasRetirada: JanelaRetiradaPublica[];
  /** Seções ativas na ordem publicada (config-driven — S1201-T1). */
  secoes: SecaoPublica[];
  seo: { titulo: string; descricao: string };
  estadoVenda: EstadoVenda;
  /**
   * Texto do regulamento da prova (RN-153, ≤50k), quando o organizador o
   * publicou. Exibido em MODAL na página do evento (LP-VENDAS-KIT/T2). Ausente
   * = sem regulamento → o componente de regulamento não renderiza.
   */
  regulamento?: string;
  /** Versão vigente do regulamento (RN-149) — referência de exibição. */
  regulamentoVersao?: number;
  /**
   * Flags de exigência de saúde do evento (RN-146 · CKMOD): dirigem a
   * SUPERFÍCIE do bloco de saúde no checkout (PAR-Q/atestado — D-7). São
   * FLAGS de config, nunca dado de saúde. Default {false,false}.
   */
  exigenciasSaude: { atestado: boolean; parq: boolean };
  /**
   * Política de vendas pública (CKMOD §5.3a) — alimenta o modal dos termos
   * da compra e a versão que o aceite carimba. SEMPRE presente (defaults
   * legais quando não há doc).
   */
  politicaVendas: PoliticaVendasPublica;
  /**
   * Versão VIGENTE do termo de responsabilidade de saúde (template do
   * produto — TERMO_SAUDE_VERSAO_VIGENTE do core).
   */
  termoSaudeVersao: number;
  /**
   * RN-347 (CKMOD · pendência T5 do CKFIX): `true` = evento em modo
   * 'repassada' — o checkout mostra o badge condicional "+ taxa" ANTES do
   * Resumo. Só o FLAG cruza (nunca percentual/termo do tenant — RN-330/404).
   */
  taxaRepassada: boolean;
}

/** Resumo de evento para o card da home marketplace. */
export interface EventoResumo {
  slug: string;
  nome: string;
  /** Data da prova em ISO — ordenação e split próximos/passados (timeline R12). */
  dataISO: string;
  /** `true` = prova ainda por vir (relógio do servidor) — split da timeline R12. */
  futuro: boolean;
  dataLabel: string;
  diaLabel: string;
  mesLabel: string;
  local: string;
  modalidades: string[];
  precoMinimo: number | null;
  estadoVenda: EstadoVenda;
  imagemUrl?: string;
}
