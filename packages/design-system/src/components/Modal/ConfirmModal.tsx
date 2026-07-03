/**
 * ConfirmModal — confirmação de ação destrutiva com preview de consequências
 * (§2.15, C15).
 *
 * Estrutura:
 *   - Card do alvo (crítico: border-left 3px Vulcão — exceção §2.16)
 *   - "O que você perde" — lista em Vulcão (danger)
 *   - "O que se mantém" — lista em Vitória (success)
 *   - Motivo opcional (textarea) quando `reasonLabel` é passado
 *   - Checkbox de notificação quando `notifyLabel` é passado
 *   - Cancelar (secondary) + Confirmar (destructive/Vulcão)
 *
 * Fechamento herda as 4 vias do Modal (cancelar / X / overlay / Esc).
 * onConfirm recebe { reason, notify }; o consumidor decide quando fechar
 * (fluxos reais mostram spinner + toast antes de navegar).
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';
import { Modal, type ModalSize } from './Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmModalDetails {
  reason: string;
  notify: boolean;
}

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Card do alvo da ação (nome/resumo do que será afetado). */
  target?: React.ReactNode;
  /** Consequências: o que se perde (Vulcão). */
  loses: string[];
  /** Consequências: o que se mantém (Vitória). */
  keeps: string[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Quando presente, exibe textarea de motivo opcional. */
  reasonLabel?: string;
  /** Quando presente, exibe checkbox de notificação. */
  notifyLabel?: string;
  /** Desabilita ações enquanto a operação roda. */
  loading?: boolean;
  size?: ModalSize;
  onConfirm: (details: ConfirmModalDetails) => void;
}

// ---------------------------------------------------------------------------
// Consequence list
// ---------------------------------------------------------------------------

function ConsequenceList({
  heading,
  items,
  tone,
}: {
  heading: string;
  items: string[];
  tone: 'danger' | 'success';
}): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <p
        className={cn(
          'text-[length:var(--font-size-sm)]',
          'font-[var(--font-weight-semibold)]',
          'uppercase tracking-[var(--table-header-spacing)]',
          tone === 'danger' ? 'text-[var(--text-danger)]' : 'text-[var(--text-success)]',
        )}
      >
        {heading}
      </p>
      <ul role="list" className="flex flex-col gap-[var(--spacing-1)]">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-[var(--spacing-2)] text-[length:var(--font-size-base)] text-[var(--text-secondary)]"
          >
            <span
              aria-hidden
              className={cn(
                'shrink-0 font-[var(--font-weight-semibold)]',
                tone === 'danger' ? 'text-[var(--text-danger)]' : 'text-[var(--text-success)]',
              )}
            >
              {tone === 'danger' ? '✕' : '✓'}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  target,
  loses,
  keeps,
  confirmLabel,
  cancelLabel = 'Cancelar',
  reasonLabel,
  notifyLabel,
  loading = false,
  size = 'sm',
  onConfirm,
}: ConfirmModalProps): JSX.Element {
  const [reason, setReason] = React.useState('');
  const [notify, setNotify] = React.useState(false);
  const reasonId = React.useId();
  const notifyId = React.useId();

  // Zera estado interno a cada abertura
  React.useEffect(() => {
    if (open) {
      setReason('');
      setNotify(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => onConfirm({ reason, notify })}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* Card do alvo — crítico (border-left Vulcão, exceção §2.16) */}
      {target && (
        <div
          className={cn(
            'bg-[var(--surface-overlay)]',
            'rounded-[var(--card-radius)]',
            'border-l-[length:var(--card-critical-border)]',
            'border-l-[color:var(--feedback-danger)]',
            'p-[var(--spacing-4)]',
          )}
        >
          {target}
        </div>
      )}

      <ConsequenceList heading="O que você perde" items={loses} tone="danger" />
      <ConsequenceList heading="O que se mantém" items={keeps} tone="success" />

      {reasonLabel && (
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <label
            htmlFor={reasonId}
            className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
          >
            {reasonLabel}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            disabled={loading}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={cn(
              'w-full resize-y',
              'bg-[var(--surface-base)]',
              'text-[length:var(--input-font-size)] text-[var(--text-primary)]',
              'rounded-[var(--input-radius)]',
              'border-[length:var(--input-border-width)] border-[var(--border-default)]',
              'p-[var(--spacing-3)]',
              'placeholder:text-[var(--text-tertiary)]',
              'focus-visible:outline-none focus-visible:border-[var(--border-focus)]',
              'focus-visible:ring-1 focus-visible:ring-[color:var(--border-focus)]',
              'disabled:opacity-40',
            )}
          />
        </div>
      )}

      {notifyLabel && (
        <div className="flex items-center gap-[var(--spacing-2)]">
          <input
            id={notifyId}
            type="checkbox"
            checked={notify}
            disabled={loading}
            onChange={(e) => setNotify(e.target.checked)}
            className={cn(
              'h-[var(--spacing-4)] w-[var(--spacing-4)]',
              'accent-[var(--action-primary)]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[color:var(--border-focus)]',
            )}
          />
          <label
            htmlFor={notifyId}
            className="text-[length:var(--font-size-base)] text-[var(--text-secondary)] select-none"
          >
            {notifyLabel}
          </label>
        </div>
      )}
    </Modal>
  );
}

ConfirmModal.displayName = 'ConfirmModal';

export { ConfirmModal };
