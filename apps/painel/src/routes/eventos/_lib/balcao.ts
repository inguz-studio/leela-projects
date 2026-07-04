// =============================================================================
// Derivações puras da tela do balcão (S204-T1 · §2.9). Sem I/O — reusam as
// regras de `@leela/core` (derivarPassosBalcao/podeAtender/presencaRegistrada)
// e classificam o ESTADO da tela para a galeria de estados (RN-208).
// =============================================================================

import {
  derivarPassosBalcao,
  presencaRegistrada,
  type Evento,
  type Inscrito,
  type PassoBalcao,
} from '@leela/core';
import { diasParaEvento } from './format';

/** Estado macro do balcão (§2.9 — cada um é uma tela dedicada na galeria). */
export type EstadoBalcao =
  | 'fora_janela' // evento distante: entrega ainda não abriu
  | 'vazio' // nenhum atleta identificado
  | 'completo' // inscrito já atendido (presença registrada)
  | 'atendendo'; // fluxo de passos em andamento

/**
 * Janela de entrega (afordância de UI, não RN de servidor): abre a partir de
 * `JANELA_ENTREGA_DIAS` antes da prova e enquanto o evento não é encerrado.
 */
export const JANELA_ENTREGA_DIAS = 2;

/** A janela de entrega está aberta? (evento próximo e não encerrado). @pure */
export function janelaEntregaAberta(
  evento: Pick<Evento, 'status' | 'data'>,
  agora: Date = new Date(),
): boolean {
  if (evento.status === 'encerrado') return false;
  if (evento.status === 'ao_vivo') return true;
  const dias = diasParaEvento(evento.data, agora);
  if (dias === null) return true; // sem data definida → não bloqueia o balcão
  return dias <= JANELA_ENTREGA_DIAS;
}

/**
 * Classifica o estado macro do balcão a partir da janela + inscrito em foco.
 * @pure
 */
export function estadoBalcao(
  evento: Pick<Evento, 'status' | 'data'>,
  inscrito: Inscrito | null,
  agora: Date = new Date(),
): EstadoBalcao {
  if (!janelaEntregaAberta(evento, agora)) return 'fora_janela';
  if (!inscrito) return 'vazio';
  if (presencaRegistrada(inscrito)) return 'completo';
  return 'atendendo';
}

/**
 * Índice (0-based) do passo atual/actionable do atendimento.
 * A ordem real de escrita é: vincular chip (se usaChip) → fechar (registra kit
 * + presença juntos, RN-205). O passo "kit" é físico/auto-concluído (o carimbo
 * `kitEntregueEm` nasce no fechamento). Assim o passo destacado bate sempre com
 * a ação exibida: chip pendente → "chip"; senão → "checkin" (fechar). @pure
 */
export function passoAtual(
  passos: readonly PassoBalcao[],
  inscrito: Pick<Inscrito, 'chipNumero'>,
  usaChip: boolean,
): number {
  const chipOk = typeof inscrito.chipNumero === 'string' && inscrito.chipNumero.length > 0;
  if (usaChip && !chipOk) return Math.max(0, passos.indexOf('chip'));
  return Math.max(0, passos.indexOf('checkin'));
}

/** Rótulos pt-BR dos passos do balcão (RN-216: "kit", nunca "tier"). */
export const PASSO_LABEL: Record<PassoBalcao, string> = {
  kit: 'Entregar kit',
  chip: 'Vincular chip',
  checkin: 'Check-in',
};

/** Deriva os passos + rótulos prontos para o Stepper do DS. @pure */
export function passosStepper(
  kit: Inscrito['kit'],
  usaChip: boolean,
): { id: PassoBalcao; label: string }[] {
  return derivarPassosBalcao(kit, usaChip).passos.map((id) => ({
    id,
    label: PASSO_LABEL[id],
  }));
}

/** Resumo ao vivo do balcão (painel operacional). */
export interface ResumoBalcao {
  /** Inscritos aptos (confirmados) */
  confirmados: number;
  /** Já com presença (kit retirado / check-in) */
  atendidos: number;
  /** Confirmados ainda não atendidos */
  pendentes: number;
}

/**
 * Deriva o resumo ao vivo a partir do pool de inscritos (presença = checkinEm).
 * @pure
 */
export function resumoBalcao(inscritos: readonly Inscrito[]): ResumoBalcao {
  let confirmados = 0;
  let atendidos = 0;
  for (const i of inscritos) {
    if (i.status !== 'confirmado') continue;
    confirmados += 1;
    if (presencaRegistrada(i)) atendidos += 1;
  }
  return { confirmados, atendidos, pendentes: confirmados - atendidos };
}
