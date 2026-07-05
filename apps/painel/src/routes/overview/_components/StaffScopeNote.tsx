// =============================================================================
// StaffScopeNote — nota de escopo para tenant_staff (FIX-E02 #16).
//
// O dashboard é agregado por INDIVÍDUO (decisão registrada em E02-L1-SUMMARY §5:
// `getOverview` escopa sempre o uid do token). Um tenant_staff que não organiza
// eventos veria só zeros + "crie seu primeiro evento" — enganoso, porque o
// tenant TEM eventos, apenas não sob o uid dele. Em vez de zeros mudos, uma
// mensagem clara alinha a UI com o comportamento definido. Presentational puro.
// =============================================================================

export function StaffScopeNote(): JSX.Element {
  return (
    <div
      role="note"
      className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--feedback-info-fg)] bg-[var(--surface-raised)] p-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
    >
      Este resumo mostra apenas os eventos que você organiza. Os indicadores do
      tenant ficam no painel de quem criou cada evento.
    </div>
  );
}

StaffScopeNote.displayName = 'StaffScopeNote';
