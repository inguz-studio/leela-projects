// =============================================================================
// Helpers puros da tela de planos de cobrança (CB-T3). Sem React/DOM — 100%
// testáveis. Resumem a tabela de taxas por parcela (2x-12x) numa string curta
// para a lista densa e derivam o docId do plano a partir do nome.
// =============================================================================

import { CHAVES_TABELA_PARCELAS, type TabelaTaxasParcela } from '@leela/core';
import { formatPct } from '../../_lib/format';

/**
 * Resumo curto da tabela por parcela para a lista densa. Considera SÓ as chaves
 * canônicas 2x-12x presentes:
 *   - nenhuma presente          → "—";
 *   - todas 0                   → "Sem taxa";
 *   - todas iguais (valor v)    → "v% em 2x-12x";
 *   - variam                    → "min%-max% (2x-12x)".
 * @pure
 */
export function resumoTabelaParcelas(tabela: TabelaTaxasParcela | undefined | null): string {
  if (!tabela) return '—';
  const valores = CHAVES_TABELA_PARCELAS
    .filter((chave) => typeof tabela[chave] === 'number')
    .map((chave) => tabela[chave] as number);

  if (valores.length === 0) return '—';

  const min = Math.min(...valores);
  const max = Math.max(...valores);

  if (min === 0 && max === 0) return 'Sem taxa';
  if (min === max) return `${formatPct(min)} em 2x-12x`;
  return `${formatPct(min)}-${formatPct(max)} (2x-12x)`;
}

/**
 * docId kebab-case derivado do nome do plano (sugestão determinística — o mesmo
 * nome mapeia para o mesmo doc, então editar por nome atualiza o mesmo plano).
 * Espelha o slugify do provisionamento de tenant. @pure
 */
export function planoIdFromNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
