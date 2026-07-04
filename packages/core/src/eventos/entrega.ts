// =============================================================================
// packages/core/src/eventos/entrega.ts
//
// Regras puras do balcão de entrega/check-in (LEELA-S204-T2 · E03).
//
// RN-205 — retirar o kit EQUIVALE a check-in (não há check-in separado);
//          no balcão padrão `kitEntregueEm` e `checkinEm` são setados juntos.
// RN-206 — chip já vinculado a OUTRO atleta exige confirmação de sobrescrita.
// RN-207 — `evento.usaChip=false` suprime o passo de chip.
//
// Este módulo é puro (sem I/O): alimenta a UI do balcão (S204-T1/T3 derivam
// o stepper e os estados) e as Functions `vincularChip`/`registrarEntrega`
// (que aplicam as mesmas regras server-side, dentro de transação).
// =============================================================================

import type { Inscrito, KitInscrito } from './inscrito';

// ---------------------------------------------------------------------------
// Passos do atendimento (stepper 3 passos do balcão)
// ---------------------------------------------------------------------------

/** Passo do fluxo de atendimento no balcão. */
export type PassoBalcao = 'kit' | 'chip' | 'checkin';

/** Plano de atendimento derivado do inscrito + configuração do evento. */
export interface PlanoAtendimento {
  /** Passos exibidos, em ordem (chip suprimido quando usaChip=false — RN-207) */
  passos: PassoBalcao[];
  /** true para `sem_kit` — passo "kit" já abre concluído (§2.9 estado sem-kit) */
  kitJaConcluido: boolean;
}

/**
 * Deriva o plano de passos do balcão (RN-205/207).
 *   - chip só participa quando o evento usa chip (RN-207);
 *   - `sem_kit` mantém o passo "kit" visível porém já concluído.
 * @pure
 */
export function derivarPassosBalcao(
  kit: KitInscrito,
  usaChip: boolean
): PlanoAtendimento {
  const passos: PassoBalcao[] = usaChip
    ? ['kit', 'chip', 'checkin']
    : ['kit', 'checkin'];
  return { passos, kitJaConcluido: kit === 'sem_kit' };
}

// ---------------------------------------------------------------------------
// Elegibilidade e estado do atendimento
// ---------------------------------------------------------------------------

/**
 * Inscrito pode ser atendido no balcão? Só `confirmado` retira kit —
 * `pendente` (pagamento em aberto) e `cancelado` não recebem entrega.
 * @pure
 */
export function podeAtender(inscrito: Pick<Inscrito, 'status'>): boolean {
  return inscrito.status === 'confirmado';
}

/**
 * Presença já registrada? (`checkinEm` é o carimbo de presença — RN-205/222)
 * @pure
 */
export function presencaRegistrada(
  inscrito: Pick<Inscrito, 'checkinEm'>
): boolean {
  return inscrito.checkinEm !== undefined && inscrito.checkinEm !== null;
}

/**
 * Fechar o atendimento exige chip vinculado? (RN-206/207)
 * Evento com chip: todo inscrito atendido corre com chip — inclusive
 * `sem_kit`. Evento sem chip: nunca exige.
 * @pure
 */
export function exigeChipParaFechar(
  usaChip: boolean,
  inscrito: Pick<Inscrito, 'chipNumero'>
): boolean {
  if (!usaChip) return false;
  return !(typeof inscrito.chipNumero === 'string' && inscrito.chipNumero.length > 0);
}

// ---------------------------------------------------------------------------
// Chip (RN-206)
// ---------------------------------------------------------------------------

/** Comprimento máximo aceito para número de chip (input manual/leitor USB). */
export const CHIP_MAX_LENGTH = 32;

/**
 * Normaliza o input de chip (manual ou leitor USB): apara espaços e valida
 * o formato — alfanumérico + hífen, 1..32 chars. Retorna null quando inválido.
 * @pure
 */
export function normalizarChip(chip: unknown): string | null {
  if (typeof chip !== 'string') return null;
  const limpo = chip.trim().toUpperCase();
  if (limpo.length === 0 || limpo.length > CHIP_MAX_LENGTH) return null;
  if (!/^[A-Z0-9-]+$/.test(limpo)) return null;
  return limpo;
}

/** Detecção de conflito de chip (RN-206). */
export type ResultadoChip =
  | { tipo: 'livre' }
  | { tipo: 'ja_do_inscrito' }
  | { tipo: 'conflito'; ocupanteId: string };

/**
 * Classifica o vínculo proposto: chip livre, já do próprio inscrito
 * (idempotente) ou em conflito com outro atleta (RN-206 — exige
 * confirmação de sobrescrita).
 * @pure
 */
export function classificarVinculoChip(
  ocupanteId: string | null,
  inscritoAlvoId: string
): ResultadoChip {
  if (ocupanteId === null) return { tipo: 'livre' };
  if (ocupanteId === inscritoAlvoId) return { tipo: 'ja_do_inscrito' };
  return { tipo: 'conflito', ocupanteId };
}
