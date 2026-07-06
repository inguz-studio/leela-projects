/**
 * HandoffButton — botão de handoff para IA nas páginas de docs do catálogo.
 *
 * Copia para a área de transferência o payload `snippet + "\n\n" + contract`
 * (código canônico de uso + contrato LLM.txt do componente), pronto para colar
 * num agente de código. Feedback visível por ~2s após copiar (Nielsen #1 —
 * visibilidade do status do sistema), anunciado via aria-live.
 *
 * Estilo 100% por token (var(--...)), sem valor cru — mesmo contrato visual
 * do resto do DS. Foco visível via focus-visible + --border-focus.
 */

import * as React from 'react';

export interface HandoffButtonProps {
  componentName: string;
  snippet: string;
  contract: string;
}

const FEEDBACK_MS = 2000;

export function HandoffButton({
  componentName,
  snippet,
  contract,
}: HandoffButtonProps): JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${snippet}\n\n${contract}`);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      // Clipboard indisponível (iframe sem permissão) — sem estado de sucesso falso.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className={[
        'inline-flex items-center gap-[var(--spacing-2)]',
        'h-[var(--btn-height-md)] px-[var(--spacing-4)]',
        'rounded-[var(--radius-md)]',
        'border border-[color:var(--border-default)]',
        'bg-[var(--surface-raised)] text-[var(--text-primary)]',
        'text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)]',
        'transition-colors duration-[var(--motion-duration-fast)]',
        'hover:bg-[var(--action-ghost-hover)]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[color:var(--border-focus)] focus-visible:ring-offset-2',
      ].join(' ')}
    >
      {copied
        ? `Handoff de ${componentName} copiado`
        : 'Copiar handoff (código + contrato IA)'}
    </button>
  );
}

HandoffButton.displayName = 'HandoffButton';
