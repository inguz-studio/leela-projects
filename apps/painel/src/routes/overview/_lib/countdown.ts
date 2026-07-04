// =============================================================================
// Countdown do próximo evento + dados de largada (S602-T1). Pura.
//
// Reusa `vagasRestantesDoEvento` de @leela/core (não duplica constante). O
// próximo evento é o não-encerrado com a data futura mais próxima de `agora`.
// =============================================================================

import { vagasRestantesDoEvento, type StatusEvento, type Timestamp } from '@leela/core';

/** Recorte de um evento para o countdown. */
export interface EventoCountdownInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  data: Timestamp;
  qtdInscritos: number;
  /** null = desconhecida (Onda 1 — cliente não tem o campo) */
  capacidade: number | null;
}

/** Estado renderizável do countdown. */
export interface CountdownView {
  slug: string;
  nome: string;
  /** Dias inteiros até a prova (0 = hoje) */
  diasRestantes: number;
  /** Rótulo pt-BR ("08 dias restantes", "Hoje") */
  rotulo: string;
  qtdInscritos: number;
  vagasRestantes: number | null;
  /** /eventos/:slug (botão "Gerenciar") */
  gerenciarHref: string;
  /** /eventos/:slug/entrega — balcão de check-in (E03) */
  checkinHref: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function toMillis(t: Timestamp): number | null {
  if (typeof t?.toMillis === 'function') return t.toMillis();
  if (typeof t?.toDate === 'function') return t.toDate().getTime();
  return null;
}

/** Dias inteiros (arredondados p/ cima) entre `agora` e a data. @pure */
export function diasAte(data: Timestamp, agora: Date): number | null {
  const ms = toMillis(data);
  if (ms === null) return null;
  return Math.ceil((ms - agora.getTime()) / DIA_MS);
}

/** "08 dias restantes" / "01 dia restante" / "Hoje". @pure */
export function rotuloDias(dias: number): string {
  if (dias <= 0) return 'Hoje';
  const pad = dias < 10 ? `0${dias}` : `${dias}`;
  return `${pad} ${dias === 1 ? 'dia restante' : 'dias restantes'}`;
}

/**
 * Próximo evento (não encerrado, data >= agora, o mais próximo). null quando
 * não há evento futuro. @pure
 */
export function derivarCountdown(
  eventos: readonly EventoCountdownInput[],
  agora: Date
): CountdownView | null {
  let melhor: { evento: EventoCountdownInput; dias: number } | null = null;

  for (const evento of eventos) {
    if (evento.status === 'encerrado') continue;
    const dias = diasAte(evento.data, agora);
    if (dias === null || dias < 0) continue;
    if (!melhor || dias < melhor.dias) {
      melhor = { evento, dias };
    }
  }

  if (!melhor) return null;

  const { evento, dias } = melhor;
  return {
    slug: evento.slug,
    nome: evento.nome,
    diasRestantes: dias,
    rotulo: rotuloDias(dias),
    qtdInscritos: evento.qtdInscritos,
    vagasRestantes: vagasRestantesDoEvento(evento),
    gerenciarHref: `/eventos/${evento.slug}`,
    checkinHref: `/eventos/${evento.slug}/entrega`,
  };
}
