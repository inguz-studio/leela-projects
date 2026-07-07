// =============================================================================
// Radio / RadioGroup — seleção única exclusiva (2 a ~5 opções visíveis para
// comparar). design-principles (a): "marcar uma desmarca as outras → radio".
// Os forms usavam `<input type="radio">` cru: ItemKitModal (Tipo tamanhado/único,
// Origem organizador/patrocinador), ConfiguracoesView (comportamento de membros).
// Entra como primitivo reusável.
//
// ENGINE: `<input type="radio">` nativo restilizado ao brasa (mesmo motor do
// Checkbox: `appearance-none` + marca desenhada por cima, input nativo como
// fonte de foco/teclado/estado). O nativo dá de graça a navegação por setas
// dentro do mesmo `name` e o role de fábrica (a11y de leitor de tela). O
// RadioGroup injeta `name`/`checked`/`onChange` por contexto — o consumidor só
// declara value.
//
// A11y: RadioGroup é um `<fieldset>` com `<legend>` (rótulo do grupo);
// aria-describedby liga descrição e erro; erro com role=alert. §2.16 borda
// permitida (identificador visual do controle vazio); estado marcado por
// --action-primary. NASCE RESPONSIVO (L-004): coluna mobile-first, sem largura
// fixa; orientação horizontal quebra linha (`flex-wrap`) sem overflow em 390px.
// =============================================================================

import * as React from 'react';
import { cn } from '../../utils/cn';

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  /** Nome do grupo (agrupa os radios nativos p/ navegação por seta). */
  name: string;
  /** Valor selecionado (controlado). */
  value?: string;
  /** Disparado com o value do radio escolhido. */
  onValueChange?: (value: string) => void;
  /** Rótulo do grupo (vira `<legend>`). Sem ele, passe `aria-label`. */
  label?: string;
  /** Texto de apoio abaixo do rótulo. */
  description?: string;
  /** Mensagem de erro; liga aria-invalid nos radios. */
  errorMessage?: string;
  /** Desabilita o grupo inteiro. */
  disabled?: boolean;
  /** Eixo de disposição das opções. */
  orientation?: 'vertical' | 'horizontal';
  /** id base para wiring de aria (descrição/erro). */
  id?: string;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}

function RadioGroup({
  name,
  value,
  onValueChange,
  label,
  description,
  errorMessage,
  disabled = false,
  orientation = 'vertical',
  id,
  className,
  children,
  'aria-label': ariaLabel,
}: RadioGroupProps): JSX.Element {
  const baseId = id ?? React.useId();
  const descId = description ? `${baseId}-desc` : undefined;
  const errorId = errorMessage ? `${baseId}-error` : undefined;
  const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;

  const ctx = React.useMemo<RadioGroupContextValue>(
    () => ({
      name,
      value,
      onChange: (v: string) => onValueChange?.(v),
      disabled,
      invalid: Boolean(errorMessage),
    }),
    [name, value, onValueChange, disabled, errorMessage],
  );

  return (
    <fieldset
      className={cn('flex flex-col gap-[var(--spacing-2)] border-0 p-0', className)}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
    >
      {label ? (
        <legend className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {label}
        </legend>
      ) : null}
      {description ? (
        <span id={descId} className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {description}
        </span>
      ) : null}

      <div
        className={cn(
          'flex gap-[var(--spacing-2)]',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center gap-x-[var(--spacing-4)]',
        )}
      >
        <RadioGroupContext.Provider value={ctx}>{children}</RadioGroupContext.Provider>
      </div>

      {errorMessage ? (
        <span
          id={errorId}
          role="alert"
          className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
        >
          {errorMessage}
        </span>
      ) : null}
    </fieldset>
  );
}
RadioGroup.displayName = 'RadioGroup';

export interface RadioProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'name' | 'onChange' | 'checked' | 'defaultChecked'
  > {
  /** Valor desta opção (comparado ao value do grupo). */
  value: string;
  /** Rótulo visível ao lado do controle. */
  label?: React.ReactNode;
  /** Texto de apoio abaixo do rótulo. */
  description?: React.ReactNode;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, value, label, description, disabled, id, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    if (!ctx) {
      throw new Error('Radio deve ser usado dentro de <RadioGroup>.');
    }
    const isDisabled = disabled || ctx.disabled;
    const checked = ctx.value === value;
    const reactId = React.useId();
    const controlId = id ?? reactId;
    // Descrição vinculada por aria-describedby, nunca dentro do <label> (senão
    // entraria no NOME acessível da opção).
    const descId = description ? `${controlId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-[var(--spacing-0-5)]">
        <label
          className={cn(
            'flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)]',
            isDisabled ? 'cursor-not-allowed text-[var(--text-tertiary)]' : 'cursor-pointer text-[var(--text-primary)]',
          )}
        >
          <span className="relative inline-flex h-[var(--spacing-5)] w-[var(--spacing-5)] shrink-0 items-center justify-center">
            <input
              ref={ref}
              {...props}
              type="radio"
              id={controlId}
              name={ctx.name}
              value={value}
              checked={checked}
              disabled={isDisabled}
              aria-invalid={ctx.invalid ? true : undefined}
              aria-describedby={descId}
              onChange={() => ctx.onChange(value)}
            className={cn(
              'peer h-[var(--spacing-5)] w-[var(--spacing-5)] appearance-none',
              'rounded-[var(--radius-pill)]',
              'bg-[var(--surface-raised)]',
              'border-[length:var(--input-border-width)] border-input',
              'cursor-pointer',
              'checked:border-[color:var(--action-primary)]',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-40',
              'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
              className,
            )}
          />
            {/* Ponto central — visível só quando marcado. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute hidden h-[var(--spacing-2-5)] w-[var(--spacing-2-5)] rounded-[var(--radius-pill)] bg-[var(--action-primary)] peer-checked:block"
            />
          </span>
          {label ? <span>{label}</span> : null}
        </label>
        {/* Descrição fora do <label>: aria-describedby, não parte do nome. */}
        {description ? (
          <span
            id={descId}
            className="pl-[calc(var(--spacing-5)+var(--spacing-2))] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
          >
            {description}
          </span>
        ) : null}
      </div>
    );
  },
);
Radio.displayName = 'Radio';

export { Radio, RadioGroup };
