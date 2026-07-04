// =============================================================================
// Ações de ciclo de vida do tenant (S1601-T4). Puro — testável sem React.
//
// Deriva a ÚNICA ação de transição disponível a partir do status atual
// (RN-402: pending→ativo, ativo→suspenso, suspenso→ativo). Suspender é
// destrutivo → confirma via ConfirmModal com preview (§2.15); aprovar e
// reativar são construtivos → ação direta + Toast. A escrita SEMPRE passa
// por Cloud Function (ADR-005), nunca grava status no cliente.
// =============================================================================

import type { TenantStatus } from '@leela/core';

export interface LifecycleAction {
  /** Status de destino da transição. */
  to: TenantStatus;
  /** Rótulo do botão. */
  label: string;
  /** Estilo do botão do DS. */
  variant: 'primary' | 'destructive';
  /** true → confirmar via ConfirmModal com preview de consequências. */
  confirm: boolean;
}

/**
 * Ação de ciclo de vida disponível para o status atual (RN-402).
 * Retorna null quando não há transição (nunca ocorre nos 3 status válidos).
 */
export function lifecycleActionFor(status: TenantStatus): LifecycleAction | null {
  switch (status) {
    case 'pending':
      return { to: 'ativo', label: 'Aprovar tenant', variant: 'primary', confirm: false };
    case 'ativo':
      return { to: 'suspenso', label: 'Suspender', variant: 'destructive', confirm: true };
    case 'suspenso':
      return { to: 'ativo', label: 'Reativar', variant: 'primary', confirm: false };
    default:
      return null;
  }
}

/**
 * Preview de consequências da suspensão (§2.15). O que trava × o que se
 * preserva — a suspensão NÃO apaga nada (RN-402: dados preservados).
 */
export const SUSPEND_PREVIEW = {
  loses: ['Novas vendas de ingressos', 'Publicação de novos eventos'],
  keeps: ['Dados e configurações do tenant', 'Membros e histórico de participação', 'Eventos e vendas já realizados'],
} as const;
