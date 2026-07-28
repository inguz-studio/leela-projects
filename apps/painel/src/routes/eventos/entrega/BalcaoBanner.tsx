// =============================================================================
// BalcaoBanner — faixa de contexto do balcão (S204 · FRENTE F). Consome o
// cronograma de entrega REAL do evento (F-T1: `janelasEntrega`) e as derivações
// PURAS do core (`janelaEntregaAtiva`, `diaDaEntrega`, `proximaJanelaEntrega`).
// Quatro estados honestos — nenhum fabrica "Dia N":
//   • ATIVA agora    → "Credenciamento ativo · Dia N de M · até HH:mm · <local>" (brand)
//   • fechada c/ prox → "Próxima janela: <dia> · HH:mm · <local>" (alerta)
//   • encerrada       → todas as janelas já passaram (neutro)
//   • sem cronograma  → EmptyState honesto (nenhuma janela configurada)
// `agora` é injetável (default new Date()) para o gate visual ser determinístico.
// =============================================================================

import { Badge, EmptyState } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { janelaEntregaAtiva, diaDaEntrega, proximaJanelaEntrega } from '@leela/core';
import { formatDiaCronograma } from '../_lib/format';

export interface BalcaoBannerProps {
  /** Só o cronograma é lido — Pick estreito facilita showroom e teste. */
  evento: Pick<Evento, 'janelasEntrega'>;
  /** "Agora" injetável (determinismo do gate visual). Default: relógio real. */
  agora?: Date | undefined;
}

export function BalcaoBanner({ evento, agora = new Date() }: BalcaoBannerProps): JSX.Element {
  const janelas = evento.janelasEntrega ?? [];

  // (c) Sem cronograma configurado → estado honesto, nunca "Dia N" fabricado.
  if (janelas.length === 0) {
    return (
      <EmptyState
        title="Cronograma de credenciamento não configurado"
        description="Defina as janelas de credenciamento do evento (dia, horário e local) para o balcão exibir a contagem de dias e liberar os atendimentos."
      />
    );
  }

  const ativa = janelaEntregaAtiva(janelas, agora);
  const dia = diaDaEntrega(janelas, agora);

  // (a) Janela ATIVA agora → "Credenciamento ativo · Dia N de M · até HH:mm · <local>".
  if (ativa) {
    const diaLabel = dia ? ` · Dia ${dia.dia} de ${dia.total}` : '';
    return (
      <div
        role="status"
        className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-brand)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
      >
        <Badge variant="brand">Ativa</Badge>
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <span className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Credenciamento ativo{diaLabel}
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            até {ativa.horaFim} · {ativa.local}
          </span>
        </div>
      </div>
    );
  }

  const proxima = proximaJanelaEntrega(janelas, agora);

  // (b) Fora de janela, mas há próxima → aponta quando/onde abre.
  if (proxima) {
    return (
      <div
        role="status"
        className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-4)]"
      >
        <Badge variant="alerta">Fechada</Badge>
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--feedback-warning-fg)]">
            Janela de credenciamento fechada
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
            Próxima janela: {formatDiaCronograma(proxima.dia)} · {proxima.horaInicio} · {proxima.local}
          </span>
        </div>
      </div>
    );
  }

  // (d) Cronograma existe, mas todas as janelas já passaram → encerrada.
  return (
    <div
      role="status"
      className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
    >
      <Badge variant="neutro">Encerrada</Badge>
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <span className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Credenciamento encerrado
        </span>
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Todas as janelas de credenciamento deste evento já passaram.
        </span>
      </div>
    </div>
  );
}

BalcaoBanner.displayName = 'BalcaoBanner';
