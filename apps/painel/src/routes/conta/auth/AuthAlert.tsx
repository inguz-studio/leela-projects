// =============================================================================
// AuthAlert — banner de erro/aviso in-form das telas de conta (LEELA-S020).
// role="alert" (assertivo) para leitores de tela anunciarem a falha de
// credencial na hora. Tom neutro (surface-sunken + borda danger à esquerda),
// sem depender só de cor. Usado por login/cadastro/recuperação/troca de senha.
// =============================================================================

export interface AuthAlertProps {
  message: string;
  /** 'error' pinta a borda danger; 'info' a info. Default: error. */
  tone?: 'error' | 'info';
}

export function AuthAlert({ message, tone = 'error' }: AuthAlertProps): JSX.Element {
  // Marcador esquerdo por token (mesma receita do Toast do DS): largura por
  // --toast-border-left, cor por --feedback-* (danger | info).
  const corBorda =
    tone === 'error'
      ? 'border-l-[color:var(--feedback-danger)]'
      : 'border-l-[color:var(--feedback-info)]';
  return (
    <div
      role="alert"
      className={`rounded-[var(--radius-sm)] border-l-[length:var(--toast-border-left)] bg-[var(--surface-sunken)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)] ${corBorda}`}
    >
      {message}
    </div>
  );
}

AuthAlert.displayName = 'AuthAlert';
