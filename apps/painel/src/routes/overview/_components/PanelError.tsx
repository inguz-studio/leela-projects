// =============================================================================
// PanelError — estado de ERRO de um bloco da Visão Geral (FIX-E02 #03).
//
// Distinto de vazio (EmptyState) e de carregando (Skeleton): quando um fetch
// falha, o bloco mostra ISTO — nunca um estado feliz fabricado ("Tudo em dia",
// "crie seu primeiro evento", skeleton eterno). `role="alert"` + borda danger
// semântica + retry opcional. Presentational puro, zero hardcode de token.
// =============================================================================

import { Button } from '@leela/design-system';

export interface PanelErrorProps {
  /** Mensagem honesta do que falhou (sem inventar all-clear). */
  message: string;
  /** Ação de recarregar; ausente = erro não recuperável por retry. */
  onRetry?: (() => void) | undefined;
}

export function PanelError({ message, onRetry }: PanelErrorProps): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
    >
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-primary)]">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

PanelError.displayName = 'PanelError';
