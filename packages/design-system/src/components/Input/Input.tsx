/**
 * Input — flat por DEFAULT (LEELA-FLAT-DEFAULT, decisão do Vitor 2026-07-17).
 *
 * O campo em repouso NÃO tem linha de borda; o identificador visual é o FILL
 * inset `surface-sunken` (recuado vs a página) e o foco segue por glow ring. O
 * estado inválido reacende a borda-danger (a11y do erro nunca depende só da
 * cor). A antiga aparência §2.16 (fill `surface-raised` + borda `border-input`)
 * vira opt-out explícito via `variant='bordered'`.
 *
 * PROVENIÊNCIA: campo interno = shadcn stock `input` restilizado ao brasa; a
 * casca (label + mensagem de erro + aria-describedby) é o valor da NOSSA API e
 * fica por cima do primitivo stock. Diff vs stock (esteira shadcn→brasa):
 *   - API pública PRESERVADA: props errorMessage, label, wrapperClassName;
 *   - opt-out `bordered`: borda por alias `border-input` (= border-strong) é o
 *     identificador visual quando o fill é `surface-raised` (≈ bg da página) e
 *     WCAG 1.4.11 exige ≥3:1 — border-default ficava em 2.4–1.5:1; input/
 *     background está provado (shadcn-aliases.test.ts) e border-strong/
 *     surface-raised na matriz (L130). O default flat legibiliza o texto sobre
 *     `surface-sunken` (par provado na matriz AA, contrast.test.ts);
 *   - placeholder por alias `text-muted-foreground` (= text-tertiary);
 *   - foco por `focus:ring-2 ring-ring` (ring = border-focus) — mantido `focus:`
 *     (glow ao clique também), não o `focus-visible:` do stock;
 *   - dimensões/tipo/radius por token de componente (--input-*), motion tokenizado.
 *
 * Estados: default (flat) | hover | focus (glow via ring) | invalid
 * (border-danger + erro inline) | disabled. A11y: aria-invalid,
 * aria-describedby, focus ring.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message shown below the field; also sets aria-invalid. */
  errorMessage?: string;
  /**
   * Texto de apoio PERMANENTE embaixo do campo — a régua que vale sempre, e
   * não o que deu errado agora (essa é a `errorMessage`).
   *
   * Nasceu no PARSE-1, quando a régua do ponto e da vírgula precisou aparecer
   * embaixo dos campos de dinheiro. O `Field` do DS já tinha `description` com
   * a mesma função, mas `Field` é a casca para controle CRU: envolver um
   * `Input` nele renderiza duas labels. Então a peça entra AQUI, com o mesmo
   * token, o mesmo tamanho e o mesmo `aria-describedby` do `Field` — nenhuma
   * moldura nova, e as telas que montavam o `<span>` à mão (`CapacidadeModal`,
   * `EstoqueView`) passam a ter para onde migrar.
   *
   * Fica ENTRE o campo e o erro, e não depois dele: a régua não se move quando
   * a recusa aparece.
   */
  hint?: React.ReactNode;
  /** Label visible above the field (for compact inline usage pass label via aria-label). */
  label?: string;
  /** Extra wrapper class. */
  wrapperClassName?: string;
  /**
   * Aparência do campo (LEELA-FLAT-DEFAULT — decisão do Vitor 2026-07-17):
   *   - `flat` (DEFAULT global) — SEM borda em repouso; o identificador é o FILL
   *     `surface-sunken` (inset, contrasta com a página) e o foco segue por glow
   *     ring. Estado inválido reacende a borda-danger (a11y do erro nunca
   *     depende só da cor);
   *   - `bordered` (opt-out §2.16) — fill `surface-raised` + borda `border-input`,
   *     a aparência antiga (WCAG 1.4.11 ≥3:1 pela borda funcional).
   *   `variant='flat'` explícito continua válido (no-op, é o default).
   */
  variant?: 'flat' | 'bordered';
  /**
   * Adorno ancorado à direita DENTRO do campo (ex.: o olho de mostrar/ocultar
   * do `InputSenha`). Nasceu como slot do primitivo, e não como markup do
   * consumidor, por um motivo medido: o `Input` renderiza label + campo + erro
   * numa pilha, então qualquer botão posicionado por fora se ancora na PILHA e
   * desliza sozinho quando aparece a mensagem de erro. Só o primitivo conhece
   * a caixa do campo.
   *
   * Quando ausente, o DOM sai EXATAMENTE como sempre saiu — o contêiner
   * relativo só existe se houver adorno, para nenhum teste de estrutura dos
   * consumidores atuais mudar de resposta.
   */
  trailing?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      errorMessage,
      hint,
      label,
      wrapperClassName,
      variant = 'flat',
      trailing,
      id,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const bordered = variant === 'bordered';
    // id ESTÁVEL mesmo sem `id` do consumidor: a mensagem de erro precisa de um
    // alvo real senão o aria-describedby fica sem id e o erro não é associado
    // (bug do showroom: aria-describedby s/ id). useId dá um id determinístico.
    const reactId = React.useId();
    const fieldId = id ?? reactId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;
    const hasError = Boolean(errorMessage);
    const hasHint = hint !== undefined && hint !== null && hint !== false;
    // Preserva o aria-describedby do consumidor (ex.: uma dica montada à mão) e
    // ANEXA a dica e o erro, em vez de um sobrescrever o outro.
    const describedBy =
      [ariaDescribedBy, hasHint ? hintId : null, hasError ? errorId : null]
        .filter(Boolean)
        .join(' ') || undefined;

    /** Envolve o campo só quando há adorno — sem adorno o DOM é o de sempre. */
    const comAdorno = (campo: React.ReactNode): React.ReactNode =>
      trailing === undefined || trailing === null ? (
        campo
      ) : (
        <div className="relative flex items-center">
          {campo}
          {/* Ancorado à caixa do CAMPO (não à pilha), por isso o inset-y-0 aqui
              e não no wrapper de fora: a mensagem de erro pode nascer embaixo
              sem empurrar o adorno. */}
          <span className="absolute inset-y-0 right-0 flex items-center pr-[var(--spacing-1)]">
            {trailing}
          </span>
        </div>
      );

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label ? (
          <label
            htmlFor={fieldId}
            className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
          >
            {label}
          </label>
        ) : null}

        {comAdorno(
        <input
          ref={ref}
          id={fieldId}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            // Base layout
            'block w-full',
            'h-[var(--input-height)] px-[var(--input-px)]',
            'rounded-[var(--input-radius)]',
            'text-[length:var(--input-font-size)]',
            // Colors & border. Default (flat): fill sunken + borda
            // --input-border-flat (= border-strong, ≥3:1 vs página — S-R9-04-T2/
            // L-006; o fill sozinho dava ~1.01:1 e o campo não tinha limite
            // perceptível). Opt-out (bordered, §2.16): bg raised + border-input.
            // Ambos ≥3:1 (WCAG 1.4.11); o foco segue por ring nos dois.
            'text-[var(--text-primary)]',
            bordered
              ? 'bg-[var(--surface-raised)] border-[length:var(--input-border-width)] border-input'
              : 'bg-[var(--surface-sunken)] border-[length:var(--input-border-width)] border-[color:var(--input-border-flat)]',
            // Placeholder — alias muted-foreground = text-tertiary
            'placeholder:text-muted-foreground',
            // Focus — glow ring via alias ring (border-focus), não border
            'focus:outline-none',
            'focus:ring-2 focus:ring-ring focus:ring-offset-0',
            // Invalid
            hasError && 'border-[var(--border-danger)] focus:ring-[color:var(--border-danger)]',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-40',
            // Transition
            'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
            // Espaço para o adorno não deitar em cima do texto digitado.
            trailing !== undefined &&
              trailing !== null &&
              'pr-[calc(var(--iconbtn-size)+var(--spacing-2))]',
            className,
          )}
          {...props}
        />,
        )}

        {hasHint ? (
          <span
            id={hintId}
            className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
          >
            {hint}
          </span>
        ) : null}

        {hasError && errorMessage ? (
          <span
            id={errorId}
            role="alert"
            className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
          >
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
