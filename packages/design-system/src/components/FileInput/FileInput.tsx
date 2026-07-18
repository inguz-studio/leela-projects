/**
 * FileInput — seletor de ARQUIVO estilizado do DS (LEELA-R5 · ADR-016).
 *
 * O `<input type="file">` nativo não é estilizável de forma consistente; aqui
 * ele fica visualmente oculto (sr-only) e o gatilho visível é o Button do DS
 * (secondary). O input REAL continua no DOM com nome acessível (aria-label =
 * label) — testing-library/userEvent.upload e leitores de tela chegam nele;
 * `tabIndex={-1}` evita tab-stop duplo (o Button é o controle de teclado).
 *
 * O componente é BURRO de propósito: não valida, não sobe nada — recebe o File
 * via `onFileSelected` e reflete `busy`/`errorMessage` que o consumidor manda.
 * Validação de tipo/tamanho vive no seam de upload (api-client
 * `problemaDoArquivoImagem`) e a fronteira REAL são as storage.rules — o DS
 * não duplica regra de segurança.
 *
 * O value do input é LIMPO após cada seleção: escolher o MESMO arquivo de novo
 * volta a disparar `change` (re-upload após falha não fica mudo).
 *
 * Estados: default | busy (desabilita + busyLabel) | disabled | erro (inline,
 * role=alert, associado por aria-describedby — nunca só cor).
 */

import * as React from 'react';
import { Button } from '../Button';
import { cn } from '../../utils/cn';

export interface FileInputProps {
  /** id do input real (default: useId). */
  id?: string;
  /** Label visível acima do gatilho; também vira o nome acessível do input. */
  label?: string;
  /** Filtro nativo de tipos (default: imagens da allowlist do upload). */
  accept?: string;
  /** Texto do gatilho (default "Escolher arquivo"). */
  buttonLabel?: string;
  /** Operação em voo: desabilita e troca o texto por `busyLabel`. */
  busy?: boolean;
  /** Texto do gatilho durante `busy` (default "Enviando…"). */
  busyLabel?: string;
  disabled?: boolean;
  /** Erro inline abaixo do gatilho (role=alert + aria-describedby). */
  errorMessage?: string;
  /** Dica abaixo do gatilho (aria-describedby). */
  hint?: string;
  /** Recebe o arquivo escolhido. Validação/upload são do consumidor. */
  onFileSelected: (file: File) => void;
  /** Extra wrapper class. */
  wrapperClassName?: string;
}

const ACCEPT_IMAGENS = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      id,
      label,
      accept = ACCEPT_IMAGENS,
      buttonLabel = 'Escolher arquivo',
      busy = false,
      busyLabel = 'Enviando…',
      disabled = false,
      errorMessage,
      hint,
      onFileSelected,
      wrapperClassName,
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const reactId = React.useId();
    const fieldId = id ?? reactId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;
    const hasError = Boolean(errorMessage);
    const describedBy =
      [hint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(' ') || undefined;
    const inativo = disabled || busy;

    function onChange(event: React.ChangeEvent<HTMLInputElement>): void {
      const file = event.target.files?.[0];
      // Limpa SEMPRE: o mesmo arquivo re-selecionado volta a disparar change.
      event.target.value = '';
      if (file) onFileSelected(file);
    }

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label ? (
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {label}
          </span>
        ) : null}

        <input
          ref={(el) => {
            inputRef.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
          id={fieldId}
          type="file"
          accept={accept}
          disabled={inativo}
          tabIndex={-1}
          aria-label={label ?? buttonLabel}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          onChange={onChange}
          className="sr-only"
        />

        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={inativo}
            aria-describedby={describedBy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? busyLabel : buttonLabel}
          </Button>
        </div>

        {hint ? (
          <span id={hintId} className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
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
FileInput.displayName = 'FileInput';

export { FileInput };
