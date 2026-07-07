// =============================================================================
// BalcaoBanner — faixa de contexto do balcão (S204 · gap visual). Dois estados
// honestos derivados do MESMO dado real do evento (data/local/status):
//   • janela ABERTA  → "Entrega de kit ativa" (tom brand) + prova/local/contagem
//   • janela FECHADA → aviso "ainda não abriu" (tom alerta).
// NÃO fabrica cronograma de entrega (Dia N de M / horário / venue próprio) —
// o modelo `Evento` não carrega janela de entrega; ver REPORT (dep. de modelo).
// =============================================================================

import { Badge } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { janelaEntregaAberta } from '../_lib/balcao';
import { diasParaEvento, faltamDiasLabel, formatDataEvento } from '../_lib/format';

export interface BalcaoBannerProps {
  evento: Evento;
}

export function BalcaoBanner({ evento }: BalcaoBannerProps): JSX.Element {
  const aberta = janelaEntregaAberta(evento);
  const contagem = faltamDiasLabel(diasParaEvento(evento.data));
  const prova = formatDataEvento(evento.data);
  const local = evento.local || '—';

  if (!aberta) {
    return (
      <div
        role="alert"
        className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-4)]"
      >
        <Badge variant="alerta">Fechada</Badge>
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--feedback-warning-fg)]">
            A janela de entrega ainda não abriu
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
            Prova {prova} · {local} · atendimentos liberam a partir de 2 dias antes do evento.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-brand)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
    >
      <Badge variant="brand">Ativa</Badge>
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <span className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Entrega de kit ativa
        </span>
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Prova {prova} · {local}
          {contagem ? ` · ${contagem}` : ''}
        </span>
      </div>
    </div>
  );
}

BalcaoBanner.displayName = 'BalcaoBanner';
