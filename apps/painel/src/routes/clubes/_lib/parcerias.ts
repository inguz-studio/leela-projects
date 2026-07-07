// =============================================================================
// Lógica pura da tela de parcerias (S107-T2) — agrupamento em 3 blocos
// (convites pendentes · eventos promovidos · patrocinadores), rótulos e
// formatação. Sem React/DOM: 100% testável. Cor nunca é hex — variantes Badge.
// =============================================================================

import type {
  ModeloComercial,
  Parceria,
  ParceriaEventoAfiliado,
  ParceriaPatrocinador,
  StatusParceria,
} from '@leela/core';
import { isParceriaEventoAfiliado, isParceriaPatrocinador } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Agrupamento nos 3 blocos da SPEC §2.7
// ---------------------------------------------------------------------------

export interface BlocosParcerias {
  /** Convites de afiliação a aceitar/recusar (evento_afiliado pendente). */
  convitesPendentes: ParceriaEventoAfiliado[];
  /** Eventos já promovidos pelo clube (evento_afiliado ativo). */
  eventosPromovidos: ParceriaEventoAfiliado[];
  /** Patrocinadores institucionais ativos (inativos somem — SPEC §2.7). */
  patrocinadores: ParceriaPatrocinador[];
}

export function separarParcerias(parcerias: Parceria[]): BlocosParcerias {
  const convitesPendentes: ParceriaEventoAfiliado[] = [];
  const eventosPromovidos: ParceriaEventoAfiliado[] = [];
  const patrocinadores: ParceriaPatrocinador[] = [];
  for (const p of parcerias) {
    if (isParceriaEventoAfiliado(p)) {
      if (p.status === 'convite_pendente') convitesPendentes.push(p);
      else if (p.status === 'ativa') eventosPromovidos.push(p);
    } else if (isParceriaPatrocinador(p) && p.status !== 'inativa') {
      patrocinadores.push(p);
    }
  }
  return { convitesPendentes, eventosPromovidos, patrocinadores };
}

// ---------------------------------------------------------------------------
// KPIs do topo (SPEC §2.7) — derivados dos blocos já separados. Sem dado
// inventado: só ∑ do que a tela já carrega (eventos promovidos + convites).
// ---------------------------------------------------------------------------

export interface KpisParcerias {
  /** Eventos afiliados ativos + convites pendentes (o pipeline do clube). */
  eventos: number;
  /** ∑ conversões atribuídas aos eventos promovidos. */
  conversoes: number;
  /** ∑ a receber (R$) dos eventos promovidos. */
  valorAReceber: number;
  /** Patrocinadores ativos. */
  patrocinadores: number;
}

export function kpisParcerias(blocos: BlocosParcerias): KpisParcerias {
  const { convitesPendentes, eventosPromovidos, patrocinadores } = blocos;
  return {
    eventos: eventosPromovidos.length + convitesPendentes.length,
    conversoes: eventosPromovidos.reduce((acc, p) => acc + p.conversoes, 0),
    valorAReceber: eventosPromovidos.reduce((acc, p) => acc + p.valorAReceber, 0),
    patrocinadores: patrocinadores.length,
  };
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export interface StatusBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const STATUS_MAPA: Record<StatusParceria, StatusBadgeInfo> = {
  convite_pendente: { label: 'Convite pendente', variant: 'heroico' },
  ativa: { label: 'Ativa', variant: 'vitoria' },
  inativa: { label: 'Inativa', variant: 'neutro' },
};

export function statusParceriaBadge(status: StatusParceria): StatusBadgeInfo {
  return STATUS_MAPA[status] ?? STATUS_MAPA.inativa;
}

const MODELO_MAPA: Record<ModeloComercial, string> = {
  financeiro: 'Financeiro',
  permuta: 'Permuta',
};

export function modeloComercialLabel(modelo: ModeloComercial): string {
  return MODELO_MAPA[modelo] ?? modelo;
}

// ---------------------------------------------------------------------------
// Nome legível do evento a partir do slug (S107)
// ---------------------------------------------------------------------------

/**
 * O `eventoId` é um slug (docId — E03), IDENTIFICADOR, não RÓTULO. A tela de
 * parcerias mostrava o slug cru ("acate-corporativo-2026") no card de convite —
 * design-principles: identificador não é rótulo. Humaniza o slug em nome legível
 * ("Acate Corporativo 2026") p/ o Coordenador reconhecer o evento na hora de
 * aceitar/recusar. Transformação de exibição PURA: o nome canônico do evento
 * (denormalizado por Function) é trabalho de backend — fora do escopo desta UI.
 */
export function eventoNomeLegivel(eventoId: string): string {
  return eventoId
    .split(/[-_]/)
    .filter((parte) => parte.length > 0)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Formatação de moeda (R$) — pt-BR
// ---------------------------------------------------------------------------

/** Formata reais em pt-BR (1234.5 → "R$ 1.234,50"). */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// ---------------------------------------------------------------------------
// Cadastro de patrocinador (S107-T3) — validação pura (espelha shape das Rules)
// ---------------------------------------------------------------------------

/** Contrapartida exige ≥ 20 chars (SPEC-02 / RN-123, mesma da Rule). */
export const CONTRAPARTIDA_MIN = 20;

/** Payload do formulário do modal de patrocinador. */
export interface PatrocinadorInput {
  nome: string;
  modeloComercial: ModeloComercial;
  /** Obrigatório e > 0 quando `modeloComercial == 'financeiro'`. */
  valorAnual?: number;
  contrapartida: string;
  contratoUrl?: string;
}

/**
 * Valida o cadastro de patrocinador (mesma superfície da Rule
 * shapePatrocinadorValido). Retorna lista de erros (vazia = válido).
 */
export function validarPatrocinador(input: PatrocinadorInput): string[] {
  const erros: string[] = [];
  if (!input.nome?.trim()) erros.push('nome é obrigatório');
  if ((input.contrapartida?.trim().length ?? 0) < CONTRAPARTIDA_MIN) {
    erros.push(`contrapartida deve ter no mínimo ${CONTRAPARTIDA_MIN} caracteres`);
  }
  if (input.modeloComercial === 'financeiro') {
    if (input.valorAnual === undefined || !(input.valorAnual > 0)) {
      erros.push('modelo financeiro exige valor anual maior que zero');
    }
  }
  return erros;
}
