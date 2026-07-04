// =============================================================================
// Estados especiais do balcão (S204-T3 · §2.9 / RN-208): cada estado é uma
// tela DEDICADA — a galeria renderiza um por vez, nunca empilhados. Conteúdo
// presentational puro; o Conflito usa ConfirmModal (§2.15) com preview.
// =============================================================================

import * as React from 'react';
import { Badge, Button, ConfirmModal, EmptyState, Stepper } from '@leela/design-system';
import type { Inscrito } from '@leela/core';
import { kitInscritoBadge } from '../../_lib/kitLabels';
import { passosStepper } from '../../_lib/balcao';

/** Estado de exemplo (amostra) — dados ilustrativos da galeria. */
const AMOSTRA: Pick<Inscrito, 'atletaNome' | 'modalidade' | 'kit' | 'chipNumero'> = {
  atletaNome: 'Marina Silva',
  modalidade: '21k',
  kit: 'kit_ouro',
  chipNumero: 'A48F21',
};

/** 1 · Vazio — nenhum atleta identificado. */
export function EstadoVazio(): JSX.Element {
  return (
    <EmptyState
      title="Nenhum atleta identificado"
      description="Busque um atleta pelo nome ou dorsal para iniciar o atendimento no balcão."
    />
  );
}

/** 2 · Sem kit — passo de kit já concluído, foco em chip/presença. */
export function EstadoSemKit(): JSX.Element {
  const passos = passosStepper('sem_kit', true);
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <header className="flex items-center justify-between gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {AMOSTRA.atletaNome}
        </span>
        <Badge variant="neutro">Sem kit</Badge>
      </header>
      <Stepper steps={passos} current={1} aria-label="Passos do atendimento (sem kit)" />
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Inscrito sem kit: o passo de entrega já vem concluído. O atendimento foca em
        vincular chip e registrar presença.
      </p>
    </div>
  );
}

/** 3 · Completo — já atendido; re-entrega bloqueada. */
export function EstadoCompleto(): JSX.Element {
  const kit = kitInscritoBadge(AMOSTRA.kit);
  return (
    <div className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-md)] bg-[var(--feedback-success-surface)] p-[var(--spacing-5)]">
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--feedback-success-fg)]">
          {AMOSTRA.atletaNome}
        </span>
        <Badge variant="vitoria">Presente</Badge>
      </div>
      <dl className="flex flex-col gap-[var(--spacing-2)] text-[length:var(--font-size-sm)]">
        <div className="flex justify-between">
          <dt className="text-[var(--text-secondary)]">Kit</dt>
          <dd className="text-[var(--text-primary)]">{kit.label}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--text-secondary)]">Chip</dt>
          <dd className="text-[var(--text-primary)]">{AMOSTRA.chipNumero}</dd>
        </div>
      </dl>
      <p className="text-[length:var(--font-size-sm)] text-[var(--feedback-success-fg)]">
        Atendimento já concluído — a re-entrega está bloqueada (idempotente).
      </p>
    </div>
  );
}

/** 4 · Conflito de chip — ConfirmModal de sobrescrita (§2.15 · RN-206). */
export function EstadoConflito(): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [sobrescrito, setSobrescrito] = React.useState(false);
  const chip = AMOSTRA.chipNumero ?? 'A48F21';
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Ao vincular um chip já em uso por outro atleta, o balcão exige confirmação
        de sobrescrita antes de reatribuir (RN-206).
      </p>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Simular conflito de chip
      </Button>
      {sobrescrito && (
        <p role="status" className="text-[length:var(--font-size-sm)] text-[var(--text-success)]">
          Chip {chip} reatribuído a {AMOSTRA.atletaNome}.
        </p>
      )}
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title="Chip já vinculado a outro atleta"
        description="Confirme a sobrescrita para reatribuir o chip (RN-206)."
        target={<strong>João Pereira</strong>}
        loses={[`João Pereira perde o chip ${chip}`]}
        keeps={[`${AMOSTRA.atletaNome} passa a usar o chip ${chip}`]}
        confirmLabel="Sobrescrever chip"
        onConfirm={() => {
          setSobrescrito(true);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** 5 · Fora da janela — entrega ainda não abriu (card crítico Vulcão). */
export function EstadoForaJanela(): JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-md)] border-l-[var(--card-critical-border)] border-l-[var(--border-danger)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-5)]"
    >
      <h3 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--feedback-warning-fg)]">
        Entrega ainda não abriu
      </h3>
      <p className="mt-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--feedback-warning-fg)]">
        A prova está distante. Os atendimentos do balcão liberam a partir de 2 dias
        antes do evento.
      </p>
    </div>
  );
}

/** Estado macro da galeria (índice §2.9). */
export interface EstadoGaleria {
  id: string;
  titulo: string;
  Componente: React.ComponentType;
}

/** Registro dos 5 estados dedicados — fonte única do índice da galeria. */
export const ESTADOS_BALCAO: readonly EstadoGaleria[] = [
  { id: 'vazio', titulo: 'Vazio', Componente: EstadoVazio },
  { id: 'sem-kit', titulo: 'Sem kit', Componente: EstadoSemKit },
  { id: 'completo', titulo: 'Completo (já atendido)', Componente: EstadoCompleto },
  { id: 'conflito', titulo: 'Conflito de chip', Componente: EstadoConflito },
  { id: 'fora-janela', titulo: 'Fora da janela', Componente: EstadoForaJanela },
];
