// =============================================================================
// Formatação de exibição do CRM (E19 · RN-172). Puro, sem PII derivada além do
// que o doc já carrega (minimização): dinheiro em BRL, gênero legível,
// aniversário mm-dd → "dd de mmm", e idade calculada AO VIVO do nascimento —
// nunca uma idade congelada no doc (P-E19-4). @pure
// =============================================================================

import type { GeneroInscrito } from '@leela/core';

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatInt(v: number): string {
  return v.toLocaleString('pt-BR');
}

const GENERO_LABEL: Record<GeneroInscrito, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
};

export function generoLabel(g: GeneroInscrito | null): string {
  if (g === null) return '—';
  return GENERO_LABEL[g] ?? '—';
}

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/**
 * Aniversário `mm-dd` → "dd de mmm" (ex.: "05-14" → "14 de mai"). Retorna '—'
 * quando null ou fora do formato — nunca lança na renderização.
 */
export function aniversarioLabel(mmdd: string | null): string {
  if (mmdd === null) return '—';
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  if (!m) return '—';
  const mes = Number(m[1]);
  const dia = Number(m[2]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return '—';
  return `${dia} de ${MESES[mes - 1]}`;
}

/**
 * Idade AO VIVO a partir de `nascimento` (yyyy-mm-dd), calculada contra `hoje`
 * (default: agora). Nunca congelada — reflete a data corrente. Retorna null
 * quando sem nascimento ou fora do formato.
 */
export function idadeAoVivo(
  nascimento: string | null,
  hoje: Date = new Date()
): number | null {
  if (nascimento === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascimento);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  let idade = hoje.getFullYear() - ano;
  const passouAniversario =
    hoje.getMonth() + 1 > mes ||
    (hoje.getMonth() + 1 === mes && hoje.getDate() >= dia);
  if (!passouAniversario) idade -= 1;
  if (idade < 0 || idade > 130) return null;
  return idade;
}
