// Classes compartilhadas do CTA de inscrição (server + client). Puro, sem
// React e sem 'use client' — importável dos dois lados. Só token utilities.

export const CTA_BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-ds-pill px-6 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';

export const CTA_ENABLED =
  'bg-action-primary text-action-primary-fg hover:bg-action-primary-hover';

export const CTA_DISABLED =
  'cursor-not-allowed bg-action-primary-disabled text-text-disabled';

/** Chaves de atribuição preservadas no link do checkout (RN-125/311 · S1204). */
export const ATRIBUICAO_KEYS = ['c', 'cupom', 'ref', 'utm_source', 'utm_medium', 'utm_campaign'] as const;

/** Rótulo do CTA por estado de venda. */
export function rotuloCta(estado: 'aberto' | 'encerrado' | 'esgotado'): string {
  switch (estado) {
    case 'aberto':
      return 'Garantir inscrição';
    case 'esgotado':
      return 'Esgotado';
    case 'encerrado':
      return 'Inscrições encerradas';
  }
}
