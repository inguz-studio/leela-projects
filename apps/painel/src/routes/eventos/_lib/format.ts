// =============================================================================
// Formatação pura para as telas de evento (E03-L3).
// pt-BR. Sem dependência de React/DOM — 100% testável.
//
// DATA DO EVENTO é date-only pinada em `FUSO_EVENTO` (review Onda1 #02):
// formatar/contar dias no fuso do runtime deslocava a exibição para o dia
// N−1 em UTC-negativo (Timestamp UTC-midnight legado) e a contagem de dias
// variava com a hora local. Aqui TODA leitura de `evento.data` passa por
// Intl pinado + `diasCivisAte` (dias de calendário no fuso do produto).
// =============================================================================

import { diasCivisAte, FUSO_EVENTO, type Timestamp } from '@leela/core';

/**
 * Formata um valor em reais (BRL) sem casas decimais.
 * Contrato do mock canônico: receitaConfirmada = 85617 → "R$ 85.617".
 */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Formata um inteiro com separador de milhar pt-BR (453 → "453"; 1200 → "1.200"). */
export function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/**
 * Data da prova por extenso curto pt-BR (ex.: "27 de abril de 2026").
 * Aceita o `Timestamp` portátil do core (toDate) ou null/undefined.
 */
export function formatDataEvento(data: Timestamp | null | undefined): string {
  if (!data || typeof data.toDate !== 'function') return 'Data a definir';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: FUSO_EVENTO, // pinado — nunca o fuso do runtime (review #02)
  }).format(data.toDate());
}

/**
 * Dias CIVIS (calendário em `FUSO_EVENTO`) entre `agora` e a data da prova.
 * 0 = a prova é hoje; negativo se já passou. Alimenta alertas (S202-T2) e a
 * janela do balcão (S204) — "é hoje" bate com o dia que o produtor digitou,
 * independentemente da hora e do fuso do dispositivo (review #02).
 */
export function diasParaEvento(
  data: Timestamp | null | undefined,
  agora: Date = new Date(),
): number | null {
  if (!data || typeof data.toDate !== 'function') return null;
  return diasCivisAte(data.toDate(), agora);
}

/**
 * Linha "quando" do hero: "Segunda-feira, 27 de abril · 06:00" (fuso do evento,
 * pinado — review #02). undefined sem data (o hero omite o trecho). @pure
 */
export function formatDataHoraExtenso(data: Timestamp | null | undefined): string | undefined {
  if (!data || typeof data.toDate !== 'function') return undefined;
  const d = data.toDate();
  const dia = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: FUSO_EVENTO,
  }).format(d);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_EVENTO,
  }).format(d);
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`;
}

/**
 * Frase de contagem regressiva do header/hero, honesta em todos os estados
 * (mockup Detalhe/Overview: "Faltam 8 dias para o evento"). Sem data → null
 * (o consumidor omite o trecho). @pure
 */
export function faltamDiasLabel(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias > 1) return `Faltam ${formatInt(dias)} dias para o evento`;
  if (dias === 1) return 'Falta 1 dia para o evento';
  if (dias === 0) return 'O evento é hoje';
  if (dias === -1) return 'O evento foi ontem';
  return `Evento realizado há ${formatInt(Math.abs(dias))} dias`;
}
