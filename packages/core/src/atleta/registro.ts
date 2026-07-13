// =============================================================================
// packages/core/src/atleta/registro.ts
//
// Registro de ação da jornada do atleta (LEELA-S1307-T1 · E13 adiantado ·
// Onda 2 T2-L2 — decisão 10: backend surface-agnostic; telas são Onda 3).
//
// Doc: `atletas/{uid}/registros/{registroId}` — escrita SÓ do dono (Rules).
// O par OPCIONAL `clubeId`+`desafioId` vincula o registro a um desafio no
// path REAL aninhado `clubes/{clubeId}/desafios/{desafioId}` (ADR-009 —
// decisão de path nº 4 do brief: a spec E13 escrevia `desafios/{id}`
// top-level e foi reconciliada aqui).
//
// PONTOS NÃO MORAM NO REGISTRO: o ∑ (com bônus RN-115) é agregado pela
// Function onRegistroWrite em `participantes/{uid}` — o cliente nunca
// escreve pontuação (Rules bloqueiam campo `pontos` no registro e escrita
// em participantes).
//
// Validação: quantidade/unidade/pilar são conferidos CONTRA O CATÁLOGO
// (RN-114 — 16 ações/3 pilares); o denormalizado do cliente nunca vence o
// catálogo.
// =============================================================================

import type { Timestamp } from '../index';
import type { CatalogoAcao, Pilar } from '../clubs/catalogo-acoes';
import { PILARES } from '../clubs/catalogo-acoes';
import type { AcaoDesafio, Desafio, ProgressoPilar } from '../clubs/desafio';
import {
  calcularPontos,
  chaveDia,
  pontosDoRegistro,
  type RegistroAcao,
} from '../clubs/pontuacao';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Origem do registro (E13: integração real Strava/Garmin é pós-V1). */
export type OrigemRegistro = 'manual' | 'assessoria';

export const ORIGENS_REGISTRO: readonly OrigemRegistro[] = [
  'manual',
  'assessoria',
];

export function isOrigemRegistro(v: unknown): v is OrigemRegistro {
  return ORIGENS_REGISTRO.includes(v as OrigemRegistro);
}

/**
 * Registro de ação — `atletas/{uid}/registros/{registroId}`.
 * `pilar`/`unidade` são espelhos informativos do catálogo (denormalização
 * de leitura); a fonte de verdade da pontuação é SEMPRE o catálogo.
 */
export interface Registro {
  id: string;
  /** Ação no catálogo global `catalogoAcoes/{acaoId}` (RN-114). */
  acaoRef: string;
  /** Espelho do catálogo (validado — divergência é erro). */
  pilar: Pilar;
  /** Quantidade na unidade do catálogo (> 0, finita). */
  quantidade: number;
  /** Espelho da unidade do catálogo (validado). */
  unidade: string;
  /** Instante do registro (o dia UTC agrupa os bônus RN-115). */
  data: Timestamp;
  origem: OrigemRegistro;
  /** Par com `desafioId` — path aninhado ADR-009 (ambos ou nenhum). */
  clubeId?: string;
  /** Par com `clubeId`. */
  desafioId?: string;
  criadoEm: Timestamp;
}

/** Payload de criação (sem id/criadoEm — carimbos do caminho de escrita). */
export type RegistroInput = Omit<Registro, 'id' | 'criadoEm'>;

/** Agregado de participação derivado dos registros (doc `participantes`). */
export interface ParticipanteAgregado {
  /** Total com bônus RN-115 (1 casa decimal). */
  pontos: number;
  /** Pontos por pilar com bônus (1 casa decimal). */
  pontosPorPilar: Record<Pilar, number>;
  /** Dias-calendário (UTC) DISTINTOS com registro pontuável na janela. */
  diasAtivos: number;
}

// ---------------------------------------------------------------------------
// Validação pura (RN-114 — sempre contra o catálogo)
// ---------------------------------------------------------------------------

/**
 * Valida um registro CONTRA a ação do catálogo. Retorna a lista de erros
 * (vazia = válido). `acao = null` ⇒ ação inexistente no catálogo.
 * @pure
 */
export function validarRegistro(
  input: Pick<
    RegistroInput,
    'acaoRef' | 'pilar' | 'quantidade' | 'unidade' | 'origem' | 'clubeId' | 'desafioId'
  >,
  acao: CatalogoAcao | null
): string[] {
  const erros: string[] = [];

  if (!acao) {
    erros.push(`Ação '${input.acaoRef}' não existe no catálogo (RN-114).`);
    return erros; // sem catálogo não há mais o que conferir
  }

  if (input.acaoRef !== acao.id) {
    erros.push('acaoRef não corresponde à ação do catálogo.');
  }
  if (input.pilar !== acao.pilar) {
    erros.push(
      `Pilar divergente do catálogo ('${input.pilar}' ≠ '${acao.pilar}').`
    );
  }
  if (input.unidade !== acao.unidade) {
    erros.push(
      `Unidade divergente do catálogo ('${input.unidade}' ≠ '${acao.unidade}').`
    );
  }
  if (
    typeof input.quantidade !== 'number' ||
    !Number.isFinite(input.quantidade) ||
    input.quantidade <= 0
  ) {
    erros.push('quantidade deve ser número finito > 0.');
  }
  if (!isOrigemRegistro(input.origem)) {
    erros.push("origem deve ser 'manual' ou 'assessoria'.");
  }
  const temClube = typeof input.clubeId === 'string' && input.clubeId.length > 0;
  const temDesafio =
    typeof input.desafioId === 'string' && input.desafioId.length > 0;
  if (temClube !== temDesafio) {
    erros.push(
      'clubeId e desafioId andam juntos (path aninhado ADR-009) — ambos ou nenhum.'
    );
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Conversão registro → motor de pontuação (catálogo é a fonte)
// ---------------------------------------------------------------------------

/**
 * Converte um registro (já validado) no input do motor de pontuação.
 * Pilar/pontosBase/unidadeBase saem do CATÁLOGO — nunca do denormalizado.
 * @pure
 */
export function paraRegistroAcao(
  registro: { acaoRef: string; quantidade: number; data: Date },
  acao: CatalogoAcao
): RegistroAcao {
  return {
    acaoId: acao.id,
    pilar: acao.pilar,
    pontosBase: acao.pontosBase,
    unidadeBase: acao.unidadeBase,
    quantidade: registro.quantidade,
    data: registro.data,
  };
}

/** Registro dentro da janela do desafio? (inclusiva nas duas pontas) @pure */
export function dentroDaJanelaDesafio(
  data: Date,
  inicio: Date,
  fim: Date
): boolean {
  const t = data.getTime();
  return t >= inicio.getTime() && t <= fim.getTime();
}

// ---------------------------------------------------------------------------
// Agregação (RN-115 via calcularPontos — fonte única do bônus)
// ---------------------------------------------------------------------------

/** Arredonda a 1 casa decimal (agregados persistidos determinísticos). */
function arred1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Agrega os registros (JÁ filtrados pela janela do desafio e convertidos
 * via paraRegistroAcao) no resumo do participante. Recompute total —
 * idempotente por construção: mesmos registros ⇒ mesmo agregado.
 * @pure
 */
export function agregarParticipante(
  registros: readonly RegistroAcao[]
): ParticipanteAgregado {
  const resultado = calcularPontos(registros);

  const dias = new Set<string>();
  for (const r of registros) {
    if (pontosDoRegistro(r) > 0) dias.add(chaveDia(r.data));
  }

  const pontosPorPilar = {} as Record<Pilar, number>;
  for (const pilar of PILARES) {
    pontosPorPilar[pilar] = arred1(resultado.porPilar[pilar]);
  }

  return {
    pontos: arred1(resultado.total),
    pontosPorPilar,
    diasAtivos: dias.size,
  };
}

// ---------------------------------------------------------------------------
// Progresso do desafio (∑ — consumido por onRegistroWrite)
// ---------------------------------------------------------------------------

/**
 * Meta total do desafio EM PONTOS:
 *   - Modelos B/C: `metaTotalPontos` (RN-110);
 *   - Modelo A: Σ das metas por ação convertidas em pontos via catálogo
 *     (meta/unidadeBase × pontosBase);
 *   - sem meta derivável ⇒ null (progresso fica 0 — nunca inventa meta).
 * @pure
 */
export function metaTotalEmPontos(
  desafio: Pick<Desafio, 'modelo' | 'metaTotalPontos'>,
  acoes: readonly AcaoDesafio[],
  catalogo: (acaoRef: string) => CatalogoAcao | null
): number | null {
  if (desafio.modelo !== 'A') {
    return typeof desafio.metaTotalPontos === 'number' &&
      desafio.metaTotalPontos > 0
      ? desafio.metaTotalPontos
      : null;
  }

  let total = 0;
  for (const acao of acoes) {
    if (typeof acao.meta !== 'number' || acao.meta <= 0) continue;
    const cat = catalogo(acao.acaoRef);
    if (!cat || cat.unidadeBase <= 0 || cat.pontosBase <= 0) continue;
    total += (acao.meta / cat.unidadeBase) * cat.pontosBase;
  }
  return total > 0 ? arred1(total) : null;
}

/**
 * Progresso coletivo do desafio (0–100, inteiro): MÉDIA do progresso
 * individual (pontos/meta, clamp em 100). Sem participantes ou sem meta ⇒ 0.
 * @pure
 */
export function derivarProgressoDesafio(
  participantes: readonly Pick<ParticipanteAgregado, 'pontos'>[],
  metaPontos: number | null
): number {
  if (!metaPontos || metaPontos <= 0 || participantes.length === 0) return 0;
  let soma = 0;
  for (const p of participantes) {
    soma += Math.min(100, (p.pontos / metaPontos) * 100);
  }
  return Math.round(soma / participantes.length);
}

/**
 * Distribuição coletiva por pilar (`progressoPorPilar`): `atual` = MÉDIA
 * dos pontos do pilar entre participantes (1 casa); `meta` = mínimo por
 * pilar (Modelo C — RN-111). Só materializa quando há `minimoPorPilar`
 * (nos demais modelos o campo fica ausente — sem meta não há barra).
 * @pure
 */
export function derivarProgressoPorPilar(
  participantes: readonly Pick<ParticipanteAgregado, 'pontosPorPilar'>[],
  minimoPorPilar: Partial<Record<Pilar, number>> | undefined
): Partial<Record<Pilar, ProgressoPilar>> | null {
  if (!minimoPorPilar || participantes.length === 0) return null;

  const out: Partial<Record<Pilar, ProgressoPilar>> = {};
  for (const pilar of PILARES) {
    const meta = minimoPorPilar[pilar];
    if (typeof meta !== 'number' || meta <= 0) continue;
    let soma = 0;
    for (const p of participantes) soma += p.pontosPorPilar[pilar] ?? 0;
    out[pilar] = { atual: arred1(soma / participantes.length), meta };
  }
  return Object.keys(out).length > 0 ? out : null;
}
