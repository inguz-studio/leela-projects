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

// =============================================================================
// RadioCard — Radio de conteúdo rico (título + descrição + ícone + badge) para
// SELEÇÃO DE DECISÃO. design-principles (a): escolha única exclusiva de 2 a ~5
// opções que precisam de CONTEXTO para decidir → radio-card, nunca chip/pill
// (chip é filtro/toggle, não escolha rica). Usado no editor de desafio (escolher
// o MODELO de conclusão) e no editor de comunicado (escolher a SEGMENTAÇÃO).
//
// REUSO, não reinvenção: compõe o MESMO motor do Radio — `<input type="radio">`
// nativo dentro do RadioGroupContext, então navegação por seta / role / foco de
// teclado vêm de fábrica e o card pluga em qualquer <RadioGroup>. A moldura §2.16
// (borda) é o identificador visual do card; marcado = borda + anel --action-primary.
// A descrição fica FORA do <label> (aria-describedby), como no Radio — nunca entra
// no NOME acessível. `children` revela conteúdo condicional (sub-seletor) abaixo,
// visível só quando o card está marcado, também fora do <label>.
// =============================================================================

export interface RadioCardProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'name' | 'onChange' | 'checked' | 'defaultChecked' | 'title'
  > {
  /** Valor desta opção (comparado ao value do grupo). */
  value: string;
  /** Título da opção (rótulo visível principal). */
  title: React.ReactNode;
  /** Texto de apoio que sustenta a decisão. Fora do nome acessível. */
  description?: React.ReactNode;
  /** Ícone opcional à esquerda (herda currentColor). */
  icon?: React.ReactNode;
  /** Selo opcional à direita (ex.: <Badge>). */
  badge?: React.ReactNode;
  /** Conteúdo revelado abaixo quando ESTE card está marcado (fora do <label>). */
  children?: React.ReactNode;
}

const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  (
    {
      className,
      value,
      title,
      description,
      icon,
      badge,
      children,
      disabled,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const ctx = React.useContext(RadioGroupContext);
    if (!ctx) {
      throw new Error('RadioCard deve ser usado dentro de <RadioGroup>.');
    }
    const isDisabled = disabled || ctx.disabled;
    const checked = ctx.value === value;
    const reactId = React.useId();
    const controlId = id ?? reactId;
    const descId = description ? `${controlId}-desc` : undefined;
    // Painel de conteúdo revelado (aria-controls quando presente e visível).
    const panelId = children ? `${controlId}-panel` : undefined;
    // Preserva o aria-describedby do consumidor: compõe com a descrição interna,
    // nunca sobrescreve (senão o consumidor perderia o próprio wiring de a11y).
    const describedBy = [ariaDescribedBy, descId].filter(Boolean).join(' ') || undefined;
    // Alinha descrição e conteúdo revelado sob o título (largura do dot + gap).
    const indent = 'pl-[calc(var(--spacing-5)+var(--spacing-3))]';

    return (
      <div
        className={cn(
          'flex flex-col gap-[var(--spacing-2)]',
          'rounded-[var(--card-radius)] border-[length:var(--input-border-width)]',
          'bg-[var(--surface-raised)] p-[var(--spacing-4)]',
          'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
          // O anel de foco acende SÓ para o input nativo do radio (foco de teclado),
          // não para qualquer controle do conteúdo revelado (era focus-within genérico).
          'has-[.radiocard-native:focus-visible]:ring-2 has-[.radiocard-native:focus-visible]:ring-ring has-[.radiocard-native:focus-visible]:ring-offset-0',
          ctx.invalid
            ? // Grupo inválido: borda de perigo tokenizada como sinal visual (marcado ainda mantém o anel primário).
              checked
              ? 'border-[var(--border-danger)] ring-1 ring-[color:var(--action-primary)]'
              : 'border-[var(--border-danger)]'
            : checked
              ? 'border-[color:var(--action-primary)] ring-1 ring-[color:var(--action-primary)]'
              : 'border-[var(--border-default)]',
          isDisabled
            ? 'cursor-not-allowed opacity-60'
            : cn('cursor-pointer', !checked && !ctx.invalid && 'hover:border-[var(--border-strong)]'),
          className,
        )}
      >
        <label
          className={cn(
            'flex items-start gap-[var(--spacing-3)]',
            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
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
              aria-describedby={describedBy}
              // Reveal associado ao controle: informa se o painel condicional está
              // expandido (visível quando marcado) e o aponta quando renderizado.
              aria-expanded={children ? checked : undefined}
              aria-controls={children && checked ? panelId : undefined}
              onChange={() => ctx.onChange(value)}
              className={cn(
                // Marca-alvo do :has() do card — restringe o anel de foco a ESTE input.
                'radiocard-native',
                'peer h-[var(--spacing-5)] w-[var(--spacing-5)] appearance-none',
                'rounded-[var(--radius-pill)] bg-[var(--surface-base)]',
                'border-[length:var(--input-border-width)] border-input',
                'cursor-pointer',
                'checked:border-[color:var(--action-primary)]',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute hidden h-[var(--spacing-2-5)] w-[var(--spacing-2-5)] rounded-[var(--radius-pill)] bg-[var(--action-primary)] peer-checked:block"
            />
          </span>

          {icon ? (
            <span
              aria-hidden="true"
              className={cn(
                'mt-[var(--spacing-0-5)] inline-flex h-[var(--spacing-5)] w-[var(--spacing-5)] shrink-0 items-center justify-center',
                checked ? 'text-[var(--action-primary)]' : 'text-[var(--text-secondary)]',
              )}
            >
              {icon}
            </span>
          ) : null}

          <span className="flex-1 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {title}
          </span>

          {/* Selo decorativo: fora do NOME acessível (senão o nome viraria "título + selo"). */}
          {badge ? (
            <span aria-hidden="true" className="shrink-0">
              {badge}
            </span>
          ) : null}
        </label>

        {description ? (
          <p
            id={descId}
            className={cn(
              indent,
              'text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]',
            )}
          >
            {description}
          </p>
        ) : null}

        {checked && children ? (
          <div id={panelId} className={indent}>
            {children}
          </div>
        ) : null}
      </div>
    );
  },
);
RadioCard.displayName = 'RadioCard';

export { Radio, RadioCard, RadioGroup };
