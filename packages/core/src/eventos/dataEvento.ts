// =============================================================================
// packages/core/src/eventos/dataEvento.ts
//
// Data do evento — semântica de DIA CIVIL no fuso do produto (fix review
// Onda 1 L2 · achados #01/#02).
//
// O form do painel envia `data` como date-only (`yyyy-mm-dd`, input date).
// Antes deste módulo, cliente e servidor interpretavam esse valor com fusos
// diferentes (meia-noite LOCAL vs `Date.parse` = meia-noite UTC): data=hoje
// passava na UI e morria `invalid-argument` no servidor em UTC-3, e o
// Timestamp gravado em UTC-midnight renderizava o dia ANTERIOR no Brasil.
//
// FONTE ÚNICA DE VERDADE: este módulo é consumido pelo painel (validação do
// form + formatação/contagem de dias) e pelas Functions (validação do input
// + conversão para Timestamp). Cliente e servidor NUNCA divergem porque
// usam a mesma função com o mesmo fuso.
//
// Decisão V1 (produto Brasil-only): todo evento vive no fuso
// `America/Sao_Paulo` (`FUSO_EVENTO`). Quando eventos ganharem fuso próprio,
// o parâmetro `fuso` já existe em todas as funções.
//
// 100% puro — usa apenas `Intl` (ICU embarcado em Node 20 e browsers).
// =============================================================================

/** Fuso canônico dos eventos na V1 (produto Brasil-only). */
export const FUSO_EVENTO = 'America/Sao_Paulo';

const RE_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * O valor é uma data date-only `yyyy-mm-dd` de calendário válido?
 * (`2026-02-30` não passa.) É o shape que o input date do form envia.
 * @pure
 */
export function isDataEventoISO(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !RE_DATA_ISO.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    d.getUTCFullYear() === ano &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

/**
 * Dia civil (`yyyy-mm-dd`) de um instante no fuso dado.
 * `en-CA` formata exatamente como ISO date-only.
 * @pure
 */
export function dataLocalISO(instante: Date, fuso: string = FUSO_EVENTO): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/**
 * A data (date-only) é HOJE ou futura no fuso do produto?
 * Regra única do form (painel) e da Function `criarEvento` — comparar dias
 * civis elimina a divergência meia-noite-local × meia-noite-UTC (#01),
 * inclusive na borda 21:00–00:00 de UTC-3.
 * @pure
 */
export function dataEventoNoFuturo(
  iso: string,
  agora: Date,
  fuso: string = FUSO_EVENTO
): boolean {
  if (!isDataEventoISO(iso)) return false;
  // yyyy-mm-dd zero-padded compara lexicograficamente
  return iso >= dataLocalISO(agora, fuso);
}

/** Offset (ms) do fuso em relação ao UTC no instante dado (SP = -3h). */
function offsetNoInstante(fuso: string, instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);
  const p: Record<string, number> = {};
  for (const parte of partes) {
    if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
  }
  const comoUTC = Date.UTC(
    p['year'] ?? 0,
    (p['month'] ?? 1) - 1,
    p['day'] ?? 1,
    p['hour'] ?? 0,
    p['minute'] ?? 0,
    p['second'] ?? 0
  );
  // Trunca ms do instante (formatToParts só tem precisão de segundo)
  return comoUTC - Math.floor(instante.getTime() / 1000) * 1000;
}

/**
 * Converte a data date-only do evento para o INSTANTE da meia-noite civil
 * no fuso do produto ('2026-07-10' → 2026-07-10T03:00:00Z em SP).
 * É o que a Function grava no Timestamp (#02): qualquer tela que formate
 * pinada em `FUSO_EVENTO` exibe o mesmo dia que o produtor digitou.
 * Lança em shape inválido (borda de validação — chamar após validar).
 * @pure
 */
export function dataEventoParaDate(iso: string, fuso: string = FUSO_EVENTO): Date {
  if (!isDataEventoISO(iso)) {
    throw new Error(`data de evento inválida: "${iso}" (esperado yyyy-mm-dd)`);
  }
  const meiaNoiteUTC = new Date(`${iso}T00:00:00Z`);
  // 1ª aproximação com o offset vigente na meia-noite UTC do dia…
  const offset1 = offsetNoInstante(fuso, meiaNoiteUTC);
  let instante = new Date(meiaNoiteUTC.getTime() - offset1);
  // …reancorada se uma transição de offset (DST) cruzou a meia-noite local.
  const offset2 = offsetNoInstante(fuso, instante);
  if (offset2 !== offset1) {
    instante = new Date(meiaNoiteUTC.getTime() - offset2);
  }
  return instante;
}

/**
 * Diferença em DIAS CIVIS (calendário do fuso) entre a data do evento e
 * `agora`. 0 = o evento é HOJE no fuso do produto; negativo = já passou.
 * Substitui a aritmética de buckets de 24h (`Math.ceil(Δms/86400000)`), que
 * deslocava a contagem conforme a hora do dia e o fuso do runtime (#02).
 * @pure
 */
export function diasCivisAte(
  data: Date,
  agora: Date,
  fuso: string = FUSO_EVENTO
): number {
  const diaEvento = Date.parse(`${dataLocalISO(data, fuso)}T00:00:00Z`);
  const diaHoje = Date.parse(`${dataLocalISO(agora, fuso)}T00:00:00Z`);
  return Math.round((diaEvento - diaHoje) / DIA_MS);
}
