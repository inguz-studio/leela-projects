// =============================================================================
// Formatação pura da Visão Geral (E02-L2/L3). pt-BR, sem dep de React/DOM.
// Local ao módulo (o módulo de eventos tem seu próprio format — não acoplar).
// =============================================================================

/** Inteiro com separador de milhar pt-BR (1284 → "1.284"; 47 → "47"). */
export function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/** Reais sem casas decimais (142280 → "R$ 142.280"). */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Percentual com 1 casa decimal pt-BR (68.2 → "68,2%").
 * null → "—" (indisponível — nunca inventa número).
 */
export function formatPct(valor: number | null): string {
  if (valor === null) return '—';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor)}%`;
}

/**
 * Variação percentual com sinal (12.5 → "+12,5%"; -3 → "−3,0%").
 * null → "—" (sem base de comparação).
 */
export function formatTrend(valor: number | null): string {
  if (valor === null) return '—';
  const abs = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(valor));
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : '';
  return `${sinal}${abs}%`;
}

const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

/**
 * Data curta do mockup ("27 Abr") — dia + mês abreviado pt-BR capitalizado,
 * sem o ponto do Intl ("abr."). Determinística (array fixo, sem locale data).
 */
export function formatDataCurta(data: Date): string {
  return `${data.getDate()} ${MESES_CURTOS[data.getMonth()]}`;
}

/**
 * Reais com 2 casas ("R$ 189,00") — a coluna Valor da tabela de inscrições
 * (o formatBRL sem casas continua para os KPIs agregados).
 */
export function formatBRLExato(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function hhmm(data: Date): string {
  const h = String(data.getHours()).padStart(2, '0');
  const m = String(data.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function mesmoDiaCivil(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Coluna Data do mockup (`.col-date`): "Hoje · 14:22", "Ontem · 19:58" ou
 * "12 Mar · 09:15". Dia civil local (mesma régua do resto da Visão Geral).
 */
export function formatQuando(data: Date, agora: Date): string {
  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  const dia = mesmoDiaCivil(data, agora)
    ? 'Hoje'
    : mesmoDiaCivil(data, ontem)
      ? 'Ontem'
      : formatDataCurta(data);
  return `${dia} · ${hhmm(data)}`;
}

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
] as const;

const MESES_EXTENSO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

/**
 * Date-badge do page-head ("Domingo, 19 de Abril · 14:32") — snapshot do
 * momento do render, sem relógio vivo. Arrays fixos capitalizados (mockup).
 */
export function formatAgoraExtenso(agora: Date): string {
  return `${DIAS_SEMANA[agora.getDay()]}, ${agora.getDate()} de ${MESES_EXTENSO[agora.getMonth()]} · ${hhmm(agora)}`;
}
