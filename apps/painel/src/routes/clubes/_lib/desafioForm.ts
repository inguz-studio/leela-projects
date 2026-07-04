// =============================================================================
// Lógica pura do editor de desafio (S106-T2). Modela o estado do formulário,
// deriva o resumo ao vivo (C16) e faz a ponte para a validação de publicação
// do core (validarPublicacao — RN-110/111). Sem React/DOM: 100% testável.
// =============================================================================

import type {
  AcaoDesafio,
  CatalogoAcao,
  Desafio,
  DesafioParaPublicar,
  ModeloDesafio,
  Pilar,
  RecompensaTipo,
  Timestamp,
  VisibilidadeDesafio,
} from '@leela/core';
import { PILARES, validarPublicacao } from '@leela/core';

// ---------------------------------------------------------------------------
// Estado do formulário (strings — inputs controlados)
// ---------------------------------------------------------------------------

/** Ação selecionada do catálogo, com meta opcional (obrigatória no Modelo A). */
export interface AcaoSelecionada {
  acaoRef: string;
  /** Meta (string do input); só relevante no Modelo A. */
  meta: string;
}

export interface DesafioFormValues {
  nome: string;
  descricao: string;
  modelo: ModeloDesafio;
  dataInicio: string;
  dataFim: string;
  /** Meta total de pontos (modelos B e C). */
  metaTotalPontos: string;
  /** Mínimo por pilar (Modelo C — RN-111). */
  minimoPorPilar: Record<Pilar, string>;
  /** Ações selecionadas por id do catálogo. */
  acoes: Record<string, AcaoSelecionada>;
  recompensaTipo: RecompensaTipo;
  visibilidade: VisibilidadeDesafio;
  /** Evento vinculado (RN-113) — copy "(Preparação para …)". */
  eventoVinculadoNome?: string;
}

export const VALORES_INICIAIS_DESAFIO: DesafioFormValues = {
  nome: '',
  descricao: '',
  modelo: 'B',
  dataInicio: '',
  dataFim: '',
  metaTotalPontos: '',
  minimoPorPilar: { fisico: '', mental: '', espiritual: '' },
  acoes: {},
  recompensaTipo: 'medalha_digital',
  visibilidade: 'membros',
};

// ---------------------------------------------------------------------------
// Toggle de ação (imutável) — marcar/desmarcar recalcula o resumo (C16)
// ---------------------------------------------------------------------------

export function toggleAcao(
  values: DesafioFormValues,
  acaoRef: string,
): DesafioFormValues {
  const acoes = { ...values.acoes };
  if (acoes[acaoRef]) delete acoes[acaoRef];
  else acoes[acaoRef] = { acaoRef, meta: '' };
  return { ...values, acoes };
}

export function setMetaAcao(
  values: DesafioFormValues,
  acaoRef: string,
  meta: string,
): DesafioFormValues {
  const atual = values.acoes[acaoRef];
  if (!atual) return values;
  return { ...values, acoes: { ...values.acoes, [acaoRef]: { ...atual, meta } } };
}

// ---------------------------------------------------------------------------
// Resumo ao vivo (C16)
// ---------------------------------------------------------------------------

export interface ResumoDesafio {
  totalAcoes: number;
  /** Nº de ações selecionadas por pilar. */
  porPilar: Record<Pilar, number>;
  /** Modelo C opera os 3 pilares → cobertura completa? */
  cobreTresPilares: boolean;
}

/** Deriva o resumo ao vivo a partir das ações selecionadas + catálogo. */
export function resumoDesafio(
  values: DesafioFormValues,
  catalogo: readonly CatalogoAcao[],
): ResumoDesafio {
  const porPilar: Record<Pilar, number> = { fisico: 0, mental: 0, espiritual: 0 };
  const selecionadas = Object.keys(values.acoes);
  for (const ref of selecionadas) {
    const acao = catalogo.find((a) => a.id === ref);
    if (acao) porPilar[acao.pilar] += 1;
  }
  return {
    totalAcoes: selecionadas.length,
    porPilar,
    cobreTresPilares: PILARES.every((p) => porPilar[p] > 0),
  };
}

// ---------------------------------------------------------------------------
// Ponte para o core (build + validação de publicação)
// ---------------------------------------------------------------------------

function numOrUndef(s: string): number | undefined {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

/** Constrói a lista de ações (junção N:N) a partir do estado do form. */
export function buildAcoes(values: DesafioFormValues): AcaoDesafio[] {
  return Object.values(values.acoes).map((a) => {
    const meta = numOrUndef(a.meta);
    return meta !== undefined ? { acaoRef: a.acaoRef, meta } : { acaoRef: a.acaoRef };
  });
}

/** Constrói o subconjunto necessário para validar publicação (datas → Date). */
export function buildParaPublicar(values: DesafioFormValues): DesafioParaPublicar {
  const minimoPorPilar: Partial<Record<Pilar, number>> = {};
  for (const p of PILARES) {
    const v = numOrUndef(values.minimoPorPilar[p]);
    if (v !== undefined) minimoPorPilar[p] = v;
  }
  const base: DesafioParaPublicar = {
    nome: values.nome,
    modelo: values.modelo,
    dataInicio: new Date(values.dataInicio),
    dataFim: new Date(values.dataFim),
  };
  const metaTotal = numOrUndef(values.metaTotalPontos);
  if (metaTotal !== undefined) base.metaTotalPontos = metaTotal;
  if (Object.keys(minimoPorPilar).length > 0) base.minimoPorPilar = minimoPorPilar;
  return base;
}

/**
 * Valida a publicação do desafio (delegando ao core). Retorna a lista de erros
 * (vazia = pode publicar). Modelo C sem mínimo nos 3 pilares → erro (RN-111).
 */
export function validarDesafioForm(values: DesafioFormValues): string[] {
  // Datas ausentes: mensagem amigável antes de o core comparar Invalid Dates.
  const erros: string[] = [];
  if (!values.dataInicio) erros.push('data de início é obrigatória');
  if (!values.dataFim) erros.push('data de término é obrigatória');
  if (erros.length > 0) {
    // Ainda roda o core p/ capturar nome/ações/modelo, mas sem datas.
    const semDatas = validarPublicacao(
      { ...buildParaPublicar(values), dataInicio: new Date(0), dataFim: new Date(1) },
      buildAcoes(values),
    ).filter((e) => !e.includes('dataFim'));
    return [...erros, ...semDatas];
  }
  return validarPublicacao(buildParaPublicar(values), buildAcoes(values));
}

export function podePublicarForm(values: DesafioFormValues): boolean {
  return validarDesafioForm(values).length === 0;
}

// ---------------------------------------------------------------------------
// Mapeamento Desafio (backend) → form (modo edição, pré-preenchido)
// ---------------------------------------------------------------------------

function tsParaData(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return ts.toDate().toISOString().slice(0, 10);
}

/**
 * Converte um Desafio do backend nos valores do formulário (edição). A junção
 * de ações (`acoes`) não é reidratada aqui (leitura separada) — o editor
 * pré-preenche identidade/modelo/metas/recompensa/visibilidade.
 */
export function desafioToForm(d: Desafio): DesafioFormValues {
  const minimoPorPilar: Record<Pilar, string> = { fisico: '', mental: '', espiritual: '' };
  for (const p of PILARES) {
    const v = d.minimoPorPilar?.[p];
    if (v !== undefined) minimoPorPilar[p] = String(v);
  }
  return {
    nome: d.nome,
    descricao: d.descricao,
    modelo: d.modelo,
    dataInicio: tsParaData(d.dataInicio),
    dataFim: tsParaData(d.dataFim),
    metaTotalPontos: d.metaTotalPontos !== undefined ? String(d.metaTotalPontos) : '',
    minimoPorPilar,
    acoes: {},
    recompensaTipo: d.recompensaTipo,
    visibilidade: d.visibilidade,
  };
}
