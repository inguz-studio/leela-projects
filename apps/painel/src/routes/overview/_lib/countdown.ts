// =============================================================================
// Countdown do próximo evento + dados de largada (S602-T1). Pura.
//
// Reusa `vagasRestantesDoEvento` de @leela/core (não duplica constante). O
// próximo evento é o não-encerrado com a data futura mais próxima de `agora`.
// =============================================================================

import {
  diasCivisAte,
  ocupacaoDoEvento,
  vagasRestantesDoEvento,
  type StatusEvento,
  type Timestamp,
} from '@leela/core';
import { quandoDoEvento } from './activeEvents';

/** Recorte de um evento para o countdown. */
export interface EventoCountdownInput {
  nome: string;
  slug: string;
  status: StatusEvento;
  data: Timestamp;
  qtdInscritos: number;
  /** null = desconhecida (Onda 1 — cliente não tem o campo) */
  capacidade: number | null;
  /** Local da prova (linha "when" do card — T6) */
  local?: string;
}

/** Estado renderizável do countdown. */
export interface CountdownView {
  slug: string;
  nome: string;
  /** Dias inteiros até a prova (0 = hoje) */
  diasRestantes: number;
  /** Rótulo pt-BR ("08 dias restantes", "Hoje") */
  rotulo: string;
  /** Número grande do card ("08"; "Hoje" quando dias=0) */
  numero: string;
  /** Unidade do número ("dias restantes"/"dia restante"; null quando "Hoje") */
  unidade: string | null;
  /** Linha "when" honesta: "27 Abr · Florianópolis/SC" (sem hora — o doc não
   *  tem horário de largada confiável no cliente); null sem data/local. */
  quando: string | null;
  qtdInscritos: number;
  vagasRestantes: number | null;
  /**
   * % da capacidade preenchida, arredondado (protótipo v3: stat "ocupado").
   * null quando a capacidade é desconhecida — a UI mostra "—", nunca 0 falso.
   * Pode passar de 100 em overbooking: o número não mente.
   */
  ocupacaoPct: number | null;
  /** /eventos/:slug (quick-action "Gerenciar") */
  gerenciarHref: string;
  /** /eventos/:slug/credenciamento — balcão de credenciamento (E03 · RN-399) */
  checkinHref: string;
  /** /eventos/:slug/inscritos (quick-action "Ver inscritos") */
  inscritosHref: string;
  /** /eventos/:slug/comunicacao — aba Comunicação (quick-action "Comunicar", D3) */
  comunicacaoHref: string;
}

function toMillis(t: Timestamp): number | null {
  if (typeof t?.toMillis === 'function') return t.toMillis();
  if (typeof t?.toDate === 'function') return t.toDate().getTime();
  return null;
}

/**
 * Dias CIVIS (calendário em FUSO_EVENTO) entre `agora` e a data. 0 = hoje.
 * Buckets de 24h deslocavam a contagem conforme a hora/fuso do dispositivo —
 * mesma correção de `eventos/_lib/format.diasParaEvento` (review Onda1 #02).
 * @pure
 */
export function diasAte(data: Timestamp, agora: Date): number | null {
  const ms = toMillis(data);
  if (ms === null) return null;
  return diasCivisAte(new Date(ms), agora);
}

/** "08 dias restantes" / "01 dia restante" / "Hoje". @pure */
export function rotuloDias(dias: number): string {
  if (dias <= 0) return 'Hoje';
  const pad = dias < 10 ? `0${dias}` : `${dias}`;
  return `${pad} ${dias === 1 ? 'dia restante' : 'dias restantes'}`;
}

/**
 * Número grande + unidade do card (mockup `.countdown-number`): "08" + "dias
 * restantes"; dia da prova → "Hoje" sem unidade. @pure
 */
export function numeroUnidade(dias: number): { numero: string; unidade: string | null } {
  if (dias <= 0) return { numero: 'Hoje', unidade: null };
  const numero = dias < 10 ? `0${dias}` : `${dias}`;
  return { numero, unidade: dias === 1 ? 'dia restante' : 'dias restantes' };
}

/**
 * % de ocupação arredondado do stat do protótipo v3. Reusa a razão canônica
 * do core (fonte única); null = capacidade desconhecida. @pure
 */
export function ocupacaoPctDoEvento(
  evento: Pick<EventoCountdownInput, 'qtdInscritos' | 'capacidade'>
): number | null {
  const razao = ocupacaoDoEvento(evento);
  return razao === null ? null : Math.round(razao * 100);
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
  const { numero, unidade } = numeroUnidade(dias);
  return {
    slug: evento.slug,
    nome: evento.nome,
    diasRestantes: dias,
    rotulo: rotuloDias(dias),
    numero,
    unidade,
    quando: quandoDoEvento(evento.data, evento.local),
    qtdInscritos: evento.qtdInscritos,
    vagasRestantes: vagasRestantesDoEvento(evento),
    ocupacaoPct: ocupacaoPctDoEvento(evento),
    gerenciarHref: `/eventos/${evento.slug}`,
    checkinHref: `/eventos/${evento.slug}/credenciamento`,
    inscritosHref: `/eventos/${evento.slug}/inscritos`,
    comunicacaoHref: `/eventos/${evento.slug}/comunicacao`,
  };
}
