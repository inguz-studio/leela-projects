// =============================================================================
// Helpers PUROS do formulário de lote (S300 · E04 · ADR-012). Sem React/DOM —
// 100% testável. É a FIAÇÃO DE MONEY-CONFIG que a Fable-review deve olhar:
//   - preço em R$ → cent-exato (arredondarCentavos) para passar `moneyCentExato`
//     na Rule; a UI nunca inventa sub-centavo;
//   - janela `inicioEm`/`fimEm` via datetime-local PINADO em `FUSO_EVENTO`
//     (America/Sao_Paulo — S300-T4 review · achado #2): a parede digitada é
//     lida/exibida SEMPRE no fuso do produto (dataHoraLocalParaDate/
//     dataHoraLocalISO do core), nunca no fuso do navegador — organizador em
//     Manaus e tabela pinada veem a MESMA hora, e a virada (S300-T2) recebe o
//     instante absoluto certo;
//   - validação = KERNEL (`loteShapeValido` + `validarLotesModalidade`), nunca
//     regra de lote reinventada aqui. A Rule é a autoridade final; isto é o
//     pré-check read-your-writes (a Rule não itera irmãos, por isso a
//     não-sobreposição é checada aqui contra os lotes já carregados).
//
// `vendidos` NUNCA entra no payload (∑ de Function). O congelamento pós-venda
// (RN-200/300) é `loteImutavel` — a UI desabilita os campos comerciais.
// =============================================================================

import {
  dataHoraLocalISO,
  dataHoraLocalParaDate,
  isDataHoraLocalISO,
  loteAtivo,
  loteEncerrado,
  loteEsgotado,
  loteShapeValido,
  validarLotesModalidade,
  type Lote,
  type Timestamp,
} from '@leela/core';
import type { SalvarLoteInput } from '@leela/api-client';

/** Campos comerciais que a Rule CONGELA quando o lote já vendeu (espelho). */
export const CAMPOS_CONGELADOS_APOS_VENDA = [
  'preco',
  'inicioEm',
  'fimEm',
  'quantidadeLimite',
  'ordem',
] as const;

/** Mensagem exibida quando o lote está congelado por já ter vendido (RN-200/300). */
export const MSG_LOTE_VENDIDO =
  'Lote com venda: preço, janela, vaga e ordem ficam bloqueados (RN-200/300). O nome ainda pode ser ajustado.';

/** Valores brutos do formulário (strings dos inputs). */
export interface LoteFormValues {
  nome: string;
  ordem: string;
  /** datetime-local `YYYY-MM-DDTHH:mm`. */
  inicioEm: string;
  /** datetime-local `YYYY-MM-DDTHH:mm`. */
  fimEm: string;
  quantidadeLimite: string;
  /** Preço em R$ ("99,90"). */
  preco: string;
}

/** Payload completo (criação/edição de lote SEM venda). */
export type LotePayloadCompleto = Omit<SalvarLoteInput, 'tenantId'>;

/**
 * Payload de edição de lote VENDIDO (review S300-T4 #1): a Rule congela os
 * campos comerciais, então SÓ `nome` viaja — nada de re-enviar janela/preço
 * "iguais" e depender de alinhamento de minuto para o diff dar vazio.
 */
export type LotePayloadVendido = Pick<LotePayloadCompleto, 'nome'>;

export type LotePayload = LotePayloadCompleto | LotePayloadVendido;

export type ResultadoValidacao =
  | { ok: true; input: LotePayload }
  | { ok: false; erro: string };

// ---------------------------------------------------------------------------
// Dinheiro
// ---------------------------------------------------------------------------

/** Arredonda a 2 casas (cent-exato) — condição de `moneyCentExato` na Rule. @pure */
export function arredondarCentavos(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Parse de preço em R$ vindo do input ("99,90" ou "99.90") → número cent-exato.
 * `null` quando não-finito ou negativo. Mesma convenção do editor de kit
 * (vírgula→ponto), mais o arredondamento a centavo. @pure
 */
export function parsePrecoReais(s: string): number | null {
  const n = Number.parseFloat(s.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return arredondarCentavos(n);
}

// ---------------------------------------------------------------------------
// Datas ↔ datetime-local
// ---------------------------------------------------------------------------

/** Date → valor de `<input type="datetime-local">` PINADO em FUSO_EVENTO. @pure */
export function dateParaInputLocal(d: Date): string {
  return dataHoraLocalISO(d);
}

/** Timestamp → valor de datetime-local (vazio quando ausente/ilegível). @pure */
export function timestampParaInputLocal(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return dateParaInputLocal(ts.toDate());
}

/**
 * Valor de datetime-local → instante, com a parede interpretada em
 * FUSO_EVENTO (nunca no fuso do navegador); `null` quando vazio/inválido.
 * @pure
 */
export function inputLocalParaDate(s: string): Date | null {
  if (!isDataHoraLocalISO(s)) return null;
  return dataHoraLocalParaDate(s);
}

// ---------------------------------------------------------------------------
// Estado do lote (derivação do KERNEL — nada recalculado à mão)
// ---------------------------------------------------------------------------

/** Lote congelado para o cliente por já ter vendido (RN-200/300). @pure */
export function loteImutavel(lote: Pick<Lote, 'vendidos'>): boolean {
  return lote.vendidos > 0;
}

/** loteId determinístico/legível na criação (mesmo padrão do seed). @pure */
export function novoLoteId(modalidade: string, ordem: number): string {
  return `${modalidade}-lote-${ordem}`;
}

/** Próxima `ordem` sugerida para uma modalidade (max + 1, mínimo 1). @pure */
export function proximaOrdem(lotesDaModalidade: readonly Pick<Lote, 'ordem'>[]): number {
  return lotesDaModalidade.reduce((max, l) => Math.max(max, l.ordem), 0) + 1;
}

export interface EstadoLoteBadge {
  label: string;
  /** Variante do Badge do DS. */
  variant: 'vitoria' | 'vulcao' | 'alerta' | 'neutro';
}

/**
 * Rótulo/variante de estado de um lote no instante `agora`, DERIVADO do kernel
 * (loteAtivo/loteEsgotado/loteEncerrado) — a UI não reimplementa a virada. @pure
 */
export function estadoLoteBadge(
  lote: Lote,
  lotesDaModalidade: readonly Lote[],
  agora: Date,
): EstadoLoteBadge {
  const ativo = loteAtivo(lotesDaModalidade, agora);
  if (ativo && ativo.id === lote.id) return { label: 'Ativo', variant: 'vitoria' };
  if (loteEsgotado(lote)) return { label: 'Esgotado', variant: 'vulcao' };
  if (loteEncerrado(lote, agora)) return { label: 'Encerrado', variant: 'neutro' };
  if (agora.getTime() < lote.inicioEm.toMillis()) return { label: 'Agendado', variant: 'alerta' };
  return { label: 'Aguardando', variant: 'neutro' };
}

// ---------------------------------------------------------------------------
// Timestamp-like (só toMillis/toDate) para alimentar as validações do core
// ---------------------------------------------------------------------------

function tsLike(d: Date): Timestamp {
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

// ---------------------------------------------------------------------------
// Validação do formulário — shape do core + invariante cross-lote do core
// ---------------------------------------------------------------------------

export interface ValidarFormParams {
  values: LoteFormValues;
  /** Modalidade dona do lote (contexto do grupo — ADR-012). */
  modalidade: string;
  /** Id do lote em edição (excluído dos irmãos); null quando criando. */
  loteId: string | null;
  /** Todos os lotes do evento (para checar sobreposição na modalidade). */
  lotesDoEvento: readonly Lote[];
  /**
   * Lote em edição já vendeu (loteImutavel)? Então SÓ o nome é validado e SÓ
   * o nome entra no payload (RN-200/300 — review S300-T4 #1). Default false.
   */
  congelado?: boolean;
}

/**
 * Valida o formulário e devolve o payload (sem tenantId) ou a 1ª mensagem de
 * erro. Ordem: campos básicos → shape do lote (core) → invariante de sequência
 * da modalidade (core, contra os irmãos já carregados). Nenhuma regra de lote é
 * inventada aqui — só se aplica o kernel. @pure
 */
export function validarFormLote(params: ValidarFormParams): ResultadoValidacao {
  const { values, modalidade, loteId, lotesDoEvento, congelado = false } = params;

  const nome = values.nome.trim();
  if (nome.length === 0) return { ok: false, erro: 'Informe o nome do lote.' };

  // Lote VENDIDO: payload mínimo — só o nome (review S300-T4 #1). Os campos
  // comerciais estão desabilitados na UI e congelados na Rule; validar/enviar
  // os valores carregados seria (a) depender de minuto-alinhamento para o
  // diff dar vazio e (b) bloquear um rename por problema pré-existente nos
  // irmãos (sobreposição legada travaria até a troca de nome).
  if (congelado) {
    return { ok: true, input: { nome } };
  }

  const ordem = Number.parseInt(values.ordem, 10);
  if (!Number.isInteger(ordem) || ordem < 1) {
    return { ok: false, erro: 'A ordem deve ser um inteiro ≥ 1.' };
  }

  const quantidadeLimite = Number.parseInt(values.quantidadeLimite, 10);
  if (!Number.isInteger(quantidadeLimite) || quantidadeLimite < 1) {
    return { ok: false, erro: 'A vaga (quantidade limite) deve ser um inteiro ≥ 1.' };
  }

  const preco = parsePrecoReais(values.preco);
  if (preco === null) return { ok: false, erro: 'Preço inválido (use R$ ≥ 0).' };

  const inicioEm = inputLocalParaDate(values.inicioEm);
  const fimEm = inputLocalParaDate(values.fimEm);
  if (!inicioEm || !fimEm) return { ok: false, erro: 'Informe início e fim da janela.' };
  if (fimEm.getTime() <= inicioEm.getTime()) {
    return { ok: false, erro: 'O fim da janela deve ser depois do início.' };
  }

  // Shape do lote pelo KERNEL (mesma checagem que a Rule faz no shape).
  const shapeOk = loteShapeValido({
    modalidade,
    ordem,
    nome,
    inicioEm: tsLike(inicioEm),
    fimEm: tsLike(fimEm),
    quantidadeLimite,
    preco,
  });
  if (!shapeOk) return { ok: false, erro: 'Dados do lote inconsistentes.' };

  // Invariante de sequência da modalidade (ADR-012 · RN-300) contra os irmãos
  // já carregados — a Rule NÃO itera coleção, por isso este pré-check vive aqui.
  const irmaos = lotesDoEvento.filter(
    (l) => l.modalidade === modalidade && l.id !== loteId,
  );
  const projetado = [
    ...irmaos.map((l) => ({
      modalidade: l.modalidade,
      ordem: l.ordem,
      inicioEm: l.inicioEm,
      fimEm: l.fimEm,
    })),
    { modalidade, ordem, inicioEm: tsLike(inicioEm), fimEm: tsLike(fimEm) },
  ];
  const erroSequencia = validarLotesModalidade(projetado);
  if (erroSequencia) return { ok: false, erro: erroSequencia };

  return {
    ok: true,
    input: { modalidade, ordem, nome, inicioEm, fimEm, quantidadeLimite, preco },
  };
}
