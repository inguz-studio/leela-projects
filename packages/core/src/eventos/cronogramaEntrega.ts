// =============================================================================
// packages/core/src/eventos/cronogramaEntrega.ts
//
// Cronograma de entrega de kits do Evento (LEELA-FABLE-F-T1 · S204/FRENTE F).
//
// O balcão (S204) hoje mostra EmptyState honesto "fora da janela" porque o
// modelo `Evento` não carregava janela de entrega (ver BalcaoBanner.tsx).
// Este módulo dá ao Evento um cronograma REAL: janelas por dia/local/horário,
// embutidas no doc do evento (`janelasEntrega: JanelaEntrega[]`).
//
// DECISÃO DE ESTRUTURA (alternativa rejeitada: subcoleção
// `eventos/{id}/janelasEntrega/{id}`): o cronograma é pequeno (1..poucas
// janelas), é lido JUNTO com o evento pelo banner do balcão (1 doc read),
// versiona atomicamente com o evento e não tem agregados próprios — array
// embutido vence. Limite defensivo `JANELAS_ENTREGA_MAX` (espelhado nas
// Rules) impede doc-bomba.
//
// SEMÂNTICA DE TEMPO (padrão do repo — dataEvento.ts, DST-safe):
//   - `dia` é DIA CIVIL date-only (`yyyy-mm-dd`) no fuso do produto
//     (FUSO_EVENTO), o mesmo shape/validação da data da prova;
//   - horários são `HH:mm` locais do fuso do evento;
//   - toda derivação recebe `agora: Date` INJETÁVEL e pina no fuso via
//     `Intl` (reusa dataLocalISO/isDataEventoISO — nunca Date.parse local);
//   - `horaFim` é EXCLUSIVO: às 20:00 exatas de uma janela 10:00–20:00 o
//     balcão está fechado (semântica de fechamento, documentada nos testes).
//
// 100% puro — sem I/O; alimenta o banner (F-T2) e futuras validações server.
// =============================================================================

import { FUSO_EVENTO, dataLocalISO, isDataEventoISO } from './dataEvento';

// ---------------------------------------------------------------------------
// Tipos + guards
// ---------------------------------------------------------------------------

/**
 * Janela de entrega de kit — um turno de balcão (dia + horário + local).
 * Mais de uma janela pode existir no MESMO dia (ex.: manhã e tarde em locais
 * diferentes); a ordenação canônica é (dia, horaInicio).
 */
export interface JanelaEntrega {
  /** Dia civil `yyyy-mm-dd` no fuso do evento (mesmo shape da data da prova) */
  dia: string;
  /** Abertura local `HH:mm` (00:00–23:59) */
  horaInicio: string;
  /** Fechamento local `HH:mm` — EXCLUSIVO e estritamente > horaInicio */
  horaFim: string;
  /** Local do balcão nesta janela (ex.: "Arena da prova — tenda 3") */
  local: string;
}

/**
 * Limite defensivo de janelas por evento (espelhado em firestore.rules).
 * Nenhum evento real tem semanas de entrega — o teto barra doc-bomba.
 */
export const JANELAS_ENTREGA_MAX = 30;

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** O valor é um horário local `HH:mm` válido (00:00–23:59)? @pure */
export function isHoraJanela(value: unknown): value is string {
  return typeof value === 'string' && RE_HORA.test(value);
}

/**
 * Type guard de JanelaEntrega — shape completo E invariante fim > início
 * (RN da task: janela de duração zero/negativa não existe). @pure
 */
export function isJanelaEntrega(value: unknown): value is JanelaEntrega {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const j = value as Record<string, unknown>;
  return (
    isDataEventoISO(j['dia']) &&
    isHoraJanela(j['horaInicio']) &&
    isHoraJanela(j['horaFim']) &&
    (j['horaFim'] as string) > (j['horaInicio'] as string) &&
    typeof j['local'] === 'string' &&
    j['local'].trim().length > 0
  );
}

// ---------------------------------------------------------------------------
// Validação de formulário/entrada (fail-fast fica no parseEvento; aqui a
// versão que LISTA problemas — para o form do painel apontar campo a campo)
// ---------------------------------------------------------------------------

/**
 * Valida um cronograma completo e devolve a lista de problemas (vazia = ok).
 *   - shape/invariante de cada janela (dia ISO, horas HH:mm, fim > início);
 *   - teto JANELAS_ENTREGA_MAX;
 *   - com `dataProva` informada: nenhuma janela DEPOIS do dia civil da prova
 *     (entrega de kit não existe após a corrida; o dia da prova é válido —
 *     retirada tardia na largada).
 * @pure
 */
export function validarJanelasEntrega(
  janelas: readonly unknown[],
  dataProva?: Date,
  fuso: string = FUSO_EVENTO
): string[] {
  const erros: string[] = [];
  if (janelas.length > JANELAS_ENTREGA_MAX) {
    erros.push(
      `cronograma com ${janelas.length} janelas excede o máximo de ${JANELAS_ENTREGA_MAX}`
    );
  }
  const diaProva = dataProva ? dataLocalISO(dataProva, fuso) : null;
  janelas.forEach((j, i) => {
    if (!isJanelaEntrega(j)) {
      erros.push(
        `janela ${i + 1}: shape inválido (dia yyyy-mm-dd, horas HH:mm, fim > início, local não-vazio)`
      );
      return;
    }
    if (diaProva !== null && j.dia > diaProva) {
      erros.push(
        `janela ${i + 1}: dia ${j.dia} é depois da prova (${diaProva}) — entrega não acontece após o evento`
      );
    }
  });
  return erros;
}

// ---------------------------------------------------------------------------
// Derivações puras (agora injetável — padrão do repo)
// ---------------------------------------------------------------------------

/**
 * Ordena o cronograma na ordem canônica (dia, horaInicio) — cópia, nunca
 * muta a entrada. `yyyy-mm-dd` e `HH:mm` zero-padded comparam
 * lexicograficamente (mesmo truque de dataEventoNoFuturo). @pure
 */
export function ordenarJanelasEntrega(
  janelas: readonly JanelaEntrega[]
): JanelaEntrega[] {
  return [...janelas].sort((a, b) =>
    a.dia === b.dia
      ? a.horaInicio.localeCompare(b.horaInicio)
      : a.dia.localeCompare(b.dia)
  );
}

/** Dias civis DISTINTOS do cronograma, ordenados (base do "Dia N de M"). @pure */
export function diasDeEntrega(janelas: readonly JanelaEntrega[]): string[] {
  return [...new Set(janelas.map((j) => j.dia))].sort();
}

/**
 * Horário local `HH:mm` de um instante no fuso dado (h23 — meia-noite é
 * "00:xx", nunca "24:xx"). Complementa dataLocalISO para a mesma janela.
 * @pure
 */
export function horaLocalHHmm(instante: Date, fuso: string = FUSO_EVENTO): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: fuso,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(instante);
}

/**
 * A janela ATIVA no instante `agora` (dia civil bate E horaInicio ≤ hora <
 * horaFim no fuso do evento) — ou null quando o balcão está fechado.
 * Com janelas sobrepostas no mesmo dia, devolve a primeira na ordem
 * canônica (determinístico).
 * @pure
 */
export function janelaEntregaAtiva(
  janelas: readonly JanelaEntrega[],
  agora: Date,
  fuso: string = FUSO_EVENTO
): JanelaEntrega | null {
  const hoje = dataLocalISO(agora, fuso);
  const hora = horaLocalHHmm(agora, fuso);
  const ativa = ordenarJanelasEntrega(janelas).find(
    (j) => j.dia === hoje && j.horaInicio <= hora && hora < j.horaFim
  );
  return ativa ?? null;
}

/** Posição do dia atual no cronograma — o "Dia N de M" do banner do balcão. */
export interface DiaEntrega {
  /** N — posição 1-based do dia civil de hoje entre os dias de entrega */
  dia: number;
  /** M — total de dias civis distintos do cronograma */
  total: number;
}

/**
 * "Dia N de M": posição do dia civil de HOJE entre os dias do cronograma.
 * Semântica de DIA (não de horário): num dia de entrega às 08:00, antes da
 * janela abrir, ainda é "Dia N de M" — quem decide "ativa/fechada" é
 * `janelaEntregaAtiva`. Null quando hoje não é dia de entrega (ou cronograma
 * vazio) — a UI mostra o estado honesto, nunca fabrica contagem.
 * @pure
 */
export function diaDaEntrega(
  janelas: readonly JanelaEntrega[],
  agora: Date,
  fuso: string = FUSO_EVENTO
): DiaEntrega | null {
  const dias = diasDeEntrega(janelas);
  if (dias.length === 0) return null;
  const hoje = dataLocalISO(agora, fuso);
  const indice = dias.indexOf(hoje);
  if (indice === -1) return null;
  return { dia: indice + 1, total: dias.length };
}

/**
 * A PRÓXIMA janela que ainda não abriu (dia futuro, ou hoje com horaInicio
 * ainda por vir) — insumo do estado "fechada" do banner ("abre sábado às
 * 10:00"). Null quando não há janela futura. Uma janela ATIVA neste
 * instante não é "próxima" — consulte janelaEntregaAtiva.
 * @pure
 */
export function proximaJanelaEntrega(
  janelas: readonly JanelaEntrega[],
  agora: Date,
  fuso: string = FUSO_EVENTO
): JanelaEntrega | null {
  const hoje = dataLocalISO(agora, fuso);
  const hora = horaLocalHHmm(agora, fuso);
  const proxima = ordenarJanelasEntrega(janelas).find(
    (j) => j.dia > hoje || (j.dia === hoje && j.horaInicio > hora)
  );
  return proxima ?? null;
}
