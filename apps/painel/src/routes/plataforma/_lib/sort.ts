// =============================================================================
// Ordenação pura das linhas do dashboard macro. O rollup chega indexado por id
// (Record) — sem ordem garantida; a tabela de saúde por tenant deve mostrar o
// maior GMV primeiro (foco do platform_admin em quem move volume). Testável sem
// React. Não muta a entrada.
// =============================================================================

import type { TenantRollup } from '@leela/core';

/**
 * Ordena tenants por GMV decrescente (maior primeiro). Empate mantém a ordem
 * relativa de entrada (sort estável do V8) e cai no nome como desempate
 * determinístico para telas/testes reproduzíveis.
 *
 * @pure — retorna uma nova lista; não muta `tenants`.
 */
export function sortTenantsByGmvDesc(tenants: TenantRollup[]): TenantRollup[] {
  return [...tenants].sort((a, b) => b.gmv - a.gmv || a.nome.localeCompare(b.nome));
}
