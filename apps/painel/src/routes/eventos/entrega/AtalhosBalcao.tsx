// =============================================================================
// AtalhosBalcao — barra de atalhos de teclado do balcão (S204 · gap visual).
// Rodapé denso com as teclas da operação: ⌘K busca, Enter confirma o passo,
// Tab avança, Esc limpa. Presentational; o WIRING de ⌘K/Esc vive no
// AtendimentoPanel (dono da busca/reset). Tokens-only (mono via token).
// =============================================================================

interface Atalho {
  tecla: string;
  descricao: string;
}

const ATALHOS: readonly Atalho[] = [
  { tecla: '⌘K', descricao: 'Buscar' },
  { tecla: 'Enter', descricao: 'Confirmar passo atual' },
  { tecla: 'Tab', descricao: 'Próximo passo' },
  { tecla: 'Esc', descricao: 'Limpar' },
];

export function AtalhosBalcao(): JSX.Element {
  return (
    <div
      aria-label="Atalhos de teclado"
      className="flex flex-wrap items-center justify-center gap-[var(--spacing-5)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-3)]"
    >
      {ATALHOS.map((a) => (
        <span
          key={a.tecla}
          className="inline-flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]"
        >
          <kbd className="rounded-[var(--radius-sm)] border-[length:var(--card-critical-border)] border-b-[length:var(--card-critical-border)] border-[var(--border-strong)] bg-[var(--surface-base)] px-[var(--spacing-2)] py-[var(--spacing-1)] font-[family-name:var(--font-family-mono)] text-[length:var(--font-size-xs)] text-[var(--text-secondary)]">
            {a.tecla}
          </kbd>
          {a.descricao}
        </span>
      ))}
    </div>
  );
}

AtalhosBalcao.displayName = 'AtalhosBalcao';
