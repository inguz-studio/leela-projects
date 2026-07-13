// =============================================================================
// Select — filtro compacto de faceta (1 controle por faceta).
//
// MOTIVAÇÃO (brief FID-EVT-INSCRITOS): em tabela/dashboard densa a INFORMAÇÃO
// domina, não uma fileira de botões. Facetas de cardinalidade 4-15
// (design-principles: 4-15 → Select) colapsam num único controle em vez de
// N chips sempre visíveis. Reusável — Financeiro/Kits/Plataforma têm as mesmas
// facetas.
//
// ENGINE: `<select>` nativo restilizado ao brasa (NÃO um listbox Radix). O
// nativo é a11y-completo de fábrica (teclado, foco, leitor de tela, mobile),
// zero-flake em jsdom e mínimo de superfície — "minimum viable" (Evan You) +
// "test behavior not implementation" (Kent C. Dodds). O chevron é decorativo
// (pointer-events-none) sobre o campo; `appearance-none` remove a seta do OS.
//
// §2.16 borda permitida (mesma exceção do Input): bg raised ≈ bg da página, a
// borda `border-input` (= border-strong) é o único identificador visual e
// cumpre WCAG 1.4.11 (≥3:1). Dimensões por token de componente (--input-*).
// =============================================================================

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  /** Opções do select (rótulo visível + valor). */
  options: SelectOption[];
  /** Label visível acima do campo; sem ele, passe `aria-label` para a11y. */
  label?: string;
  /** Classe do wrapper (label + campo). */
  wrapperClassName?: string;
  /**
   * Aparência (experimento LEELA-DS-FLAT-INPUTS): `default` = fill raised +
   * borda `border-input`; `flat` = sem borda em repouso, fill `surface-sunken`
   * como identificador, foco por ring. Opt-in — não muda o default global.
   */
  variant?: 'default' | 'flat';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, wrapperClassName, variant = 'default', id, disabled, ...props }, ref) => {
    const flat = variant === 'flat';
    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label ? (
          <label
            htmlFor={id}
            className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              // Base layout — pr maior abre espaço p/ o chevron.
              'block w-full appearance-none',
              'h-[var(--input-height)] pl-[var(--input-px)] pr-[var(--spacing-8)]',
              'rounded-[var(--input-radius)]',
              'text-[length:var(--input-font-size)]',
              // Cores & borda. Default (§2.16, igual ao Input) vs flat
              // (experimento): fill sunken sem borda em repouso, foco por ring.
              'text-[var(--text-primary)]',
              flat
                ? 'bg-[var(--surface-sunken)] border-[length:var(--input-border-width)] border-transparent'
                : 'bg-[var(--surface-raised)] border-[length:var(--input-border-width)] border-input',
              // Foco — glow ring via alias ring (border-focus).
              'focus:outline-none',
              'focus:ring-2 focus:ring-ring focus:ring-offset-0',
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-40',
              // Cursor de seleção
              'cursor-pointer',
              // Transition
              'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
              className,
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron decorativo — o campo nativo já é acessível por teclado. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-[var(--input-px)] top-1/2 -translate-y-1/2 h-[var(--spacing-4)] w-[var(--spacing-4)] text-[var(--text-tertiary)]"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
