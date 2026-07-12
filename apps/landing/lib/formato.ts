// =============================================================================
// apps/landing/lib/formato.ts
//
// Formatação de exibição PURA (sem I/O, sem firebase-admin) — importável por
// qualquer componente sem arrastar o grafo do Admin SDK. Nunca fabrica valor.
// =============================================================================

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um preço em R$; `null` → texto honesto de venda fechada. */
export function formatarPreco(preco: number | null): string {
  return preco === null ? 'Vendas encerradas' : fmtBRL.format(preco);
}
