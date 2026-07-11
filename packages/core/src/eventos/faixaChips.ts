// =============================================================================
// packages/core/src/eventos/faixaChips.ts
//
// Faixa/estoque de chips de cronometragem do Evento (LEELA-FABLE-F-T1 ·
// S204/FRENTE F — alertas do balcão: chip órfão, fora-da-faixa, esgotamento).
//
// MODELO: o organizador recebe da cronometragem um LOTE NUMÉRICO de chips
// (ex.: 8001–8600) e configura a faixa no evento (`faixaChips: {inicio, fim}`,
// embutida no doc — mesma decisão do cronograma: config pequena, lida junto,
// sem agregado próprio). O chip FÍSICO segue string alfanumérica
// (`inscrito.chipNumero`, RN-203/206 — ex.: "CHIP-8891"): a ponte é
// `numeroDoChip`, que extrai o componente numérico do código.
//
// Derivações 100% puras — cruzam com `Inscrito` SÓ por leitura de tipo
// (Pick<>), nunca editam inscrito.ts (raia do lote A-T2). O estoque aqui é
// DERIVADO dos vínculos reais (chipNumero carimbado pela Function
// vincularChip) — nunca um contador fabricado.
// =============================================================================

import type { Inscrito } from './inscrito';
import { chipVinculado } from './inscrito';
import { normalizarChip } from './entrega';

// ---------------------------------------------------------------------------
// Tipo + guard
// ---------------------------------------------------------------------------

/**
 * Faixa numérica de chips do evento (inclusiva nas duas pontas).
 * `fim >= inicio` — faixa de UM chip (inicio == fim) é válida.
 */
export interface FaixaChips {
  /** Primeiro número do lote (int ≥ 0) */
  inicio: number;
  /** Último número do lote (int ≥ inicio — INCLUSIVO) */
  fim: number;
}

/** Type guard de FaixaChips (ints ≥ 0, fim ≥ início). @pure */
export function isFaixaChips(value: unknown): value is FaixaChips {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f['inicio'] === 'number' &&
    Number.isInteger(f['inicio']) &&
    f['inicio'] >= 0 &&
    typeof f['fim'] === 'number' &&
    Number.isInteger(f['fim']) &&
    f['fim'] >= (f['inicio'] as number)
  );
}

/** Quantos chips a faixa comporta (pontas inclusivas). @pure */
export function tamanhoFaixaChips(faixa: FaixaChips): number {
  return faixa.fim - faixa.inicio + 1;
}

// ---------------------------------------------------------------------------
// Ponte chip físico (string) → número do lote
// ---------------------------------------------------------------------------

const RE_ULTIMA_CORRIDA_DE_DIGITOS = /(\d+)(?!.*\d)/;

/**
 * Extrai o componente NUMÉRICO de um código de chip ("CHIP-8891" → 8891;
 * "8891" → 8891). Usa a ÚLTIMA corrida de dígitos do código normalizado
 * (prefixos de lote como "A1B-0042" resolvem para 42). Null quando o código
 * é inválido (normalizarChip — RN-203), não tem dígitos ou excede o inteiro
 * seguro. @pure
 */
export function numeroDoChip(chipNumero: string | null): number | null {
  const chip = normalizarChip(chipNumero);
  if (chip === null) return null;
  const match = RE_ULTIMA_CORRIDA_DE_DIGITOS.exec(chip);
  if (!match) return null;
  const numero = Number(match[1]);
  return Number.isSafeInteger(numero) ? numero : null;
}

/**
 * Chip FORA da faixa do evento? Código sem componente numérico (ou inválido)
 * conta como fora — o balcão alerta em vez de fingir que confere. @pure
 */
export function chipForaDaFaixa(chipNumero: string, faixa: FaixaChips): boolean {
  const numero = numeroDoChip(chipNumero);
  if (numero === null) return true;
  return numero < faixa.inicio || numero > faixa.fim;
}

// ---------------------------------------------------------------------------
// Chip órfão (alerta do balcão — regra que a UI derivava inline; agora
// canônica no core para F-T2 e Functions consumirem a MESMA regra)
// ---------------------------------------------------------------------------

/**
 * Chip órfão: retirou o kit (kitEntregueEm carimbado — RN-205) mas o chip
 * não foi vinculado — só em evento que usa chip (RN-207). @pure
 */
export function chipOrfao(
  inscrito: Pick<Inscrito, 'kitEntregueEm' | 'chipNumero'>,
  usaChip: boolean
): boolean {
  if (!usaChip) return false;
  const kitRetirado =
    inscrito.kitEntregueEm !== undefined && inscrito.kitEntregueEm !== null;
  return kitRetirado && !chipVinculado(inscrito);
}

// ---------------------------------------------------------------------------
// Estoque derivado
// ---------------------------------------------------------------------------

/**
 * Fração de chips restantes que dispara o alerta "quase esgotado"
 * (mesmo espírito do LIMIAR_ESGOTANDO de vagas do overview).
 */
export const LIMIAR_CHIPS_ESGOTANDO = 0.1;

/** Fotografia derivada do estoque de chips do evento. */
export interface EstoqueChips {
  /** Capacidade da faixa (fim − início + 1) */
  total: number;
  /** Chips DISTINTOS da faixa vinculados a inscritos ativos */
  vinculados: number;
  /** total − vinculados (nunca negativo) */
  disponiveis: number;
  /** Chips DISTINTOS vinculados FORA da faixa (alerta de lote errado) */
  foraDaFaixa: number;
  /** disponiveis == 0 */
  esgotado: boolean;
  /** Restam ≤ LIMIAR_CHIPS_ESGOTANDO da faixa (e ainda não esgotou) */
  quaseEsgotado: boolean;
}

/**
 * Deriva o estoque de chips dos VÍNCULOS reais (RN-203 — chipNumero é
 * carimbo da Function vincularChip):
 *   - só inscritos ATIVOS contam (cancelado devolve o chip ao estoque);
 *   - chips repetidos contam UMA vez (o conflito em si é assunto da RN-206);
 *   - chip sem componente numérico/fora da faixa vai para `foraDaFaixa` e
 *     NÃO consome estoque da faixa.
 * @pure
 */
export function derivarEstoqueChips(
  inscritos: ReadonlyArray<Pick<Inscrito, 'chipNumero' | 'status'>>,
  faixa: FaixaChips
): EstoqueChips {
  const dentro = new Set<number>();
  const fora = new Set<string>();

  for (const inscrito of inscritos) {
    if (inscrito.status === 'cancelado') continue;
    if (!chipVinculado(inscrito)) continue;
    const chip = inscrito.chipNumero as string;
    const numero = numeroDoChip(chip);
    if (numero !== null && numero >= faixa.inicio && numero <= faixa.fim) {
      dentro.add(numero);
    } else {
      fora.add(normalizarChip(chip) ?? chip);
    }
  }

  const total = tamanhoFaixaChips(faixa);
  const vinculados = dentro.size;
  const disponiveis = Math.max(0, total - vinculados);
  const esgotado = disponiveis === 0;
  return {
    total,
    vinculados,
    disponiveis,
    foraDaFaixa: fora.size,
    esgotado,
    quaseEsgotado: !esgotado && disponiveis / total <= LIMIAR_CHIPS_ESGOTANDO,
  };
}
