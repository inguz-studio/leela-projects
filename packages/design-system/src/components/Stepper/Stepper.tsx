/**
 * Stepper — indicador de etapas de fluxo (T4; checkout usa 5 etapas).
 *
 * Estados por etapa: concluída (Brasa + ✓), atual (ring brand,
 * aria-current="step"), futura (surface-overlay).
 * Conector entre etapas acompanha o estado (concluído = Brasa).
 * A11y: <ol> ordenada, sr-only "concluída" nas feitas.
 * §2.16 flat.
 */

import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepperStep {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Índice (0-based) da etapa atual. */
  current: number;
  'aria-label'?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Stepper({
  steps,
  current,
  'aria-label': ariaLabel = 'Progresso das etapas',
  className,
}: StepperProps): JSX.Element {
  return (
    <ol aria-label={ariaLabel} className={cn('flex items-center w-full', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;

        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
          >
            <div className="flex flex-col items-center gap-[var(--spacing-2)]">
              {/* Círculo da etapa */}
              <span
                className={cn(
                  'flex items-center justify-center',
                  'h-[var(--stepper-step-size)] w-[var(--stepper-step-size)]',
                  'rounded-[var(--radius-pill)]',
                  'text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
                  'transition-colors duration-[var(--motion-duration-fast)]',
                  isCompleted &&
                    'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
                  isCurrent && [
                    'bg-[var(--surface-high)] text-[var(--text-primary)]',
                    'ring-2 ring-[color:var(--border-brand)]',
                  ],
                  !isCompleted &&
                    !isCurrent &&
                    'bg-[var(--surface-overlay)] text-[var(--text-tertiary)]',
                )}
              >
                {isCompleted ? <span aria-hidden>✓</span> : index + 1}
              </span>

              {/* Rótulo */}
              <span
                className={cn(
                  'text-[length:var(--font-size-sm)] whitespace-nowrap',
                  isCurrent
                    ? 'text-[var(--text-primary)] font-[var(--font-weight-semibold)]'
                    : 'text-[var(--text-secondary)]',
                )}
              >
                {step.label}
                {isCompleted && <span className="sr-only"> (concluída)</span>}
              </span>
            </div>

            {/* Conector */}
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'flex-1 h-[var(--divider-thickness)] mx-[var(--spacing-3)]',
                  // Alinha com o centro do círculo (rótulo fica abaixo)
                  '-translate-y-[var(--spacing-4)]',
                  isCompleted ? 'bg-[var(--action-primary)]' : 'bg-[var(--border-subtle)]',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

Stepper.displayName = 'Stepper';

export { Stepper };
