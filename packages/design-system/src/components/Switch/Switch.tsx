// =============================================================================
// Switch (Toggle) — liga/desliga um estado do sistema com efeito imediato, sem
// botão Salvar. design-principles (a): "toggle/switch p/ on-off imediato; se
// depende de Submit, use checkbox". É a peça que faltava na caixa de forms —
// hoje os on/off de efeito instantâneo (settings de club/evento: inscrições
// abertas, evento público) não têm controle próprio. Checkbox continua sendo o
// certo p/ on/off que só surte efeito no Submit (ex.: aprovação manual).
//
// ENGINE: `<input type="checkbox" role="switch">` nativo restilizado. O nativo
// dá teclado (Espaço), foco e o role="switch" faz o leitor de tela anunciar
// "ligado/desligado" (não "marcado"). `appearance-none` some com o box; trilho
// e polegar são desenhados por cima, o input segue como fonte de eventos/foco.
//
// A11y: quando não há `label` visível, passe `aria-label`. Estado ligado por
// --action-primary; §2.16 borda permitida no trilho desligado (identificador
// visual). NASCE RESPONSIVO (L-004): controle de tamanho fixo em tokens +
// rótulo fluido `flex-1`, sem overflow em 390px.
// =============================================================================

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> {
  /** Rótulo visível ao lado do controle (sem ele, passe `aria-label`). */
  label?: React.ReactNode;
  /** Texto de apoio abaixo do rótulo. */
  description?: React.ReactNode;
  /** Atalho tipado p/ o novo estado (além do onChange nativo). */
  onCheckedChange?: (checked: boolean) => void;
  /** Classe do wrapper (label + controle). */
  wrapperClassName?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    { className, wrapperClassName, label, description, checked, disabled, onCheckedChange, onChange, id, ...props },
    ref,
  ) => {
    const reactId = React.useId();
    const controlId = id ?? reactId;
    // A descrição é vinculada por aria-describedby (nunca dentro do <label>, que
    // a jogaria no NOME acessível — o leitor leria "Evento público Aparece…").
    const descId = description ? `${controlId}-desc` : undefined;

    const control = (
      <span className="relative inline-flex h-[var(--spacing-5)] w-[var(--spacing-8)] shrink-0 items-center">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={controlId}
          checked={checked}
          disabled={disabled}
          aria-describedby={descId}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className={cn(
            'peer h-[var(--spacing-5)] w-[var(--spacing-8)] appearance-none',
            'rounded-[var(--radius-pill)]',
            'bg-[var(--surface-sunken)]',
            'border-[length:var(--input-border-width)] border-input',
            'cursor-pointer',
            'checked:bg-[var(--action-primary)] checked:border-[color:var(--action-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-40',
            'transition-[background-color,border-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
            className,
          )}
          {...props}
        />
        {/* Polegar — desliza da esquerda p/ a direita quando ligado. */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-[var(--spacing-0-5)] h-[var(--spacing-3-5)] w-[var(--spacing-3-5)]',
            // OFF: --switch-thumb-off (= border-strong/neutral.500) garante ≥3:1
            // sobre o trilho surface-sunken (S-R9-04-T2/L-006). ON: primary-fg.
            'rounded-[var(--radius-pill)] bg-[var(--switch-thumb-off)]',
            'peer-checked:bg-[var(--action-primary-fg)]',
            'translate-x-0 peer-checked:translate-x-[var(--spacing-3)]',
            'transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
          )}
        />
      </span>
    );

    if (!label && !description) {
      return control;
    }

    return (
      <div className={cn('flex flex-col gap-[var(--spacing-1)]', wrapperClassName)}>
        {/* O <label> envolve só controle + texto do rótulo → nome acessível limpo. */}
        <label
          className={cn(
            'flex items-center gap-[var(--spacing-3)] text-[length:var(--font-size-sm)]',
            disabled ? 'cursor-not-allowed text-[var(--text-tertiary)]' : 'cursor-pointer text-[var(--text-primary)]',
          )}
        >
          {control}
          {label ? <span className="font-[var(--font-weight-medium)]">{label}</span> : null}
        </label>
        {/* Descrição fora do <label>: é aria-describedby, não parte do nome. */}
        {description ? (
          <span
            id={descId}
            className="pl-[calc(var(--spacing-8)+var(--spacing-3))] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
          >
            {description}
          </span>
        ) : null}
      </div>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
