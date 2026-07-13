// =============================================================================
// RepasseErro — estado de ERRO de carga de um bloco do repasse (§2.12).
//
// Distinto de vazio (EmptyState) e de carregando (Skeleton): quando a leitura
// do saldo/dados/histórico falha, o bloco mostra ISTO — nunca um estado feliz
// fabricado (zeros, "tudo em dia"). `role="alert"` + borda danger semântica +
// "Tentar novamente". Presentational puro; mesma anatomia do PanelError da
// Visão Geral (border-left Vulcão — exceção ao flat §2.16 para o card crítico).
// =============================================================================

import { Button } from '@leela/design-system';

export interface RepasseErroProps {
  /** Mensagem honesta do que falhou (sem inventar all-clear). */
  message: string;
  /** Ação de recarregar; ausente = erro não recuperável por retry. */
  onRetry?: (() => void) | undefined;
}

export function RepasseErro({ message, onRetry }: RepasseErroProps): JSX.Element {
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

RepasseErro.displayName = 'RepasseErro';
